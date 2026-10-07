import { Component, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { BranchSummary, MemberStatus } from '../../../core/models/api.models';
import { Modal } from '../../../shared/components/modal/modal';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';

export interface MemberFilters {
  status: MemberStatus | null;
  branchId: string | null;
}

@Component({
  selector: 'app-member-filter-dialog',
  imports: [FormsModule, MatRadioModule, MatSelectModule, Modal, AutofocusDirective],
  template: `
    <app-modal title="Filter Members" [(open)]="open" width="460px">
      <div class="field">
        <span class="field-label">Status</span>
        <mat-radio-group class="radios" [ngModel]="status()" (ngModelChange)="status.set($event)" aria-label="Status">
          <mat-radio-button [value]="null" appAutofocus>Any</mat-radio-button>
          @for (s of statuses; track s.value) {
            <mat-radio-button [value]="s.value">{{ s.label }}</mat-radio-button>
          }
        </mat-radio-group>
      </div>
      <div class="field">
        <label class="field-label" for="f-branch">Branch</label>
        <mat-form-field>
          <mat-select id="f-branch" [ngModel]="branchId()" (ngModelChange)="branchId.set($event)">
            <mat-option [value]="null">All Branches</mat-option>
            @for (b of branches(); track b.id) { <mat-option [value]="b.id">{{ b.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
      <ng-container modal-actions>
        <button type="button" class="btn btn-outline" (click)="reset()">Clear</button>
        <button type="button" class="btn btn-primary" (click)="apply()">Apply Filters</button>
      </ng-container>
    </app-modal>
  `,
  styles: `
    .radios { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 16px; }
  `,
})
export class MemberFilterDialog {
  readonly open = model(false);
  readonly value = input.required<MemberFilters>();
  readonly branches = input.required<BranchSummary[]>();
  readonly filtersApplied = output<MemberFilters>();

  protected readonly status = signal<MemberStatus | null>(null);
  protected readonly branchId = signal<string | null>(null);

  protected readonly statuses: { value: MemberStatus; label: string }[] = [
    { value: 'Active', label: 'Active' },
    { value: 'Frozen', label: 'Frozen' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Expired', label: 'Expired' },
    { value: 'None', label: 'No plan' },
  ];

  constructor() {
    effect(() => {
      if (this.open()) {
        this.status.set(this.value().status);
        this.branchId.set(this.value().branchId);
      }
    });
  }

  protected reset(): void {
    this.status.set(null);
    this.branchId.set(null);
  }

  protected apply(): void {
    this.filtersApplied.emit({ status: this.status(), branchId: this.branchId() });
    this.open.set(false);
  }
}
