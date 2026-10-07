import { ClassSession } from '../../core/models/api.models';

export type ClassState = 'Upcoming' | 'Active' | 'Full' | 'Completed' | 'Cancelled';

export function classState(s: ClassSession): ClassState {
  if (s.status === 'Cancelled') return 'Cancelled';
  if (s.status === 'Completed') return 'Completed';
  if (s.status === 'InProgress') return 'Active';
  if (s.confirmedCount >= s.capacityLimit) return 'Full';
  return 'Upcoming';
}

export function isNearlyFull(s: ClassSession): boolean {
  return s.capacityLimit > 0 && s.confirmedCount / s.capacityLimit >= 0.9;
}

export function fillPercent(s: ClassSession): number {
  return s.capacityLimit > 0 ? Math.min(100, Math.round((s.confirmedCount / s.capacityLimit) * 100)) : 0;
}
