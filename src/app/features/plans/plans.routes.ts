import { Routes } from '@angular/router';

const data = { searchPlaceholder: 'Search plans...' };
const details = () => import('./plan-details/plan-details').then((m) => m.PlanDetails);

export default [
  {
    path: '',
    title: 'Plans · Titan Fitness',
    data,
    loadComponent: () => import('./plan-catalogue/plan-catalogue').then((m) => m.PlanCatalogue),
  },
  { path: 'new', title: 'New Plan · Titan Fitness', data: { ...data, mode: 'add', searchTarget: '/plans' }, loadComponent: details },
  { path: ':id', title: 'Plan · Titan Fitness', data: { ...data, mode: 'view', searchTarget: '/plans' }, loadComponent: details },
  { path: ':id/edit', title: 'Update Plan · Titan Fitness', data: { ...data, mode: 'edit', searchTarget: '/plans' }, loadComponent: details },
] satisfies Routes;
