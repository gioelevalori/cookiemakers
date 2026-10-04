import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { throwError } from 'rxjs';
import { environment } from './environment';

@Injectable({
  providedIn: 'root'
})
export class MailchimpService {

  constructor(private http: HttpClient) {}

  subscribe(email: string) {
    if (!environment.newsletterEndpoint) {
      return throwError(() => new Error('Iscrizione newsletter non disponibile.'));
    }
    return this.http.post(environment.newsletterEndpoint, { email });
  }
}
