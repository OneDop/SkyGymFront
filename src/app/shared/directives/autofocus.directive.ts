import { AfterViewInit, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly appAutofocus = input<boolean | ''>(true);

  ngAfterViewInit(): void {
    if (this.appAutofocus() === false) return;
    setTimeout(() => {
      const el = this.host.nativeElement;
      const target = el.matches('input, textarea, select, button, [tabindex]')
        ? el
        : el.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])');
      target?.focus();
    }, 120);
  }
}
