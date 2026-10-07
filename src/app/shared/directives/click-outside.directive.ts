import { Directive, ElementRef, inject, input, output } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  host: { '(document:click)': 'onDocumentClick($event)' },
})
export class ClickOutsideDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly clickOutsideEnabled = input(true);
  readonly appClickOutside = output<MouseEvent>();

  onDocumentClick(event: MouseEvent): void {
    if (!this.clickOutsideEnabled()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.appClickOutside.emit(event);
    }
  }
}
