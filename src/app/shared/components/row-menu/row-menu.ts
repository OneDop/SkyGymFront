import { Component, input, output, signal } from '@angular/core';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

export interface RowAction {
  id: string;
  label: string;
  disabled?: boolean;
  reason?: string;
}

const POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
];

@Component({
  selector: 'app-row-menu',
  imports: [MatIconModule, MatTooltipModule, ClickOutsideDirective, CdkConnectedOverlay, CdkOverlayOrigin],
  template: `
    <button type="button" class="trigger" cdkOverlayOrigin #origin="cdkOverlayOrigin" [class.active]="open()"
            (click)="toggle($event)" [attr.aria-expanded]="open()" aria-haspopup="menu"
            [attr.aria-label]="'Actions for ' + label()">
      <mat-icon>more_vert</mat-icon>
    </button>
    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="open()"
                 [cdkConnectedOverlayPositions]="positions" (detach)="open.set(false)"
                 (overlayKeydown)="$event.key === 'Escape' && open.set(false)">
      <div class="row-menu-panel" role="menu" (appClickOutside)="open.set(false)">
        @for (a of actions(); track a.id) {
          <span [matTooltip]="a.disabled ? (a.reason ?? '') : ''" matTooltipPosition="left">
            <button type="button" role="menuitem" class="item" [disabled]="a.disabled" (click)="pick(a)">
              {{ a.label }}
            </button>
          </span>
        }
      </div>
    </ng-template>
  `,
  styles: `
    :host { display: inline-block; }
    .trigger { border: 0; background: transparent; cursor: pointer; width: 34px; height: 34px;
      border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--tf-text); }
    .trigger:hover, .trigger.active { background: var(--tf-grey-bg); }
    .row-menu-panel { min-width: 230px; background: var(--tf-surface); border: 1px solid var(--tf-border);
      box-shadow: var(--tf-shadow); padding: 6px 0; display: flex; flex-direction: column; font-family: var(--tf-font); }
    .row-menu-panel > span { display: block; }
    .item { display: block; width: 100%; text-align: right; padding: 11px 22px; border: 0;
      background: transparent; font: inherit; font-size: 17px; color: var(--tf-text); cursor: pointer; }
    .item:hover:not(:disabled) { background: var(--tf-grey-bg); }
    .item:disabled { color: var(--tf-disabled); cursor: not-allowed; }
  `,
})
export class RowMenu {
  readonly actions = input.required<RowAction[]>();
  readonly label = input('row');

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly action = output<string>();

  protected readonly open = signal(false);
  protected readonly positions = POSITIONS;

  protected toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.open.update((v) => !v);
  }

  protected pick(a: RowAction): void {
    if (a.disabled) return;
    this.open.set(false);
    if (a.id === 'view') this.view.emit();
    if (a.id === 'edit') this.edit.emit();
    this.action.emit(a.id);
  }
}
