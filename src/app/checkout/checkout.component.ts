import { EditorOrderService } from '../editor-order.service';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CartItem, CartService } from '../cart.service';
import { CheckoutOrder, PAYMENT_RESULT_PARAM, StripeElement, StripeElements, StripeJs, StripeService } from '../stripe.service';
import { DeliveryService, validRequestedDate } from '../delivery.service';
import { COOKIE_BUSINESS, coveringLabel, recipeLabel, whatsappUrl } from '../cookie-product';
import { OrderRequestService } from '../order-request.service';

const PENDING_PAYMENT_KEY = 'cookie-pending-payment';

@Component({ standalone: false, changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-checkout', templateUrl: './checkout.component.html', styleUrls: ['./checkout.component.css'] })
export class CheckoutComponent implements OnInit, OnDestroy {
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
  paymentResult: 'paid' | 'cancelled' | null = null;
  paymentOpen = false;
  paymentLoading = false;
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChild('addressElement') addressContainer?: ElementRef<HTMLElement>;
  @ViewChild('paymentElement') paymentContainer?: ElementRef<HTMLElement>;
  private payment: { stripe: StripeJs; elements: StripeElements; address: StripeElement | null; payment: StripeElement } | null = null;
  readonly contactForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 ().-]{6,40}$/)]]
  });
  readonly firstFormGroup = this.formBuilder.nonNullable.group({
    requestedDate: [this.delivery.requestedDate, (control: AbstractControl) => validRequestedDate(control.value, this.delivery.today) ? null : { requestedDate: true }],
    deliveryMethod: [this.orderRequest.details.deliveryMethod],
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.direct = params.get('direct') === '1';
      this.quantityErrors.clear();
      const result = params.get(PAYMENT_RESULT_PARAM);
      // Stripe adds redirect_status when a payment method that left the site (e.g. Klarna) comes back.
      const failed = params.get('redirect_status') === 'failed';
      if (result === 'ok' && !failed) this.completePaidOrder();
      this.paymentResult = result === 'ok' ? (failed ? 'cancelled' : 'paid') : result === 'annullato' ? 'cancelled' : null;
    });
    // Delivery and quantities change the amount: the payment form reopens with the new total.
    this.firstFormGroup.controls.deliveryMethod.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.closePayment());
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
      designs,
      `Quantita totale: ${this.quantity} biscotti`,
      values.deliveryMethod === 'pickup' ? `Ritiro in sede: ${this.business.pickupName}, ${this.business.pickupAddress}` : `Spedizione: ${currency(this.shipping)}`,
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
    this.closePayment();
    if (!this.cart.validQuantity(quantity)) { this.quantityErrors.add(item.id); return; }
    this.quantityErrors.delete(item.id);
    if (this.direct) this.cart.updateDirectQuantity(quantity);
    else this.cart.updateQuantity(item.id, quantity);
  }
  remove(item: CartItem): void { this.closePayment(); this.quantityErrors.delete(item.id); this.cart.remove(item.id); }
  async edit(item: CartItem): Promise<void> {
    this.editorOrder.quantityControl.setValue(item.quantity);
    this.editorOrder.editingId = item.id;
    if (this.direct) { this.cart.startNew(); this.cart.edit(item); this.cart.editingId = null; }
    else this.cart.edit(item); await this.router.navigate(['/' + item.shape]); }
  newDesign(): void { this.cart.startNew(); }
  // Empties only the order that was sent to Stripe, once, so a reload keeps later changes.
  private completePaidOrder(): void {
    let pending: string | null = null;
    try { pending = sessionStorage.getItem(PENDING_PAYMENT_KEY); sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch { /* Storage is blocked. */ }
    if (pending === 'direct') this.cart.clearDirect();
    else if (pending === 'cart') this.cart.clear();
  }
  buildOrder(): CheckoutOrder {
    return {
      items: this.items.map(item => ({ quantity: item.quantity, shape: item.shape, preview: item.preview,
        message: this.message(item), textColor: this.message(item) ? item.draft.selectedColor : '',
        backgroundColor: item.draft.selectedColorSfondo, font: this.message(item) ? item.draft.selectedFontFamily : '',
        image: item.draft.croppedImage, recipe: item.draft.recipe || 'classic', covering: item.draft.selectedColorSfondo ? (item.draft.covering || 'royal-icing') : null,
        lines: [item.draft.testoInput, item.draft.testoDueInput, item.draft.testoTreInput], fontSize: item.draft.fontSize,
        textPosition: item.draft.textPosition, originalImage: item.draft.originalImage || '', originalImageName: item.draft.originalImageName || '' })),
      requestedDate: this.firstFormGroup.controls.requestedDate.value,
      ...this.orderRequest.details
    };
  }
  /** Shows the Stripe payment form inside the page, styled like the site. */
  async openPayment(): Promise<void> {
    if (this.paymentOpen || !this.stripeService.configured) return;
    if (this.invalidOrder) { this.firstFormGroup.markAllAsTouched(); return; }
    if (this.stripeService.demo) { window.location.assign(this.stripeService.demoUrl); return; }
    this.paymentError = '';
    this.paymentOpen = true;
    this.paymentLoading = true;
    this.changeDetector.detectChanges();
    try {
      const { stripe, elements } = await this.stripeService.elements(Math.round((this.counter + this.shipping) * 100));
      const address = this.firstFormGroup.controls.deliveryMethod.value === 'shipping'
        ? elements.create('address', { mode: 'shipping', allowedCountries: ['IT'] }) : null;
      // Name, email and phone come from the site fields above and are passed on confirmation.
      const payment = elements.create('payment', { layout: { type: 'tabs' }, fields: { billingDetails: { name: 'never', email: 'never', phone: 'never' } } });
      if (!this.paymentOpen) return;
      if (address && this.addressContainer) address.mount(this.addressContainer.nativeElement);
      if (this.paymentContainer) payment.mount(this.paymentContainer.nativeElement);
      this.payment = { stripe, elements, address, payment };
    } catch {
      this.closePayment();
      this.paymentError = 'Impossibile caricare il pagamento. Riprova tra poco o contattaci su WhatsApp.';
    } finally { this.paymentLoading = false; }
  }
  closePayment(): void {
    this.payment?.address?.destroy();
    this.payment?.payment.destroy();
    this.payment = null;
    this.paymentOpen = false;
  }
  async pay(): Promise<void> {
    if (!this.payment || this.isPaying) return;
    if (this.contactForm.invalid || this.invalidOrder) { this.contactForm.markAllAsTouched(); this.firstFormGroup.markAllAsTouched(); return; }
    const { stripe, elements, address } = this.payment;
    this.isPaying = true;
    this.paymentError = '';
    try {
      const submitted = await elements.submit();
      if (submitted.error) { this.paymentError = submitted.error.message || 'Controlla i dati di pagamento.'; return; }
      const customer = this.contactForm.getRawValue();
      const shipping = address?.getValue ? (await address.getValue()).value : null;
      const { clientSecret } = await this.stripeService.createPayment({ ...this.buildOrder(), customer,
        shipping: shipping && { name: shipping.name, address: shipping.address } });
      try { sessionStorage.setItem(PENDING_PAYMENT_KEY, this.direct ? 'direct' : 'cart'); } catch { /* The order stays in the cart after payment. */ }
      // Cards and wallets confirm here; methods such as Klarna return to the checkout with ?pagamento=ok.
      const result = await stripe.confirmPayment({ elements, clientSecret, redirect: 'if_required',
        confirmParams: { return_url: this.stripeService.returnUrl(), payment_method_data: { billing_details: customer } } });
      if (result.error) {
        try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch { /* Storage is blocked. */ }
        this.paymentError = result.error.message || 'Pagamento non riuscito. Nessun addebito.';
        return;
      }
      this.closePayment();
      this.completePaidOrder();
      this.paymentResult = 'paid';
    } catch (error) {
      this.paymentError = error instanceof Error ? error.message : 'Impossibile completare il pagamento. Riprova tra poco.';
    } finally { this.isPaying = false; }
  }
  ngOnDestroy(): void { this.closePayment(); }
}
