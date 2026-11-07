import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  addDays, monthOf, pct, periodLabel, prevPeriods, sum, toIsoDate, toMillion,
} from '../common/utils';
import { Expense } from '../expenses/expense.entity';
import { Invoice } from '../invoices/invoice.entity';
import { latestInvoicePeriod, refreshOverdue } from '../invoices/invoices.helpers';
import { Room } from '../rooms/room.entity';
import { SettingsService } from '../settings/settings.service';
import { Tenant } from '../tenants/tenant.entity';
import { Reading } from '../utilities/reading.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Invoice) private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Expense) private expensesRepository: Repository<Expense>,
    @InjectRepository(Room) private roomsRepository: Repository<Room>,
    @InjectRepository(Tenant) private tenantsRepository: Repository<Tenant>,
    @InjectRepository(Reading) private readingsRepository: Repository<Reading>,
    private settingsService: SettingsService,
  ) {}

  // GET /dashboard/summary?period=2024-10
  async summary(periodParam?: string) {
    await refreshOverdue(this.invoicesRepository);
    const period = periodParam ?? (await latestInvoicePeriod(this.invoicesRepository));
    const periods = prevPeriods(period, 6);

    const [settings, rooms, invoices, expenses, tenants, readings] = await Promise.all([
      this.settingsService.get(),
      this.roomsRepository.find(),
      this.invoicesRepository.find({
        where: { period: In(periods) },
        relations: { room: true, tenant: true },
      }),
      this.expensesRepository.find({ where: { period: In(periods) } }),
      this.tenantsRepository.find({ where: { isStaying: true }, relations: { room: true } }),
      this.readingsRepository.find({ where: { period } }),
    ]);

    const cur = invoices.filter((i) => i.period === period);
    const paid = (list: Invoice[]) => sum(list.filter((i) => i.status === 'PAID').map((i) => i.total));
    const expected = sum(cur.map((i) => i.total));
    const collected = paid(cur);
    const prevExpected = sum(invoices.filter((i) => i.period === periods[periods.length - 2]).map((i) => i.total));

    // Biểu đồ 6 kỳ (đơn vị: triệu đồng)
    const chart = periods.map((p) => ({
      label: `T${String(monthOf(p)).padStart(2, '0')}`,
      income: toMillion(paid(invoices.filter((i) => i.period === p))),
      expense: toMillion(sum(expenses.filter((e) => e.period === p).map((e) => e.amount))),
      current: p === period ? true : undefined,
    }));
    const totalIncome = sum(chart.map((c) => c.income));
    const totalExpense = sum(chart.map((c) => c.expense));

    // Việc cần làm: tự suy ra từ dữ liệu
    const tasks: any[] = [];
    const recordedRooms = new Set(readings.filter((r) => r.elecNew != null && r.waterNew != null).map((r) => r.roomId));
    const missing = tenants.filter((t) => !recordedRooms.has(t.roomId));
    if (missing.length) {
      tasks.push({
        type: 'METER',
        title: `${missing.length} phòng chưa chốt điện nước`,
        detail: `${missing.map((t) => `P.${t.room.code}`).join(', ')} còn thiếu chỉ số cuối tháng`,
        action: 'Nhập ngay',
        to: '/utilities',
      });
    }
    const today = toIsoDate(new Date());
    const in7 = toIsoDate(addDays(new Date(), 7));
    const expiring = tenants.filter((t) => t.contractEndDate >= today && t.contractEndDate <= in7);
    if (expiring.length) {
      tasks.push({
        type: 'CONTRACT',
        title: `${expiring.length} khách sắp hết hạn (7 ngày tới)`,
        detail: expiring.map((t) => `${t.fullName} (P.${t.room.code})`).join(' & '),
        action: 'Tái ký',
        to: '/tenants',
      });
    }
    rooms
      .filter((r) => r.status === 'MAINTENANCE')
      .forEach((r) =>
        tasks.push({
          type: 'REPAIR',
          title: `Sửa chữa Phòng ${r.code}`,
          detail: r.reason ?? 'Đang bảo trì',
          action: 'Gọi thợ',
          to: '/rooms',
        }),
      );

    const countRooms = (st: string) => rooms.filter((r) => r.status === st).length;

    return {
      branchName: settings.facilityName,
      period,
      totalRooms: rooms.length,
      rentedRooms: countRooms('RENTED'),
      vacantRooms: countRooms('VACANT'),
      maintenanceRooms: countRooms('MAINTENANCE'),
      expectedRevenue: expected,
      collected,
      outstanding: expected - collected,
      unpaidRooms: cur.filter((i) => i.status !== 'PAID').length,
      paidInvoices: cur.filter((i) => i.status === 'PAID').length,
      totalInvoices: cur.length,
      revenueGrowth: prevExpected > 0 ? Math.round(((expected - prevExpected) / prevExpected) * 100) : 0,
      chart,
      avgMonthlyIncome: Math.round(sum(periods.map((p) => paid(invoices.filter((i) => i.period === p)))) / periods.length),
      netMargin: pct(totalIncome - totalExpense, totalIncome),
      tasks: tasks.map((t, idx) => ({ id: idx + 1, ...t })),
      recentPayments: [...cur]
        .sort((a, b) => b.id - a.id)
        .slice(0, 4)
        .map((i) => ({
          id: i.id,
          roomCode: `P.${i.room.code}`,
          tenantName: i.tenant.fullName,
          phone: i.tenant.phone,
          period: periodLabel(i.period),
          amount: i.total,
          method: i.method ?? '—',
          status: i.status,
        })),
    };
  }
}
