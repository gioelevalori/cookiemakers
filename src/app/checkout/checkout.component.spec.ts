import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rejects past delivery dates and flags requests before the estimate', () => {
    spyOnProperty(component.delivery, 'today', 'get').and.returnValue('2026-10-07');
    const date = component.firstFormGroup.controls.requestedDate;
    date.setValue('2026-10-06');
    expect(date.invalid).toBeTrue();
    date.setValue('2026-10-08');
    expect(date.valid).toBeTrue();
    expect(component.dateTooSoon).toBeTrue();
    date.setValue('2026-10-16');
    expect(component.dateTooSoon).toBeFalse();
    date.setValue('');
    expect(date.valid).toBeTrue();
    expect(component.dateTooSoon).toBeFalse();
  });

  it('recalculates the price when quantity is edited directly', () => {
    component.firstFormGroup.controls.firstCtrl.setValue(12);
    expect(component.counter).toBe(25);
    expect(component.counter + component.shipping).toBe(31);
  });

  it('rejects quantities below ten and fractional quantities', () => {
    component.firstFormGroup.controls.firstCtrl.setValue(9);
    expect(component.firstFormGroup.invalid).toBeTrue();
    component.firstFormGroup.controls.firstCtrl.setValue(10.5);
    expect(component.firstFormGroup.invalid).toBeTrue();
    component.firstFormGroup.controls.firstCtrl.setValue(10);
    expect(component.firstFormGroup.valid).toBeTrue();
  });

  it('never decrements below the minimum order', () => {
    component.decrement();
    expect(component.countBiscuits).toBe(10);
  });

  it('does not start a payment without a preview', async () => {
    const checkout = spyOn(component.stripeService, 'createCheckoutSession');
    await component.makePayment();
    expect(checkout).not.toHaveBeenCalled();
  });

  it('enables the demo button with an order and explains that no charge is made', () => {
    component.imageData = 'data:image/png;base64,iVBORw0KGgo=';
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.pay-button');
    expect(button.disabled).toBeFalse();
    expect(button.textContent).toContain('Prova pagamento Stripe');
    expect(fixture.nativeElement.querySelector('.payment-notice').textContent).toContain('nessun addebito');
    component.firstFormGroup.controls.firstCtrl.setValue(9);
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });
});
