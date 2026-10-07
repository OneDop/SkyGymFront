import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MemberActivity } from '../../../../core/models/api.models';
import { isSameDay } from '../../../../shared/utils/dates';

@Component({
  selector: 'app-activity-list',
  imports: [DatePipe, MatIconModule],
  template: `
    <section class="card">
      <header class="card-head">
        <h2 class="card-title">Recent Activity</h2>
        @if (canShowMore()) {
          <button type="button" class="btn-link" (click)="showMore.emit()">{{ expanded() ? 'Show more' : 'View All' }}</button>
        }
      </header>
      @for (a of items(); track $index) {
        <article class="item">
          <span class="icon" [class.refused]="a.admitted === false">
            <mat-icon>{{ a.type === 'CheckIn' ? (a.admitted === false ? 'block' : 'login') : 'fitness_center' }}</mat-icon>
          </span>
          <div class="text">
            <strong>{{ a.title }}</strong>
            <span>{{ a.subtitle }}@if (a.refusalReason) { — {{ a.refusalReason }} }</span>
          </div>
          <time [attr.datetime]="a.occurredAt">
            {{ isToday(a.occurredAt) ? 'Today' : (a.occurredAt | date: 'MMM d, y') }}<br />
            {{ a.occurredAt | date: 'hh:mm a' }}
          </time>
        </article>
      } @empty {
        <p class="empty">{{ loading() ? 'Loading activity…' : 'No check-ins or classes yet.' }}</p>
      }
    </section>
  `,
  styles: `
    .item { display: grid; grid-template-columns: 52px 1fr auto; gap: 18px; align-items: center;
      padding: 18px 24px; border-bottom: 1px solid var(--tf-border); }
    .item:last-child { border-bottom: 0; }
    .icon { width: 52px; height: 52px; display: grid; place-items: center; background: var(--tf-grey-bg); color: var(--tf-navy); }
    .icon.refused { background: var(--tf-red-bg); color: var(--tf-red); }
    .text { display: flex; flex-direction: column; gap: 2px; }
    .text strong { font-size: 19px; font-weight: 400; }
    .text span { color: var(--tf-text-soft); }
    time { text-align: right; color: var(--tf-text-soft); white-space: nowrap; }
    .empty { padding: 24px; margin: 0; color: var(--tf-muted); }
  `,
})
export class ActivityList {
  readonly items = input.required<MemberActivity[]>();
  readonly loading = input(false);
  readonly canShowMore = input(false);
  readonly expanded = input(false);
  readonly showMore = output<void>();

  protected isToday(iso: string): boolean {
    return isSameDay(new Date(iso), new Date());
  }
}
