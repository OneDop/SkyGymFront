import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClassSession } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { HeaderSearchService } from '../../../core/services/header-search.service';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { ToastService } from '../../../core/services/toast.service';
import { listLoad } from '../../../core/http/request-context';
import { ClassService } from '../class.service';
import { classState, fillPercent, isNearlyFull } from '../class-state';
import { openClassDialog } from '../class-dialog/class-dialog';
import { openBookSession } from '../book-session-dialog/book-session-dialog';
import { RowAction, RowMenu } from '../../../shared/components/row-menu/row-menu';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { confirm } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';
import { addDays, isSameDay, parseDateOnly, splitTime, startOfDay, toDateOnly } from '../../../shared/utils/dates';

type View = 'day' | 'week';
const ALL = 'all';

interface DayGroup {
  date: Date;
  sessions: ClassSession[];
}

@Component({
  selector: 'app-class-schedule',
  imports: [DatePipe, FormsModule, MatDatepickerModule, MatIconModule, MatInputModule, MatSelectModule, MatTooltipModule,
    RowMenu, StatusBadge, StateMessage, HighlightPipe],
  templateUrl: './class-schedule.html',
  styleUrl: './class-schedule.scss',
})
export class ClassSchedule {
  private readonly classes = inject(ClassService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly memory = inject(ListMemoryService);
  protected readonly branches = inject(BranchService);
  protected readonly search = inject(HeaderSearchService);

  protected readonly branchFilter = signal<string>(ALL);
  protected readonly date = signal<Date>(startOfDay(new Date()));
  protected readonly view = signal<View>('day');

  protected readonly sessions = signal<ClassSession[]>([]);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  protected readonly allBranches = computed(() => this.branchFilter() === ALL);
  protected readonly isToday = computed(() => isSameDay(this.date(), new Date()));
  protected readonly weekEnd = computed(() => addDays(this.date(), 6));

  protected readonly visible = computed(() => {
    const term = this.search.term().trim().toLowerCase();
    if (!term) return this.sessions();
    return this.sessions().filter((s) =>
      [s.className, s.trainerName ?? 'No trainer', s.studioName ?? 'No room', s.branchName, this.stateLabel(s)]
        .some((v) => v.toLowerCase().includes(term)),
    );
  });

  protected readonly groups = computed<DayGroup[]>(() => {
    const days = this.view() === 'week' ? 7 : 1;
    return Array.from({ length: days }, (_, i) => {
      const date = addDays(this.date(), i);
      const key = toDateOnly(date);
      return { date, sessions: this.visible().filter((s) => s.sessionDate === key) };
    });
  });

  protected readonly capacity = computed(() => {
    const live = this.sessions().filter((s) => s.status !== 'Cancelled');
    const booked = live.reduce((n, s) => n + s.confirmedCount, 0);
    const places = live.reduce((n, s) => n + s.capacityLimit, 0);
    return { booked, fill: places ? Math.round((booked / places) * 100) : 0, waitlist: live.reduce((n, s) => n + s.waitlistCount, 0) };
  });

  private headerBranchSeen: string | null | undefined;

  constructor() {
    this.readUrl();

    effect(() => {
      const branch = this.branchFilter();
      const date = this.date();
      const view = this.view();
      untracked(() => {
        this.writeUrl(branch, date, view);
        this.load();
      });
    });

    effect(() => {
      const current = this.branches.currentId();
      untracked(() => {
        if (this.headerBranchSeen === undefined) {
          this.headerBranchSeen = current;
          if (!this.route.snapshot.queryParamMap.has('branch') && current) this.branchFilter.set(current);
          return;
        }
        if (current && current !== this.headerBranchSeen) {
          this.headerBranchSeen = current;
          this.branchFilter.set(current);
        }
      });
    });
  }

  protected load(): void {
    this.loading.set(true);
    const from = this.date();
    const to = this.view() === 'week' ? this.weekEnd() : from;
    this.classes
      .list(
        {
          branchId: this.allBranches() ? null : this.branchFilter(),
          from: toDateOnly(from),
          to: toDateOnly(to),
          pageSize: 100,
        },
        listLoad(() => this.load()),
      )
      .subscribe({
        next: (r) => {
          this.sessions.set(r.items);
          this.loading.set(false);
          this.failed.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  protected shiftDate(days: number): void {
    this.date.set(addDays(this.date(), days));
  }

  protected pickDate(d: Date | null): void {
    if (d) this.date.set(startOfDay(d));
  }

  protected time(s: ClassSession) {
    return splitTime(s.startTime);
  }

  protected state(s: ClassSession): string {
    const st = classState(s);
    return st === 'Active' ? 'InProgress' : st;
  }

  protected stateLabel(s: ClassSession): string {
    const st = this.state(s);
    return st === 'InProgress' ? 'In Progress' : st;
  }

  protected nearlyFull(s: ClassSession): boolean {
    return s.status !== 'Cancelled' && isNearlyFull(s);
  }

  protected fill(s: ClassSession): number {
    return fillPercent(s);
  }

  protected fillTone(s: ClassSession): string {
    if (s.confirmedCount >= s.capacityLimit) return 'full';
    return isNearlyFull(s) ? 'hot' : 'ok';
  }

  protected durationText(s: ClassSession): string {
    return `${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)} (${s.durationMinutes} min)`;
  }

  protected actionsFor(s: ClassSession): RowAction[] {
    const state = classState(s);
    const closed = state === 'Completed' || state === 'Cancelled';
    const started = state === 'Active' || closed;
    return [
      { id: 'view', label: 'View Class' },
      { id: 'edit', label: 'Edit Class', disabled: closed, reason: `A ${state.toLowerCase()} class can't be edited.` },
      {
        id: 'book',
        label: 'Book Session',
        disabled: started,
        reason: closed ? `This class is ${state.toLowerCase()}.` : 'This class has already started.',
      },
      {
        id: 'cancel',
        label: 'Cancel Class',
        disabled: closed,
        reason: state === 'Cancelled' ? 'This class is already cancelled.' : 'A completed class cannot be cancelled.',
      },
    ];
  }

  protected onAction(id: string, s: ClassSession): void {
    switch (id) {
      case 'view':
        this.openClass('view', s);
        break;
      case 'edit':
        this.openClass('edit', s);
        break;
      case 'book':
        openBookSession(this.dialog, { session: s }).subscribe((ok) => ok && this.load());
        break;
      case 'cancel':
        this.cancelClass(s);
        break;
    }
  }

  protected openClass(mode: 'view' | 'edit', s: ClassSession): void {
    openClassDialog(this.dialog, { mode, session: s }).subscribe((saved) => saved && this.load());
  }

  protected addClass(): void {
    openClassDialog(this.dialog, {
      mode: 'add',
      branchId: this.allBranches() ? this.branches.currentId() : this.branchFilter(),
      date: this.date(),
    }).subscribe((saved) => saved && this.load());
  }

  private cancelClass(s: ClassSession): void {
    const booked = s.confirmedCount + s.waitlistCount;
    confirm(this.dialog, {
      title: `Cancel ${s.className}?`,
      message: booked
        ? `${booked} booking${booked === 1 ? '' : 's'} will be cancelled too. This can't be undone.`
        : "The class will be removed from booking. This can't be undone.",
      confirmLabel: 'Cancel Class',
      cancelLabel: 'Keep Class',
      danger: true,
    }).subscribe((yes) => {
      if (!yes) return;
      this.classes.cancel(s.id).subscribe({
        next: () => {
          this.toast.success(`${s.className} cancelled`);
          this.load();
        },
        error: () => {},
      });
    });
  }

  private readUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('branch')) this.branchFilter.set(q.get('branch')!);
    if (q.get('date')) {
      const d = parseDateOnly(q.get('date')!);
      if (!Number.isNaN(d.getTime())) this.date.set(d);
    }
    if (q.get('view') === 'week') this.view.set('week');
  }

  private writeUrl(branch: string, date: Date, view: View): void {
    const queryParams = {
      branch: branch === this.branches.currentId() ? null : branch,
      date: isSameDay(date, new Date()) ? null : toDateOnly(date),
      view: view === 'week' ? 'week' : null,
    };
    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    this.router.navigateByUrl(tree, { replaceUrl: true });
    this.memory.remember('classes', this.router.serializeUrl(tree));
  }
}
