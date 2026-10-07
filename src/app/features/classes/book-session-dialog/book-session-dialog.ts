import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { ClassSession, Member } from '../../../core/models/api.models';
import { ToastService } from '../../../core/services/toast.service';
import { ClassService } from '../class.service';
import { MemberSearch } from '../../members/member-search/member-search';
import { isSameDay, parseDateOnly } from '../../../shared/utils/dates';

export interface BookSessionData {
  session: ClassSession;
  member?: Member;
}

@Component({
  selector: 'app-book-session-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatIconModule, MatInputModule, MemberSearch],
  template: `
    @let s = data.session;
    <div class="session">
      <div class="title-row">
        <h2 mat-dialog-title>{{ s.className }}</h2>
        <span class="spots" [class.full]="s.placesRemaining === 0">
          <mat-icon>group</mat-icon>
          @if (s.placesRemaining > 0) {
            {{ s.placesRemaining }} / {{ s.capacityLimit }} spots remaining
          } @else {
            Full · Waitlist: {{ s.waitlistCount }}
          }
        </span>
      </div>
      <p class="meta">
        <span><mat-icon>schedule</mat-icon>{{ dayLabel() }}, {{ s.startTime.slice(0, 5) }} - {{ s.endTime.slice(0, 5) }}</span>
        <span><mat-icon>person</mat-icon>Trainer: {{ s.trainerName ?? 'Not assigned' }}</span>
        <span><mat-icon>location_on</mat-icon>{{ s.studioName ?? 'No room yet' }}</span>
      </p>
    </div>

    <mat-dialog-content>
      <div class="field">
        <span class="field-label">Select Member<span class="req">*</span></span>
        <app-member-search [member]="member()" (memberChange)="member.set($event)" [locked]="!!data.member" />
        @if (eligibility(); as e) { <span class="field-error">{{ e }}</span> }
        @if (submitted() && !member()) { <span class="field-error">Choose a member.</span> }
      </div>

      <div class="field">
        <label class="field-label" for="b-notes">Special Requirements / Notes (Optional)</label>
        <mat-form-field>
          <textarea matInput id="b-notes" [formControl]="notes" rows="4" maxlength="500"
                    placeholder="e.g., Recovering from mild shoulder injury"></textarea>
        </mat-form-field>
      </div>

      @if (s.placesRemaining === 0) {
        <p class="note"><mat-icon>info</mat-icon>This class is full — the member will join the waitlist.</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline" mat-dialog-close>Cancel</button>
      <button type="button" class="btn btn-primary" (click)="confirm()" [disabled]="saving() || !!eligibility()">
        {{ saving() ? 'Booking…' : s.placesRemaining === 0 ? 'Join Waitlist' : 'Confirm Booking' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .session { padding: 8px 0 18px; border-bottom: 1px solid var(--tf-border); }
    .title-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-right: 24px; }
    h2[mat-dialog-title] { color: var(--tf-navy); font-size: 32px !important; padding-bottom: 0; }
    .spots { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; font-size: 14px;
      border: 1px solid var(--tf-border-strong); background: var(--tf-grey-bg); white-space: nowrap; }
    .spots.full { color: var(--tf-red); border-color: var(--tf-red-border); background: var(--tf-red-bg); }
    .spots mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .meta { display: flex; gap: 28px; flex-wrap: wrap; margin: 0; padding: 0 24px; color: var(--tf-text-soft); }
    .meta span { display: inline-flex; align-items: center; gap: 6px; }
    .meta mat-icon { font-size: 20px; width: 20px; height: 20px; }
    mat-dialog-content { display: flex; flex-direction: column; gap: 18px; padding-top: 20px !important; }
    .note { display: flex; gap: 8px; align-items: center; margin: 0; color: var(--tf-amber); }
  `,
})
export class BookSessionDialog {
  protected readonly data = inject<BookSessionData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<BookSessionDialog, boolean>);
  private readonly classes = inject(ClassService);
  private readonly toast = inject(ToastService);

  protected readonly member = signal<Member | null>(this.data.member ?? null);
  protected readonly notes = new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) });
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);

  protected readonly dayLabel = computed(() => {
    const date = parseDateOnly(this.data.session.sessionDate);
    return isSameDay(date, new Date())
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  });

  protected readonly eligibility = computed(() => {
    const m = this.member();
    if (!m || m.status === 'Active') return null;
    const why = m.status === 'None' ? 'has no membership' : `has a ${m.status.toLowerCase()} membership`;
    return `${m.fullName} ${why}, so they can't be booked. Sell or renew a membership first.`;
  });

  protected confirm(): void {
    this.submitted.set(true);
    const m = this.member();
    if (!m || this.eligibility()) return;

    const s = this.data.session;
    this.saving.set(true);
    this.classes.book(s.id, m.id, this.notes.value.trim() || null).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          s.placesRemaining > 0 ? `${m.fullName} booked into ${s.className}` : `${m.fullName} added to the ${s.className} waitlist`,
        );
        this.ref.close(true);
      },
      error: () => this.saving.set(false),
    });
  }
}

export function openBookSession(dialog: MatDialog, data: BookSessionData): Observable<boolean | undefined> {
  return dialog
    .open<BookSessionDialog, BookSessionData, boolean>(BookSessionDialog, {
      data,
      width: '760px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
    })
    .afterClosed();
}
