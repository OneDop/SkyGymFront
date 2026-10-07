import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FreezeReason, Member, MembershipDetail } from '../../../core/models/api.models';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { ToastService } from '../../../core/services/toast.service';
import { pageLoad } from '../../../core/http/request-context';
import { MemberService } from '../member.service';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { applyServerErrors } from '../../../shared/utils/form-errors';
import { FREEZE_REASONS } from '../../../shared/utils/format';
import { addDays, addMonths, daysBetweenInclusive, parseDateOnly, startOfDay, toDateOnly } from '../../../shared/utils/dates';

type Months = 1 | 2 | 3;

const freezeEnd = (start: Date, months: number) => addDays(addMonths(start, months), -1);
const freezeDays = (start: Date, months: number) => daysBetweenInclusive(start, freezeEnd(start, months));

@Component({
  selector: 'app-freeze-membership',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MatDatepickerModule, MatIconModule, MatInputModule,
    MatSelectModule, MatTooltipModule, Avatar, StatusBadge, StateMessage, AutofocusDirective],
  templateUrl: './freeze-membership.html',
  styleUrl: './freeze-membership.scss',
})
export class FreezeMembership {
  private readonly members = inject(MemberService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly memory = inject(ListMemoryService);

  readonly id = input.required<string>();
  readonly from = input<string | undefined>();

  protected readonly member = signal<Member | null>(null);
  protected readonly membership = signal<MembershipDetail | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  protected readonly saving = signal(false);

  protected readonly today = startOfDay(new Date());
  protected readonly reasons = FREEZE_REASONS;
  protected readonly durations: Months[] = [1, 2, 3];

  protected readonly form = new FormGroup(
    {
      startDate: new FormControl<Date | null>(addDays(this.today, 1), Validators.required),
      months: new FormControl<Months>(1, { nonNullable: true, validators: Validators.required }),
      reason: new FormControl<FreezeReason | null>(null, Validators.required),
      notes: new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) }),
    },
    { validators: (g) => this.freezeRules(g) },
  );

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  protected readonly originalEnd = computed(() => {
    const ms = this.membership();
    return ms ? parseDateOnly(ms.endDate) : null;
  });

  private readonly validStart = computed(() => {
    this.status();
    const start = this.value().startDate ?? null;
    const ctrlOk = this.form.controls.startDate.valid;
    const groupErrors = this.form.errors ?? {};
    return start && ctrlOk && !groupErrors['startPast'] && !groupErrors['startAfterEnd'] && !groupErrors['overlap']
      ? startOfDay(start)
      : null;
  });

  protected readonly months = computed(() => (this.value().months ?? 1) as Months);

  protected readonly newEndDate = computed(() => {
    const start = this.validStart();
    const end = this.originalEnd();
    return start && end ? addDays(end, freezeDays(start, this.months())) : null;
  });

  protected readonly blockedReason = computed(() => {
    const ms = this.membership();
    if (!ms) return 'This member has no membership to freeze.';
    if (ms.status === 'Frozen') return 'This membership is already frozen.';
    if (ms.status === 'Expired') return 'This membership has expired.';
    if (ms.status !== 'Active') return `This membership is ${ms.status.toLowerCase()}, so it cannot be frozen.`;
    if (ms.freezesRemaining <= 0 || ms.freezeDaysRemaining <= 0) return 'No freezes remain on this membership.';
    return null;
  });

  constructor() {
    effect(() => {
      this.id();
      untracked(() => this.load());
    });
    effect(() => {
      if (this.blockedReason()) this.form.disable({ emitEvent: false });
      else this.form.enable({ emitEvent: false });
    });
  }

  load(): void {
    this.state.set('loading');
    this.members.get(this.id(), pageLoad()).subscribe({
      next: (m) => {
        this.member.set(m);
        if (!m.currentMembershipId) {
          this.membership.set(null);
          this.state.set('ready');
          return;
        }
        this.members.membership(m.currentMembershipId).subscribe({
          next: (ms) => {
            this.membership.set(ms);
            this.state.set('ready');
            this.form.updateValueAndValidity();
          },
          error: () => this.state.set('error'),
        });
      },
      error: (err: HttpErrorResponse) => this.state.set(err.status === 404 ? 'notFound' : 'error'),
    });
  }

  protected durationTooLong(n: Months): boolean {
    const ms = this.membership();
    if (!ms) return true;
    const start = this.validStart() ?? addDays(this.today, 1);
    return freezeDays(start, n) > ms.freezeDaysRemaining;
  }

  protected durationTooltip(n: Months): string {
    const left = this.membership()?.freezeDaysRemaining ?? 0;
    return this.durationTooLong(n) ? `Only ${left} freeze ${left === 1 ? 'day remains' : 'days remain'} on this membership.` : '';
  }

  protected pickDuration(n: Months): void {
    if (!this.durationTooLong(n) && this.form.enabled) this.form.controls.months.setValue(n);
  }

  protected startError(): string | null {
    const c = this.form.controls.startDate;
    if (!(c.touched || c.dirty)) return null;
    if (c.hasError('required')) return 'Start date is required.';
    if (c.hasError('matDatepickerParse')) return 'Enter a valid date (mm/dd/yyyy).';
    if (c.hasError('server')) return c.getError('server');
    const e = this.form.errors ?? {};
    if (e['startPast']) return 'Start date must be today or later.';
    if (e['startAfterEnd']) return 'Start date must be before the current end date.';
    if (e['overlap']) return e['overlap'];
    if (e['pastEnd']) return 'This freeze would run past the end of the membership.';
    return null;
  }

  protected durationError(): string | null {
    const e = this.form.errors ?? {};
    return e['tooLong'] ?? null;
  }

  protected reasonError(): string | null {
    const c = this.form.controls.reason;
    return (c.touched || c.dirty) && c.invalid ? (c.getError('server') ?? 'Choose a reason for the freeze.') : null;
  }

  protected confirm(): void {
    this.form.markAllAsTouched();
    const ms = this.membership();
    const v = this.form.getRawValue();
    if (!ms || this.form.invalid || !v.startDate || !v.reason || this.blockedReason()) return;

    const start = startOfDay(v.startDate);
    this.saving.set(true);
    this.members
      .freeze(ms.id, {
        startDate: toDateOnly(start),
        endDate: toDateOnly(freezeEnd(start, v.months)),
        reason: v.reason,
        notes: v.notes.trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          const newEnd = this.newEndDate();
          this.toast.success(
            `${this.member()?.fullName}'s membership is frozen` +
              (newEnd ? ` — it now ends ${newEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''),
          );
          this.leave();
        },
        error: (err) => {
          this.saving.set(false);
          applyServerErrors(this.form, err, { StartDate: 'startDate', EndDate: 'startDate', Reason: 'reason', Notes: 'notes' });
        },
      });
  }

  protected leave(): void {
    if (this.from() === 'list') this.router.navigateByUrl(this.memory.urlFor('members'));
    else this.router.navigate(['/members', this.id()]);
  }

  private freezeRules(g: AbstractControl): ValidationErrors | null {
    const ms = this.membership?.();
    const startValue = g.get('startDate')?.value as Date | null;
    const months = (g.get('months')?.value ?? 1) as Months;
    if (!ms || !startValue) return null;

    const start = startOfDay(startValue);
    const end = freezeEnd(start, months);
    const membershipEnd = parseDateOnly(ms.endDate);

    if (start < this.today) return { startPast: true };
    if (start >= membershipEnd) return { startAfterEnd: true };

    const clash = ms.freezes.find(
      (f) => !f.isLifted && start <= parseDateOnly(f.endDate) && parseDateOnly(f.startDate) <= end,
    );
    if (clash) {
      const fmt = (d: string) => parseDateOnly(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return { overlap: `Overlaps the freeze already scheduled for ${fmt(clash.startDate)} – ${fmt(clash.endDate)}.` };
    }
    if (freezeDays(start, months) > ms.freezeDaysRemaining) {
      return { tooLong: `Only ${ms.freezeDaysRemaining} freeze days remain — choose a shorter duration.` };
    }
    if (end > membershipEnd) return { pastEnd: true };
    return null;
  }
}
