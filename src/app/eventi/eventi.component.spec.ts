import { TestBed } from '@angular/core/testing';
import { AppModule } from '../app.module';
import { EventiComponent } from './eventi.component';

describe('Event inquiries', () => {
  it('validates quantities and creates an encoded inquiry without confirming an order', async () => {
    await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
    const fixture = TestBed.createComponent(EventiComponent);
    const component = fixture.componentInstance;
    component.form.controls.quantity.setValue(10.5);
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ quantity: 100, occasion: 'Matrimonio', notes: 'Anna & Luca' });
    expect(component.form.valid).toBeTrue();
    const message = new URL(component.requestUrl).searchParams.get('text')!;
    expect(message).toContain('100 biscotti');
    expect(message).toContain('Anna & Luca');
    expect(message).toContain('preventivo');
    fixture.destroy();
  });
});
