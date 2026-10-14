import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { COOKIE_BUSINESS, whatsappUrl } from '../cookie-product';
import { DeliveryService, validRequestedDate } from '../delivery.service';

@Component({
  standalone: false,
  selector: 'app-eventi',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './eventi.component.html',
  styleUrls: ['./eventi.component.css']
})
export class EventiComponent {
  private readonly builder = inject(FormBuilder);
  readonly delivery = inject(DeliveryService);
  readonly business = COOKIE_BUSINESS;
  readonly occasions = ['Matrimonio', 'Compleanno', 'Battesimo e nascita', 'Laurea', 'Evento aziendale', 'Altra occasione'];
  readonly form = this.builder.nonNullable.group({
    occasion: ['Matrimonio', Validators.required],
    date: ['', (control: AbstractControl) => validRequestedDate(control.value, this.delivery.today) ? null : { date: true }],
    quantity: [10, [Validators.required, Validators.min(10), (control: AbstractControl) => Number.isInteger(control.value) ? null : { integer: true }]],
    name: ['', Validators.maxLength(120)],
    deliveryMethod: ['pickup'],
    notes: ['', Validators.maxLength(1000)]
  });

  get requestUrl(): string {
    const value = this.form.getRawValue();
    return whatsappUrl([
      'Ciao! Vorrei informazioni sui biscotti My Cookie Delight per un evento.',
      `Occasione: ${value.occasion}`,
      value.name.trim() ? `Nome: ${value.name.trim()}` : '',
      value.date ? `Data dell'evento: ${value.date}` : '',
      `Quantita desiderata: ${value.quantity} biscotti`,
      value.deliveryMethod === 'pickup' ? `Ritiro in sede: ${this.business.pickupName}, ${this.business.pickupAddress}` : 'Consegna: spedizione',
      value.notes.trim() ? `Note e informazioni: ${value.notes.trim()}` : '',
      'Vorrei un preventivo e confermare disponibilita, personalizzazione, ingredienti e allergeni.'
    ].filter(Boolean).join('\n\n'));
  }

  request(event: Event): void {
    if (this.form.invalid) { event.preventDefault(); this.form.markAllAsTouched(); }
  }
}
