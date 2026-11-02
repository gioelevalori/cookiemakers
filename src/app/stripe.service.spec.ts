import { StripeService } from './stripe.service';
import { environment } from './environment';

describe('StripeService', () => {
  let previous: typeof environment.stripe;
  const order = { items: [{ quantity: 10, shape: 'cerchio', preview: '', message: '', textColor: '', backgroundColor: '', font: '', image: '' }] };

  beforeEach(() => { previous = { ...environment.stripe }; });
  afterEach(() => { Object.assign(environment.stripe, previous); });

  it('opens the official public demo without contacting a payment backend', async () => {
    Object.assign(environment.stripe, { demo: true, paymentEndpoint: '', publishableKey: '' });
    const service = new StripeService();
    const fetchSpy = spyOn(window, 'fetch');
    expect(service.configured).toBeTrue();
    expect(service.demoUrl).toBe('https://checkout.stripe.dev/checkout');
    await expectAsync(service.createPayment(order)).toBeRejected();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is disabled until both the endpoint and the publishable key are set', async () => {
    Object.assign(environment.stripe, { demo: false, paymentEndpoint: '/api/create-payment.php', publishableKey: '' });
    const service = new StripeService();
    const fetchSpy = spyOn(window, 'fetch');
    expect(service.configured).toBeFalse();
    await expectAsync(service.createPayment(order)).toBeRejected();
    await expectAsync(service.load()).toBeRejected();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns the client secret and surfaces the server validation message', async () => {
    Object.assign(environment.stripe, { demo: false, paymentEndpoint: '/api/create-payment.php', publishableKey: 'pk_test_x' });
    const service = new StripeService();
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ clientSecret: 'pi_1_secret_2', orderId: 'ABCD1234' }), { status: 200 }));
    await expectAsync(service.createPayment(order)).toBeResolvedTo({ clientSecret: 'pi_1_secret_2', orderId: 'ABCD1234' });
    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/create-payment.php');
    fetchSpy.and.resolveTo(new Response(JSON.stringify({ error: 'Inserisci un indirizzo email valido.' }), { status: 400 }));
    await expectAsync(service.createPayment(order)).toBeRejectedWithError('Inserisci un indirizzo email valido.');
  });

  it('returns to the checkout with a clean result parameter', () => {
    const url = new StripeService().returnUrl();
    expect(url).toMatch(/[?&]pagamento=ok$/);
    expect(url.match(/pagamento=/g)?.length).toBe(1);
  });
});
