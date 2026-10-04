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
});
