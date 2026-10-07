import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CheckInOutcome, Member } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { ToastService } from '../../../core/services/toast.service';
import { CheckInService } from '../check-in.service';
import { MemberSearch } from '../../members/member-search/member-search';
import { addDays, formatMinutes, minutesNowRoundedDown, startOfDay, toLocalDateTime } from '../../../shared/utils/dates';
import { applyServerErrors, errorText } from '../../../shared/utils/form-errors';

export interface NewCheckInData {
  member?: Member;
}

const STEP = 5;
const ALL_TIMES = Array.from({ length: (24 * 60) / STEP }, (_, i) => i * STEP);

function notInFuture(group: AbstractControl): ValidationErrors | null {
  const date = group.get('date')?.value as Date | null;
  const minutes = group.get('time')?.value as number | null;
  if (!date || minutes === null) return null;
  const at = startOfDay(date);
  at.setMinutes(minutes);
  return at.getTime() > Date.now() ? { future: true } : null;
}

@Component({
  selector: 'app-new-check-in-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatDatepickerModule, MatInputModule, MatSelectModule,
    MatIconModule, MemberSearch],
  template: `
    <h2 mat-dialog-title>New Check-in</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form" id="checkin-form" (ngSubmit)="save()">
        <div class="field">
          <span class="field-label">Member<span class="req">*</span></span>
          <app-member-search [member]="member()" (memberChange)="setMember($event)"
                             [locked]="!!data.member" [autofocus]="!data.member" />
          @if (memberError()) { <span class="field-error">{{ memberError() }}</span> }
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label" for="ci-date">Check-in date<span class="req">*</span></label>
            <mat-form-field>
              <input matInput id="ci-date" [matDatepicker]="picker" formControlName="date"
                     [min]="minDate" [max]="today" placeholder="mm/dd/yyyy" />
              <mat-datepicker-toggle matIconSuffix [for]="picker" />
              <mat-datepicker #picker />
            </mat-form-field>
            @if (dateError()) { <span class="field-error">{{ dateError() }}</span> }
          </div>

          <div class="field">
            <label class="field-label" for="ci-time">Check-in time<span class="req">*</span></label>
            <mat-form-field>
              <mat-select id="ci-time" formControlName="time" placeholder="hh:mm AM">
                @for (t of timeOptions(); track t) {
                  <mat-option [value]="t">{{ label(t) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (form.hasError('future')) {
              <span class="field-error">Check-in date and time cannot be in the future.</span>
            }
          </div>
        </div>

        <div class="field">
          <span class="field-label">Branch</span>
          <span class="readonly-value">{{ branches.current()?.name }}</span>
        </div>

        <div class="field">
          <label class="field-label" for="ci-notes">Notes</label>
          <mat-form-field>
            <textarea matInput id="ci-notes" formControlName="notes" rows="3" maxlength="250"
                      placeholder="Optional"></textarea>
            <mat-hint align="end">{{ form.controls.notes.value.length }} / 250</mat-hint>
          </mat-form-field>
        </div>

        @if (refusal(); as r) {
          <div class="refused" role="alert">
            <mat-icon>block</mat-icon>
            <div><strong>Entry refused</strong><br />{{ r }} The attempt has been recorded.</div>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (refusal()) {
        <button type="button" class="btn btn-primary" mat-dialog-close>Close</button>
      } @else {
        <button type="button" class="btn btn-outline" mat-dialog-close>Cancel</button>
        <button type="submit" form="checkin-form" class="btn btn-primary" [disabled]="saving()">
          <mat-icon>login</mat-icon> {{ saving() ? 'Saving…' : 'Confirm Check-in' }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .form { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .refused { display: flex; gap: 12px; padding: 14px 16px; background: var(--tf-red-bg);
      border: 1px solid var(--tf-red-border); color: var(--tf-red); }
    @media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
  `,
})
export class NewCheckInDialog {
  protected readonly data = inject<NewCheckInData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<NewCheckInDialog, CheckInOutcome>);
  private readonly checkIns = inject(CheckInService);
  protected readonly branches = inject(BranchService);
  private readonly toast = inject(ToastService);

  protected readonly today = startOfDay(new Date());
  protected readonly minDate = addDays(this.today, -7);

  protected readonly member = signal<Member | null>(this.data.member ?? null);
  protected readonly saving = signal(false);
  protected readonly refusal = signal<string | null>(null);
  private readonly submitted = signal(false);

  protected readonly form = new FormGroup(
    {
      date: new FormControl<Date | null>(this.today, Validators.required),
      time: new FormControl<number | null>(minutesNowRoundedDown(STEP), Validators.required),
      notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(250)] }),
    },
    { validators: notInFuture },
  );

  private readonly dateValue = toSignal(this.form.controls.date.valueChanges, { initialValue: this.today });

  protected readonly timeOptions = computed(() => {
    const date = this.dateValue();
    if (!date || startOfDay(date).getTime() !== this.today.getTime()) return ALL_TIMES;
    const latest = minutesNowRoundedDown(STEP);
    return ALL_TIMES.filter((t) => t <= latest);
  });

  protected readonly memberError = computed(() =>
    this.submitted() && !this.member() ? 'Choose a member.' : null,
  );

  protected dateError(): string | null {
    const c = this.form.controls.date;
    if (c.hasError('matDatepickerMax')) return 'Check-in date cannot be in the future.';
    if (c.hasError('matDatepickerMin')) return 'Check-in date cannot be older than 7 days.';
    if (c.hasError('matDatepickerParse')) return 'Enter a valid date (mm/dd/yyyy).';
    return errorText(c, 'Check-in date');
  }

  protected label(minutes: number): string {
    return formatMinutes(minutes);
  }

  protected setMember(m: Member | null): void {
    this.member.set(m);
  }

  protected save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const member = this.member();
    const branchId = this.branches.currentId();
    const { date, time, notes } = this.form.getRawValue();
    if (!member || !branchId || this.form.invalid || !date || time === null) return;

    const at = startOfDay(date);
    at.setMinutes(time);

    this.saving.set(true);
    this.checkIns
      .record({ memberId: member.id, branchId, occurredAt: toLocalDateTime(at), notes: notes.trim() || null })
      .subscribe({
        next: (outcome) => {
          this.saving.set(false);
          if (outcome.admitted) {
            this.toast.success(`${member.fullName} checked in at ${formatMinutes(time)}`);
            this.ref.close(outcome);
          } else {
            this.refusal.set(outcome.refusalReason ?? 'The member has no active membership.');
          }
        },
        error: (err) => {
          this.saving.set(false);
          applyServerErrors(this.form, err, { OccurredAt: 'date', MemberId: 'date' });
        },
      });
  }
}
