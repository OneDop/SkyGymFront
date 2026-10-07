import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { Member } from '../../../core/models/api.models';
import { BranchService } from '../../../core/services/branch.service';
import { ToastService } from '../../../core/services/toast.service';
import { MemberService } from '../member.service';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { applyServerErrors, errorText } from '../../../shared/utils/form-errors';
import { pattern, PERSON_NAME, PHONE, trimmedLength } from '../../../shared/utils/validators';

export interface MemberFormData {
  member?: Member;
}

export type MemberFormResult = string;

@Component({
  selector: 'app-member-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatInputModule, MatSelectModule, StatusBadge, AutofocusDirective],
  template: `
    <h2 mat-dialog-title>{{ editing ? 'Edit Member' : 'Add Member' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="member-form" class="form" (ngSubmit)="save()">
        @if (data.member; as m) {
          <div class="identity">
            <span>Member ID: <strong>#{{ m.membershipNumber }}</strong></span>
            <app-status-badge [status]="m.status" />
          </div>
        }

        <div class="field">
          <label class="field-label" for="m-name">Member name<span class="req">*</span></label>
          <mat-form-field>
            <input matInput id="m-name" formControlName="fullName" appAutofocus maxlength="80"
                   placeholder="e.g., Jane Doe" autocomplete="off" />
          </mat-form-field>
          @if (error('fullName', 'Member name'); as e) { <span class="field-error">{{ e }}</span> }
        </div>

        <div class="field">
          <label class="field-label" for="m-branch">Branch<span class="req">*</span></label>
          <mat-form-field>
            <mat-select id="m-branch" formControlName="homeBranchId" placeholder="Select a branch">
              @for (b of branches.branches(); track b.id) {
                <mat-option [value]="b.id">{{ b.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (error('homeBranchId', 'Branch'); as e) { <span class="field-error">{{ e }}</span> }
        </div>

        <div class="field">
            <label class="field-label" for="m-email">Email</label>
            <mat-form-field>
              <input matInput id="m-email" type="email" formControlName="email" maxlength="100"
                     placeholder="name@email.com" autocomplete="off" />
            </mat-form-field>
            @if (error('email', 'Email'); as e) { <span class="field-error">{{ e }}</span> }
          </div>

          <div class="field">
            <label class="field-label" for="m-phone">Phone</label>
            <mat-form-field>
              <input matInput id="m-phone" type="tel" formControlName="phone" maxlength="20"
                     placeholder="+1 (555) 000-0000" autocomplete="off" />
            </mat-form-field>
            @if (error('phone', 'Phone'); as e) { <span class="field-error">{{ e }}</span> }
          </div>

          <div class="field">
            <label class="field-label" for="m-address">Address</label>
            <mat-form-field>
              <input matInput id="m-address" formControlName="address" maxlength="200"
                     placeholder="Street, city, apt." autocomplete="off" />
            </mat-form-field>
            @if (error('address', 'Address'); as e) { <span class="field-error">{{ e }}</span> }
          </div>

        @if (!editing) {
          <div class="field">
            <span class="field-label">Status</span>
            <div><app-status-badge status="Active" /></div>
            <span class="field-hint">The member ID and joined date are set automatically. Sell a plan from the
              member's profile so they can check in and book classes.</span>
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline" mat-dialog-close>Cancel</button>
      <button type="submit" form="member-form" class="btn btn-primary" [disabled]="saving()">
        {{ saving() ? 'Saving…' : editing ? 'Save Changes' : 'Add Member' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
    .identity { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px;
      background: var(--tf-grey-bg); border: 1px solid var(--tf-border); }
  `,
})
export class MemberFormDialog {
  protected readonly data = inject<MemberFormData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<MemberFormDialog, MemberFormResult>);
  private readonly members = inject(MemberService);
  protected readonly branches = inject(BranchService);
  private readonly toast = inject(ToastService);

  protected readonly editing = !!this.data.member;
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    fullName: new FormControl(this.data.member?.fullName ?? '', {
      nonNullable: true,
      validators: [
        Validators.required,
        trimmedLength(2, 80),
        pattern(PERSON_NAME, 'Use letters, spaces, hyphens and apostrophes only.'),
      ],
    }),
    homeBranchId: new FormControl(this.data.member?.homeBranchId ?? this.branches.currentId() ?? '', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl(this.data.member?.email ?? '', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(100)],
    }),
    phone: new FormControl(this.data.member?.phone ?? '', {
      nonNullable: true,
      validators: [pattern(PHONE, 'Enter a valid phone number, e.g. +1 (555) 019-2834.')],
    }),
    address: new FormControl(this.data.member?.address ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
  });

  constructor() {
    effect(() => {
      const id = this.branches.currentId();
      untracked(() => {
        const c = this.form.controls.homeBranchId;
        if (id && !c.value && !c.dirty) c.setValue(id);
      });
    });
  }

  protected error(name: 'fullName' | 'homeBranchId' | 'email' | 'phone' | 'address', label: string): string | null {
    return errorText(this.form.controls[name], label);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const contact = (value: string) => value.trim() || null;
    const body = {
      fullName: v.fullName.trim(),
      homeBranchId: v.homeBranchId,
      email: contact(v.email),
      phone: contact(v.phone),
      address: contact(v.address),
    };

    this.saving.set(true);
    const request: Observable<unknown> = this.editing
      ? this.members.update(this.data.member!.id, body)
      : this.members.create(body);

    request.subscribe({
      next: (result) => {
        this.saving.set(false);
        this.toast.success(this.editing ? 'Member updated' : `${body.fullName} added`);
        this.ref.close(this.editing ? this.data.member!.id : (result as string));
      },
      error: (err) => {
        this.saving.set(false);
        applyServerErrors(this.form, err);
      },
    });
  }
}

export function openMemberForm(dialog: MatDialog, data: MemberFormData = {}): Observable<MemberFormResult | undefined> {
  return dialog
    .open<MemberFormDialog, MemberFormData, MemberFormResult>(MemberFormDialog, {
      data,
      width: '520px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
    })
    .afterClosed();
}
