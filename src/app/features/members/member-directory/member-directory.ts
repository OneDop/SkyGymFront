import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime } from 'rxjs';
import { Member, MemberStatus, PagedResult } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { HeaderSearchService } from '../../../core/services/header-search.service';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { listLoad } from '../../../core/http/request-context';
import { MemberService } from '../member.service';
import { CheckInService } from '../../check-ins/check-in.service';
import { CheckInDialogService } from '../../check-ins/check-in-dialog.service';
import { openMemberForm } from '../member-form-dialog/member-form-dialog';
import { MemberFilterDialog, MemberFilters } from '../member-filter-dialog/member-filter-dialog';
import { CellDef, DataTable, TableColumn, TableSort } from '../../../shared/components/data-table/data-table';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { RowAction, RowMenu } from '../../../shared/components/row-menu/row-menu';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';
import { lastVisitLabel } from '../../../shared/utils/format';

const PAGE_SIZE = 20;
const DEFAULT_SORT: TableSort = { by: 'name', dir: 'asc' };

interface MemberQueryState {
  term: string;
  page: number;
  sort: TableSort;
  filters: MemberFilters;
}

@Component({
  selector: 'app-member-directory',
  imports: [RouterLink, MatIconModule, DataTable, CellDef, Paginator, RowMenu, StatusBadge, StateMessage,
    Avatar, HighlightPipe, MemberFilterDialog],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1 class="page-title">Member Directory</h1>
          <p class="page-subtitle">Manage and view all registered members.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-outline" (click)="filterOpen.set(true)">
            <mat-icon>filter_list</mat-icon> Filter
            @if (activeFilterCount()) { <span class="count">{{ activeFilterCount() }}</span> }
          </button>
          <button type="button" class="btn btn-primary" (click)="addMember()">
            <mat-icon>add</mat-icon> Add Member
          </button>
        </div>
      </div>

      @if (activeFilterCount()) {
        <div class="active-filters">
          @if (filters().status; as s) {
            <span class="tag">Status: {{ s === 'None' ? 'No plan' : s }}</span>
          }
          @if (filters().branchId; as b) { <span class="tag">Branch: {{ branches.nameOf(b) }}</span> }
          <button type="button" class="btn-link" (click)="applyFilters({ status: null, branchId: null })">Clear filters</button>
        </div>
      }

      <section class="card">
        @if (failed()) {
          <app-state-message icon="cloud_off" title="Members could not be loaded"
                             message="Check the connection and try again." actionLabel="Retry" (act)="reload()" />
        } @else {
          <app-data-table [columns]="columns" [rows]="result()?.items ?? []" [(sort)]="sort"
                          [loading]="loading()" [emptyText]="emptyText()">
            <ng-template appCell="name" let-m>
              <a class="who" [routerLink]="['/members', m.id]">
                <app-avatar [name]="m.fullName" [size]="42" />
                <span [innerHTML]="m.fullName | highlight: term()"></span>
              </a>
            </ng-template>
            <ng-template appCell="number" let-m>
              <span [innerHTML]="'#' + m.membershipNumber | highlight: term()"></span>
            </ng-template>
            <ng-template appCell="status" let-m><app-status-badge [status]="m.status" [highlight]="term()" /></ng-template>
            <ng-template appCell="branch" let-m>
              <span [innerHTML]="m.branchName | highlight: term()"></span>
            </ng-template>
            <ng-template appCell="lastVisit" let-m><span [innerHTML]="lastVisit(m.lastVisit) | highlight: term()"></span></ng-template>
            <ng-template appCell="actions" let-m>
              <app-row-menu [actions]="actionsFor(m)" [label]="m.fullName"
                            (view)="viewProfile(m)" (action)="onAction($event, m)" />
            </ng-template>
          </app-data-table>
          <app-paginator [total]="result()?.totalCount ?? 0" [page]="page()" [pageSize]="pageSize"
                         (pageChange)="page.set($event)" />
        }
      </section>
    </div>

    <app-member-filter-dialog [(open)]="filterOpen" [value]="filters()" [branches]="branches.branches()"
                              (filtersApplied)="applyFilters($event)" />
  `,
  styles: `
    .who { display: inline-flex; align-items: center; gap: 14px; color: var(--tf-text); text-decoration: none; }
    .who:hover span { text-decoration: underline; }
    .count { background: var(--tf-navy); color: #fff; border-radius: 999px; font-size: 12px; padding: 1px 7px; }
    .active-filters { display: flex; align-items: center; gap: 10px; margin: -12px 0 16px; flex-wrap: wrap; }
    .tag { background: var(--tf-navy-tint); color: var(--tf-navy); padding: 4px 12px; border-radius: 999px; font-size: 14px; }
  `,
})
export class MemberDirectory {
  private readonly members = inject(MemberService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly checkInDialog = inject(CheckInDialogService);
  private readonly checkIns = inject(CheckInService);
  private readonly memory = inject(ListMemoryService);
  private readonly search = inject(HeaderSearchService);
  protected readonly branches = inject(BranchService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly columns: TableColumn[] = [
    { key: 'name', label: 'Member Name', sortable: true },
    { key: 'number', label: 'ID', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'lastVisit', label: 'Last Visit', sortable: true },
    { key: 'actions', label: 'Actions', align: 'right', width: '90px' },
  ];

  protected readonly page = signal(1);
  protected readonly sort = signal<TableSort>(DEFAULT_SORT);
  protected readonly filters = signal<MemberFilters>({ status: null, branchId: null });
  protected readonly term = toSignal(toObservable(this.search.term).pipe(debounceTime(300)), {
    initialValue: this.search.term(),
  });

  protected readonly result = signal<PagedResult<Member> | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly filterOpen = signal(false);

  protected readonly activeFilterCount = computed(
    () => (this.filters().status ? 1 : 0) + (this.filters().branchId ? 1 : 0),
  );
  protected readonly emptyText = computed(() =>
    this.term() || this.activeFilterCount() ? 'No members match your search or filters.' : 'No members yet.',
  );

  private readonly state = computed<MemberQueryState>(() => ({
    term: this.term().trim(),
    page: this.page(),
    sort: this.sort(),
    filters: this.filters(),
  }));

  private lastTerm: string | null = null;

  constructor() {
    this.readUrl();

    effect(() => {
      const state = this.state();
      untracked(() => {
        if (this.lastTerm !== null && state.term !== this.lastTerm && state.page !== 1) {
          this.lastTerm = state.term;
          this.page.set(1);
          return;
        }
        this.lastTerm = state.term;
        this.writeUrl(state);
        this.load(state);
      });
    });

    effect(() => {
      if (this.checkIns.recorded()) untracked(() => this.reload());
    });
  }

  protected reload(): void {
    this.load(this.state());
  }

  protected applyFilters(filters: MemberFilters): void {
    this.filters.set(filters);
    this.page.set(1);
  }

  protected lastVisit(iso: string | null): string {
    return lastVisitLabel(iso);
  }

  protected actionsFor(m: Member): RowAction[] {
    const active = m.status === 'Active';
    const freezesLeft = (m.freezesRemaining ?? 0) > 0 && (m.freezeDaysRemaining ?? 0) > 0;
    const statusText = m.status === 'None' ? 'has no membership' : `is ${m.status.toLowerCase()}`;
    return [
      { id: 'view', label: 'View Profile' },
      {
        id: 'checkin',
        label: 'Check-In',
        disabled: !active,
        reason: `Only members with an active membership can check in — this member ${statusText}.`,
      },
      {
        id: 'freeze',
        label: 'Freeze Membership',
        disabled: !active || !freezesLeft,
        reason: !active
          ? `Only an active membership can be frozen — this member ${statusText}.`
          : 'No freezes remain on this membership.',
      },
    ];
  }

  protected viewProfile(m: Member): void {
    this.router.navigate(['/members', m.id]);
  }

  protected onAction(id: string, m: Member): void {
    if (id === 'checkin') this.checkInDialog.open(m).subscribe();
    if (id === 'freeze') this.router.navigate(['/members', m.id, 'freeze'], { queryParams: { from: 'list' } });
  }

  protected addMember(): void {
    openMemberForm(this.dialog).subscribe((id) => {
      if (id) this.reload();
    });
  }

  private load(state: MemberQueryState): void {
    this.loading.set(true);
    this.members
      .list(
        {
          search: state.term,
          status: state.filters.status,
          branchId: state.filters.branchId,
          sortBy: state.sort.by,
          sortDir: state.sort.dir,
          page: state.page,
          pageSize: PAGE_SIZE,
        },
        listLoad(() => this.reload()),
      )
      .subscribe({
        next: (r) => {
          this.result.set(r);
          this.loading.set(false);
          this.failed.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  private readUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('q')) this.search.set(q.get('q')!);
    this.page.set(Math.max(1, Number(q.get('page')) || 1));
    if (q.get('sort')) this.sort.set({ by: q.get('sort')!, dir: q.get('dir') === 'desc' ? 'desc' : 'asc' });
    this.filters.set({ status: (q.get('status') as MemberStatus) || null, branchId: q.get('branch') || null });
  }

  private writeUrl(s: MemberQueryState): void {
    const queryParams = {
      q: s.term || null,
      page: s.page > 1 ? s.page : null,
      sort: s.sort.by !== DEFAULT_SORT.by || s.sort.dir !== DEFAULT_SORT.dir ? s.sort.by : null,
      dir: s.sort.by !== DEFAULT_SORT.by || s.sort.dir !== DEFAULT_SORT.dir ? s.sort.dir : null,
      status: s.filters.status,
      branch: s.filters.branchId,
    };
    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    this.router.navigateByUrl(tree, { replaceUrl: true });
    this.memory.remember('members', this.router.serializeUrl(tree));
  }
}
