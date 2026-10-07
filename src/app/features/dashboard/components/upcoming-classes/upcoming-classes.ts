import { Component, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClassSession } from '../../../../core/models/api.models';
import { ClassState, classState } from '../../../classes/class-state';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { StateMessage } from '../../../../shared/components/state-message/state-message';
import { HighlightPipe } from '../../../../shared/pipes/highlight.pipe';
import { splitTime } from '../../../../shared/utils/dates';

export type ClassFilter = 'All' | ClassState;

@Component({
  selector: 'app-upcoming-classes',
  imports: [RouterLink, StatusBadge, StateMessage, HighlightPipe],
  template: `
    <section class="card">
      <header class="card-head">
        <h2 class="card-title">Upcoming Classes</h2>
        <a routerLink="/classes" class="btn-link">View Schedule</a>
      </header>

      <div class="filters" role="group" aria-label="Filter by state">
        @for (f of filters; track f) {
          <button type="button" class="chip" [class.on]="filter() === f" [attr.aria-pressed]="filter() === f"
                  (click)="filter.set(f)">{{ f }}</button>
        }
      </div>

      @if (loading() && sessions().length === 0) {
        <p class="loading">Loading classes…</p>
      } @else if (error()) {
        <app-state-message icon="cloud_off" title="Classes could not be loaded" [compact]="true" />
      } @else {
        @for (s of sessions(); track s.id) {
          <article class="row">
            <div class="time">
              <strong>{{ time(s).time }}</strong>
              <span>{{ time(s).meridiem }}</span>
            </div>
            <div class="info">
              <h3 [innerHTML]="s.className | highlight: search()"></h3>
              <p>
                <span [innerHTML]="(s.studioName ?? 'No room') | highlight: search()"></span> •
                <span [innerHTML]="shortName(s.trainerName) | highlight: search()"></span>
              </p>
            </div>
            <span class="enrolled" [innerHTML]="s.confirmedCount + '/' + s.capacityLimit + ' Enrolled' | highlight: search()"></span>
            <app-status-badge [status]="state(s)" [dot]="false" [highlight]="search()" />
          </article>
        } @empty {
          <app-state-message icon="event_available" [compact]="true"
                             [title]="search() || filter() !== 'All' ? 'No classes match' : 'No upcoming classes'"
                             [message]="search() || filter() !== 'All' ? 'Try another search or filter.' : 'Nothing else is scheduled at this branch.'" />
        }
      }
    </section>
  `,
  styles: `
    .filters { display: flex; gap: 8px; padding: 14px 24px 0; flex-wrap: wrap; }
    .chip { border: 1px solid var(--tf-border-strong); background: var(--tf-surface); padding: 4px 14px;
      border-radius: 999px; font: inherit; font-size: 14px; cursor: pointer; color: var(--tf-text-soft); }
    .chip.on { background: var(--tf-navy); border-color: var(--tf-navy); color: #fff; }
    .loading { padding: 24px; color: var(--tf-muted); margin: 0; }
    .row { display: grid; grid-template-columns: 80px 1fr auto auto; align-items: center; gap: 20px;
      padding: 20px 24px; border-top: 1px solid var(--tf-border); }
    .filters + .row, .filters + app-state-message { margin-top: 14px; }
    .time { display: flex; flex-direction: column; align-items: center; color: var(--tf-text-soft); }
    .time strong { font-size: 18px; letter-spacing: .04em; }
    .time span { font-size: 14px; color: var(--tf-muted); }
    h3 { margin: 0 0 4px; font-size: 24px; }
    .info p { margin: 0; color: var(--tf-text-soft); font-size: 16px; }
    .enrolled { color: var(--tf-text-soft); font-size: 17px; white-space: nowrap; }
    @media (max-width: 700px) { .row { grid-template-columns: 64px 1fr; } .enrolled { grid-column: 2; } }
  `,
})
export class UpcomingClasses {
  readonly sessions = input.required<ClassSession[]>();
  readonly search = input('');
  readonly loading = input(false);
  readonly error = input(false);
  readonly filter = model<ClassFilter>('All');

  protected readonly filters: ClassFilter[] = ['All', 'Upcoming', 'Active', 'Full'];

  protected time(s: ClassSession) {
    return splitTime(s.startTime);
  }

  protected state(s: ClassSession): string {
    return classState(s);
  }

  protected shortName(name: string | null): string {
    if (!name) return 'No trainer';
    const [first, ...rest] = name.split(' ');
    const last = rest.at(-1);
    return last ? `${first} ${last[0]}.` : first;
  }
}
