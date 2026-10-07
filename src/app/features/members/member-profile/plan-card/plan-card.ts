import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Freeze, MembershipDetail, MembershipSummary } from '../../../../core/models/api.models';
import { parseDateOnly, startOfDay } from '../../../../shared/utils/dates';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-plan-card',
  imports: [CurrencyPipe, DatePipe, MatIconModule, MatTooltipModule, StatusBadge],
  template: `
    <section class="card plan">
      <header class="card-head">
        <h2 class="card-title">Current Plan</h2>
        <mat-icon>workspace_premium</mat-icon>
      </header>
      @if (membership(); as ms) {
        <div class="card-body">
          <div class="top">
            <div>
              <h3>{{ ms.planName }}</h3>
              <p class="meta">
                {{ dateLabel() }}: {{ (ms.status === 'Pending' ? ms.startDate : ms.endDate) | date: 'MMM d, y' }}
                <app-status-badge [status]="ms.status" />
              </p>
            </div>
            <div class="price">
              <strong>{{ ms.agreedTerms.pricePaid | currency: 'USD' : 'symbol' : '1.0-2' }}</strong>
              <span>{{ per() }}</span>
            </div>
          </div>

          @if (openFreeze(); as f) {
            <p class="frozen"><mat-icon>ac_unit</mat-icon>
              {{ freezeStarted() ? 'Frozen' : 'Freeze scheduled' }}: {{ f.startDate | date: 'MMM d' }} – {{ f.endDate | date: 'MMM d, y' }}</p>
          }

          @if (upcoming(); as next) {
            <p class="next"><mat-icon>event_upcoming</mat-icon>
              Next: <strong>{{ next.planName }}</strong> from {{ next.startDate | date: 'MMM d, y' }}</p>
          }

          <div class="actions">
            @switch (ms.status) {
              @case ('Expired') {
                <button type="button" class="btn btn-primary btn-block" (click)="renew.emit()">
                  <mat-icon>autorenew</mat-icon> Renew Membership
                </button>
              }
              @case ('Cancelled') {
                <button type="button" class="btn btn-primary btn-block" (click)="sell.emit()">
                  <mat-icon>add_card</mat-icon> Sell Plan
                </button>
              }
              @case ('Pending') {
                <button type="button" class="btn btn-outline btn-block danger" (click)="cancelMembership.emit()">
                  Cancel Membership
                </button>
              }
              @case ('Frozen') {
                <button type="button" class="btn btn-primary btn-block" (click)="endFreeze.emit()">
                  <mat-icon>wb_sunny</mat-icon> {{ freezeStarted() ? 'End Freeze' : 'Cancel Scheduled Freeze' }}
                </button>
                <button type="button" class="btn btn-outline btn-block" (click)="change.emit()">
                  <mat-icon>swap_horiz</mat-icon> Change Plan
                </button>
                <button type="button" class="btn-link danger-link" (click)="cancelMembership.emit()">Cancel membership</button>
              }
              @default {
                <button type="button" class="btn btn-primary btn-block" (click)="change.emit()">
                  <mat-icon>swap_horiz</mat-icon> Change Plan
                </button>
                <span [matTooltip]="freezeBlockedReason() ?? ''">
                  <button type="button" class="btn btn-outline btn-block" [disabled]="!!freezeBlockedReason()"
                          (click)="freeze.emit()">
                    <mat-icon>ac_unit</mat-icon> Freeze Membership
                  </button>
                </span>
                <button type="button" class="btn-link danger-link" (click)="cancelMembership.emit()">Cancel membership</button>
              }
            }
          </div>
        </div>
      } @else {
        <div class="card-body empty">
          <p>No membership yet. Sell a plan so this member can check in and book classes.</p>
          <button type="button" class="btn btn-primary btn-block" (click)="sell.emit()">
            <mat-icon>add_card</mat-icon> Sell Plan
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .card-head mat-icon { color: var(--tf-text-soft); }
    .top { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    h3 { margin: 0 0 6px; font-size: 28px; color: var(--tf-navy); }
    .meta { margin: 0; color: var(--tf-text-soft); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .price { text-align: right; white-space: nowrap; }
    .price strong { display: block; font-size: 26px; }
    .price span { color: var(--tf-text-soft); }
    .frozen { display: flex; align-items: center; gap: 6px; margin: 0 0 18px; padding: 10px 12px;
      background: var(--tf-blue-bg); color: var(--tf-blue); border: 1px solid var(--tf-blue-border); }
    .next { display: flex; align-items: center; gap: 6px; margin: 0 0 18px; padding: 10px 12px; background: var(--tf-navy-tint);
      color: var(--tf-navy); }
    .actions { display: flex; flex-direction: column; gap: 12px; }
    .actions > span { display: block; }
    .danger { color: var(--tf-red); border-color: var(--tf-red-border); }
    .danger-link { color: var(--tf-red); align-self: center; font-weight: 400; text-decoration: underline; }
    .empty p { margin: 0 0 16px; color: var(--tf-muted); }
  `,
})
export class PlanCard {
  readonly membership = input<MembershipDetail | null>(null);
  readonly upcoming = input<MembershipSummary | null>(null);

  readonly freeze = output<void>();
  readonly sell = output<void>();
  readonly change = output<void>();
  readonly renew = output<void>();
  readonly cancelMembership = output<void>();
  readonly endFreeze = output<void>();

  protected readonly openFreeze = computed<Freeze | null>(() => {
    const today = startOfDay(new Date());
    return this.membership()?.freezes
      .filter((f) => !f.isLifted && parseDateOnly(f.endDate) >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
  });

  protected readonly freezeStarted = computed(() => {
    const f = this.openFreeze();
    return !!f && parseDateOnly(f.startDate) <= startOfDay(new Date());
  });

  protected readonly dateLabel = computed(() => {
    const status = this.membership()?.status;
    if (status === 'Pending') return 'Starts';
    if (status === 'Expired') return 'Ended';
    if (status === 'Cancelled') return 'Was due to end';
    return this.upcoming() ? 'Ends' : 'Renews';
  });

  protected readonly per = computed(() => {
    const months = this.membership()?.agreedTerms.durationInMonths ?? 0;
    if (months === 12) return '/year';
    if (months === 1) return '/month';
    return `/${months} months`;
  });

  protected readonly freezeBlockedReason = computed(() => {
    const ms = this.membership();
    if (!ms) return 'No membership to freeze.';
    if (ms.status !== 'Active') return `Only an active membership can be frozen (this one is ${ms.status.toLowerCase()}).`;
    if (ms.freezesRemaining <= 0 || ms.freezeDaysRemaining <= 0) return 'No freezes remain on this membership.';
    return null;
  });
}
