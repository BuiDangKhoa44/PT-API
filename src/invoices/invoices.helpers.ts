import { LessThan, Repository } from 'typeorm';
import { currentPeriod, toIsoDate } from '../common/utils';
import { Invoice } from './invoice.entity';

/** Hóa đơn PENDING đã quá hạn thì chuyển sang OVERDUE. Gọi trước khi đọc danh sách / thống kê. */
export function refreshOverdue(repo: Repository<Invoice>) {
  return repo.update(
    { status: 'PENDING', dueDate: LessThan(toIsoDate(new Date())) },
    { status: 'OVERDUE' },
  );
}

/** Kỳ mới nhất có hóa đơn; chưa có hóa đơn nào thì dùng kỳ hiện tại */
export async function latestInvoicePeriod(repo: Repository<Invoice>): Promise<string> {
  const raw = await repo.createQueryBuilder('i').select('MAX(i.period)', 'p').getRawOne();
  return raw?.p ?? currentPeriod();
}
