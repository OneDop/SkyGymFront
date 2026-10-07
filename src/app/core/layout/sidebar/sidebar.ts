import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CheckInDialogService } from '../../../features/check-ins/check-in-dialog.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <aside class="sidebar">
      <a routerLink="/dashboard" class="brand">
        <span class="brand-name">Titan Fitness</span>
        <span class="brand-sub">Staff Portal</span>
      </a>

      <button type="button" class="new-checkin" (click)="checkIns.open()">
        <mat-icon>add</mat-icon> New Check-in
      </button>

      <nav aria-label="Main">
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" #rla="routerLinkActive"
             [attr.aria-current]="rla.isActive ? 'page' : null">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    </aside>
  `,
  styles: `
    .sidebar { height: 100%; background: var(--tf-navy); color: #fff; display: flex; flex-direction: column;
      padding: 0 0 24px; box-sizing: border-box; }
    .brand { display: flex; flex-direction: column; padding: 4px 52px 0; text-decoration: none; color: #fff; }
    .brand-name { font-size: 26px; font-weight: 700; line-height: 1.3; }
    .brand-sub { font-size: 15px; opacity: .85; }
    .new-checkin { margin: 28px 52px 40px; height: 46px; border: 0; background: #fff; color: var(--tf-navy);
      font-family: var(--tf-font); font-size: 18px; font-weight: 700; letter-spacing: .04em; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px; }
    .new-checkin:hover { background: var(--tf-navy-tint); }
    .new-checkin mat-icon { font-size: 22px; width: 22px; height: 22px; }
    nav { display: flex; flex-direction: column; }
    nav a { display: flex; align-items: center; gap: 18px; padding: 18px 56px; color: rgba(255,255,255,.82);
      text-decoration: none; font-size: 20px; border-left: 4px solid transparent; }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: rgba(255,255,255,.12); color: #fff; border-left-color: #fff; }
    nav mat-icon { font-size: 22px; width: 22px; height: 22px; }
  `,
})
export class Sidebar {
  protected readonly checkIns = inject(CheckInDialogService);

  protected readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { path: '/members', label: 'Members', icon: 'group' },
    { path: '/classes', label: 'Classes', icon: 'fitness_center' },
    { path: '/trainers', label: 'Trainers', icon: 'badge' },
    { path: '/plans', label: 'Plans', icon: 'sell' },
  ];
}
