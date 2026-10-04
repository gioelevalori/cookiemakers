import { Injectable } from '@angular/core';

export const COOKIE_FONTS = ['CocoGothic', 'BeckMan', 'PhotoShoot'] as const;

export function normalizeCookieFont(font: string): string {
  if ((COOKIE_FONTS as readonly string[]).includes(font)) return font;
  return 'CocoGothic';
}

export const COOKIE_SHAPES = [
  { title: 'Rettangolo', route: '/rettangolo', shape: 'rectangle' },
  { title: 'Cerchio', route: '/cerchio', shape: 'circle' },
  { title: 'Quadrato', route: '/quadrato', shape: 'square' },
  { title: 'Esagono', route: '/esagono', shape: 'hexagon' },
  { title: 'Cuore', route: '/cuore', shape: 'heart' }
] as const;

export interface CookieDraft {
  testoInput: string;
  testoDueInput: string;
  testoTreInput: string;
  selectedFontFamily: string;
  fontSize: number;
  selectedColor: string;
  selectedColorSfondo: string;
  croppedImage: string;
  textPosition: { x: number; y: number };
}

@Injectable({ providedIn: 'root' })
export class CookieDesignService {
  draft: CookieDraft | null = null;
}
