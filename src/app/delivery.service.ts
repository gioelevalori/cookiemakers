import { Injectable } from '@angular/core';

// Fill these values only with confirmed operating times. Null means to confirm.
export const DELIVERY_TIMES: { preparationBusinessDays: number | null; shippingBusinessDays: number | null } = {
  preparationBusinessDays: 5,
  shippingBusinessDays: 2
};

export function romeToday(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

export function validRequestedDate(value: string, today: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= today;
}

export function addBusinessDays(start: string, days: number): string {
  const date = new Date(`${start}T12:00:00Z`);
  for (let remaining = days; remaining > 0;) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) remaining--;
  }
  return date.toISOString().slice(0, 10);
}

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly storageKey = 'cookie-requested-date-v1';
  private date = '';
  constructor() {
    try {
      const saved = localStorage.getItem(this.storageKey) || '';
      if (validRequestedDate(saved, '0000-00-00')) this.date = saved;
    } catch { /* The date remains available during navigation. */ }
  }
  get today(): string { return romeToday(); }
  get requestedDate(): string { return this.date; }
  set requestedDate(value: string) {
    this.date = validRequestedDate(value, this.today) ? value : '';
    try {
      if (this.date) localStorage.setItem(this.storageKey, this.date);
      else localStorage.removeItem(this.storageKey);
    } catch { /* Keep the date in memory when storage is unavailable. */ }
  }
  get preparationDays(): number | null { return DELIVERY_TIMES.preparationBusinessDays; }
  get shippingDays(): number | null { return DELIVERY_TIMES.shippingBusinessDays; }
  get earliestDate(): string | null {
    const preparation = this.preparationDays;
    const shipping = this.shippingDays;
    if (preparation === null || shipping === null || !Number.isInteger(preparation) || !Number.isInteger(shipping) || preparation < 0 || shipping < 0) return null;
    return addBusinessDays(this.today, preparation + shipping);
  }
}
