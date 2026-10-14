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

export interface SavedCookieDesign {
  id: string;
  route: string;
  preview: string;
  draft: CookieDraft;
}

@Injectable({ providedIn: 'root' })
export class CookieDesignService {
  private readonly storageKey = 'cookie-saved-designs-v2';
  private currentDraft: CookieDraft | null = null;
  private route = '/cerchio';
  private saved: SavedCookieDesign[] = this.loadSavedDesigns();
  editingSavedId: string | null = null;
  saveError = '';

  get draft(): CookieDraft | null { return this.currentDraft ? this.snapshot(this.currentDraft) : null; }
  set draft(value: CookieDraft | null) { this.currentDraft = value ? this.snapshot(value) : null; }
  get resumeRoute(): string | null { return this.currentDraft ? this.route : null; }

  // Temporary handoff between the editor, shape selection, cart and order sheet.
  save(value: CookieDraft, route: string): void {
    this.currentDraft = this.snapshot(value);
    this.route = route;
  }

  clearSession(): void {
    this.currentDraft = null;
    this.editingSavedId = null;
    this.saveError = '';
  }

  getSavedDesigns(): SavedCookieDesign[] {
    this.saved = this.loadSavedDesigns();
    return this.saved.map(value => ({ ...value, draft: this.snapshot(value.draft) }));
  }

  saveForLater(draft: CookieDraft, route: string, preview = '', id: string | null = null): string {
    if (!COOKIE_SHAPES.some(shape => shape.route === route)) throw new Error('Invalid cookie route');
    const saved = this.loadSavedDesigns();
    const existing = saved.find(value => value.id === id);
    const value: SavedCookieDesign = { id: existing?.id || crypto.randomUUID(), route, preview, draft: this.snapshot(draft) };
    const next = existing ? saved.map(item => item.id === existing.id ? value : item) : [...saved, value];
    this.persist(next);
    this.saved = next;
    return value.id;
  }

  removeSavedDesign(id: string): void {
    const next = this.loadSavedDesigns().filter(value => value.id !== id);
    this.persist(next);
    this.saved = next;
  }

  private persist(values: SavedCookieDesign[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify({ version: 2, designs: values }));
  }

  private loadSavedDesigns(): SavedCookieDesign[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored !== null) {
        const value = JSON.parse(stored);
        return value?.version === 2 && Array.isArray(value.designs) ? value.designs.filter((item: any) =>
          typeof item?.id === 'string' && typeof item.preview === 'string' &&
          (!item.preview || item.preview.startsWith('data:image/png;base64,')) && this.validDraft(item)) : [];
      }
      const migrated: SavedCookieDesign[] = [];
      for (const key of ['cookie-maker.saved-design.v1', 'cookie-design-v1']) {
        let value;
        try { value = JSON.parse(localStorage.getItem(key) || 'null'); } catch { continue; }
        if (value?.version === 1 && this.validDraft(value)) {
          const draft = this.snapshot(value.draft);
          if (!migrated.some(item => item.route === value.route && JSON.stringify(item.draft) === JSON.stringify(draft))) {
            migrated.push({ id: crypto.randomUUID(), route: value.route, preview: '', draft });
          }
        }
      }
      if (migrated.length) {
        this.persist(migrated);
        for (const key of ['cookie-maker.saved-design.v1', 'cookie-design-v1']) localStorage.removeItem(key);
      }
      return migrated;
    } catch {
      return this.saved || [];
    }
  }

  private validDraft(value: any): boolean {
    const draft = value?.draft;
    return COOKIE_SHAPES.some(shape => shape.route === value?.route) && !!draft &&
      ['testoInput', 'testoDueInput', 'testoTreInput', 'selectedFontFamily', 'selectedColor', 'selectedColorSfondo', 'croppedImage'].every(key => typeof draft[key] === 'string') &&
      Number.isFinite(draft.fontSize) && draft.fontSize > 0 &&
      Number.isFinite(draft.textPosition?.x) && Number.isFinite(draft.textPosition?.y) &&
      (!draft.croppedImage || /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(draft.croppedImage)) &&
      (draft.originalImage === undefined || draft.originalImage === '' || (typeof draft.originalImage === 'string' && /^data:image\/(jpeg|jpg|png|gif|webp);base64,/.test(draft.originalImage))) &&
      (draft.originalImageName === undefined || typeof draft.originalImageName === 'string');
  }

  private snapshot(value: CookieDraft): CookieDraft {
    return {
      testoInput: value.testoInput, testoDueInput: value.testoDueInput, testoTreInput: value.testoTreInput,
      selectedFontFamily: normalizeCookieFont(value.selectedFontFamily), fontSize: value.fontSize,
      selectedColor: value.selectedColor, selectedColorSfondo: value.selectedColorSfondo,
      croppedImage: value.croppedImage, originalImage: value.originalImage || '',
      originalImageName: value.originalImageName || '', textPosition: { ...value.textPosition }
    };
  }
}
