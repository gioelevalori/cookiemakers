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
    expect(component.counter).toBe(39);
    expect(component.counter + component.shipping).toBe(45);
    expect(component.cart.quantity).toBe(17);
  });
  it('blocks checkout for invalid quantities without corrupting the saved cart', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    const item = component.cart.items[0];
    component.updateQuantity(item, 4);
    expect(component.invalidOrder).toBeTrue();
    expect(component.cart.items[0].quantity).toBe(5);
    component.updateQuantity(item, 10.5);
    expect(component.invalidOrder).toBeTrue();
    component.updateQuantity(item, 12);
    expect(component.invalidOrder).toBeFalse();
    component.remove(item);
    expect(component.invalidOrder).toBeTrue();
  });
  it('does not start a payment with an empty cart', async () => {
    const checkout = spyOn(component.stripeService, 'elements');
    await component.openPayment();
    expect(component.paymentOpen).toBeFalse();
    expect(checkout).not.toHaveBeenCalled();
  });
  it('removes shipping charges for pickup and persists notes for the PDF', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    component.firstFormGroup.patchValue({ deliveryMethod: 'pickup', notes: 'Per un matrimonio' });
    expect(component.shipping).toBe(0);
    expect(component.counter + component.shipping).toBe(12.5);
    expect(component.orderRequest.details.notes).toBe('Per un matrimonio');
    component.firstFormGroup.controls.deliveryMethod.setValue('shipping');
    expect(component.shipping).toBe(6);
  });
  it('encodes the complete multi-design inquiry for the bakery WhatsApp number', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', { ...draft, recipe: 'lactose-free', covering: 'royal-icing', selectedColorSfondo: '#FFD43B' });
    component.cart.add('cuore', 'data:image/png;base64,test', { ...draft, testoInput: 'A&B' });
    component.firstFormGroup.patchValue({ deliveryMethod: 'pickup', notes: 'Confezioni & fiocco' });
    const url = new URL(component.whatsappOrderUrl);
    expect(url.pathname).toBe('/393516777748');
    const message = url.searchParams.get('text')!;
    expect(message).toContain('Senza lattosio');
    expect(message).toContain('Ghiaccia reale');
    expect(message).toContain('Via Roma, 78');
    expect(message).toContain('A&B');
    expect(message).toContain('Confezioni & fiocco');
    expect(message).toContain('25,00');
    expect(message).toContain('da allegare');
  });
  it('checks out only the direct design while preserving the cart', async () => {
    component.cart.add('cerchio', 'data:image/png;base64,cart', draft);
    component.cart.checkoutDirect('cuore', 'data:image/png;base64,direct', { ...draft, testoInput: 'Luca' });
    component.direct = true;
    component.updateQuantity(component.items[0], 12);
    expect(component.counter).toBe(26.5);
    const order = component.buildOrder();
    expect(order.items.length).toBe(1);
    expect(order.items[0].message).toBe('Luca');
    expect(order.items[0].quantity).toBe(12);
    expect(component.cart.items[0].quantity).toBe(5);
  });
  it('sends every model and its quantity to checkout', async () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    component.cart.add('cuore', 'data:image/png;base64,test', { ...draft, testoInput: '' });
    const order = component.buildOrder();
    expect(order.items.length).toBe(2);
    expect(order.items[0].message).toBe('Anna');
    expect(order.items[1].font).toBe('');
    expect(order.items.map(item => item.quantity)).toEqual([5, 5]);
  });
  it('sends the text lines, layout and original photo for the order email', async () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', { ...draft, testoDueInput: 'Auguri', fontSize: 28, textPosition: { x: 4, y: -10 },
      croppedImage: 'data:image/jpeg;base64,crop', originalImage: 'data:image/jpeg;base64,orig', originalImageName: 'foto.jpg' });
    const [item] = component.buildOrder().items;
    expect(item.lines).toEqual(['Anna', 'Auguri', '']);
    expect(item.fontSize).toBe(28);
    expect(item.textPosition).toEqual({ x: 4, y: -10 });
    expect(item.originalImage).toBe('data:image/jpeg;base64,orig');
    expect(item.originalImageName).toBe('foto.jpg');
  });
  it('does not send name or address with the order details: the payment form collects them', () => {
    component.cart.add('cerchio', 'data:image/png;base64,test', draft);
    const order = component.buildOrder();
    expect(Object.keys(order).sort()).toEqual(['deliveryMethod', 'items', 'notes', 'requestedDate']);
  });
  it('requires name, email and phone before paying', () => {
    component.contactForm.setValue({ name: 'Mario Rossi', email: 'non-valida', phone: '3330000000' });
    expect(component.contactForm.invalid).toBeTrue();
    component.contactForm.controls.email.setValue('mario@example.com');
    expect(component.contactForm.valid).toBeTrue();
  });
  it('empties only the paid order when Stripe returns to the checkout', () => {
    component.cart.add('cerchio', 'data:image/png;base64,cart', draft);
    component.cart.checkoutDirect('cuore', 'data:image/png;base64,direct', draft);
    sessionStorage.setItem('cookie-pending-payment', 'direct');
    component['completePaidOrder']();
    expect(component.cart.directItem).toBeNull();
    expect(component.cart.items.length).toBe(1);
    expect(sessionStorage.getItem('cookie-pending-payment')).toBeNull();
    component['completePaidOrder']();
    expect(component.cart.items.length).toBe(1);
  });
});
