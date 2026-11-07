import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { In, Repository } from 'typeorm';
import {
  fmtMillionText, monthOf, pct, prevPeriods, sum, toMillion, yearOf,
} from '../common/utils';
import { Expense } from '../expenses/expense.entity';
import { Invoice } from '../invoices/invoice.entity';
import { latestInvoicePeriod, refreshOverdue } from '../invoices/invoices.helpers';
import { Room } from '../rooms/room.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Invoice) private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Expense) private expensesRepository: Repository<Expense>,
    @InjectRepository(Room) private roomsRepository: Repository<Room>,
  ) {}

  // GET /reports/revenue?months=4
  // "Doanh thu" = tổng hóa đơn phát hành trong kỳ (kể cả chưa thu). "hit" = % số tiền đã thu.
  async revenue(months = 4) {
    await refreshOverdue(this.invoicesRepository);
    const latest = await latestInvoicePeriod(this.invoicesRepository);
    const periods = prevPeriods(latest, months);

    const [invoices, expenses, totalRooms] = await Promise.all([
      this.invoicesRepository.find({ where: { period: In(periods) } }),
      this.expensesRepository.find({ where: { period: In(periods) }, order: { id: 'ASC' } }),
      this.roomsRepository.count(),
    ]);

    const stats = periods.map((p) => {
      const inv = invoices.filter((i) => i.period === p);
      const total = sum(inv.map((i) => i.total));
      const paid = sum(inv.filter((i) => i.status === 'PAID').map((i) => i.total));
      const electric = sum(inv.map((i) => i.electric));
      const water = sum(inv.map((i) => i.water));
      const maintenance = sum(expenses.filter((e) => e.period === p).map((e) => e.amount));
      return {
        p,
        total,
        paid,
        rent: sum(inv.map((i) => i.rent)),
        electric,
        water,
        service: sum(inv.map((i) => i.service)),
        maintenance,
        rooms: new Set(inv.map((i) => i.roomId)).size,
        paidCount: inv.filter((i) => i.status === 'PAID').length,
        count: inv.length,
      };
    });

    const cur = stats[stats.length - 1];
    const prev = stats.length > 1 ? stats[stats.length - 2] : null;
    const utilityCost = cur.electric + cur.water;
    const label = (p: string) => `T${monthOf(p)}/${yearOf(p)}`;
    const lastNote = [...expenses].reverse().find((e) => e.period === cur.p)?.note ?? '';

    return {
      period: label(cur.p),
      totalRevenue: cur.total,
      growth: prev && prev.total > 0 ? pct(cur.total - prev.total, prev.total) : 0,
      rentCollected: cur.rent,
      roomsDone: cur.paidCount,
      roomsTotal: cur.count,
      utilityCost,
      utilityPct: pct(utilityCost, cur.total),
      maintenance: cur.maintenance,
      maintenanceNote: lastNote,
      netProfitPct: pct(cur.total - utilityCost - cur.maintenance, cur.total),
      chart: stats.map((s) => ({
        label: label(s.p),
        total: toMillion(s.total),
        service: toMillion(s.electric + s.water + s.service),
        hit: Math.round(pct(s.paid, s.total)),
        current: s.p === cur.p ? true : undefined,
      })),
      costShare: [
        { name: 'Điện năng tiêu thụ', pct: pct(cur.electric, cur.total), amount: fmtMillionText(cur.electric), color: '#ff5252' },
        { name: 'Nước sinh hoạt', pct: pct(cur.water, cur.total), amount: fmtMillionText(cur.water), color: '#4ade9e' },
        { name: 'Bảo trì thiết bị', pct: pct(cur.maintenance, cur.total), amount: fmtMillionText(cur.maintenance), color: '#a9b8d8' },
      ],
      rows: [...stats].reverse().map((s) => ({
        period: `Tháng ${String(monthOf(s.p)).padStart(2, '0')}/${yearOf(s.p)}${s.p === cur.p ? ' (Tạm tính)' : ''}`,
        rented: `${s.rooms} / ${totalRooms} (${pct(s.rooms, totalRooms)}%)`,
        rent: s.rent,
        electric: s.electric,
        water: s.water,
        maintenance: s.maintenance,
        net: s.total - s.maintenance,
      })),
    };
  }

  // GET /reports/export?format=xlsx -> file Excel (Buffer)
  async exportXlsx(months = 4): Promise<Buffer> {
    const report = await this.revenue(months);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Doanh thu');
    ws.columns = [
      { header: 'Chu kỳ', key: 'period', width: 28 },
      { header: 'Phòng thuê', key: 'rented', width: 22 },
      { header: 'Tiền phòng', key: 'rent', width: 16 },
      { header: 'Tiền điện', key: 'electric', width: 16 },
      { header: 'Tiền nước', key: 'water', width: 16 },
      { header: 'Bảo trì', key: 'maintenance', width: 16 },
      { header: 'Thực thu ròng', key: 'net', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    report.rows.forEach((r) => ws.addRow(r));
    ['C', 'D', 'E', 'F', 'G'].forEach((c) => (ws.getColumn(c).numFmt = '#,##0'));
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
