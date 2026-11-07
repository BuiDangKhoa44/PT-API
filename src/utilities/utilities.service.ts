import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { monthOf, prevPeriods } from '../common/utils';
import { SettingsService } from '../settings/settings.service';
import { Tenant } from '../tenants/tenant.entity';
import { Reading } from './reading.entity';
import { SaveReadingsDto } from './utilities.dto';

@Injectable()
export class UtilitiesService {
  constructor(
    @InjectRepository(Reading) private readingsRepository: Repository<Reading>,
    @InjectRepository(Tenant) private tenantsRepository: Repository<Tenant>,
    private settingsService: SettingsService,
    private dataSource: DataSource,
  ) {}

  // GET /utilities/rates
  async rates() {
    const s = await this.settingsService.get();
    return {
      electric: s.electricPrice,
      water: s.waterPrice,
      waterPerPerson: s.waterPerPerson,
      garbage: s.servicePrice,
      internet: s.internetPrice,
    };
  }

  private maskPhone(phone: string) {
    const d = phone.replace(/\D/g, '');
    return d.length >= 7 ? `${d.slice(0, 4)} *** ${d.slice(-3)}` : phone;
  }

  // GET /utilities/readings?period=2024-10 -> { period, consumption, rows }
  async readings(period: string) {
    const tenants = await this.tenantsRepository.find({
      where: { isStaying: true },
      relations: { room: true },
    });
    tenants.sort((a, b) => a.room.code.localeCompare(b.room.code));

    const current = await this.readingsRepository.find({ where: { period } });
    const currentByRoom = new Map(current.map((r) => [r.roomId, r]));

    // Chỉ số của kỳ gần nhất trước đó = "chỉ số cũ" của kỳ này
    const before = await this.readingsRepository.find({
      where: { period: LessThan(period) },
      order: { period: 'DESC' },
    });
    const lastByRoom = new Map<number, Reading>();
    before.forEach((r) => {
      if (!lastByRoom.has(r.roomId) && r.elecNew != null) lastByRoom.set(r.roomId, r);
    });

    const rows = tenants.map((t) => {
      const cur = currentByRoom.get(t.roomId);
      const prev = lastByRoom.get(t.roomId);
      return {
        roomId: t.roomId,
        roomCode: `P.${t.room.code}`,
        tenantName: t.fullName,
        phoneMasked: this.maskPhone(t.phone),
        people: t.people,
        elecOld: cur ? cur.elecOld : prev?.elecNew ?? t.elecStart,
        elecNew: cur?.elecNew ?? null,
        waterOld: cur ? cur.waterOld : prev?.waterNew ?? t.waterStart,
        waterNew: cur?.waterNew ?? null,
        recorded: cur?.elecNew != null && cur?.waterNew != null,
      };
    });

    // Biểu đồ tiêu thụ 5 kỳ gần nhất (tổng kWh và m3 của toàn bộ phòng)
    const periods = prevPeriods(period, 5);
    const all = await this.readingsRepository.find();
    const consumption = periods.map((p) => {
      const rs = all.filter((r) => r.period === p && r.elecNew != null && r.waterNew != null);
      return {
        label: `T${monthOf(p)}`,
        electric: rs.reduce((n, r) => n + (r.elecNew - r.elecOld), 0),
        water: rs.reduce((n, r) => n + (r.waterNew - r.waterOld), 0),
        current: p === period ? true : undefined,
      };
    });

    return { period, consumption, rows };
  }

  // PUT /utilities/readings  body { period, items:[{roomId, elecNew, waterNew}] }
  async saveReadings(dto: SaveReadingsDto) {
    const { period, items } = dto;

    await this.dataSource.transaction(async (manager) => {
      for (const it of items) {
        const tenant = await manager.findOne(Tenant, {
          where: { roomId: it.roomId, isStaying: true },
          relations: { room: true },
        });
        if (!tenant) throw new BadRequestException(`Phòng ${it.roomId} chưa có khách đang thuê`);

        let reading = await manager.findOneBy(Reading, { roomId: it.roomId, period });
        if (!reading) {
          const prev = await manager.findOne(Reading, {
            where: { roomId: it.roomId, period: LessThan(period) },
            order: { period: 'DESC' },
          });
          reading = manager.create(Reading, {
            roomId: it.roomId,
            period,
            elecOld: prev?.elecNew ?? tenant.elecStart,
            waterOld: prev?.waterNew ?? tenant.waterStart,
          });
        }
        if (it.elecNew < reading.elecOld) {
          throw new BadRequestException(
            `Phòng ${tenant.room.code}: chỉ số điện mới (${it.elecNew}) nhỏ hơn chỉ số cũ (${reading.elecOld})`,
          );
        }
        if (it.waterNew < reading.waterOld) {
          throw new BadRequestException(
            `Phòng ${tenant.room.code}: chỉ số nước mới (${it.waterNew}) nhỏ hơn chỉ số cũ (${reading.waterOld})`,
          );
        }
        reading.elecNew = it.elecNew;
        reading.waterNew = it.waterNew;
        await manager.save(reading);
      }
    });
    return { saved: items.length };
  }
}
