export interface BillingCycleInput {
  transactionDate: string;
  cutoffDay: number;
  paymentDueDay: number;
  timeZone: 'Asia/Jakarta';
}

interface CalendarDate {
  year: number;
  monthIndex: number;
  day: number;
}

function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Tanggal tidak valid');

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const maxDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > maxDay) {
    throw new Error('Tanggal tidak valid');
  }

  return { year, monthIndex, day };
}

function formatDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function assertBillingDay(name: 'cutoffDay' | 'paymentDueDay', value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error(`${name} harus antara 1 dan 31`);
  }
}

export function clampDay(year: number, monthIndex: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error('Tanggal tidak valid');
  }
  assertBillingDay('paymentDueDay', day);
  const maxDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return formatDate(year, monthIndex, Math.min(day, maxDay));
}

export function addBillingMonth(date: string, months: number): string {
  if (!Number.isInteger(months)) throw new Error('Jumlah bulan harus bilangan bulat');
  const parsed = parseCalendarDate(date);
  const target = parsed.year * 12 + parsed.monthIndex + months;
  const targetYear = Math.floor(target / 12);
  const targetMonthIndex = ((target % 12) + 12) % 12;
  return clampDay(targetYear, targetMonthIndex, parsed.day);
}

export function calculateFirstDueDate(input: BillingCycleInput): string {
  if (input.timeZone !== 'Asia/Jakarta') throw new Error('Zona waktu tagihan tidak didukung');
  assertBillingDay('cutoffDay', input.cutoffDay);
  assertBillingDay('paymentDueDay', input.paymentDueDay);

  const transaction = parseCalendarDate(input.transactionDate);
  const cutoff = Number(clampDay(transaction.year, transaction.monthIndex, input.cutoffDay).slice(-2));
  const monthsUntilDue = transaction.day <= cutoff ? 1 : 2;
  const target = transaction.year * 12 + transaction.monthIndex + monthsUntilDue;
  const targetYear = Math.floor(target / 12);
  const targetMonthIndex = ((target % 12) + 12) % 12;

  return clampDay(targetYear, targetMonthIndex, input.paymentDueDay);
}
