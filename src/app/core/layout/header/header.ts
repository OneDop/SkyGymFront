import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BranchService } from '../../services/branch.service';
import { HeaderSearchService } from '../../services/header-search.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  imports: [MatIconModule, MatMenuModule, RouterLink],
  template: `
    <header class="topbar">
      <button type="button" class="branch" [matMenuTriggerFor]="branchMenu"
              aria-label="Change branch">
        {{ branches.current()?.name ?? (branches.loaded() ? 'No branches' : 'Loading…') }}
        <mat-icon>expand_more</mat-icon>
      </button>
      <mat-menu #branchMenu="matMenu">
        @for (b of branches.branches(); track b.id) {
          <button mat-menu-item (click)="branches.select(b.id)">
            @if (b.id === branches.currentId()) { <mat-icon>check</mat-icon> } @else { <mat-icon></mat-icon> }
            {{ b.name }}
          </button>
        }
      </mat-menu>

      <label class="search">
        <mat-icon>search</mat-icon>
        <input type="search" [placeholder]="search.placeholder()" [value]="search.term()"
               (input)="onSearch($any($event.target).value)" [attr.aria-label]="search.placeholder()" />
      </label>

      <div class="right">
        <button type="button" class="icon-btn" aria-label="Notifications"><mat-icon>notifications</mat-icon></button>
        <a routerLink="/classes" class="icon-btn" aria-label="Class schedule"><mat-icon>calendar_today</mat-icon></a>
        <button type="button" class="avatar" [matMenuTriggerFor]="userMenu" aria-label="Account">
          {{ auth.initials() }}
        </button>
        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="who">{{ auth.staffName() ?? 'Not signed in' }}</div>
          @if (auth.staffName()) {
            <button mat-menu-item (click)="signOut()"><mat-icon>logout</mat-icon>Sign out</button>
          } @else {
            <button mat-menu-item (click)="signIn()"><mat-icon>login</mat-icon>Sign in</button>
          }
        </mat-menu>
      </div>
    </header>
  `,
  styles: `
    .topbar { height: 84px; display: flex; align-items: center; gap: 48px; padding: 0 52px;
      background: var(--tf-surface); border-bottom: 1px solid var(--tf-border); box-sizing: border-box; }
    .branch { border: 0; background: none; cursor: pointer; font-family: var(--tf-font); font-size: 26px;
      font-weight: 700; color: var(--tf-navy); display: inline-flex; align-items: center; gap: 2px; padding: 0; white-space: nowrap; }
    .branch mat-icon { color: var(--tf-muted); }
    .search { display: flex; align-items: center; gap: 10px; width: 340px; max-width: 100%; height: 48px;
      padding: 0 16px; border: 1px solid var(--tf-border-strong); background: var(--tf-surface); box-sizing: border-box; }
    .search mat-icon { color: var(--tf-text-soft); font-size: 20px; width: 20px; height: 20px; }
    .search input { border: 0; outline: 0; flex: 1; font: inherit; font-size: 17px; background: transparent; min-width: 0; }
    .search:focus-within { border-color: var(--tf-navy); }
    .right { margin-left: auto; display: flex; align-items: center; gap: 18px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer; background: var(--tf-avatar-bg);
      color: var(--tf-navy); font-family: var(--tf-font); font-weight: 700; font-size: 15px; }
    .who { padding: 8px 16px; color: var(--tf-muted); font-size: 14px; }
    @media (max-width: 900px) { .topbar { gap: 16px; padding: 0 16px; } .branch { font-size: 18px; } .search { width: auto; flex: 1; } }
  `,
})
export class Header {
  protected readonly branches = inject(BranchService);
  protected readonly search = inject(HeaderSearchService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected onSearch(term: string): void {
    this.search.set(term);
    const target = this.search.target();
    if (target && term.trim()) this.router.navigate([target], { queryParams: { q: term } });
  }

  protected signOut(): void {
    this.auth.clear();
    this.router.navigate(['/sign-in'], { queryParams: { returnUrl: this.router.url } });
  }

  protected signIn(): void {
    this.router.navigate(['/sign-in'], { queryParams: { returnUrl: this.router.url } });
  }
}
