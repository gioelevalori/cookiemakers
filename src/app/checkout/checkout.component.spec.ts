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
    sessionStorage.removeItem('cookie-order-details-v1');
    await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => { localStorage.removeItem('cookie-cart-v1'); sessionStorage.removeItem('cookie-cart-editing'); sessionStorage.removeItem('cookie-direct-order'); sessionStorage.removeItem('cookie-order-details-v1'); });
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
  it('removes shipping charges for pickup and persists notes for the PDF', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    component.firstFormGroup.patchValue({ deliveryMethod: 'pickup', notes: 'Per un matrimonio' });
    expect(component.shipping).toBe(0);
    expect(component.counter + component.shipping).toBe(15);
    expect(component.orderRequest.details.notes).toBe('Per un matrimonio');
    component.firstFormGroup.controls.deliveryMethod.setValue('shipping');
    expect(component.shipping).toBe(6);
  });
  it('encodes the complete multi-design inquiry for the bakery WhatsApp number', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', { ...draft, recipe: 'lactose-free', covering: 'sugar-paste', selectedColorSfondo: '#FFD43B' });
    component.cart.add('cuore', 'data:image/png;base64,test', { ...draft, testoInput: 'A&B' });
    component.firstFormGroup.patchValue({ deliveryMethod: 'pickup', customerName: 'Sara', notes: 'Confezioni & fiocco' });
    const url = new URL(component.whatsappOrderUrl);
    expect(url.pathname).toBe('/393491687845');
    const message = url.searchParams.get('text')!;
    expect(message).toContain('Senza lattosio');
    expect(message).toContain('Pasta di zucchero');
    expect(message).toContain('Via Roma, 78');
    expect(message).toContain('A&B');
    expect(message).toContain('Confezioni & fiocco');
    expect(message).toContain('30,00');
    expect(message).toContain('da allegare');
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
