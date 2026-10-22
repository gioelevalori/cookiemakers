import { Injectable, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { CartService } from './cart.service';
import { OrderRequestService, DeliveryMethod } from './order-request.service';
import { DeliveryService } from './delivery.service';

@Injectable({ providedIn: 'root' })
export class EditorOrderService {
  editingId: string | null = null;
  readonly quantityControl = new FormControl(10, { nonNullable: true,
    validators: [Validators.required, Validators.min(10), Validators.pattern(/^[0-9]+$/)] });
  private readonly cart = inject(CartService);
  private readonly request = inject(OrderRequestService);
  readonly delivery = inject(DeliveryService);
  get quantity(): number { return this.quantityControl.value; }
  get invalid(): boolean { return this.quantityControl.invalid; }
  get method(): DeliveryMethod { return this.request.details.deliveryMethod; }
  set method(value: DeliveryMethod) { this.request.update({ ...this.request.details, deliveryMethod: value }); }
  get subtotal(): number { return this.invalid ? 0 : this.cart.price(this.quantity); }
  get shipping(): number { return this.method === 'pickup' ? 0 : 6; }
  get total(): number { return this.subtotal + this.shipping; }
  get earliestDate(): string | null { return this.delivery.earliestDateFor(this.method); }
  reset(): void { this.quantityControl.reset(10); this.editingId = null; }
}
