import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Dashboard · Titan Fitness',
    data: { searchPlaceholder: 'Search classes...' },
    loadComponent: () => import('./dashboard').then((m) => m.Dashboard),
  },
] satisfies Routes;
