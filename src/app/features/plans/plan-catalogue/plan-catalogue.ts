import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime } from 'rxjs';
import { AccessScope, PagedResult, Plan, PlanFilterOptions } from '../../../core/models/api.models';
import { HeaderSearchService } from '../../../core/services/header-search.service';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { listLoad } from '../../../core/http/request-context';
import { PlanService } from '../plan.service';
import { NO_PLAN_FILTERS, PlanFilterDialog, PlanFilters } from '../plan-filter-dialog/plan-filter-dialog';
import { CellDef, DataTable, TableColumn, TableSort } from '../../../shared/components/data-table/data-table';
import { Paginator } from '../../../shared/components/paginator/paginator';
import { RowAction, RowMenu } from '../../../shared/components/row-menu/row-menu';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { FreezeAllowancePipe } from '../../../shared/pipes/freeze-allowance.pipe';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';

const PAGE_SIZE = 20;
const DEFAULT_SORT: TableSort = { by: 'name', dir: 'asc' };

interface PlanListState {
  term: string;
  page: number;
  sort: TableSort;
  filters: PlanFilters;
}

@Component({
  selector: 'app-plan-catalogue',
  imports: [CurrencyPipe, RouterLink, MatIconModule, DataTable, CellDef, Paginator, RowMenu, StatusBadge, StateMessage,
    FreezeAllowancePipe, HighlightPipe, PlanFilterDialog],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1 class="page-title">Plan Catalogue</h1>
          <p class="page-subtitle">Manage and view all membership plans.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-outline" (click)="filterOpen.set(true)">
            <mat-icon>filter_list</mat-icon> Filter
            @if (filterCount()) { <span class="count">{{ filterCount() }}</span> }
          </button>
          <a routerLink="/plans/new" class="btn btn-primary"><mat-icon>add</mat-icon> Add Plan</a>
        </div>
      </div>

      @if (filterCount()) {
        <div class="active-filters">
          @for (d of filters().durations; track d) { <span class="tag">{{ d }} {{ d === 1 ? 'month' : 'months' }}</span> }
          @if (filters().accessScope; as a) { <span class="tag">{{ accessLabel(a) }}</span> }
          @if (filters().minPrice !== null || filters().maxPrice !== null) {
            <span class="tag">{{ priceRange() }}</span>
          }
          @if (filters().published !== filters().retired) { <span class="tag">{{ filters().published ? 'Published' : 'Retired' }}</span> }
          <button type="button" class="btn-link" (click)="applyFilters(none)">Clear filters</button>
        </div>
      }

      <section class="card">
        @if (failed()) {
          <app-state-message icon="cloud_off" title="Plans could not be loaded" actionLabel="Retry" (act)="reload()" />
        } @else {
          <app-data-table [columns]="columns" [rows]="result()?.items ?? []" [(sort)]="sort" [loading]="loading()"
                          [emptyText]="term() || filterCount() ? 'No plans match your search or filters.' : 'No plans yet.'">
            <ng-template appCell="name" let-p>
              <a class="name" [routerLink]="['/plans', p.id]" [innerHTML]="p.name | highlight: term()"></a>
            </ng-template>
            <ng-template appCell="price" let-p><span [innerHTML]="(p.price | currency: 'USD') | highlight: term()"></span></ng-template>
            <ng-template appCell="duration" let-p>
              <span [innerHTML]="p.durationInMonths + (p.durationInMonths === 1 ? ' month' : ' months') | highlight: term()"></span>
            </ng-template>
            <ng-template appCell="freeze" let-p>
              <span [innerHTML]="(p.maxFreezeDays | freezeAllowance: p.maxFreezeCount) | highlight: term()"></span>
            </ng-template>
            <ng-template appCell="guestPasses" let-p><span [innerHTML]="p.guestPassQuota | highlight: term()"></span></ng-template>
            <ng-template appCell="access" let-p><span [innerHTML]="accessLabel(p.accessScope) | highlight: term()"></span></ng-template>
            <ng-template appCell="status" let-p>
              <app-status-badge [status]="p.isPublished ? 'Published' : 'Retired'" [highlight]="term()" />
            </ng-template>
            <ng-template appCell="actions" let-p>
              <app-row-menu [actions]="rowActions" [label]="p.name" (view)="view(p)" (edit)="update(p)" />
            </ng-template>
          </app-data-table>
          <app-paginator [total]="result()?.totalCount ?? 0" [page]="page()" [pageSize]="pageSize" (pageChange)="page.set($event)" />
        }
      </section>
    </div>

    <app-plan-filter-dialog [(open)]="filterOpen" [value]="filters()" [options]="options()"
                            (filtersApplied)="applyFilters($event)" />
  `,
  styles: `
    .name { color: var(--tf-text); text-decoration: none; }
    .name:hover { text-decoration: underline; }
    .count { background: var(--tf-navy); color: #fff; border-radius: 999px; font-size: 12px; padding: 1px 7px; }
    .active-filters { display: flex; align-items: center; gap: 10px; margin: -12px 0 16px; flex-wrap: wrap; }
    .tag { background: var(--tf-navy-tint); color: var(--tf-navy); padding: 4px 12px; border-radius: 999px; font-size: 14px; }
  `,
})
export class PlanCatalogue {
  private readonly plans = inject(PlanService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly memory = inject(ListMemoryService);
  private readonly search = inject(HeaderSearchService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly none = NO_PLAN_FILTERS;
  protected readonly columns: TableColumn[] = [
    { key: 'name', label: 'Plan Name', sortable: true },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'duration', label: 'Duration', sortable: true },
    { key: 'freeze', label: 'Freeze Allowance' },
    { key: 'guestPasses', label: 'Guest Passes', sortable: true },
    { key: 'access', label: 'Access', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'actions', label: 'Actions', align: 'right', width: '90px' },
  ];
  protected readonly rowActions: RowAction[] = [
    { id: 'view', label: 'View Plan' },
    { id: 'edit', label: 'Update Plan' },
  ];

  protected readonly page = signal(1);
  protected readonly sort = signal<TableSort>(DEFAULT_SORT);
  protected readonly filters = signal<PlanFilters>(NO_PLAN_FILTERS);
  protected readonly term = toSignal(toObservable(this.search.term).pipe(debounceTime(300)), {
    initialValue: this.search.term(),
  });
  protected readonly options = signal<PlanFilterOptions>({ durations: [], minPrice: 0, maxPrice: 0 });

  protected readonly result = signal<PagedResult<Plan> | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly filterOpen = signal(false);

  protected readonly filterCount = computed(() => {
    const f = this.filters();
    return f.durations.length + (f.accessScope ? 1 : 0) + (f.minPrice !== null || f.maxPrice !== null ? 1 : 0)
      + (f.published !== f.retired ? 1 : 0);
  });

  protected readonly priceRange = computed(() => {
    const { minPrice, maxPrice } = this.filters();
    if (minPrice !== null && maxPrice !== null) return `$${minPrice} – $${maxPrice}`;
    return minPrice !== null ? `From $${minPrice}` : `Up to $${maxPrice}`;
  });

  private readonly state = computed<PlanListState>(() => ({
    term: this.term().trim(),
    page: this.page(),
    sort: this.sort(),
    filters: this.filters(),
  }));
  private lastTerm: string | null = null;

  constructor() {
    this.readUrl();
    this.plans.filterOptions().subscribe({ next: (o) => this.options.set(o), error: () => {} });

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

  protected accessLabel(a: AccessScope): string {
    return a === 'AllBranches' ? 'All branches' : 'Home branch only';
  }

  protected reload(): void {
    this.load(this.state());
  }

  protected applyFilters(f: PlanFilters): void {
    this.filters.set(f);
    this.page.set(1);
  }

  protected view(p: Plan): void {
    this.router.navigate(['/plans', p.id]);
  }

  protected update(p: Plan): void {
    this.router.navigate(['/plans', p.id, 'edit']);
  }

  private load(s: PlanListState): void {
    this.loading.set(true);
    const f = s.filters;
    this.plans
      .list(
        {
          search: s.term,
          durations: f.durations,
          accessScope: f.accessScope,
          minPrice: f.minPrice,
          maxPrice: f.maxPrice,
          isPublished: f.published === f.retired ? null : f.published,
          sortBy: s.sort.by === 'guestPasses' ? 'guestpasses' : s.sort.by,
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
    const num = (k: string) => (q.get(k) !== null && q.get(k) !== '' ? Number(q.get(k)) : null);
    const status = q.get('status');
    this.filters.set({
      durations: q.getAll('duration').map(Number).filter((n) => !Number.isNaN(n)),
      accessScope: (q.get('access') as AccessScope) || null,
      minPrice: num('min'),
      maxPrice: num('max'),
      published: status === 'published',
      retired: status === 'retired',
    });
  }

  private writeUrl(s: PlanListState): void {
    const custom = s.sort.by !== DEFAULT_SORT.by || s.sort.dir !== DEFAULT_SORT.dir;
    const f = s.filters;
    const queryParams = {
      q: s.term || null,
      page: s.page > 1 ? s.page : null,
      sort: custom ? s.sort.by : null,
      dir: custom ? s.sort.dir : null,
      duration: f.durations.length ? f.durations : null,
      access: f.accessScope,
      min: f.minPrice,
      max: f.maxPrice,
      status: f.published === f.retired ? null : f.published ? 'published' : 'retired',
    };
    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams });
    this.router.navigateByUrl(tree, { replaceUrl: true });
    this.memory.remember('plans', this.router.serializeUrl(tree));
  }
}
