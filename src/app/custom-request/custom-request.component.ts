import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COOKIE_BUSINESS, whatsappUrl } from '../cookie-product';
import { DeliveryService, validRequestedDate } from '../delivery.service';

@Component({ standalone: false, selector: 'app-custom-request', changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './custom-request.component.html', styleUrls: ['./custom-request.component.css'] })
export class CustomRequestComponent implements OnDestroy {
  private readonly builder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly delivery = inject(DeliveryService);
  readonly business = COOKIE_BUSINESS;
  readonly occasions = ['Compleanno', 'Matrimonio', 'Nascita o battesimo', 'Laurea', 'Aziendale', 'Altra occasione'];
  readonly packagingOptions = [{ id: 'da-concordare', label: 'Scegliamo insieme' }, { id: 'singola', label: 'Confezione singola' }, { id: 'scatola', label: 'Scatola regalo' }, { id: 'evento', label: 'Confezioni coordinate per evento' }];
  readonly sizes = [{ id: 'da-concordare', label: 'Da scegliere insieme' }, { id: '4', label: 'Circa 4 cm' }, { id: '6', label: 'Circa 6 cm' }, { id: '8', label: 'Circa 8 cm' }, { id: 'altra', label: 'Un’altra misura' }];
  readonly form = this.builder.nonNullable.group({
    occasion: ['', Validators.required], name: ['', Validators.maxLength(120)],
    date: ['', (control: AbstractControl) => validRequestedDate(control.value, this.delivery.today) ? null : { date: true }],
    quantity: [10, [Validators.required, Validators.min(10), Validators.pattern(/^[0-9]+$/)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    colors: ['', Validators.maxLength(120)], packaging: ['da-concordare'], size: ['da-concordare'],
    ribbon: [false], card: [false], deliveryMethod: ['pickup']
  });
  referenceUrl = '';
  referenceName = '';
  referenceError = '';
  private destroyed = false;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const pack = params.get('confezione'), size = params.get('dimensione');
      if (this.packagingOptions.some(value => value.id === pack)) this.form.controls.packaging.setValue(pack!);
      if (this.sizes.some(value => value.id === size)) this.form.controls.size.setValue(size!);
    });
  }
  get requestUrl(): string {
    const value = this.form.getRawValue();
    return whatsappUrl([
      'Ciao! Vorrei una proposta per una creazione su misura My Cookie Delight.',
      `Occasione: ${value.occasion}`, value.name.trim() ? `Nome: ${value.name.trim()}` : '',
      value.date ? `Data desiderata: ${value.date}` : '', `Quantità: ${value.quantity} biscotti`,
      `La mia idea: ${value.description.trim()}`, value.colors.trim() ? `Colori desiderati: ${value.colors.trim()}` : '',
      `Misura indicativa: ${this.sizes.find(size => size.id === value.size)?.label || 'Da concordare'}`,
      `Confezione desiderata: ${this.packagingOptions.find(pack => pack.id === value.packaging)?.label || 'Da concordare'}`,
      value.ribbon ? 'Mi piacerebbe un nastro coordinato.' : '', value.card ? 'Mi piacerebbe un bigliettino.' : '',
      value.deliveryMethod === 'pickup' ? `Ritiro: ${this.business.pickupName}, ${this.business.pickupAddress}` : 'Consegna: spedizione',
      this.referenceName ? `Foto di riferimento: ${this.referenceName}. La allego alla chat.` : '',
      'Vorrei confermare fattibilità, confezione, misure, ingredienti e allergeni, prezzo e tempi prima di ordinare.'
    ].filter(Boolean).join('\n\n'));
  }
  prepareRequest(event: Event): void {
    if (this.form.invalid || this.referenceError) { event.preventDefault(); this.form.markAllAsTouched(); }
  }
  async selectReference(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.removeReference();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      this.referenceError = 'Scegli una foto JPG, PNG o WebP fino a 8 MB.'; input.value = ''; return;
    }
    const url = URL.createObjectURL(file);
    this.referenceUrl = url;
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!this.destroyed && this.referenceUrl === url) this.referenceName = file.name.slice(0, 160);
    } catch {
      if (!this.destroyed && this.referenceUrl === url) { this.removeReference(); this.referenceError = 'Impossibile leggere questa foto. Scegli un altro file.'; input.value = ''; }
    }
  }
  removeReference(): void {
    if (this.referenceUrl) URL.revokeObjectURL(this.referenceUrl);
    this.referenceUrl = ''; this.referenceName = ''; this.referenceError = '';
  }
  ngOnDestroy(): void { this.destroyed = true; this.removeReference(); }
}
