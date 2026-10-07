import { Component, input, model } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-modal',
  imports: [MatIconModule],
  host: { '(document:keydown.escape)': 'open() && close()' },
  template: `
    @if (open()) {
      <div class="backdrop" (click)="close()"></div>
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()" [style.width]="width()">
        <header>
          <h2>{{ title() }}</h2>
          <button type="button" class="close" (click)="close()" aria-label="Close"><mat-icon>close</mat-icon></button>
        </header>
        <div class="body"><ng-content /></div>
        <footer><ng-content select="[modal-actions]" /></footer>
      </div>
    }
  `,
  styles: `
    .backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, .45); z-index: 900; }
    .dialog { position: fixed; z-index: 901; left: 50%; top: 50%; transform: translate(-50%, -50%);
      max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); display: flex; flex-direction: column;
      background: var(--tf-surface); box-shadow: var(--tf-shadow); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px;
      border-bottom: 1px solid var(--tf-border); }
    h2 { margin: 0; font-size: 22px; }
    .close { border: 0; background: transparent; cursor: pointer; color: var(--tf-muted); display: flex; }
    .body { padding: 20px 24px; overflow: auto; }
    footer { padding: 14px 24px; border-top: 1px solid var(--tf-border); background: var(--tf-page);
      display: flex; justify-content: flex-end; gap: 12px; }
  `,
})
export class Modal {
  readonly open = model(false);
  readonly title = input.required<string>();
  readonly width = input('520px');

  close(): void {
    this.open.set(false);
  }
}
