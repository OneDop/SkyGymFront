import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { interval } from 'rxjs';
import { ClassSession, DashboardSummary } from '../../core/models/api.models';
import { BranchService } from '../../core/services/branch.service';
import { HeaderSearchService } from '../../core/services/header-search.service';
import { listLoad } from '../../core/http/request-context';
import { DashboardService } from './dashboard.service';
import { ClassService } from '../classes/class.service';
import { CheckInService } from '../check-ins/check-in.service';
import { CheckInDialogService } from '../check-ins/check-in-dialog.service';
import { classState } from '../classes/class-state';
import { openMemberForm } from '../members/member-form-dialog/member-form-dialog';
import { KpiCard } from './components/kpi-card/kpi-card';
import { ClassFilter, UpcomingClasses } from './components/upcoming-classes/upcoming-classes';
import { QuickActions } from './components/quick-actions/quick-actions';

const REFRESH_MS = 60_000;

@Component({
  selector: 'app-dashboard',
  imports: [KpiCard, UpcomingClasses, QuickActions],
  providers: [DecimalPipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Live floor statistics and quick actions.</p>
        </div>
      </div>

      <div class="layout">
        <div class="left">
          <div class="kpis">
            <app-kpi-card label="Check-ins Today" icon="how_to_reg"
                          [value]="summary() ? number(summary()!.checkInsToday) : null"
                          [note]="checkInNote()" [trend]="checkInTrend()" />
            <app-kpi-card label="Active Members" icon="groups"
                          [value]="summary() ? number(summary()!.activeMembers) : null"
                          [note]="summary() ? 'Currently on floor: ' + number(summary()!.currentlyOnFloor) : ''" />
          </div>
          <app-upcoming-classes [sessions]="visibleClasses()" [search]="search.term()"
                                [loading]="loadingClasses()" [error]="classesFailed()"
                                [(filter)]="classFilter" />
        </div>
        <app-quick-actions (newMember)="newMember()" (checkIn)="checkIn()" (registerClass)="registerClass()" />
      </div>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 834px) 400px; gap: 32px; align-items: start; }
    .left { display: flex; flex-direction: column; gap: 32px; }
    .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    @media (max-width: 1300px) { .layout { grid-template-columns: 1fr; } }
    @media (max-width: 700px) { .kpis { grid-template-columns: 1fr; } }
  `,
})
export class Dashboard {
  private readonly dashboard = inject(DashboardService);
  private readonly classes = inject(ClassService);
  private readonly branches = inject(BranchService);
  private readonly checkIns = inject(CheckInService);
  private readonly checkInDialog = inject(CheckInDialogService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly decimal = inject(DecimalPipe);
  protected readonly search = inject(HeaderSearchService);

  protected readonly summary = signal<DashboardSummary | null>(null);
  private readonly upcoming = signal<ClassSession[]>([]);
  protected readonly loadingClasses = signal(true);
  protected readonly classesFailed = signal(false);
  protected readonly classFilter = signal<ClassFilter>('All');

  protected readonly visibleClasses = computed(() => {
    const term = this.search.term().trim().toLowerCase();
    const filter = this.classFilter();
    return this.upcoming().filter(
      (s) =>
        (filter === 'All' || classState(s) === filter) &&
        (!term || [s.className, s.studioName ?? 'No room', s.trainerName ?? 'No trainer', classState(s)]
          .some((v) => v.toLowerCase().includes(term))),
    );
  });

  protected readonly checkInNote = computed(() => {
    const change = this.summary()?.checkInsChangePercent;
    if (change === null || change === undefined) return this.summary() ? 'No check-ins last week to compare' : '';
    return `${change > 0 ? '+' : ''}${this.decimal.transform(change, '1.0-1')}% vs last week`;
  });

  protected readonly checkInTrend = computed(() => {
    const change = this.summary()?.checkInsChangePercent;
    return change ? (change > 0 ? 'up' : 'down') : null;
  });

  constructor() {
    effect(() => {
      const branchId = this.branches.currentId();
      this.checkIns.recorded();
      if (branchId) untracked(() => this.load(branchId));
    });

    interval(REFRESH_MS)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        const id = this.branches.currentId();
        if (id) this.load(id);
      });
  }

  protected number(n: number): string {
    return this.decimal.transform(n) ?? String(n);
  }

  private load(branchId: string): void {
    this.dashboard.summary(branchId).subscribe({ next: (s) => this.summary.set(s), error: () => {} });

    this.classes.upcoming(branchId, 10, listLoad(() => this.load(branchId))).subscribe({
      next: (list) => {
        this.upcoming.set(list);
        this.loadingClasses.set(false);
        this.classesFailed.set(false);
      },
      error: () => {
        this.loadingClasses.set(false);
        this.classesFailed.set(true);
      },
    });
  }

  protected newMember(): void {
    openMemberForm(this.dialog).subscribe((id) => {
      if (id) this.router.navigate(['/members', id]);
    });
  }

  protected checkIn(): void {
    this.checkInDialog.open().subscribe();
  }

  protected registerClass(): void {
    this.router.navigate(['/classes']);
  }
}
