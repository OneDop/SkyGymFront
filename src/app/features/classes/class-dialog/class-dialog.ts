import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { ClassSession, Studio, Trainer } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClassRequest, ClassService } from '../class.service';
import { TrainerService } from '../../trainers/trainer.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { confirm } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { applyServerErrors, errorText } from '../../../shared/utils/form-errors';
import { trimmedLength, wholeNumber } from '../../../shared/utils/validators';
import { parseDateOnly, startOfDay, toDateOnly } from '../../../shared/utils/dates';
import { classState } from '../class-state';

export type ClassDialogMode = 'add' | 'view' | 'edit';

export interface ClassDialogData {
  mode: ClassDialogMode;
  session?: ClassSession;
  branchId?: string | null;
  date?: Date;
}

const DEFAULT_CAPACITY = 20;
const DURATIONS = [30, 45, 60];

@Component({
  selector: 'app-class-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatDatepickerModule, MatIconModule, MatInputModule,
    MatSelectModule, StatusBadge, AutofocusDirective],
  templateUrl: './class-dialog.html',
  styleUrl: './class-dialog.scss',
})
export class ClassDialog {
  protected readonly data = inject<ClassDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<ClassDialog, boolean>);
  private readonly dialog = inject(MatDialog);
  private readonly classes = inject(ClassService);
  private readonly trainersApi = inject(TrainerService);
  private readonly toast = inject(ToastService);
  protected readonly branches = inject(BranchService);

  protected readonly session = this.data.session ?? null;
  private readonly openedInEdit = this.data.mode === 'edit';

  protected readonly mode = signal<ClassDialogMode>(this.data.mode);
  protected readonly saving = signal(false);
  protected readonly trainers = signal<Trainer[]>([]);
  protected readonly studios = signal<Studio[]>([]);
  protected readonly today = startOfDay(new Date());

  protected readonly title = computed(() =>
    ({ add: 'Add New Class', view: 'Class Details', edit: 'Edit Class' })[this.mode()],
  );

  protected readonly statusBadge = (() => {
    if (!this.session) return { status: 'Active', label: 'Active (Booking Open)' };
    const state = classState(this.session);
    if (state === 'Upcoming') return { status: 'Active', label: 'Active (Booking Open)' };
    if (state === 'Active') return { status: 'InProgress', label: null };
    return { status: state, label: null };
  })();

  protected readonly hasBookings = !!this.session && this.session.confirmedCount + this.session.waitlistCount > 0;
  protected readonly canEdit = !this.session || !['Completed', 'Cancelled'].includes(classState(this.session));
  protected readonly durationOptions = this.session && !DURATIONS.includes(this.session.durationMinutes)
    ? [...DURATIONS, this.session.durationMinutes].sort((a, b) => a - b)
    : DURATIONS;

  protected readonly form = new FormGroup(
    {
      className: new FormControl(this.session?.className ?? '', {
        nonNullable: true,
        validators: [Validators.required, trimmedLength(3, 80)],
      }),
      branchId: new FormControl(this.session?.branchId ?? this.data.branchId ?? this.branches.currentId() ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      trainerId: new FormControl<string | null>(this.session?.trainerId ?? null),
      studioId: new FormControl<string | null>(this.session?.studioId ?? null),
      date: new FormControl<Date | null>(this.session ? parseDateOnly(this.session.sessionDate) : null, Validators.required),
      startTime: new FormControl(this.session?.startTime.slice(0, 5) ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      capacity: new FormControl<number | null>(this.session?.capacityLimit ?? null, [
        Validators.min(1),
        Validators.max(100),
        wholeNumber(),
      ]),
      duration: new FormControl(this.session?.durationMinutes ?? 45, { nonNullable: true }),
      description: new FormControl(this.session?.description ?? '', {
        nonNullable: true,
        validators: [Validators.maxLength(500)],
      }),
    },
    { validators: (g) => this.crossFieldRules(g) },
  );

  private readonly branchValue = toSignal(this.form.controls.branchId.valueChanges, {
    initialValue: this.form.controls.branchId.value,
  });
  private readonly studioValue = toSignal(this.form.controls.studioId.valueChanges, {
    initialValue: this.form.controls.studioId.value,
  });
  protected readonly selectedStudio = computed(() => this.studios().find((s) => s.id === this.studioValue()) ?? null);

  constructor() {
    if (this.mode() === 'view') this.form.disable();
    else this.applyEditRules();

    this.loadBranchOptions(this.form.controls.branchId.value, false);
    effect(() => {
      const id = this.branches.currentId();
      untracked(() => {
        const c = this.form.controls.branchId;
        if (id && !c.value && !c.dirty && this.mode() === 'add') c.setValue(id);
      });
    });
    this.form.controls.branchId.valueChanges.subscribe((id) => this.loadBranchOptions(id, true));
  }

  protected error(name: keyof ClassDialog['form']['controls'], label: string): string | null {
    const c = this.form.controls[name];
    if (c.hasError('matDatepickerMin')) return 'Choose today or a later date.';
    if (c.hasError('matDatepickerParse')) return 'Enter a valid date (mm/dd/yyyy).';
    return errorText(c, label);
  }

  protected groupError(key: string): string | null {
    const touched = this.form.controls.startTime.touched || this.form.controls.capacity.touched || this.form.controls.date.touched;
    return touched ? (this.form.errors?.[key] ?? null) : null;
  }

  protected edit(): void {
    this.mode.set('edit');
    this.form.enable();
    this.applyEditRules();
  }

  protected cancel(): void {
    const leave = () => {
      if (this.mode() === 'edit' && !this.openedInEdit) {
        this.resetToSaved();
        this.mode.set('view');
        this.form.disable();
      } else {
        this.ref.close(false);
      }
    };
    if (this.mode() !== 'view' && this.form.dirty) {
      confirm(this.dialog, {
        title: 'Discard changes?',
        message: 'The changes you made to this class will be lost.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        danger: true,
      }).subscribe((yes) => yes && leave());
    } else {
      leave();
    }
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    const body: ClassRequest = {
      className: v.className.trim(),
      branchId: v.branchId,
      trainerId: v.trainerId,
      studioId: v.studioId,
      sessionDate: toDateOnly(v.date!),
      startTime: `${v.startTime}:00`,
      durationMinutes: v.duration,
      capacityLimit: v.capacity ?? DEFAULT_CAPACITY,
      description: v.description.trim() || null,
    };

    this.saving.set(true);
    const request: Observable<unknown> = this.session
      ? this.classes.update(this.session.id, body)
      : this.classes.create(body);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.session ? 'Class updated' : `${body.className} scheduled`);
        this.ref.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        applyServerErrors(this.form, err, {
          ClassName: 'className', BranchId: 'branchId', SessionDate: 'date', StartTime: 'startTime',
          DurationMinutes: 'duration', CapacityLimit: 'capacity', Description: 'description',
        });
        const code = (err.error as { title?: string } | null)?.title;
        const detail = (err.error as { detail?: string } | null)?.detail ?? '';
        const field = { 'ClassSession.TrainerClash': 'trainerId', 'ClassSession.StudioClash': 'studioId',
          'ClassSession.CapacityExceeded': 'capacity', 'Trainer.NotActive': 'trainerId' }[code ?? ''];
        if (field) this.form.get(field)?.setErrors({ server: detail });
      },
    });
  }

  private applyEditRules(): void {
    if (this.session && this.hasBookings) this.form.controls.branchId.disable({ emitEvent: false });
  }

  private resetToSaved(): void {
    const s = this.session!;
    this.form.reset({
      className: s.className,
      branchId: s.branchId,
      trainerId: s.trainerId,
      studioId: s.studioId,
      date: parseDateOnly(s.sessionDate),
      startTime: s.startTime.slice(0, 5),
      capacity: s.capacityLimit,
      duration: s.durationMinutes,
      description: s.description ?? '',
    });
  }

  private loadBranchOptions(branchId: string, clearInvalid: boolean): void {
    if (!branchId) {
      this.trainers.set([]);
      this.studios.set([]);
      return;
    }
    this.trainersApi.list({ branchIds: [branchId], isActive: true, pageSize: 100, sortBy: 'name' }).subscribe((r) => {
      this.trainers.set(r.items);
      const t = this.form.controls.trainerId;
      if (clearInvalid && t.value && !r.items.some((x) => x.id === t.value)) t.setValue(null);
    });
    this.branches.getDetails(branchId).then((b) => {
      this.studios.set(b.studios);
      const s = this.form.controls.studioId;
      if (clearInvalid && s.value && !b.studios.some((x) => x.id === s.value)) s.setValue(null);
      this.form.updateValueAndValidity();
    });
  }

  private crossFieldRules(g: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {};
    const date = g.get('date')?.value as Date | null;
    const time = g.get('startTime')?.value as string;
    const capacity = g.get('capacity')?.value as number | null;

    const rescheduled = !this.session
      || (date && toDateOnly(date) !== this.session.sessionDate)
      || time !== this.session.startTime.slice(0, 5);
    if (date && time && rescheduled) {
      const at = startOfDay(date);
      const [h, m] = time.split(':').map(Number);
      at.setHours(h, m);
      if (startOfDay(date) < this.today) errors['startPast'] = 'Choose today or a later date.';
      else if (at.getTime() <= Date.now()) errors['startPast'] = 'Start time must be later than now.';
    }

    const effectiveCapacity = capacity ?? DEFAULT_CAPACITY;
    const studio = this.studios?.().find((s) => s.id === g.get('studioId')?.value);
    if (studio && effectiveCapacity > studio.capacity) {
      errors['overRoom'] = `${studio.name} holds ${studio.capacity} people — lower the capacity.`;
    }
    if (this.session && effectiveCapacity < this.session.confirmedCount) {
      errors['belowBooked'] = `${this.session.confirmedCount} people are already booked — capacity can't be lower.`;
    }
    return Object.keys(errors).length ? errors : null;
  }
}

export function openClassDialog(dialog: MatDialog, data: ClassDialogData): Observable<boolean | undefined> {
  return dialog
    .open<ClassDialog, ClassDialogData, boolean>(ClassDialog, {
      data,
      width: '860px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      disableClose: data.mode !== 'view',
    })
    .afterClosed();
}
