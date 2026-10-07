import { Routes } from '@angular/router';
import { Shell } from './core/layout/shell/shell';

export const routes: Routes = [
  {
    path: 'sign-in',
    title: 'Sign in · Titan Fitness',
    loadComponent: () => import('./core/pages/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'book/:sessionId',
    title: 'Class Booking · Titan Fitness',
    loadComponent: () =>
      import('./features/classes/book-session-member/book-session-member').then((m) => m.BookSessionMember),
  },
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'members', loadChildren: () => import('./features/members/members.routes') },
      { path: 'classes', loadChildren: () => import('./features/classes/classes.routes') },
      { path: 'trainers', loadChildren: () => import('./features/trainers/trainers.routes') },
      { path: 'plans', loadChildren: () => import('./features/plans/plans.routes') },
      {
        path: 'access-denied',
        title: 'Access denied · Titan Fitness',
        loadComponent: () => import('./core/pages/access-denied/access-denied').then((m) => m.AccessDenied),
      },
      {
        path: '**',
        title: 'Page not found · Titan Fitness',
        loadComponent: () => import('./core/pages/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
