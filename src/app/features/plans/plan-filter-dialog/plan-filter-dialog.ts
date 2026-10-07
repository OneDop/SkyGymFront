import { CurrencyPipe } from '@angular/common';
import { Component, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { AccessScope, PlanFilterOptions } from '../../../core/models/api.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';

export interface PlanFilters {
  durations: number[];
  accessScope: AccessScope | null;
  minPrice: number | null;
  maxPrice: number | null;
  published: boolean;
  retired: boolean;
}

export const NO_PLAN_FILTERS: PlanFilters = {
  durations: [], accessScope: null, minPrice: null, maxPrice: null, published: false, retired: false,
};

@Component({
  selector: 'app-plan-filter-dialog',
  imports: [CurrencyPipe, FormsModule, MatCheckboxModule, MatChipsModule, MatInputModule, MatRadioModule, MatSliderModule,
    Modal, AutofocusDirective],
  template: `
    <app-modal title="Filter Plans" [(open)]="open" width="560px">
      <div class="field">
        <span class="field-label">Duration</span>
        <mat-chip-listbox multiple aria-label="Duration" [ngModel]="durations()" (ngModelChange)="durations.set($event)">
          @for (d of options().durations; track d; let first = $first) {
            <mat-chip-option [value]="d" [appAutofocus]="first">{{ d }} {{ d === 1 ? 'month' : 'months' }}</mat-chip-option>
          } @empty {
            <span class="muted">No plans yet.</span>
          }
        </mat-chip-listbox>
      </div>

      <div class="field">
        <span class="field-label">Access</span>
        <mat-radio-group class="radios" aria-label="Access" [ngModel]="accessScope()" (ngModelChange)="accessScope.set($event)">
          <mat-radio-button [value]="null">Any</mat-radio-button>
          <mat-radio-button value="AllBranches">All branches (full access)</mat-radio-button>
          <mat-radio-button value="HomeBranchOnly">Home branch only</mat-radio-button>
        </mat-radio-group>
      </div>

      <div class="field">
        <span class="field-label">Price range (USD)</span>
        <div class="range">
          <mat-form-field>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" min="0" placeholder="Min" aria-label="Minimum price"
                   [ngModel]="minPrice()" (ngModelChange)="minPrice.set(toNumber($event))" />
          </mat-form-field>
          <span>–</span>
          <mat-form-field>
            <span matTextPrefix>$&nbsp;</span>
            <input matInput type="number" min="0" placeholder="Max" aria-label="Maximum price"
                   [ngModel]="maxPrice()" (ngModelChange)="maxPrice.set(toNumber($event))" />
          </mat-form-field>
        </div>
        @if (options().maxPrice > options().minPrice) {
          <mat-slider [min]="options().minPrice" [max]="options().maxPrice" step="1" discrete>
            <input matSliderStartThumb aria-label="Minimum price" [ngModel]="minPrice() ?? options().minPrice"
                   (ngModelChange)="minPrice.set($event === options().minPrice ? null : $event)" />
            <input matSliderEndThumb aria-label="Maximum price" [ngModel]="maxPrice() ?? options().maxPrice"
                   (ngModelChange)="maxPrice.set($event === options().maxPrice ? null : $event)" />
          </mat-slider>
          <div class="bounds">
            <span>{{ options().minPrice | currency: 'USD' : 'symbol' : '1.0-0' }}</span>
            <span>{{ options().maxPrice | currency: 'USD' : 'symbol' : '1.0-0' }}</span>
          </div>
        }
      </div>

      <div class="field">
        <span class="field-label">Status</span>
        <div class="checks">
          <mat-checkbox [ngModel]="published()" (ngModelChange)="published.set($event)">Published</mat-checkbox>
          <mat-checkbox [ngModel]="retired()" (ngModelChange)="retired.set($event)">Retired</mat-checkbox>
        </div>
      </div>

      <ng-container modal-actions>
        <button type="button" class="btn btn-outline" (click)="reset()">Clear</button>
        <button type="button" class="btn btn-primary" (click)="apply()">Apply Filters</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .field + .field { margin-top: 18px; }
    .radios { display: flex; flex-direction: column; }
    .range { display: flex; align-items: center; gap: 12px; }
    .range mat-form-field { flex: 1; }
    mat-slider { width: 100%; margin: 4px 0 0; }
    .bounds { display: flex; justify-content: space-between; color: var(--tf-muted); font-size: 13px; }
    .checks { display: flex; gap: 24px; }
    .muted { color: var(--tf-muted); }
  `,
})
export class PlanFilterDialog {
  readonly open = model(false);
  readonly value = input.required<PlanFilters>();
  readonly options = input.required<PlanFilterOptions>();
  readonly filtersApplied = output<PlanFilters>();

  protected readonly durations = signal<number[]>([]);
  protected readonly accessScope = signal<AccessScope | null>(null);
  protected readonly minPrice = signal<number | null>(null);
  protected readonly maxPrice = signal<number | null>(null);
  protected readonly published = signal(false);
  protected readonly retired = signal(false);

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const v = this.value();
      this.durations.set([...v.durations]);
      this.accessScope.set(v.accessScope);
      this.minPrice.set(v.minPrice);
      this.maxPrice.set(v.maxPrice);
      this.published.set(v.published);
      this.retired.set(v.retired);
    });
  }

  protected toNumber(v: unknown): number | null {
    return v === null || v === '' || v === undefined || Number.isNaN(Number(v)) ? null : Number(v);
  }

  protected reset(): void {
    this.durations.set([]);
    this.accessScope.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.published.set(false);
    this.retired.set(false);
  }

  protected apply(): void {
    let min = this.minPrice();
    let max = this.maxPrice();
    if (min !== null && max !== null && min > max) [min, max] = [max, min];
    this.filtersApplied.emit({
      durations: this.durations(),
      accessScope: this.accessScope(),
      minPrice: min,
      maxPrice: max,
      published: this.published(),
      retired: this.retired(),
    });
    this.open.set(false);
  }
}
