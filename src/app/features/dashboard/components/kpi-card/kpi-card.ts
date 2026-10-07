import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-kpi-card',
  imports: [MatIconModule],
  template: `
    <section class="card kpi">
      <header>
        <span class="overline">{{ label() }}</span>
        <mat-icon>{{ icon() }}</mat-icon>
      </header>
      @if (value() === null) {
        <div class="value muted">—</div>
      } @else {
        <div class="value">{{ value() }}</div>
      }
      <p class="note" [class.up]="trend() === 'up'" [class.down]="trend() === 'down'">{{ note() }}</p>
    </section>
  `,
  styles: `
    .kpi { padding: 0 24px 22px; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 22px 0 14px;
      border-bottom: 1px solid var(--tf-border); }
    header mat-icon { color: var(--tf-navy); font-size: 20px; width: 20px; height: 20px; }
    .value { font-size: 58px; font-weight: 700; line-height: 1; margin: 30px 0 18px; }
    .value.muted { color: var(--tf-disabled); }
    .note { margin: 0; color: var(--tf-text-soft); font-size: 17px; }
    .note.up { color: var(--tf-green); }
    .note.down { color: var(--tf-red); }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly icon = input('insights');
  readonly value = input<string | null>(null);
  readonly note = input('');
  readonly trend = input<'up' | 'down' | null>(null);
}
