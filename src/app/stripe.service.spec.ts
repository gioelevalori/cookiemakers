import { TestBed } from '@angular/core/testing';

import { StripeService } from './stripe.service';
import { environment } from './environment';

describe('StripeService', () => {
  let service: StripeService;
  let previousDemo: boolean;
  let previousEndpoint: string;

  beforeEach(() => {
    previousDemo = environment.stripe.demo;
    previousEndpoint = environment.stripe.checkoutEndpoint;
    environment.stripe.demo = false;
    environment.stripe.checkoutEndpoint = '';
    TestBed.configureTestingModule({});
    service = TestBed.inject(StripeService);
  });

  afterEach(() => {
    environment.stripe.demo = previousDemo;
    environment.stripe.checkoutEndpoint = previousEndpoint;
  });

  it('opens the official public demo without contacting a payment backend', async () => {
    environment.stripe.demo = true;
    environment.stripe.checkoutEndpoint = '/checkout-session';
    const demoService = new StripeService();
    const fetchSpy = spyOn(window, 'fetch');
    expect(demoService.configured).toBeTrue();
    expect(demoService.demo).toBeTrue();
    await expectAsync(demoService.createCheckoutSession({ items: [{ quantity: 10, shape: 'cerchio', preview: '', message: '', textColor: '', backgroundColor: '', font: '', image: '' }] }))
      .toBeResolvedTo('https://checkout.stripe.dev/checkout');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not contact Stripe when checkout is not configured', async () => {
    const fetchSpy = spyOn(window, 'fetch');
    await expectAsync(service.createCheckoutSession({ items: [{ quantity: 10, shape: 'cerchio', preview: '', message: '', textColor: '', backgroundColor: '', font: '', image: '' }] })).toBeRejected();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a redirect outside the hosted Stripe checkout', async () => {
    const previous = environment.stripe.checkoutEndpoint;
    environment.stripe.checkoutEndpoint = '/checkout-session';
    try {
      const configuredService = new StripeService();
      spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ url: 'https://example.com' }), { status: 200 }));
      await expectAsync(configuredService.createCheckoutSession({ items: [{ quantity: 10, shape: 'cerchio', preview: '', message: '', textColor: '', backgroundColor: '', font: '', image: '' }] })).toBeRejected();
    } finally {
      environment.stripe.checkoutEndpoint = previous;
    }
  });
});
