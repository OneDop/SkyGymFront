import { Component, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-quick-actions',
  imports: [MatIconModule],
  template: `
    <section class="card">
      <header class="card-head"><h2 class="card-title">Quick Actions</h2></header>
      <div class="actions">
        <button type="button" class="action" (click)="newMember.emit()">
          <span class="ico"><mat-icon>person_add</mat-icon></span>
          <span><strong>New Member</strong><small>Start enrollment process</small></span>
        </button>
        <button type="button" class="action" (click)="checkIn.emit()">
          <span class="ico"><mat-icon>qr_code_scanner</mat-icon></span>
          <span><strong>Manual Check-in</strong><small>Verify member entry</small></span>
        </button>
        <button type="button" class="action" (click)="registerClass.emit()">
          <span class="ico"><mat-icon>event_available</mat-icon></span>
          <span><strong>Register Class</strong><small>Book member into session</small></span>
        </button>
      </div>
    </section>
  `,
  styles: `
    .card-head { margin: 0 22px; padding: 22px 0 14px; }
    .actions { display: flex; flex-direction: column; gap: 22px; padding: 22px; }
    .action { display: flex; align-items: center; gap: 22px; padding: 38px 22px; text-align: left;
      border: 1px solid var(--tf-border-strong); background: var(--tf-surface); cursor: pointer; font-family: var(--tf-font); }
    .action:hover { border-color: var(--tf-navy); background: var(--tf-navy-tint); }
    .ico { width: 52px; height: 52px; background: var(--tf-grey-bg); display: grid; place-items: center; flex: none; }
    .ico mat-icon { color: var(--tf-navy); }
    strong { display: block; font-size: 18px; letter-spacing: .03em; color: var(--tf-text); }
    small { display: block; font-size: 16px; color: var(--tf-text-soft); margin-top: 2px; }
  `,
})
export class QuickActions {
  readonly newMember = output<void>();
  readonly checkIn = output<void>();
  readonly registerClass = output<void>();
}
