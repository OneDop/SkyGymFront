import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AutofocusDirective } from '../../directives/autofocus.directive';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, AutofocusDirective],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content><p class="message">{{ data.message }}</p></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline" [mat-dialog-close]="false" appAutofocus>
        {{ data.cancelLabel ?? 'Cancel' }}
      </button>
      <button type="button" class="btn" [class.btn-danger]="data.danger" [class.btn-primary]="!data.danger"
              [mat-dialog-close]="true">{{ data.confirmLabel ?? 'Confirm' }}</button>
    </mat-dialog-actions>
  `,
  styles: `.message { margin: 0; font-size: 16px; color: var(--tf-text-soft); }`,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}

export function confirmDiscard(dialog: MatDialog): Observable<boolean | undefined> {
  return confirm(dialog, {
    title: 'Discard changes?',
    message: 'The changes you made will be lost.',
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    danger: true,
  });
}

export function confirm(dialog: MatDialog, data: ConfirmData): Observable<boolean | undefined> {
  return dialog.open(ConfirmDialog, { data, width: '440px', autoFocus: false }).afterClosed();
}
