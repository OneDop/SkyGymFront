import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-state-message',
  imports: [MatIconModule],
  template: `
    <div class="state" [class.compact]="compact()">
      <mat-icon class="icon">{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      @if (message()) { <p>{{ message() }}</p> }
      <div class="actions">
        @if (actionLabel()) {
          <button type="button" class="btn btn-outline" (click)="act.emit()">{{ actionLabel() }}</button>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .state { text-align: center; padding: 56px 24px; color: var(--tf-muted); }
    .state.compact { padding: 28px 16px; }
    .icon { font-size: 40px; width: 40px; height: 40px; color: var(--tf-border-strong); }
    h3 { margin: 8px 0 4px; color: var(--tf-text); font-size: 20px; }
    p { margin: 0 auto 16px; max-width: 420px; }
    .actions { display: flex; justify-content: center; gap: 12px; }
  `,
})
export class StateMessage {
  readonly icon = input('info');
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly compact = input(false);
  readonly act = output<void>();
}
