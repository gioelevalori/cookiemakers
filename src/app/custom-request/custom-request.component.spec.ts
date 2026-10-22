import { TestBed } from '@angular/core/testing';
import { AppModule } from '../app.module';
import { CustomRequestComponent } from './custom-request.component';

describe('CustomRequestComponent', () => {
  it('requires a valid description and prepares the selected details without sending them', async () => {
    await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
    const fixture = TestBed.createComponent(CustomRequestComponent);
    const component = fixture.componentInstance;
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ occasion: 'Compleanno', description: 'Un tema floreale nei toni salvia', quantity: 20, packaging: 'scatola', size: '6', ribbon: true });
    expect(component.form.valid).toBeTrue();
    const message = new URL(component.requestUrl).searchParams.get('text')!;
    expect(message).toContain('Quantità: 20'); expect(message).toContain('Scatola regalo'); expect(message).toContain('Circa 6 cm'); expect(message).toContain('nastro coordinato'); expect(message).not.toContain('bigliettino');
    component.form.controls.quantity.setValue(9);
    const event = jasmine.createSpyObj('event', ['preventDefault']); component.prepareRequest(event);
    expect(event.preventDefault).toHaveBeenCalled();
    fixture.destroy();
  });
});
