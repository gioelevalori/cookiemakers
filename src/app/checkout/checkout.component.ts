import { EditorOrderService } from '../editor-order.service';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CartItem, CartService } from '../cart.service';
import { StripeService } from '../stripe.service';
import { DeliveryService, validRequestedDate } from '../delivery.service';
import { COOKIE_BUSINESS, coveringLabel, recipeLabel, whatsappUrl } from '../cookie-product';
import { OrderRequestService } from '../order-request.service';

@Component({ standalone: false, changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-checkout', templateUrl: './checkout.component.html', styleUrls: ['./checkout.component.css'] })
export class CheckoutComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  direct = false;
  readonly cart = inject(CartService);
  private readonly editorOrder = inject(EditorOrderService);
  get items(): CartItem[] { return this.direct ? (this.cart.directItem ? [this.cart.directItem] : []) : this.cart.items; }
  get quantity(): number { return this.items.reduce((sum, item) => sum + item.quantity, 0); }
  readonly stripeService = inject(StripeService);
  readonly delivery = inject(DeliveryService);
  readonly orderRequest = inject(OrderRequestService);
  readonly business = COOKIE_BUSINESS;
  readonly recipeLabel = recipeLabel;
  readonly coveringLabel = coveringLabel;
  get shipping(): number { return this.firstFormGroup.controls.deliveryMethod.value === 'pickup' ? 0 : 6; }
  get earliestDate(): string | null { return this.delivery.earliestDateFor(this.firstFormGroup.controls.deliveryMethod.value); }
  quantityErrors = new Set<string>();
  isPaying = false;
  paymentError = '';
  readonly firstFormGroup = this.formBuilder.nonNullable.group({
    requestedDate: [this.delivery.requestedDate, (control: AbstractControl) => validRequestedDate(control.value, this.delivery.today) ? null : { requestedDate: true }],
    deliveryMethod: [this.orderRequest.details.deliveryMethod],
    customerName: [this.orderRequest.details.customerName, Validators.maxLength(120)],
    address: [this.orderRequest.details.address, Validators.maxLength(300)],
    notes: [this.orderRequest.details.notes, Validators.maxLength(1000)]
  });
  get counter(): number { return this.items.reduce((sum, item) => sum + this.cart.price(item.quantity), 0); }
  get invalidOrder(): boolean { return !this.items.length || this.quantityErrors.size > 0 || this.firstFormGroup.invalid; }
  get dateTooSoon(): boolean {
    const requested = this.firstFormGroup.controls.requestedDate;
    const earliest = this.earliestDate;
    return requested.valid && Boolean(requested.value && earliest && requested.value < earliest);
  }


  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => { this.direct = params.get('direct') === '1'; this.quantityErrors.clear(); });
    this.firstFormGroup.controls.requestedDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.delivery.requestedDate = value);
    this.firstFormGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.orderRequest.update(this.firstFormGroup.getRawValue()));
  }
  get whatsappOrderUrl(): string {
    const values = this.firstFormGroup.getRawValue();
    const currency = (amount: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
    const designs = this.items.map((item, index) => [
      `Biscotto ${index + 1}: ${item.shape} - ${item.quantity} pezzi`,
      `Impasto: ${recipeLabel(item.draft.recipe)}`,
      `Copertura: ${item.draft.selectedColorSfondo ? coveringLabel(item.draft.covering) : 'Biscotto naturale'}`,
      item.draft.selectedColorSfondo ? `Colore sfondo: ${item.draft.selectedColorSfondo}` : '',
      this.message(item) ? `Testo: ${this.message(item)}` : '',
      this.message(item) ? `Carattere: ${item.draft.selectedFontFamily}; dimensione: ${item.draft.fontSize} px; colore: ${item.draft.selectedColor || '#202925'}` : '',
      this.message(item) ? `Posizione testo: X ${item.draft.textPosition.x} px, Y ${item.draft.textPosition.y} px` : '',
      item.draft.croppedImage || this.message(item) ? 'Stampa su cialda di zucchero' : '',
      `Subtotale: ${currency(this.cart.price(item.quantity))}`
    ].filter(Boolean).join('\n')).join('\n\n');
    const message = [
      'Ciao! Vorrei richiedere questo ordine My Cookie Delight.',
      values.customerName.trim() ? `Nome: ${values.customerName.trim()}` : '',
      designs,
      `Quantita totale: ${this.quantity} biscotti`,
      values.deliveryMethod === 'pickup' ? `Ritiro in sede: ${this.business.pickupName}, ${this.business.pickupAddress}` : `Spedizione: ${currency(this.shipping)}`,
      values.deliveryMethod === 'shipping' && values.address.trim() ? `Indirizzo: ${values.address.trim()}` : '',
      values.requestedDate ? `Data desiderata: ${values.requestedDate} (da confermare)` : '',
      `Totale indicativo: ${currency(this.counter + this.shipping)}`,
      values.notes.trim() ? `Note e informazioni: ${values.notes.trim()}` : '',
      'Grafica: schede PDF e immagini da allegare in chat.',
      'Potete confermare disponibilita, ingredienti e allergeni, tempi e prezzo finale?'
    ].filter(Boolean).join('\n\n');
    return whatsappUrl(message);
  }
  requestOrder(event: Event): void {
    if (this.invalidOrder) { event.preventDefault(); this.firstFormGroup.markAllAsTouched(); }
  }
  message(item: CartItem): string { return [item.draft.testoInput, item.draft.testoDueInput, item.draft.testoTreInput].filter(line => line.trim()).join(' / '); }
  updateQuantity(item: CartItem, value: string | number): void {
    const quantity = Number(value);
    if (!this.cart.validQuantity(quantity)) { this.quantityErrors.add(item.id); return; }
    this.quantityErrors.delete(item.id);
    if (this.direct) this.cart.updateDirectQuantity(quantity);
    else this.cart.updateQuantity(item.id, quantity);
  }
  remove(item: CartItem): void { this.quantityErrors.delete(item.id); this.cart.remove(item.id); }
  async edit(item: CartItem): Promise<void> {
    this.editorOrder.quantityControl.setValue(item.quantity);
    this.editorOrder.editingId = item.id;
    if (this.direct) { this.cart.startNew(); this.cart.edit(item); this.cart.editingId = null; }
    else this.cart.edit(item); await this.router.navigate(['/' + item.shape]); }
  newDesign(): void { this.cart.startNew(); }
  async makePayment(): Promise<void> {
    if (this.isPaying || this.invalidOrder || !this.stripeService.configured) return;
    this.isPaying = true;
    this.paymentError = '';
    try {
      const url = await this.stripeService.createCheckoutSession({
        items: this.items.map(item => ({ quantity: item.quantity, shape: item.shape, preview: item.preview,
          message: this.message(item), textColor: this.message(item) ? item.draft.selectedColor : '',
          backgroundColor: item.draft.selectedColorSfondo, font: this.message(item) ? item.draft.selectedFontFamily : '',
          image: item.draft.croppedImage, recipe: item.draft.recipe || 'classic', covering: item.draft.selectedColorSfondo ? (item.draft.covering || 'royal-icing') : null })),
        requestedDate: this.firstFormGroup.controls.requestedDate.value,
        ...this.orderRequest.details
      });
      window.location.assign(url);
    } catch { this.paymentError = 'Impossibile avviare il pagamento. Riprova tra poco.'; }
    finally { this.isPaying = false; }
  }
}
