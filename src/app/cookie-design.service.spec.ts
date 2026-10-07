import { CookieDesignService, CookieDraft } from './cookie-design.service';

describe('Persistent cookie draft', () => {
  let stored: Map<string, string>;
  const draft: CookieDraft = {
    testoInput: 'Auguri', testoDueInput: 'Anna', testoTreInput: '',
    selectedFontFamily: 'BeckMan', fontSize: 40, selectedColor: '#ff0000',
    selectedColorSfondo: '#ffffff', croppedImage: 'data:image/jpeg;base64,example',
    originalImage: 'data:image/png;base64,original', originalImageName: 'photo.png',
    textPosition: { x: 12, y: -4 }
  };
  beforeEach(() => {
    stored = new Map();
    spyOn(Storage.prototype, 'getItem').and.callFake(key => stored.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { stored.set(key, value); });
    spyOn(Storage.prototype, 'removeItem').and.callFake(key => { stored.delete(key); });
  });
  it('restores text, image, position and shape in a new service instance', () => {
    new CookieDesignService().save(draft, '/cuore');
    const restored = new CookieDesignService();
    expect(restored.draft).toEqual(draft);
    expect(restored.resumeRoute).toBe('/cuore');
  });
  it('does not write unchanged photos on every change detection pass', () => {
    const service = new CookieDesignService();
    service.save(draft, '/cerchio');
    service.save({ ...draft, textPosition: { ...draft.textPosition } }, '/cerchio');
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed stored drafts', () => {
    stored.set('cookie-design-v1', JSON.stringify({ version: 1, draft: { testoInput: 'incomplete' } }));
    expect(new CookieDesignService().draft).toBeNull();
    stored.set('cookie-design-v1', '{broken');
    expect(new CookieDesignService().draft).toBeNull();
  });
  it('clears saved drafts explicitly', () => {
    const service = new CookieDesignService();
    service.save(draft, '/cerchio');
    service.draft = null;
    expect(new CookieDesignService().resumeRoute).toBeNull();
  });
  it('keeps editing possible and warns if storage is full', () => {
    const service = new CookieDesignService();
    service.save(draft, '/cerchio');
    (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');
    service.save({ ...draft, testoInput: 'Modificato' }, '/cerchio');
    expect(service.draft?.testoInput).toBe('Modificato');
    expect(service.saveError).toContain('non è stato possibile salvarla');
    expect(new CookieDesignService().draft).toBeNull();
  });
});
