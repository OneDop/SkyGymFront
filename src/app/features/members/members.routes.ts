import { Routes } from '@angular/router';

const data = { searchPlaceholder: 'Search members...' };

export default [
  {
    path: '',
    title: 'Members · Titan Fitness',
    data,
    loadComponent: () => import('./member-directory/member-directory').then((m) => m.MemberDirectory),
  },
  {
    path: ':id',
    title: 'Member Profile · Titan Fitness',
    data: { ...data, searchTarget: '/members' },
    loadComponent: () => import('./member-profile/member-profile').then((m) => m.MemberProfile),
  },
  {
    path: ':id/freeze',
    title: 'Freeze Membership · Titan Fitness',
    data: { ...data, searchTarget: '/members' },
    loadComponent: () => import('./freeze-membership/freeze-membership').then((m) => m.FreezeMembership),
  },
] satisfies Routes;
