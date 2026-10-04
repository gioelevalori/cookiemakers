import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MailchimpService } from './mail.service';

describe('MailchimpService', () => {
  let service: MailchimpService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MailchimpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
