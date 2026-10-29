import { Injectable } from '@angular/core';
import { environment } from './environment';
import { CookieRecipe, CookieCovering } from './cookie-product';
import { OrderDetails } from './order-request.service';

export interface CheckoutOrder extends Partial<OrderDetails> {
  requestedDate?: string;
  items: CheckoutItem[];
}

/** Checkout query parameter set by the server's Stripe success and cancel URLs. */
export const PAYMENT_RESULT_PARAM = 'pagamento';

export interface CheckoutItem {
  recipe?: CookieRecipe;
  covering?: CookieCovering | null;
  requestedDate?: string;
  quantity: number;
  shape: string;
  preview: string;
  message: string;
  textColor: string;
  backgroundColor: string;
  font: string;
  image: string;
  lines?: string[];
  fontSize?: number;
  textPosition?: { x: number; y: number };
  originalImage?: string;
  originalImageName?: string;
}

@Injectable({ providedIn: 'root' })
export class StripeService {
  readonly demo = environment.stripe.demo;
  readonly configured = this.demo || Boolean(environment.stripe.checkoutEndpoint);

  async createCheckoutSession(order: CheckoutOrder): Promise<string> {
    // The public Stripe demo uses its own sample order and needs no backend or keys.
    if (this.demo) return 'https://checkout.stripe.dev/checkout';
    if (!this.configured) throw new Error('Pagamento online non disponibile.');
    const response = await fetch(environment.stripe.checkoutEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...order, returnUrl: this.returnUrl() })
    });
    if (!response.ok) throw new Error('Impossibile avviare il pagamento.');
    const session: { url?: string } = await response.json();
    if (!session.url) throw new Error('Sessione di pagamento non valida.');
    const checkoutUrl = new URL(session.url);
    if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') {
      throw new Error('Indirizzo di pagamento non valido.');
    }
    return checkoutUrl.href;
  }

  // Stripe sends the customer back to this checkout page, with or without hash routes.
  private returnUrl(): string {
    return window.location.href.replace(new RegExp(`[?&]${PAYMENT_RESULT_PARAM}=[^&#]*(&session_id=[^&#]*)?`), '');
  }
}
