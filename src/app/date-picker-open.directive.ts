import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Opens the browser calendar when a date field is clicked, not only from its small (sometimes hidden) icon. */
@Directive({ standalone: false, selector: 'input[type=date]' })
export class DatePickerOpenDirective {
  private readonly input: HTMLInputElement = inject(ElementRef).nativeElement;

  @HostListener('click')
  open(): void {
    try { this.input.showPicker?.(); } catch { /* Not allowed here (e.g. inside a cross-origin frame): typing still works. */ }
  }
}
