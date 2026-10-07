import { CartService } from './cart.service';
import { CookieDesignService, CookieDraft } from './cookie-design.service';

const draft: CookieDraft = { testoInput: 'Anna', testoDueInput: '', testoTreInput: '',
  selectedFontFamily: 'CocoGothic', fontSize: 36, selectedColor: '#ff0000', selectedColorSfondo: '',
  croppedImage: '', originalImage: '', originalImageName: '', textPosition: { x: 0, y: 0 } };

describe('CartService', () => {
  let cart: CartService;
  beforeEach(() => {
    localStorage.removeItem('cookie-cart-v1'); sessionStorage.removeItem('cookie-cart-editing');
    cart = new CartService(new CookieDesignService());
  });
  afterEach(() => { localStorage.removeItem('cookie-cart-v1'); sessionStorage.removeItem('cookie-cart-editing'); localStorage.removeItem('cookie-design-v1'); });
  it('preserves independent snapshots and quantities after reload', () => {
    const input = { ...draft, textPosition: { x: 0, y: 0 } };
    cart.add('cerchio', 'data:image/png;base64,test', input);
    input.testoInput = 'Luca'; input.textPosition.x = 20;
    cart.add('cuore', 'data:image/png;base64,test', input);
    cart.updateQuantity(cart.items[0].id, 12);
    const restored = new CartService(new CookieDesignService());
    expect(restored.items[0].draft.testoInput).toBe('Anna');
    expect(restored.items[0].draft.textPosition.x).toBe(0);
    expect(restored.items[1].draft.testoInput).toBe('Luca');
    expect(restored.quantity).toBe(22);
    expect(restored.total).toBe(40);
  });
  it('updates an edited model instead of adding a duplicate, even after reload', () => {
    cart.add('cerchio', 'data:image/png;base64,test', draft);
    const id = cart.items[0].id;
    cart.updateQuantity(id, 14);
    cart.edit(cart.items[0]);
    const restored = new CartService(new CookieDesignService());
    restored.add('quadrato', 'data:image/png;base64,updated', { ...draft, testoInput: 'Nuovo' });
    expect(restored.items.length).toBe(1);
    expect(restored.items[0].id).toBe(id);
    expect(restored.items[0].quantity).toBe(14);
    expect(restored.items[0].shape).toBe('quadrato');
    expect(restored.editingId).toBeNull();
  });
  it('starts a new design without deleting other cart items', () => {
    cart.add('cerchio', 'data:image/png;base64,test', draft);
    cart.edit(cart.items[0]);
    cart.startNew();
    cart.add('cuore', 'data:image/png;base64,test', draft);
    expect(cart.items.length).toBe(2);
    cart.remove(cart.items[0].id);
    expect(new CartService(new CookieDesignService()).items.length).toBe(1);
  });
  it('reports a storage failure and keeps all models in memory', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('quota');
    cart.add('cerchio', 'data:image/png;base64,test', draft);
    expect(cart.items.length).toBe(1);
    expect(cart.storageError).toContain('non è stato possibile salvarlo');
  });
});
