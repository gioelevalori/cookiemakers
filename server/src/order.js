// Validates the order sent by the checkout page and computes prices on the server.
// Labels and prices mirror src/app/cookie-product.ts and src/app/cart.service.ts.

export const SHAPES = { rettangolo: 'Rettangolo', cerchio: 'Cerchio', quadrato: 'Quadrato', esagono: 'Esagono', cuore: 'Cuore' };
export const RECIPES = { classic: 'Classica', 'lactose-free': 'Senza lattosio' };
export const COVERINGS = { 'royal-icing': 'Ghiaccia reale', 'sugar-paste': 'Pasta di zucchero' };
export const SHIPPING_CENTS = 600;
export const MIN_QUANTITY = 10;
const MAX_QUANTITY = 5000;
const MAX_ITEMS = 20;
const MAX_IMAGE_LENGTH = 12_000_000;
const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;
const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export class OrderError extends Error {}

/** 15 EUR for the first 10 cookies, 5 EUR for each additional cookie. */
export function itemPriceCents(quantity) {
  return 1500 + (quantity - MIN_QUANTITY) * 500;
}

export function orderTotals(order) {
  const items = order.items.reduce((sum, item) => sum + itemPriceCents(item.quantity), 0);
  const shipping = order.deliveryMethod === 'pickup' ? 0 : SHIPPING_CENTS;
  return { items, shipping, total: items + shipping };
}

const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const color = value => typeof value === 'string' && HEX_COLOR.test(value) ? value : '';
const image = value => typeof value === 'string' && value.length <= MAX_IMAGE_LENGTH && DATA_IMAGE.test(value) ? value : '';
const number = (value, fallback = 0) => Number.isFinite(value) ? Math.round(value) : fallback;

function normalizeItem(raw, index) {
  if (!raw || typeof raw !== 'object') throw new OrderError(`Biscotto ${index + 1} non valido.`);
  if (!Object.hasOwn(SHAPES, raw.shape)) throw new OrderError(`Forma del biscotto ${index + 1} non valida.`);
  if (!Number.isInteger(raw.quantity) || raw.quantity < MIN_QUANTITY || raw.quantity > MAX_QUANTITY) {
    throw new OrderError(`Quantità del biscotto ${index + 1} non valida.`);
  }
  const lines = Array.isArray(raw.lines) ? raw.lines.slice(0, 3).map(line => text(line, 120)) : [];
  if (!lines.length && raw.message) lines.push(text(raw.message, 360));
  const backgroundColor = color(raw.backgroundColor);
  return {
    shape: raw.shape,
    quantity: raw.quantity,
    recipe: Object.hasOwn(RECIPES, raw.recipe) ? raw.recipe : 'classic',
    covering: backgroundColor ? (Object.hasOwn(COVERINGS, raw.covering) ? raw.covering : 'royal-icing') : null,
    backgroundColor,
    lines: lines.filter(Boolean),
    font: text(raw.font, 40),
    fontSize: number(raw.fontSize),
    textColor: color(raw.textColor),
    textPosition: { x: number(raw.textPosition?.x), y: number(raw.textPosition?.y) },
    preview: image(raw.preview),
    image: image(raw.image),
    originalImage: image(raw.originalImage),
    originalImageName: text(raw.originalImageName, 120)
  };
}

export function normalizeOrder(raw) {
  if (!raw || typeof raw !== 'object') throw new OrderError('Ordine non valido.');
  if (!Array.isArray(raw.items) || !raw.items.length || raw.items.length > MAX_ITEMS) throw new OrderError('Il carrello è vuoto o troppo grande.');
  const requestedDate = typeof raw.requestedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.requestedDate) ? raw.requestedDate : '';
  return {
    items: raw.items.map(normalizeItem),
    deliveryMethod: raw.deliveryMethod === 'pickup' ? 'pickup' : 'shipping',
    customerName: text(raw.customerName, 120),
    address: text(raw.address, 300),
    notes: text(raw.notes, 1000),
    requestedDate
  };
}

/** Accepts only return pages on the configured site origins, so Stripe never redirects elsewhere. */
export function validReturnUrl(value, allowedOrigins) {
  try {
    const url = new URL(value);
    return allowedOrigins.includes(url.origin) ? url.href : null;
  } catch {
    return null;
  }
}

/** Appends a query string to the checkout page, also when the site uses hash routes (#/checkout). */
export function withQuery(url, query) {
  return url + (url.includes('?') ? '&' : '?') + query;
}
