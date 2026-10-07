import { addBusinessDays, validRequestedDate, DeliveryService, DELIVERY_TIMES } from './delivery.service';

describe('Delivery timing', () => {
  it('skips weekends, including a weekend order and a year boundary', () => {
    expect(addBusinessDays('2026-10-09', 7)).toBe('2026-10-20');
    expect(addBusinessDays('2026-10-10', 7)).toBe('2026-10-20');
    expect(addBusinessDays('2026-12-31', 2)).toBe('2027-01-04');
  });
  it('handles leap years and DST without shifting calendar dates', () => {
    expect(addBusinessDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addBusinessDays('2026-03-27', 1)).toBe('2026-03-30');
  });
  it('allows no preference and rejects past dates and impossible dates', () => {
    expect(validRequestedDate('', '2026-10-07')).toBeTrue();
    expect(validRequestedDate('2026-10-07', '2026-10-07')).toBeTrue();
    expect(validRequestedDate('2026-10-06', '2026-10-07')).toBeFalse();
    expect(validRequestedDate('2027-02-29', '2026-10-07')).toBeFalse();
    expect(validRequestedDate('invalid', '2026-10-07')).toBeFalse();
  });
  it('keeps the requested date across new service instances', () => {
    let saved = '';
    spyOn(Storage.prototype, 'getItem').and.callFake(() => saved);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { saved = value; });
    spyOn(Storage.prototype, 'removeItem').and.callFake(() => { saved = ''; });
    const service = new DeliveryService();
    service.requestedDate = '2099-12-10';
    expect(new DeliveryService().requestedDate).toBe('2099-12-10');
    service.requestedDate = '';
    expect(new DeliveryService().requestedDate).toBe('');
  });
  it('does not invent an estimate when operating times are missing', () => {
    const previous = DELIVERY_TIMES.preparationBusinessDays;
    try {
      DELIVERY_TIMES.preparationBusinessDays = null;
      expect(new DeliveryService().earliestDate).toBeNull();
    } finally { DELIVERY_TIMES.preparationBusinessDays = previous; }
  });
});
