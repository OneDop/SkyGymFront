import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-usage-card',
  imports: [MatIconModule],
  template: `
    <section class="card usage">
      <header>
        <span class="label"><mat-icon>{{ icon() }}</mat-icon>{{ label() }}</span>
        <span>{{ used() }} / {{ allowed() }}</span>
      </header>
      <div class="bar" role="progressbar" [attr.aria-valuenow]="used()" aria-valuemin="0" [attr.aria-valuemax]="allowed()">
        <span [style.width.%]="percent()"></span>
      </div>
      <p>{{ remaining() }} {{ remaining() === 1 ? unit() : unit() + 's' }} remaining</p>
    </section>
  `,
  styles: `
    .usage { padding: 22px 24px 18px; }
    header { display: flex; justify-content: space-between; align-items: center; color: var(--tf-text-soft); }
    .label { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; font-size: 19px; color: var(--tf-text); }
    .label mat-icon { color: var(--tf-navy); }
    .bar { height: 10px; border-radius: 999px; background: var(--tf-grey-bg); margin: 18px 0 12px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--tf-navy); border-radius: 999px; }
    p { margin: 0; text-align: right; color: var(--tf-text-soft); font-size: 15px; }
  `,
})
export class UsageCard {
  readonly label = input.required<string>();
  readonly icon = input('ac_unit');
  readonly used = input.required<number>();
  readonly allowed = input.required<number>();
  readonly unit = input('freeze');

  protected readonly remaining = computed(() => Math.max(0, this.allowed() - this.used()));
  protected readonly percent = computed(() =>
    this.allowed() > 0 ? Math.min(100, (this.used() / this.allowed()) * 100) : 0,
  );
}
