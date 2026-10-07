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
  originalImage?: string;
  originalImageName?: string;
  textPosition: { x: number; y: number };
}

@Injectable({ providedIn: 'root' })
export class CookieDesignService {
  private readonly storageKey = 'cookie-design-v1';
  private currentDraft: CookieDraft | null = null;
  private route = '/cerchio';
  saveError = '';

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      const draft = saved?.draft;
      if (saved?.version === 1 && draft &&
          (draft.originalImage === undefined || draft.originalImage === '' || (typeof draft.originalImage === 'string' && /^data:image\/(jpeg|jpg|png|gif);base64,/.test(draft.originalImage))) &&
          (draft.originalImageName === undefined || typeof draft.originalImageName === 'string') &&
          ['testoInput', 'testoDueInput', 'testoTreInput', 'selectedFontFamily', 'selectedColor', 'selectedColorSfondo', 'croppedImage'].every(key => typeof draft[key] === 'string') &&
          Number.isFinite(draft.fontSize) && draft.fontSize > 0 &&
          Number.isFinite(draft.textPosition?.x) && Number.isFinite(draft.textPosition?.y) &&
          (!draft.croppedImage || /^data:image\/(jpeg|png|gif);base64,/.test(draft.croppedImage))) {
        this.currentDraft = this.snapshot(draft);
        if (COOKIE_SHAPES.some(shape => shape.route === saved.route)) this.route = saved.route;
      }
    } catch { /* Storage may be unavailable or contain an old, invalid draft. */ }
  }

  get draft(): CookieDraft | null {
    return this.currentDraft ? this.snapshot(this.currentDraft) : null;
  }

  set draft(value: CookieDraft | null) {
    if (value) this.save(value, this.route);
    else {
      this.currentDraft = null;
      try { localStorage.removeItem(this.storageKey); } catch { /* Keep editing in memory. */ }
    }
  }

  get resumeRoute(): string | null {
    const d = this.currentDraft;
    return d && (d.testoInput || d.testoDueInput || d.testoTreInput || d.croppedImage || d.selectedColor || d.selectedColorSfondo || d.fontSize !== 36 || d.selectedFontFamily !== 'CocoGothic' || d.textPosition.x || d.textPosition.y) ? this.route : null;
  }

  save(value: CookieDraft, route: string): void {
    const draft = this.snapshot(value);
    const previous = this.currentDraft;
    if (previous && route === this.route &&
        Object.keys(draft).filter(key => key !== 'textPosition').every(key => draft[key as keyof CookieDraft] === previous[key as keyof CookieDraft]) &&
        draft.textPosition.x === previous.textPosition.x && draft.textPosition.y === previous.textPosition.y) return;
    this.currentDraft = draft;
    this.route = route;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ version: 1, route, draft }));
      this.saveError = '';
    } catch {
      // Do not restore a stale design after a failed write (for example, a large photo).
      try { localStorage.removeItem(this.storageKey); } catch { /* Storage is blocked. */ }
      this.saveError = 'La bozza resta disponibile in questa pagina, ma non è stato possibile salvarla sul dispositivo.';
    }
  }

  private snapshot(value: CookieDraft): CookieDraft {
    return {
      testoInput: value.testoInput, testoDueInput: value.testoDueInput, testoTreInput: value.testoTreInput,
      selectedFontFamily: normalizeCookieFont(value.selectedFontFamily), fontSize: value.fontSize,
      selectedColor: value.selectedColor, selectedColorSfondo: value.selectedColorSfondo,
      croppedImage: value.croppedImage, originalImage: value.originalImage || '', originalImageName: value.originalImageName || '', textPosition: { ...value.textPosition }
    };
  }
}
