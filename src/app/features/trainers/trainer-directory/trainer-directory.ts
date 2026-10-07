import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime } from 'rxjs';
import { PagedResult, Trainer } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { HeaderSearchService } from '../../../core/services/header-search.service';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { listLoad } from '../../../core/http/request-context';
import { TrainerService } from '../trainer.service';
import { NO_TRAINER_FILTERS, TrainerFilterDialog, TrainerFilters } from '../trainer-filter-dialog/trainer-filter-dialog';
import { CellDef, DataTable, TableColumn, TableSort } from '../../../shared/components/data-table/data-table';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { RowAction, RowMenu } from '../../../shared/components/row-menu/row-menu';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';

const PAGE_SIZE = 20;
const DEFAULT_SORT: TableSort = { by: 'name', dir: 'asc' };

interface TrainerListState {
  term: string;
  page: number;
  sort: TableSort;
  filters: TrainerFilters;
}

@Component({
  selector: 'app-trainer-directory',
  imports: [RouterLink, MatIconModule, DataTable, CellDef, Paginator, RowMenu, StatusBadge, StateMessage, Avatar,
    HighlightPipe, TrainerFilterDialog],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1 class="page-title">Trainer Directory</h1>
          <p class="page-subtitle">Manage and view all trainers.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-outline" (click)="filterOpen.set(true)">
            <mat-icon>filter_list</mat-icon> Filter
            @if (filterCount()) { <span class="count">{{ filterCount() }}</span> }
          </button>
          <a routerLink="/trainers/new" class="btn btn-primary"><mat-icon>add</mat-icon> Add Trainer</a>
        </div>
      </div>

      @if (filterCount()) {
        <div class="active-filters">
          @for (id of filters().branchIds; track id) { <span class="tag">{{ branches.nameOf(id) }}</span> }
          @for (s of filters().specialties; track s) { <span class="tag">{{ s }}</span> }
          @if (filters().active !== filters().inactive) { <span class="tag">{{ filters().active ? 'Active' : 'Inactive' }}</span> }
          <button type="button" class="btn-link" (click)="applyFilters(none)">Clear filters</button>
        </div>
      }

      <section class="card">
        @if (failed()) {
          <app-state-message icon="cloud_off" title="Trainers could not be loaded" actionLabel="Retry" (act)="reload()" />
        } @else {
          <app-data-table [columns]="columns" [rows]="result()?.items ?? []" [(sort)]="sort" [loading]="loading()"
                          [emptyText]="term() || filterCount() ? 'No trainers match your search or filters.' : 'No trainers yet.'">
            <ng-template appCell="name" let-t>
              <a class="who" [routerLink]="['/trainers', t.id]">
                <app-avatar [name]="t.fullName" [size]="42" />
                <span [innerHTML]="t.fullName | highlight: term()"></span>
              </a>
            </ng-template>
            <ng-template appCell="number" let-t><span [innerHTML]="'#' + t.trainerNumber | highlight: term()"></span></ng-template>
            <ng-template appCell="specialty" let-t>
              <span [innerHTML]="(t.specialty ?? '—') | highlight: term()"></span>
            </ng-template>
            <ng-template appCell="branch" let-t><span [innerHTML]="t.branchName | highlight: term()"></span></ng-template>
            <ng-template appCell="status" let-t>
              <app-status-badge [status]="t.isActive ? 'Active' : 'Inactive'" [highlight]="term()" />
            </ng-template>
            <ng-template appCell="actions" let-t>
              <app-row-menu [actions]="rowActions" [label]="t.fullName" (view)="view(t)" (edit)="update(t)" />
            </ng-template>
          </app-data-table>
          <app-paginator [total]="result()?.totalCount ?? 0" [page]="page()" [pageSize]="pageSize" (pageChange)="page.set($event)" />
        }
      </section>
    </div>

    <app-trainer-filter-dialog [(open)]="filterOpen" [value]="filters()" [branches]="branches.branches()"
                               [specialtyOptions]="specialtyOptions()" (filtersApplied)="applyFilters($event)" />
  `,
  styles: `
    .who { display: inline-flex; align-items: center; gap: 14px; color: var(--tf-text); text-decoration: none; }
    .who:hover span { text-decoration: underline; }
    .count { background: var(--tf-navy); color: #fff; border-radius: 999px; font-size: 12px; padding: 1px 7px; }
    .active-filters { display: flex; align-items: center; gap: 10px; margin: -12px 0 16px; flex-wrap: wrap; }
    .tag { background: var(--tf-navy-tint); color: var(--tf-navy); padding: 4px 12px; border-radius: 999px; font-size: 14px; }
  `,
})
export class TrainerDirectory {
  private readonly trainers = inject(TrainerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly memory = inject(ListMemoryService);
  private readonly search = inject(HeaderSearchService);
  protected readonly branches = inject(BranchService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly none = NO_TRAINER_FILTERS;
  protected readonly columns: TableColumn[] = [
    { key: 'name', label: 'Trainer Name', sortable: true },
    { key: 'number', label: 'ID', sortable: true },
    { key: 'specialty', label: 'Specialty', sortable: true },
    { key: 'branch', label: 'Branch', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'actions', label: 'Actions', align: 'right', width: '90px' },
  ];
  protected readonly rowActions: RowAction[] = [
    { id: 'view', label: 'View Trainer' },
    { id: 'edit', label: 'Update Trainer' },
  ];

  protected readonly page = signal(1);
  protected readonly sort = signal<TableSort>(DEFAULT_SORT);
  protected readonly filters = signal<TrainerFilters>(NO_TRAINER_FILTERS);
  protected readonly term = toSignal(toObservable(this.search.term).pipe(debounceTime(300)), {
    initialValue: this.search.term(),
  });
  protected readonly specialtyOptions = signal<string[]>([]);

  protected readonly result = signal<PagedResult<Trainer> | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly filterOpen = signal(false);

  protected readonly filterCount = computed(() => {
    const f = this.filters();
    return f.branchIds.length + f.specialties.length + (f.active !== f.inactive ? 1 : 0);
  });

  private readonly state = computed<TrainerListState>(() => ({
    term: this.term().trim(),
    page: this.page(),
    sort: this.sort(),
    filters: this.filters(),
  }));
  private lastTerm: string | null = null;

  constructor() {
    this.readUrl();
    this.trainers.specialties().subscribe({ next: (r) => this.specialtyOptions.set(r.specialties), error: () => {} });

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
  }

  protected reload(): void {
    this.load(this.state());
  }

  protected applyFilters(f: TrainerFilters): void {
    this.filters.set(f);
    this.page.set(1);
  }

  protected view(t: Trainer): void {
    this.router.navigate(['/trainers', t.id]);
  }

  protected update(t: Trainer): void {
    this.router.navigate(['/trainers', t.id, 'edit']);
  }

  private load(s: TrainerListState): void {
    this.loading.set(true);
    const f = s.filters;
    this.trainers
      .list(
        {
          search: s.term,
          branchIds: f.branchIds,
          specialties: f.specialties,
          isActive: f.active === f.inactive ? null : f.active,
          sortBy: s.sort.by,
          sortDir: s.sort.dir,
          page: s.page,
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
    const status = q.get('status');
    this.filters.set({
      branchIds: q.getAll('branch'),
      specialties: q.getAll('specialty'),
      active: status === 'active',
      inactive: status === 'inactive',
    });
  }

  private writeUrl(s: TrainerListState): void {
    const custom = s.sort.by !== DEFAULT_SORT.by || s.sort.dir !== DEFAULT_SORT.dir;
    const f = s.filters;
    const queryParams = {
      q: s.term || null,
      page: s.page > 1 ? s.page : null,
      sort: custom ? s.sort.by : null,
      dir: custom ? s.sort.dir : null,
      branch: f.branchIds.length ? f.branchIds : null,
      specialty: f.specialties.length ? f.specialties : null,
      status: f.active === f.inactive ? null : f.active ? 'active' : 'inactive',
    };
    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    this.router.navigateByUrl(tree, { replaceUrl: true });
    this.memory.remember('trainers', this.router.serializeUrl(tree));
  }
}
