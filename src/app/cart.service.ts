import { Injectable } from '@angular/core';
import { CookieDraft, CookieDesignService, COOKIE_SHAPES } from './cookie-design.service';

export interface CartItem {
  id: string;
  shape: string;
  preview: string;
  quantity: number;
  draft: CookieDraft;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly key = 'cookie-cart-v1';
  items: CartItem[] = [];
  private currentEditingId: string | null = null;
  get editingId(): string | null { return this.currentEditingId; }
  set editingId(value: string | null) {
    this.currentEditingId = value;
    try {
      if (value) sessionStorage.setItem('cookie-cart-editing', value);
      else sessionStorage.removeItem('cookie-cart-editing');
    } catch { /* Keep editing in memory. */ }
  }
  storageError = '';

  constructor(private readonly designs: CookieDesignService) {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key) || '[]');
      if (Array.isArray(saved)) this.items = saved.filter(item =>
        typeof item.id === 'string' && COOKIE_SHAPES.some(shape => shape.route === '/' + item.shape) &&
        typeof item.preview === 'string' && item.preview.startsWith('data:image/png;base64,') &&
        this.validQuantity(item.quantity) && item.draft &&
        ['testoInput', 'testoDueInput', 'testoTreInput', 'selectedColor', 'selectedColorSfondo', 'croppedImage', 'selectedFontFamily'].every(key => typeof item.draft[key] === 'string') &&
        Number.isFinite(item.draft.fontSize) && Number.isFinite(item.draft.textPosition?.x) && Number.isFinite(item.draft.textPosition?.y));
    } catch { /* Keep the cart available when storage is unavailable. */ }
    try {
      const id = sessionStorage.getItem('cookie-cart-editing');
      this.currentEditingId = this.items.some(item => item.id === id) ? id : null;
    } catch { /* Keep editing in memory. */ }
  }

  validQuantity(quantity: number): boolean { return Number.isInteger(quantity) && quantity >= 10; }
  price(quantity: number): number { return 15 + (quantity - 10) * 5; }
  get total(): number { return this.items.reduce((sum, item) => sum + this.price(item.quantity), 0); }
  get quantity(): number { return this.items.reduce((sum, item) => sum + item.quantity, 0); }

  add(shape: string, preview: string, draft: CookieDraft): void {
    const existing = this.items.find(item => item.id === this.editingId);
    const item: CartItem = { id: existing?.id || (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`), shape, preview,
      quantity: existing?.quantity || 10, draft: JSON.parse(JSON.stringify(draft)) };
    this.items = existing ? this.items.map(value => value.id === existing.id ? item : value) : [...this.items, item];
    this.editingId = null;
    this.persist();
  }

  edit(item: CartItem): void {
    this.designs.save(item.draft, '/' + item.shape);
    this.editingId = item.id;
  }

  startNew(): void { this.editingId = null; this.designs.draft = null; }
  updateQuantity(id: string, quantity: number): void {
    if (!this.validQuantity(quantity)) return;
    this.items = this.items.map(item => item.id === id ? { ...item, quantity } : item);
    this.persist();
  }
  remove(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
    if (this.editingId === id) this.editingId = null;
    this.persist();
  }
  private persist(): void {
    try { localStorage.setItem(this.key, JSON.stringify(this.items)); this.storageError = ''; }
    catch {
      try { localStorage.removeItem(this.key); } catch { /* Storage is blocked. */ }
      this.storageError = 'Il carrello resta disponibile in questa pagina, ma non è stato possibile salvarlo sul dispositivo.';
    }
  }
}
