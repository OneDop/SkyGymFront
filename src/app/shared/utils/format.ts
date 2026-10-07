import { formatDate } from '@angular/common';
import { addDays, isSameDay } from './dates';

export function lastVisitLabel(iso: string | null, now = new Date()): string {
  if (!iso) return 'Never';
  const at = new Date(iso);
  if (isSameDay(at, now)) return `Today, ${formatDate(at, 'hh:mm a', 'en-US')}`;
  if (isSameDay(at, addDays(now, -1))) return 'Yesterday';
  return formatDate(at, 'MMM dd, y', 'en-US');
}

export const FREEZE_REASONS = [
  { value: 'ExtendedTravel', label: 'Extended Travel' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Injury', label: 'Injury' },
  { value: 'Financial', label: 'Financial' },
  { value: 'Other', label: 'Other' },
] as const;
