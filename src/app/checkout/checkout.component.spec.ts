import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutComponent } from './checkout.component';
import { CartService } from '../cart.service';
import { CookieDraft } from '../cookie-design.service';

const draft: CookieDraft = { testoInput: 'Anna', testoDueInput: '', testoTreInput: '', selectedFontFamily: 'CocoGothic', fontSize: 36, selectedColor: '', selectedColorSfondo: '', croppedImage: '', textPosition: { x: 0, y: 0 } };
describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;
  beforeEach(async () => {
    localStorage.removeItem('cookie-cart-v1');
    sessionStorage.removeItem('cookie-cart-editing'); sessionStorage.removeItem('cookie-direct-order');
    await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => { localStorage.removeItem('cookie-cart-v1'); sessionStorage.removeItem('cookie-cart-editing'); sessionStorage.removeItem('cookie-direct-order'); });
  it('should create', () => { expect(component).toBeTruthy(); });
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


  it('prices models separately and applies shipping once', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    component.cart.add('cuore', 'data:image/png;base64,test', { ...draft, testoInput: 'Luca' });
    component.updateQuantity(component.cart.items[0], 12);
    expect(component.counter).toBe(40);
    expect(component.counter + component.shipping).toBe(46);
    expect(component.cart.quantity).toBe(22);
  });
  it('blocks checkout for invalid quantities without corrupting the saved cart', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    const item = component.cart.items[0];
    component.updateQuantity(item, 9);
    expect(component.invalidOrder).toBeTrue();
    expect(component.cart.items[0].quantity).toBe(10);
    component.updateQuantity(item, 10.5);
    expect(component.invalidOrder).toBeTrue();
    component.updateQuantity(item, 12);
    expect(component.invalidOrder).toBeFalse();
    component.remove(item);
    expect(component.invalidOrder).toBeTrue();
  });
  it('does not start a payment with an empty cart', async () => {
    const checkout = spyOn(component.stripeService, 'createCheckoutSession');
    await component.makePayment();
    expect(checkout).not.toHaveBeenCalled();
  });
  it('checks out only the direct design while preserving the cart', async () => {
    component.cart.add('cerchio', 'data:image/png;base64,cart', draft);
    component.cart.checkoutDirect('cuore', 'data:image/png;base64,direct', { ...draft, testoInput: 'Luca' });
    component.direct = true;
    component.updateQuantity(component.items[0], 12);
    expect(component.counter).toBe(25);
    const checkout = spyOn(component.stripeService, 'createCheckoutSession').and.rejectWith(new Error('test'));
    await component.makePayment();
    const order = checkout.calls.mostRecent().args[0];
    expect(order.items.length).toBe(1);
    expect(order.items[0].message).toBe('Luca');
    expect(order.items[0].quantity).toBe(12);
    expect(component.cart.items[0].quantity).toBe(10);
  });
  it('sends every model and its quantity to checkout', async () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    component.cart.add('cuore', 'data:image/png;base64,test', { ...draft, testoInput: '' });
    const checkout = spyOn(component.stripeService, 'createCheckoutSession').and.rejectWith(new Error('test'));
    await component.makePayment();
    const order = checkout.calls.mostRecent().args[0];
    expect(order.items.length).toBe(2);
    expect(order.items[0].message).toBe('Anna');
    expect(order.items[1].font).toBe('');
    expect(order.items.map(item => item.quantity)).toEqual([10, 10]);
  });
});
