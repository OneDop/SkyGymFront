import { Component, computed, input } from '@angular/core';
import { HighlightPipe } from '../../pipes/highlight.pipe';

type Tone = 'green' | 'grey' | 'grey-outline' | 'grey-filled' | 'red' | 'red-outline' | 'navy' | 'amber' | 'blue';

const TONES: Record<string, Tone> = {
  active: 'green',
  published: 'green',
  upcoming: 'grey-outline',
  inprogress: 'navy',
  full: 'red',
  completed: 'grey-filled',
  cancelled: 'red-outline',
  frozen: 'blue',
  pending: 'amber',
  expired: 'red',
  retired: 'red',
  inactive: 'grey',
  none: 'grey',
};

const LABELS: Record<string, string> = {
  inprogress: 'In Progress',
  none: 'No Plan',
};

@Component({
  selector: 'app-status-badge',
  imports: [HighlightPipe],
  template: `<span class="badge" [class]="'badge tone-' + tone()" [class.dot]="dot()"
                   [innerHTML]="text() | highlight: highlight()"></span>`,
  styles: `
    .badge {
      display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
      padding: 3px 10px; border-radius: 999px; font-size: 13px; line-height: 1.4;
      border: 1px solid transparent;
    }
    .dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .tone-green { background: var(--tf-green-bg); color: var(--tf-green); border-color: var(--tf-green-border); }
    .tone-blue { background: var(--tf-blue-bg); color: var(--tf-blue); border-color: var(--tf-blue-border); }
    .tone-amber { background: var(--tf-amber-bg); color: var(--tf-amber); border-color: var(--tf-amber-border); }
    .tone-red { background: var(--tf-red-bg); color: var(--tf-red); border-color: var(--tf-red-border); }
    .tone-red-outline { background: transparent; color: var(--tf-red); border-color: var(--tf-red); }
    .tone-grey { background: var(--tf-grey-bg); color: var(--tf-muted); border-color: var(--tf-border); }
    .tone-grey-outline { background: transparent; color: var(--tf-muted); border-color: var(--tf-border-strong); border-radius: 4px; }
    .tone-grey-filled { background: var(--tf-grey-filled); color: #fff; }
    .tone-navy { background: transparent; color: var(--tf-navy); border-color: var(--tf-navy); border-radius: 4px;
      font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  `,
})
export class StatusBadge {
  readonly status = input.required<string>();
  readonly label = input<string | null>(null);
  readonly dot = input(true);
  readonly highlight = input('');

  private readonly key = computed(() => this.status().replace(/\s+/g, '').toLowerCase());
  protected readonly tone = computed<Tone>(() => TONES[this.key()] ?? 'grey');
  protected readonly text = computed(
    () => this.label() ?? LABELS[this.key()] ?? this.status().replace(/([a-z])([A-Z])/g, '$1 $2'),
  );
}
