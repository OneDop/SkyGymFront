import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { Member, MembershipDetail, Plan } from '../../../core/models/api.models';
import { ToastService } from '../../../core/services/toast.service';
import { MemberService, PlanChangeTiming } from '../member.service';
import { PlanService } from '../../plans/plan.service';
import { FreezeAllowancePipe } from '../../../shared/pipes/freeze-allowance.pipe';
import { addDays, addMonths, parseDateOnly, startOfDay, toDateOnly } from '../../../shared/utils/dates';

export type MembershipDialogMode = 'sell' | 'change' | 'renew';

export interface MembershipDialogData {
  mode: MembershipDialogMode;
  member: Member;
  membership?: MembershipDetail | null;
}

@Component({
  selector: 'app-membership-dialog',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, MatDialogModule, MatDatepickerModule, MatIconModule,
    MatInputModule, MatSelectModule, FreezeAllowancePipe],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p class="who">{{ data.member.fullName }} · #{{ data.member.membershipNumber }}</p>

      @if (current; as c) {
        <div class="current">
          <span class="overline">Current membership</span>
          <p><strong>{{ c.planName }}</strong> · {{ c.startDate | date: 'MMM d, y' }} → {{ c.endDate | date: 'MMM d, y' }}
            · {{ c.status }}</p>
          <small>Its agreed terms never change — a new membership is created.</small>
        </div>
      }

      <form [formGroup]="form" id="membership-form" (ngSubmit)="confirm()">
        <div class="field">
          <label class="field-label" for="ms-plan">{{ data.mode === 'renew' ? 'Plan' : 'New plan' }}<span class="req">*</span></label>
          <mat-form-field>
            <mat-select id="ms-plan" formControlName="planId" placeholder="Select a plan">
              @for (p of plans(); track p.id) {
                <mat-option [value]="p.id">
                  {{ p.name }} — {{ p.price | currency: 'USD' }} / {{ p.durationInMonths }} {{ p.durationInMonths === 1 ? 'month' : 'months' }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (plansLoaded() && plans().length === 0) {
            <span class="field-error">No published plans. Publish a plan in the Plan Catalogue first.</span>
          } @else if (form.controls.planId.touched && form.controls.planId.invalid) {
            <span class="field-error">Choose a plan.</span>
          } @else {
            <span class="field-hint">Only published plans can be sold.</span>
          }
        </div>

        @if (data.mode === 'sell') {
          <div class="field">
            <label class="field-label" for="ms-start">Start date<span class="req">*</span></label>
            <mat-form-field>
              <input matInput id="ms-start" [matDatepicker]="picker" formControlName="startDate" [min]="today" placeholder="mm/dd/yyyy" />
              <mat-datepicker-toggle matIconSuffix [for]="picker" />
              <mat-datepicker #picker />
            </mat-form-field>
            @if (form.controls.startDate.touched && form.controls.startDate.invalid) {
              <span class="field-error">Choose today or a later date.</span>
            }
          </div>
        }

        @if (data.mode === 'change') {
          <div class="field">
            <span class="field-label" id="ms-when">When does the change take effect?</span>
            <div class="options" role="radiogroup" aria-labelledby="ms-when">
              <label class="option" [class.selected]="timing() === 'AtRenewal'">
                <input type="radio" formControlName="timing" value="AtRenewal" />
                <span><strong>At renewal</strong> <em>Recommended</em><br />
                  The new membership begins {{ renewalStart() | date: 'MMM d, y' }}, the day after the current one ends.</span>
              </label>
              <label class="option" [class.selected]="timing() === 'Immediately'">
                <input type="radio" formControlName="timing" value="Immediately" />
                <span><strong>Immediately</strong><br />
                  Cancels the current membership today and starts the new one now. This can't be undone.</span>
              </label>
            </div>
          </div>
        }
      </form>

      @if (selectedPlan(); as p) {
        <section class="preview">
          <span class="overline">New terms</span>
          <dl>
            <div><dt>Price</dt><dd>{{ p.price | currency: 'USD' }}</dd></div>
            <div><dt>Duration</dt><dd>{{ p.durationInMonths }} {{ p.durationInMonths === 1 ? 'month' : 'months' }}</dd></div>
            <div><dt>Freezes</dt><dd>{{ p.maxFreezeDays | freezeAllowance: p.maxFreezeCount }}</dd></div>
            <div><dt>Guest passes</dt><dd>{{ p.guestPassQuota }}</dd></div>
            <div><dt>Access</dt><dd>{{ p.accessScope === 'AllBranches' ? 'All branches' : 'Home branch only' }}</dd></div>
            @if (period(); as d) {
              <div class="dates"><dt>Runs</dt><dd>{{ d.start | date: 'MMM d, y' }} → {{ d.end | date: 'MMM d, y' }}</dd></div>
            }
          </dl>
        </section>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline" mat-dialog-close>Cancel</button>
      <button type="submit" form="membership-form" class="btn" [class.btn-primary]="timing() !== 'Immediately'"
              [class.btn-danger]="timing() === 'Immediately' && data.mode === 'change'" [disabled]="saving()">
        {{ saving() ? 'Saving…' : confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .who { margin: 0 0 14px; color: var(--tf-text-soft); }
    .current { padding: 12px 14px; background: var(--tf-grey-bg); border: 1px solid var(--tf-border); margin-bottom: 18px; }
    .current p { margin: 6px 0 2px; }
    .current small { color: var(--tf-muted); }
    form { display: flex; flex-direction: column; gap: 14px; }
    .options { display: flex; flex-direction: column; gap: 10px; }
    .option { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; cursor: pointer;
      border: 1px solid var(--tf-border-strong); }
    .option input { accent-color: var(--tf-navy); margin-top: 4px; }
    .option.selected { border: 2px solid var(--tf-navy); background: var(--tf-navy-tint); }
    .option em { font-style: normal; font-size: 12px; color: var(--tf-green); background: var(--tf-green-bg); padding: 1px 8px; border-radius: 999px; }
    .option span { color: var(--tf-text-soft); }
    .option strong { color: var(--tf-text); }
    .preview { margin-top: 18px; padding: 14px 16px; border: 1px solid var(--tf-border); }
    dl { margin: 8px 0 0; }
    dl div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--tf-border); }
    dl div:last-child { border-bottom: 0; }
    dt { color: var(--tf-text-soft); }
    dd { margin: 0; font-weight: 700; }
    .dates dd { color: var(--tf-navy); }
  `,
})
export class MembershipDialog {
  protected readonly data = inject<MembershipDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MembershipDialog, boolean>);
  private readonly members = inject(MemberService);
  private readonly plansApi = inject(PlanService);
  private readonly toast = inject(ToastService);

  protected readonly current = this.data.mode === 'sell' ? null : (this.data.membership ?? null);
  protected readonly today = startOfDay(new Date());
  protected readonly title = { sell: 'Sell Plan', change: 'Change Membership Plan', renew: 'Renew Membership' }[this.data.mode];
  protected readonly confirmLabel = { sell: 'Sell Plan', change: 'Confirm Change', renew: 'Renew Membership' }[this.data.mode];

  protected readonly plans = signal<Plan[]>([]);
  protected readonly plansLoaded = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    planId: new FormControl<string | null>(this.data.mode === 'renew' ? (this.current?.planId ?? null) : null,
      Validators.required),
    startDate: new FormControl<Date | null>(this.today, Validators.required),
    timing: new FormControl<PlanChangeTiming>('AtRenewal', { nonNullable: true }),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly timing = computed(() => this.value().timing ?? 'AtRenewal');
  protected readonly selectedPlan = computed(() => this.plans().find((p) => p.id === this.value().planId) ?? null);

  protected readonly renewalStart = computed(() => {
    if (!this.current) return this.today;
    const next = addDays(parseDateOnly(this.current.endDate), 1);
    return next < this.today ? this.today : next;
  });

  protected readonly period = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) return null;
    let start: Date | null;
    if (this.data.mode === 'sell') start = this.value().startDate ? startOfDay(this.value().startDate!) : null;
    else if (this.data.mode === 'change' && this.timing() === 'Immediately') start = this.today;
    else start = this.renewalStart();
    if (!start) return null;
    return { start, end: addDays(addMonths(start, plan.durationInMonths), -1) };
  });

  constructor() {
    this.plansApi.list({ isPublished: true, pageSize: 100, sortBy: 'name' }).subscribe({
      next: (r) => {
        this.plans.set(r.items);
        this.plansLoaded.set(true);
        const id = this.form.controls.planId.value;
        if (id && !r.items.some((p) => p.id === id)) this.form.controls.planId.setValue(null);
      },
      error: () => this.plansLoaded.set(true),
    });
  }

  protected confirm(): void {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (!v.planId || (this.data.mode === 'sell' && (!v.startDate || startOfDay(v.startDate) < this.today))) return;

    const member = this.data.member;
    const planName = this.selectedPlan()?.name ?? 'the new plan';
    let request: Observable<unknown>;
    if (this.data.mode === 'sell') request = this.members.purchase(member.id, v.planId, toDateOnly(v.startDate!));
    else if (this.data.mode === 'renew') request = this.members.renew(this.current!.id, v.planId);
    else request = this.members.changePlan(this.current!.id, v.planId, v.timing);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        const when = this.period()?.start;
        this.toast.success(
          when && when > this.today
            ? `${member.fullName} moves to ${planName} on ${when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : `${member.fullName} is now on ${planName}`,
        );
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}

export function openMembershipDialog(dialog: MatDialog, data: MembershipDialogData): Observable<boolean | undefined> {
  return dialog
    .open<MembershipDialog, MembershipDialogData, boolean>(MembershipDialog, {
      data,
      width: '620px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
    })
    .afterClosed();
}
