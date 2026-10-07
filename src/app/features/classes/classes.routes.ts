import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Class Schedule · Titan Fitness',
    data: { searchPlaceholder: 'Search classes...' },
    loadComponent: () => import('./class-schedule/class-schedule').then((m) => m.ClassSchedule),
  },
] satisfies Routes;
