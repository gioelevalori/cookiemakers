import { Injectable } from '@angular/core';
import { environment } from './environment';
import { CookieRecipe, CookieCovering } from './cookie-product';
import { OrderDetails } from './order-request.service';

export interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface CheckoutAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CheckoutOrder extends Partial<OrderDetails> {
  requestedDate?: string;
  items: CheckoutItem[];
  customer?: CheckoutCustomer;
  shipping?: { name: string; address: CheckoutAddress } | null;
}

/** Checkout query parameter set on the return URL of payment methods that leave the site (e.g. Klarna). */
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

// Minimal typing of the Stripe.js calls used by the checkout (https://docs.stripe.com/js).
export interface StripeElement {
  mount(target: HTMLElement): void;
  destroy(): void;
  getValue?(): Promise<{ complete: boolean; value: { name: string; address: CheckoutAddress } }>;
}
export interface StripeElements {
  create(type: 'payment' | 'address', options?: object): StripeElement;
  submit(): Promise<{ error?: { message?: string } }>;
}
export interface StripeJs {
  elements(options: object): StripeElements;
  confirmPayment(options: object): Promise<{ error?: { message?: string }; paymentIntent?: { status: string } }>;
}
declare global {
  interface Window { Stripe?: (publishableKey: string, options?: object) => StripeJs; }
}

/** Matches the Payment and Address Elements to the site: Nunito Sans, dark green text, soft borders. */
export const STRIPE_APPEARANCE = {
  theme: 'stripe',
  variables: {
    fontFamily: '"Nunito Sans", sans-serif',
    fontSizeBase: '15px',
    colorPrimary: '#205a48',
    colorText: '#253b33',
    colorTextSecondary: '#61766a',
    colorTextPlaceholder: '#8a9b91',
    colorBackground: '#ffffff',
    colorDanger: '#a32e43',
    borderRadius: '6px',
    spacingUnit: '4px'
  },
  rules: {
    '.Input': { border: '1px solid #b4c9bc', boxShadow: 'none', padding: '14px' },
    '.Input:focus': { border: '1px solid #205a48', boxShadow: '0 0 0 1px #205a48' },
    '.Tab': { border: '1px solid #dde6e0', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#205a48', boxShadow: '0 0 0 1px #205a48' },
    '.Label': { color: '#61766a', fontWeight: '400' }
  }
};
const STRIPE_FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600&display=swap' }];

@Injectable({ providedIn: 'root' })
export class StripeService {
  readonly demo = environment.stripe.demo;
  readonly configured = this.demo || Boolean(environment.stripe.paymentEndpoint && environment.stripe.publishableKey);
  private stripe: Promise<StripeJs> | null = null;

  /** The public Stripe demo uses its own sample order and needs no backend or keys. */
  readonly demoUrl = 'https://checkout.stripe.dev/checkout';

  /** Loads Stripe.js from js.stripe.com once, as Stripe requires for PCI compliance. */
  load(): Promise<StripeJs> {
    if (!this.configured || this.demo) return Promise.reject(new Error('Pagamento online non disponibile.'));
    this.stripe ??= new Promise<StripeJs>((resolve, reject) => {
      const ready = () => window.Stripe ? resolve(window.Stripe(environment.stripe.publishableKey, { locale: 'it' })) : reject(new Error('Stripe non disponibile.'));
      if (window.Stripe) return ready();
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = ready;
      script.onerror = () => { this.stripe = null; reject(new Error('Impossibile caricare Stripe.')); };
      document.head.appendChild(script);
    });
    return this.stripe;
  }

  /** Payment form in deferred mode: the PaymentIntent is created only when the customer pays. */
  async elements(amountCents: number): Promise<{ stripe: StripeJs; elements: StripeElements }> {
    const stripe = await this.load();
    const elements = stripe.elements({ mode: 'payment', amount: amountCents, currency: 'eur', locale: 'it',
      appearance: STRIPE_APPEARANCE, fonts: STRIPE_FONTS });
    return { stripe, elements };
  }

  /** Stores the order on the server, which prices it and returns the PaymentIntent client secret. */
  async createPayment(order: CheckoutOrder): Promise<{ clientSecret: string; orderId: string }> {
    if (this.demo || !this.configured) throw new Error('Pagamento online non disponibile.');
    const response = await fetch(environment.stripe.paymentEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    const body: { clientSecret?: string; orderId?: string; error?: string } = await response.json().catch(() => ({}));
    if (!response.ok || !body.clientSecret) throw new Error(body.error || 'Impossibile avviare il pagamento.');
    return { clientSecret: body.clientSecret, orderId: body.orderId || '' };
  }

  /** Page Stripe returns to after payment methods that leave the site, with or without hash routes. */
  returnUrl(): string {
    const url = window.location.href.replace(/[?&](pagamento|payment_intent|payment_intent_client_secret|redirect_status)=[^&#]*/g, '');
    return url + (url.includes('?') ? '&' : '?') + `${PAYMENT_RESULT_PARAM}=ok`;
  }
}
