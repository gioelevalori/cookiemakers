import { TestBed } from '@angular/core/testing';

import { ServiceRettangoloService } from './service-rettangolo.service';

describe('ServiceRettangoloService', () => {
  let service: ServiceRettangoloService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceRettangoloService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
