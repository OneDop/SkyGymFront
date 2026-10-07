import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AccessScope, Plan } from '../../../core/models/api.models';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { ToastService } from '../../../core/services/toast.service';
import { pageLoad } from '../../../core/http/request-context';
import { PlanRequest, PlanService } from '../plan.service';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { confirmDiscard } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { applyServerErrors, errorText } from '../../../shared/utils/form-errors';
import { maxDecimals, trimmedLength, wholeNumber } from '../../../shared/utils/validators';

export type DetailsMode = 'add' | 'view' | 'edit';

function freezeTerms(g: AbstractControl): ValidationErrors | null {
  const days = Number(g.get('maxFreezeDays')?.value || 0);
  const count = Number(g.get('maxFreezeCount')?.value || 0);
  if (days === 0 && count !== 0) return { freezeCount: 'Must be 0 when maximum freeze days is 0.' };
  if (days > 0 && count === 0) return { freezeCount: 'Allow at least 1 freeze when freeze days are offered.' };
  return null;
}

@Component({
  selector: 'app-plan-details',
  imports: [ReactiveFormsModule, MatCheckboxModule, MatIconModule, MatInputModule, StateMessage, AutofocusDirective],
  templateUrl: './plan-details.html',
  styleUrl: './plan-details.scss',
})
export class PlanDetails {
  private readonly plans = inject(PlanService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly memory = inject(ListMemoryService);

  readonly id = input<string>();
  readonly routeMode = input<DetailsMode>('view', { alias: 'mode' });

  protected readonly mode = signal<DetailsMode>('view');
  protected readonly plan = signal<Plan | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  protected readonly saving = signal(false);
  private readonly cameFromView = signal(false);

  protected readonly title = computed(() => (this.mode() === 'add' ? 'New Plan' : this.plan()?.name ?? 'Plan'));
  protected readonly badge = computed(() => ({ add: 'Add mode', view: 'View mode', edit: 'Update mode' })[this.mode()]);

  protected readonly form = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true, validators: [Validators.required, trimmedLength(2, 60)] }),
      price: new FormControl<number | null>(null, [Validators.required, Validators.min(0), maxDecimals(2)]),
      durationInMonths: new FormControl<number | null>(null, [
        Validators.required, Validators.min(1), Validators.max(36), wholeNumber(),
      ]),
      isPublished: new FormControl(false, { nonNullable: true }),
      maxFreezeDays: new FormControl<number | null>(null, [Validators.min(0), wholeNumber()]),
      maxFreezeCount: new FormControl<number | null>(null, [Validators.min(0), wholeNumber()]),
      guestPassQuota: new FormControl<number | null>(null, [Validators.min(0), wholeNumber()]),
      accessScope: new FormControl<AccessScope | null>(null),
    },
    { validators: freezeTerms },
  );

  constructor() {
    effect(() => {
      const mode = this.routeMode();
      const id = this.id();
      untracked(() => this.open(mode, id));
    });
  }

  protected error(name: keyof PlanDetails['form']['controls'], label: string): string | null {
    return errorText(this.form.controls[name], label);
  }

  protected freezeCountError(): string | null {
    const c = this.form.controls.maxFreezeCount;
    const touched = c.touched || c.dirty || this.form.controls.maxFreezeDays.touched;
    return errorText(c, 'Maximum number of freezes') ?? (touched ? (this.form.errors?.['freezeCount'] ?? null) : null);
  }

  protected pickAccess(scope: AccessScope): void {
    if (this.mode() === 'view') return;
    this.form.controls.accessScope.setValue(scope);
    this.form.controls.accessScope.markAsDirty();
  }

  protected startEdit(): void {
    this.cameFromView.set(true);
    this.setMode('edit');
    this.location.go(`/plans/${this.id()}/edit`);
  }

  protected cancel(): void {
    this.whenNoUnsavedChanges(() => {
      if (this.mode() === 'edit' && this.cameFromView()) {
        this.fill(this.plan()!);
        this.setMode('view');
        this.location.go(`/plans/${this.id()}`);
      } else {
        this.router.navigateByUrl(this.memory.urlFor('plans'));
      }
    });
  }

  protected backToList(): void {
    this.whenNoUnsavedChanges(() => this.router.navigateByUrl(this.memory.urlFor('plans')));
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const zero = (n: number | null) => (n === null || (n as unknown) === '' ? 0 : Number(n));
    const body: PlanRequest = {
      name: v.name.trim(),
      price: Number(v.price),
      durationInMonths: Number(v.durationInMonths),
      maxFreezeDays: zero(v.maxFreezeDays),
      maxFreezeCount: zero(v.maxFreezeCount),
      guestPassQuota: zero(v.guestPassQuota),
      accessScope: v.accessScope,
      isPublished: v.isPublished,
    };

    this.saving.set(true);
    if (this.mode() === 'add') {
      this.plans.create(body).subscribe({
        next: (id) => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.success(`${body.name} created`);
          this.router.navigate(['/plans', id]);
        },
        error: (err) => this.onSaveError(err),
      });
    } else {
      const id = this.id()!;
      this.plans.update(id, body).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Plan updated');
          this.plans.get(id).subscribe((p) => {
            this.plan.set(p);
            this.fill(p);
          });
          this.cameFromView.set(false);
          this.setMode('view');
          this.location.go(`/plans/${id}`);
        },
        error: (err) => this.onSaveError(err),
      });
    }
  }

  protected retry(): void {
    this.open(this.routeMode(), this.id());
  }

  private open(mode: DetailsMode, id: string | undefined): void {
    this.cameFromView.set(false);
    if (mode === 'add' || !id) {
      this.plan.set(null);
      this.form.reset({
        name: '', price: null, durationInMonths: null, isPublished: false,
        maxFreezeDays: null, maxFreezeCount: null, guestPassQuota: null, accessScope: null,
      });
      this.setMode('add');
      this.state.set('ready');
      return;
    }
    this.state.set('loading');
    this.plans.get(id, pageLoad()).subscribe({
      next: (p) => {
        this.plan.set(p);
        this.fill(p);
        this.setMode(mode);
        this.state.set('ready');
      },
      error: (err: HttpErrorResponse) => this.state.set(err.status === 404 ? 'notFound' : 'error'),
    });
  }

  private fill(p: Plan): void {
    this.form.reset({
      name: p.name,
      price: p.price,
      durationInMonths: p.durationInMonths,
      isPublished: p.isPublished,
      maxFreezeDays: p.maxFreezeDays,
      maxFreezeCount: p.maxFreezeCount,
      guestPassQuota: p.guestPassQuota,
      accessScope: p.accessScope,
    });
  }

  private setMode(mode: DetailsMode): void {
    this.mode.set(mode);
    if (mode === 'view') this.form.disable();
    else this.form.enable();
  }

  private whenNoUnsavedChanges(go: () => void): void {
    if (this.mode() !== 'view' && this.form.dirty) {
      confirmDiscard(this.dialog).subscribe((yes) => yes && go());
    } else {
      go();
    }
  }

  private onSaveError(err: HttpErrorResponse): void {
    this.saving.set(false);
    applyServerErrors(this.form, err, { Name: 'name' });
    const body = err.error as { title?: string; detail?: string } | null;
    if (err.status === 409 && body?.title === 'Plan.NameTaken') {
      this.form.controls.name.setErrors({ server: body.detail });
    }
  }
}
