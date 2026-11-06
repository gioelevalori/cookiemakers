export const COOKIE_PALETTE = [
  { color: '#FFFFFF', name: 'Bianco' },
  { color: '#FF0000', name: 'Rosso' },
  { color: '#FFD43B', name: 'Giallo' },
  { color: '#000000', name: 'Nero' },
  { color: '#A791D9', name: 'Lavanda' },
  { color: '#FC6C05', name: 'Arancione' },
  { color: '#81DB81', name: 'Menta' },
  { color: '#B8BEC4', name: 'Grigio' },
  { color: '#40C8F5', name: 'Blu Cielo' }
] as const;

export type CookieRecipe = 'classic' | 'lactose-free';
// Minimum order per cookie design; see CartService.price for the price list.
export const MIN_COOKIES = 5;

export type CookieCovering = 'royal-icing';
export const recipeLabel = (value?: CookieRecipe): string => value === 'lactose-free' ? 'Senza lattosio' : 'Classica';
export const coveringLabel = (_value?: CookieCovering): string => 'Ghiaccia reale';

export const COOKIE_BUSINESS = {
  whatsappNumber: '393516777748',
  pickupName: 'Nonna Delizia',
  pickupAddress: 'Via Roma, 78, 65012 Cepagatti (PE)',
  mapsUrl: 'https://www.google.com/maps?cid=4568183702203452684'
};

export function whatsappUrl(message: string): string {
  return `https://wa.me/${COOKIE_BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export interface IngredientPart { text: string; allergen?: boolean; }
export interface IngredientList { label: string; parts: IngredientPart[]; traces: IngredientPart[]; }

// Populate from the bakery's approved ingredient sheets, including decorations and traces.
export const COOKIE_INGREDIENTS: Record<CookieRecipe, IngredientList[]> = {
  classic: [],
  'lactose-free': []
};
