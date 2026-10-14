import { Injectable } from '@angular/core';

export type DeliveryMethod = 'shipping' | 'pickup';
export interface OrderDetails {
  deliveryMethod: DeliveryMethod;
  customerName: string;
  address: string;
  notes: string;
}

const DEFAULT_DETAILS: OrderDetails = { deliveryMethod: 'shipping', customerName: '', address: '', notes: '' };

@Injectable({ providedIn: 'root' })
export class OrderRequestService {
  private readonly key = 'cookie-order-details-v1';
  private value: OrderDetails = { ...DEFAULT_DETAILS };

  constructor() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(this.key) || 'null');
      if (saved && ['shipping', 'pickup'].includes(saved.deliveryMethod) &&
          ['customerName', 'address', 'notes'].every(key => typeof saved[key] === 'string')) {
        this.value = this.normalize(saved);
      }
    } catch { /* Keep details in memory if session storage is unavailable. */ }
  }

  get details(): OrderDetails { return { ...this.value }; }
  update(details: OrderDetails): void {
    this.value = this.normalize(details);
    try { sessionStorage.setItem(this.key, JSON.stringify(this.value)); }
    catch { /* Customer details remain available during navigation. */ }
  }

  private normalize(value: OrderDetails): OrderDetails {
    return {
      deliveryMethod: value.deliveryMethod === 'pickup' ? 'pickup' : 'shipping',
      customerName: value.customerName.slice(0, 120),
      address: value.address.slice(0, 300),
      notes: value.notes.slice(0, 1000)
    };
  }
}
