import { TestBed } from '@angular/core/testing';
import { EditorQuoteComponent } from './editor-quote.component';
import { EditorOrderService } from './editor-order.service';

describe('EditorQuoteComponent', () => {
  beforeEach(() => { sessionStorage.clear(); TestBed.inject(EditorOrderService).reset(); });

  it('steps one cookie at a time from the minimum of 5', () => {
    const quote = TestBed.runInInjectionContext(() => new EditorQuoteComponent());
    expect(quote.order.quantity).toBe(5);
    quote.changeQuantity(1);
    expect(quote.order.quantity).toBe(6);
    quote.changeQuantity(1);
    expect(quote.order.quantity).toBe(7);
    quote.changeQuantity(-1);
    quote.changeQuantity(-1);
    quote.changeQuantity(-1);
    expect(quote.order.quantity).toBe(5);
    expect(quote.order.subtotal).toBe(12.5);
  });
});
