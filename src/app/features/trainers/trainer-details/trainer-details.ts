import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Trainer } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { ToastService } from '../../../core/services/toast.service';
import { pageLoad } from '../../../core/http/request-context';
import { TrainerRequest, TrainerService } from '../trainer.service';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { confirmDiscard } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { applyServerErrors, errorText } from '../../../shared/utils/form-errors';
import { pattern, PHONE, trimmedLength } from '../../../shared/utils/validators';

export type DetailsMode = 'add' | 'view' | 'edit';

@Component({
  selector: 'app-trainer-details',
  imports: [ReactiveFormsModule, MatCheckboxModule, MatIconModule, MatInputModule, MatSelectModule, StateMessage,
    AutofocusDirective],
  templateUrl: './trainer-details.html',
  styleUrl: './trainer-details.scss',
})
export class TrainerDetails {
  private readonly trainers = inject(TrainerService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly memory = inject(ListMemoryService);
  protected readonly branches = inject(BranchService);

  readonly id = input<string>();
  readonly routeMode = input<DetailsMode>('view', { alias: 'mode' });

  protected readonly mode = signal<DetailsMode>('view');
  protected readonly trainer = signal<Trainer | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  protected readonly saving = signal(false);
  private readonly cameFromView = signal(false);

  protected readonly title = computed(() => (this.mode() === 'add' ? 'New Trainer' : this.trainer()?.fullName ?? 'Trainer'));
  protected readonly badge = computed(() => ({ add: 'Add mode', view: 'View mode', edit: 'Update mode' })[this.mode()]);

  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required, trimmedLength(2, 80)] }),
    specialty: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    homeBranchId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(100)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [pattern(PHONE, 'Enter a valid phone number, e.g. +1 (555) 019-4471.')],
    }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const mode = this.routeMode();
      const id = this.id();
      untracked(() => this.open(mode, id));
    });
  }

  protected error(name: keyof TrainerDetails['form']['controls'], label: string): string | null {
    return errorText(this.form.controls[name], label);
  }

  protected startEdit(): void {
    this.cameFromView.set(true);
    this.setMode('edit');
    this.location.go(`/trainers/${this.id()}/edit`);
  }

  protected cancel(): void {
    this.whenNoUnsavedChanges(() => {
      if (this.mode() === 'edit' && this.cameFromView()) {
        this.fill(this.trainer()!);
        this.setMode('view');
        this.location.go(`/trainers/${this.id()}`);
      } else {
        this.router.navigateByUrl(this.memory.urlFor('trainers'));
      }
    });
  }

  protected backToList(): void {
    this.whenNoUnsavedChanges(() => this.router.navigateByUrl(this.memory.urlFor('trainers')));
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const body: TrainerRequest = {
      fullName: v.fullName.trim(),
      specialty: v.specialty.trim() || null,
      homeBranchId: v.homeBranchId,
      email: v.email.trim(),
      phone: v.phone.trim() || null,
      isActive: v.isActive,
    };

    this.saving.set(true);
    if (this.mode() === 'add') {
      this.trainers.create(body).subscribe({
        next: (id) => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.success(`${body.fullName} added`);
          this.router.navigate(['/trainers', id]);
        },
        error: (err) => this.onSaveError(err),
      });
    } else {
      const id = this.id()!;
      this.trainers.update(id, body).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Trainer updated');
          this.trainers.get(id).subscribe((t) => {
            this.trainer.set(t);
            this.fill(t);
          });
          this.cameFromView.set(false);
          this.setMode('view');
          this.location.go(`/trainers/${id}`);
        },
        error: (err) => this.onSaveError(err),
      });
    }
  }

  private open(mode: DetailsMode, id: string | undefined): void {
    this.cameFromView.set(false);
    if (mode === 'add' || !id) {
      this.trainer.set(null);
      this.form.reset({ fullName: '', specialty: '', homeBranchId: '', email: '', phone: '', isActive: true });
      this.setMode('add');
      this.state.set('ready');
      return;
    }
    this.state.set('loading');
    this.trainers.get(id, pageLoad()).subscribe({
      next: (t) => {
        this.trainer.set(t);
        this.fill(t);
        this.setMode(mode);
        this.state.set('ready');
      },
      error: (err: HttpErrorResponse) => this.state.set(err.status === 404 ? 'notFound' : 'error'),
    });
  }

  protected retry(): void {
    this.open(this.routeMode(), this.id());
  }

  private fill(t: Trainer): void {
    this.form.reset({
      fullName: t.fullName,
      specialty: t.specialty ?? '',
      homeBranchId: t.homeBranchId,
      email: t.email ?? '',
      phone: t.phone ?? '',
      isActive: t.isActive,
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
    applyServerErrors(this.form, err);
    const body = err.error as { title?: string; detail?: string } | null;
    if (err.status === 409 && body?.title === 'Trainer.EmailTaken') {
      this.form.controls.email.setErrors({ server: body.detail });
    }
  }
}
