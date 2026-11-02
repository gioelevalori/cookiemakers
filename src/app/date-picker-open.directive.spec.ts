import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DatePickerOpenDirective } from './date-picker-open.directive';

@Component({ standalone: false, template: '<input type="date" />' })
class DateFieldComponent {}

describe('DatePickerOpenDirective', () => {
  function dateInput(): HTMLInputElement {
    TestBed.configureTestingModule({ declarations: [DateFieldComponent, DatePickerOpenDirective] });
    const fixture = TestBed.createComponent(DateFieldComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('input');
  }

  it('opens the browser calendar on click', () => {
    const input = dateInput();
    const showPicker = jasmine.createSpy('showPicker');
    Object.defineProperty(input, 'showPicker', { value: showPicker });
    input.click();
    expect(showPicker).toHaveBeenCalled();
  });

  it('keeps typing available when the browser refuses to open the calendar', () => {
    const input = dateInput();
    Object.defineProperty(input, 'showPicker', { value: () => { throw new DOMException('NotAllowedError'); } });
    expect(() => input.click()).not.toThrow();
  });
});
