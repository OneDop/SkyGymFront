const pad = (n: number) => String(n).padStart(2, '0');

export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toLocalDateTime(date: Date): string {
  return `${toDateOnly(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateOnly(a) === toDateOnly(b);
}

export function atTime(date: string, time: string): Date {
  const d = parseDateOnly(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function splitTime(time: string): { time: string; meridiem: 'AM' | 'PM' } {
  const [h, m] = time.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${pad(hour12)}:${pad(m)}`, meridiem: h < 12 ? 'AM' : 'PM' };
}

export function minutesNowRoundedDown(step = 5, now = new Date()): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes - (minutes % step);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(hour12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
