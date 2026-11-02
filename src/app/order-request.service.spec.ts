import { OrderRequestService } from './order-request.service';

describe('Order request details', () => {
  beforeEach(() => sessionStorage.removeItem('cookie-order-details-v1'));
  afterEach(() => sessionStorage.removeItem('cookie-order-details-v1'));
  it('persists delivery and notes within the current browser session', () => {
    const details = { deliveryMethod: 'pickup' as const, notes: 'Un fiocco giallo' };
    const service = new OrderRequestService();
    service.update(details);
    expect(new OrderRequestService().details).toEqual(details);
  });
  it('rejects malformed storage and returns independent snapshots', () => {
    sessionStorage.setItem('cookie-order-details-v1', JSON.stringify({ deliveryMethod: 'unknown' }));
    const service = new OrderRequestService();
    const snapshot = service.details;
    snapshot.notes = 'Changed';
    expect(service.details.notes).toBe('');
    expect(service.details.deliveryMethod).toBe('shipping');
  });
  it('drops name and address saved by older versions of the checkout', () => {
    sessionStorage.setItem('cookie-order-details-v1', JSON.stringify({ deliveryMethod: 'pickup', customerName: 'Anna', address: 'Via Roma 1', notes: 'Ciao' }));
    expect(new OrderRequestService().details).toEqual({ deliveryMethod: 'pickup', notes: 'Ciao' });
  });
  it('keeps details in memory when session storage is blocked', () => {
    const service = new OrderRequestService();
    spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError');
    service.update({ deliveryMethod: 'pickup', notes: 'Hello' });
    expect(service.details.notes).toBe('Hello');
  });
});
