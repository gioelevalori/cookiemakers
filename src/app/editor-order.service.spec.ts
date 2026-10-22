import { TestBed } from '@angular/core/testing';
import { EditorOrderService } from './editor-order.service';
import { OrderRequestService } from './order-request.service';
import { CartService } from './cart.service';
import { CookieDraft } from './cookie-design.service';

const draft: CookieDraft = { testoInput: 'Ciao', testoDueInput: '', testoTreInput: '', selectedFontFamily: 'CocoGothic', fontSize: 36, selectedColor: '', selectedColorSfondo: '', croppedImage: '', textPosition: { x: 0, y: 0 } };
describe('EditorOrderService', () => {
  beforeEach(() => { localStorage.removeItem('cookie-cart-v1'); sessionStorage.clear(); });
  afterEach(() => { localStorage.removeItem('cookie-cart-v1'); sessionStorage.clear(); });
  it('uses the same quantity and delivery price as checkout', () => {
    const order = TestBed.inject(EditorOrderService);
    order.quantityControl.setValue(12);
    order.method = 'pickup';
    expect(order.subtotal).toBe(25); expect(order.total).toBe(25);
    order.method = 'shipping';
    expect(order.total).toBe(31);
    expect(TestBed.inject(OrderRequestService).details.deliveryMethod).toBe('shipping');
  });
  it('rejects invalid quantities and resets the editor', () => {
    const order = TestBed.inject(EditorOrderService);
    for (const value of [9, 10.5, -1]) { order.quantityControl.setValue(value); expect(order.invalid).toBeTrue(); }
    order.editingId = 'example'; order.reset();
    expect(order.quantity).toBe(10); expect(order.invalid).toBeFalse(); expect(order.editingId).toBeNull();
  });
  it('carries the chosen quantity into both cart and direct order', () => {
    const cart = TestBed.inject(CartService);
    cart.add('cerchio', 'data:image/png;base64,test', draft, 12);
    cart.checkoutDirect('cuore', 'data:image/png;base64,test', draft, 14);
    expect(cart.items[0].quantity).toBe(12); expect(cart.directItem!.quantity).toBe(14);
    expect(() => cart.add('cerchio', 'data:image/png;base64,test', draft, 9)).toThrow();
    expect(cart.items.length).toBe(1);
  });
});
