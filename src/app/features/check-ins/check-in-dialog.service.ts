import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { CheckInOutcome, Member } from '../../core/models/api.models';
import { NewCheckInDialog, NewCheckInData } from './new-check-in-dialog/new-check-in-dialog';

@Injectable({ providedIn: 'root' })
export class CheckInDialogService {
  private readonly dialog = inject(MatDialog);

  open(member?: Member): Observable<CheckInOutcome | undefined> {
    return this.dialog
      .open<NewCheckInDialog, NewCheckInData, CheckInOutcome>(NewCheckInDialog, {
        data: { member },
        width: '600px',
        maxWidth: 'calc(100vw - 32px)',
        autoFocus: false,
      })
      .afterClosed();
  }
}
