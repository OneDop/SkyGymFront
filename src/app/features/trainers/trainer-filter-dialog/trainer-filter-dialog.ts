import { Component, computed, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BranchSummary } from '../../../core/models/api.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';

export interface TrainerFilters {
  branchIds: string[];
  specialties: string[];
  active: boolean;
  inactive: boolean;
}

export const NO_TRAINER_FILTERS: TrainerFilters = { branchIds: [], specialties: [], active: false, inactive: false };

@Component({
  selector: 'app-trainer-filter-dialog',
  imports: [FormsModule, MatAutocompleteModule, MatCheckboxModule, MatChipsModule, MatIconModule, MatInputModule,
    MatSelectModule, Modal, AutofocusDirective],
  template: `
    <app-modal title="Filter Trainers" [(open)]="open" width="520px">
      <div class="field">
        <label class="field-label" for="tf-branch">Branch</label>
        <mat-form-field>
          <mat-select id="tf-branch" multiple placeholder="All branches" [ngModel]="branchIds()"
                      (ngModelChange)="branchIds.set($event)" appAutofocus>
            @for (b of branches(); track b.id) { <mat-option [value]="b.id">{{ b.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="field">
        <label class="field-label" for="tf-spec">Specialty</label>
        <mat-form-field>
          <mat-chip-grid #chips aria-label="Chosen specialties">
            @for (s of specialties(); track s) {
              <mat-chip-row (removed)="removeSpecialty(s)">{{ s }}
                <button matChipRemove [attr.aria-label]="'Remove ' + s"><mat-icon>cancel</mat-icon></button>
              </mat-chip-row>
            }
            <input id="tf-spec" [placeholder]="specialties().length ? '' : 'All specialties'" [matChipInputFor]="chips"
                   [matAutocomplete]="auto" [ngModel]="typed()" (ngModelChange)="typed.set($event)" />
          </mat-chip-grid>
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="addSpecialty($event.option.value)">
            @for (s of suggestions(); track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-autocomplete>
        </mat-form-field>
      </div>

      <div class="field">
        <span class="field-label">Status</span>
        <div class="checks">
          <mat-checkbox [ngModel]="active()" (ngModelChange)="active.set($event)">Active</mat-checkbox>
          <mat-checkbox [ngModel]="inactive()" (ngModelChange)="inactive.set($event)">Inactive</mat-checkbox>
        </div>
      </div>

      <ng-container modal-actions>
        <button type="button" class="btn btn-outline" (click)="reset()">Clear</button>
        <button type="button" class="btn btn-primary" (click)="apply()">Apply Filters</button>
      </ng-container>
    </app-modal>
  `,
  styles: `.checks { display: flex; gap: 24px; } .field + .field { margin-top: 14px; }`,
})
export class TrainerFilterDialog {
  readonly open = model(false);
  readonly value = input.required<TrainerFilters>();
  readonly branches = input.required<BranchSummary[]>();
  readonly specialtyOptions = input.required<string[]>();
  readonly filtersApplied = output<TrainerFilters>();

  protected readonly branchIds = signal<string[]>([]);
  protected readonly specialties = signal<string[]>([]);
  protected readonly active = signal(false);
  protected readonly inactive = signal(false);
  protected readonly typed = signal('');

  protected readonly suggestions = computed(() => {
    const t = (this.typed() ?? '').toString().toLowerCase();
    return this.specialtyOptions().filter((s) => !this.specialties().includes(s) && s.toLowerCase().includes(t));
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const v = this.value();
      this.branchIds.set([...v.branchIds]);
      this.specialties.set([...v.specialties]);
      this.active.set(v.active);
      this.inactive.set(v.inactive);
      this.typed.set('');
    });
  }

  protected addSpecialty(s: string): void {
    this.specialties.update((list) => [...list, s]);
    this.typed.set('');
  }

  protected removeSpecialty(s: string): void {
    this.specialties.update((list) => list.filter((x) => x !== s));
  }

  protected reset(): void {
    this.branchIds.set([]);
    this.specialties.set([]);
    this.active.set(false);
    this.inactive.set(false);
  }

  protected apply(): void {
    this.filtersApplied.emit({
      branchIds: this.branchIds(),
      specialties: this.specialties(),
      active: this.active(),
      inactive: this.inactive(),
    });
    this.open.set(false);
  }
}
