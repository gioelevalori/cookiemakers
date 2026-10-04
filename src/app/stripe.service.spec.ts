import { TestBed } from '@angular/core/testing';

import { StripeService } from './stripe.service';
import { environment } from './environment';

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StripeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not contact Stripe when checkout is not configured', async () => {
    const fetchSpy = spyOn(window, 'fetch');
    await expectAsync(service.createCheckoutSession({ quantity: 10, shape: 'cerchio', preview: '', message: '', textColor: '', backgroundColor: '', font: '', image: '' })).toBeRejected();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a redirect outside the hosted Stripe checkout', async () => {
    const previous = environment.stripe.checkoutEndpoint;
    environment.stripe.checkoutEndpoint = '/checkout-session';
    try {
      const configuredService = new StripeService();
      spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ url: 'https://example.com' }), { status: 200 }));
      await expectAsync(configuredService.createCheckoutSession({ quantity: 10, shape: 'cerchio', preview: '', message: '', textColor: '', backgroundColor: '', font: '', image: '' })).toBeRejected();
    } finally {
      environment.stripe.checkoutEndpoint = previous;
    }
  });
});
