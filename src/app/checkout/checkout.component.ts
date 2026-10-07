import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CartItem, CartService } from '../cart.service';
import { StripeService } from '../stripe.service';
import { DeliveryService, validRequestedDate } from '../delivery.service';

@Component({ standalone: false, changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-checkout', templateUrl: './checkout.component.html', styleUrls: ['./checkout.component.css'] })
export class CheckoutComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  direct = false;
  readonly cart = inject(CartService);
  get items(): CartItem[] { return this.direct ? (this.cart.directItem ? [this.cart.directItem] : []) : this.cart.items; }
  get quantity(): number { return this.items.reduce((sum, item) => sum + item.quantity, 0); }
  readonly stripeService = inject(StripeService);
  readonly delivery = inject(DeliveryService);
  readonly shipping = 6;
  quantityErrors = new Set<string>();
  isPaying = false;
  paymentError = '';
  readonly firstFormGroup = this.formBuilder.nonNullable.group({
    requestedDate: [this.delivery.requestedDate, (control: AbstractControl) => validRequestedDate(control.value, this.delivery.today) ? null : { requestedDate: true }]
  });
  get counter(): number { return this.items.reduce((sum, item) => sum + this.cart.price(item.quantity), 0); }
  get invalidOrder(): boolean { return !this.items.length || this.quantityErrors.size > 0 || this.firstFormGroup.invalid; }
  get dateTooSoon(): boolean {
    const requested = this.firstFormGroup.controls.requestedDate;
    const earliest = this.delivery.earliestDate;
    return requested.valid && Boolean(requested.value && earliest && requested.value < earliest);
  }


  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => { this.direct = params.get('direct') === '1'; this.quantityErrors.clear(); });
    this.firstFormGroup.controls.requestedDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.delivery.requestedDate = value);
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
          image: item.draft.croppedImage })),
        requestedDate: this.firstFormGroup.controls.requestedDate.value
      });
      window.location.assign(url);
    } catch { this.paymentError = 'Impossibile avviare il pagamento. Riprova tra poco.'; }
    finally { this.isPaying = false; }
  }
}
