import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  template: `<span class="avatar" [style.width.px]="size()" [style.height.px]="size()"
                   [style.font-size.px]="size() * 0.42">{{ initials() }}</span>`,
  styles: `
    .avatar { display: inline-flex; align-items: center; justify-content: center; flex: none;
      border-radius: 50%; background: var(--tf-avatar-bg); color: var(--tf-navy); }
  `,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly size = input(40);

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );
}
