import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3500, panelClass: 'toast-success' });
  }

  error(message: string, retry?: () => void): void {
    const ref = this.snackBar.open(message, retry ? 'Retry' : 'Dismiss', {
      duration: retry ? 8000 : 5000,
      panelClass: 'toast-error',
    });
    if (retry) ref.onAction().subscribe(() => retry());
  }
}
