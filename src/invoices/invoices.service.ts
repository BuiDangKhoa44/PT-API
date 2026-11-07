import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { fmtDate, pct, sum } from '../common/utils';
import { SettingsService } from '../settings/settings.service';
import { Tenant } from '../tenants/tenant.entity';
import { Reading } from '../utilities/reading.entity';
import { Invoice } from './invoice.entity';
import { latestInvoicePeriod, refreshOverdue } from './invoices.helpers';
import { ConfirmPaymentDto, ListInvoicesQuery } from './invoices.dto';

const pad = (n: number) => String(n).padStart(2, '0');

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Tenant) private tenantsRepository: Repository<Tenant>,
    @InjectRepository(Reading) private readingsRepository: Repository<Reading>,
    private settingsService: SettingsService,
  ) {}

  // GET /invoices?period=&status=&q= -> { items, stats, counts }
  async list(query: ListInvoicesQuery) {
    await refreshOverdue(this.invoicesRepository);
    const period = query.period ?? (await latestInvoicePeriod(this.invoicesRepository));

    // Danh sách (có lọc)
    const base: FindOptionsWhere<Invoice> = { period };
    if (query.status) base.status = query.status;
    const q = query.q?.trim().replace(/^p\./i, ''); // gõ "P.101" hay "101" đều tìm được
    const where: FindOptionsWhere<Invoice> | FindOptionsWhere<Invoice>[] = q
      ? [
          { ...base, code: Like(`%${q}%`) },
          { ...base, room: { code: Like(`%${q}%`) } },
        ]
      : base;
    const rows = await this.invoicesRepository.find({
      where,
      relations: { room: true, tenant: true },
      order: { id: 'ASC' },
    });

    // Thống kê (toàn bộ hóa đơn của kỳ, không phụ thuộc bộ lọc)
    const all = await this.invoicesRepository.find({ where: { period } });
    const by = (st: string) => all.filter((i) => i.status === st);
    const money = (st: string) => sum(by(st).map((i) => i.total));
    const totalAll = sum(all.map((i) => i.total));

    return {
      items: rows.map((i) => ({
        id: i.id,
        code: i.code,
        roomCode: `P.${i.room.code}`,
        tenantName: i.tenant.fullName,
        rent: i.rent,
        electric: i.electric,
        electricKwh: i.electricKwh,
        service: i.service + i.water, // "Dịch vụ" = nước + rác + internet
        total: i.total,
        dueDate: fmtDate(i.dueDate),
        status: i.status,
      })),
      stats: {
        collected: money('PAID'),
        collectedCount: by('PAID').length,
        collectedPct: pct(money('PAID'), totalAll),
        pending: money('PENDING'),
        pendingCount: by('PENDING').length,
        pendingPct: pct(money('PENDING'), totalAll),
        overdue: money('OVERDUE'),
        overdueRooms: by('OVERDUE').length,
      },
      counts: {
        all: all.length,
        PAID: by('PAID').length,
        PENDING: by('PENDING').length,
        OVERDUE: by('OVERDUE').length,
      },
    };
  }

  // PATCH /invoices/:id/confirm-payment
  async confirm(id: number, dto: ConfirmPaymentDto) {
    const invoice = await this.invoicesRepository.findOneBy({ id });
    if (!invoice) throw new NotFoundException(`Không tìm thấy hóa đơn ${id}`);
    if (invoice.status !== 'PAID') {
      invoice.status = 'PAID';
      invoice.paidAt = new Date();
      invoice.method = dto.method ?? 'Tiền mặt trực tiếp';
      await this.invoicesRepository.save(invoice);
    }
    return { id: invoice.id, status: invoice.status };
  }

  // POST /invoices/generate  body { period }
  // Tạo hóa đơn cho mọi phòng đã chốt đủ chỉ số điện + nước và chưa có hóa đơn kỳ đó.
  // Tiền được TÍNH LẠI ở backend theo đơn giá trong Settings (không tin số tạm tính của frontend).
  async generate(period: string) {
    const [settings, tenants, readings, existing] = await Promise.all([
      this.settingsService.get(),
      this.tenantsRepository.find({ where: { isStaying: true }, relations: { room: true } }),
      this.readingsRepository.find({ where: { period } }),
      this.invoicesRepository.find({ where: { period } }),
    ]);
    if (!tenants.length) throw new BadRequestException('Chưa có khách nào đang thuê');

    const readingByRoom = new Map(readings.map((r) => [r.roomId, r]));
    const invoicedRooms = new Set(existing.map((i) => i.roomId));
    const toCreate: Invoice[] = [];

    for (const t of tenants) {
      const r = readingByRoom.get(t.roomId);
      if (!r || r.elecNew == null || r.waterNew == null) continue; // chưa chốt số
      if (invoicedRooms.has(t.roomId)) continue; // đã có hóa đơn

      const kwh = r.elecNew - r.elecOld;
      const m3 = r.waterNew - r.waterOld;
      const electric = kwh * settings.electricPrice;
      const water = m3 * settings.waterPrice;
      const service = settings.servicePrice + settings.internetPrice;
      const rent = t.room.price;

      toCreate.push(
        this.invoicesRepository.create({
          code: `HD-${period.replace('-', '')}-${t.room.code}`,
          roomId: t.roomId,
          tenantId: t.id,
          period,
          rent,
          electricKwh: kwh,
          electric,
          water,
          service,
          total: rent + electric + water + service,
          dueDate: `${period}-${pad(t.dueDay)}`,
          status: 'PENDING',
        }),
      );
    }
    await this.invoicesRepository.save(toCreate);
    return { created: toCreate.length };
  }

  // POST /invoices/notify  body { period }
  // Hiện chỉ đếm số hóa đơn cần nhắc. Muốn gửi Zalo/SMS thật thì gọi API của nhà cung cấp tại đây.
  async notify(period: string) {
    await refreshOverdue(this.invoicesRepository);
    const unpaid = await this.invoicesRepository.find({ where: { period } });
    const sent = unpaid.filter((i) => i.status !== 'PAID').length;
    return { sent };
  }
}
