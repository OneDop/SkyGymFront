import { Routes } from '@angular/router';

const data = { searchPlaceholder: 'Search trainers...' };
const details = () => import('./trainer-details/trainer-details').then((m) => m.TrainerDetails);

export default [
  {
    path: '',
    title: 'Trainers · Titan Fitness',
    data,
    loadComponent: () => import('./trainer-directory/trainer-directory').then((m) => m.TrainerDirectory),
  },
  { path: 'new', title: 'New Trainer · Titan Fitness', data: { ...data, mode: 'add', searchTarget: '/trainers' }, loadComponent: details },
  { path: ':id', title: 'Trainer · Titan Fitness', data: { ...data, mode: 'view', searchTarget: '/trainers' }, loadComponent: details },
  { path: ':id/edit', title: 'Update Trainer · Titan Fitness', data: { ...data, mode: 'edit', searchTarget: '/trainers' }, loadComponent: details },
] satisfies Routes;
