import { Injectable } from '@angular/core';
import { environment } from './environment';

export interface CheckoutOrder {
  requestedDate?: string;
  items: CheckoutItem[];
}

export interface CheckoutItem {
  requestedDate?: string;
  quantity: number;
  shape: string;
  preview: string;
  message: string;
  textColor: string;
  backgroundColor: string;
  font: string;
  image: string;
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
      body: JSON.stringify(order)
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
}
