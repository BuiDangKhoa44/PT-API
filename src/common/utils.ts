// Các hàm tiện ích dùng chung: ngày tháng, kỳ (period) dạng 'YYYY-MM', định dạng tiền.

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' (giờ máy chủ) */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' (hoặc Date) -> 'dd/MM/yyyy' đúng định dạng frontend đang hiển thị */
export function fmtDate(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  const iso = typeof v === 'string' ? v.slice(0, 10) : toIsoDate(v);
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Kỳ hiện tại, ví dụ '2026-11' */
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** n kỳ kết thúc ở `period`, xếp tăng dần. prevPeriods('2024-10', 3) -> ['2024-08','2024-09','2024-10'] */
export function prevPeriods(period: string, n: number): string[] {
  const [y, m] = period.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
}

export const monthOf = (period: string) => Number(period.split('-')[1]);
export const yearOf = (period: string) => Number(period.split('-')[0]);
/** 'Tháng 10/2024' */
export const periodLabel = (p: string) => `Tháng ${pad(monthOf(p))}/${yearOf(p)}`;

/** Đổi VNĐ -> triệu, làm tròn 1 số lẻ (dùng cho biểu đồ) */
export const toMillion = (n: number) => Math.round(n / 100000) / 10;

/** 5550000 -> '5,55 Tr' */
export const fmtMillionText = (n: number) => `${(n / 1_000_000).toFixed(2).replace('.', ',')} Tr`;

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
export const pct = (a: number, b: number, digits = 1) =>
  b > 0 ? Number(((a / b) * 100).toFixed(digits)) : 0;
