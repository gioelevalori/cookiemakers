import { CookieDesignService, CookieDraft } from './cookie-design.service';

describe('Saved cookie designs', () => {
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

  it('restores multiple explicitly saved designs with photos, shape and position', () => {
    const service = new CookieDesignService();
    service.saveForLater(draft, '/cuore', 'data:image/png;base64,preview');
    service.saveForLater({ ...draft, testoInput: 'Luca' }, '/quadrato');
    const saved = new CookieDesignService().getSavedDesigns();
    expect(saved.length).toBe(2);
    expect(saved[0].draft).toEqual(draft);
    expect(saved[0].route).toBe('/cuore');
    expect(saved[1].draft.testoInput).toBe('Luca');
  });

  it('keeps temporary editing handoffs out of persistent storage', () => {
    const service = new CookieDesignService();
    service.save(draft, '/cerchio');
    expect(service.draft).toEqual(draft);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(new CookieDesignService().draft).toBeNull();
    expect(new CookieDesignService().getSavedDesigns()).toEqual([]);
    service.clearSession();
    expect(service.draft).toBeNull();
  });

  it('updates a resumed saved design without creating duplicates', () => {
    const service = new CookieDesignService();
    const id = service.saveForLater(draft, '/cerchio');
    expect(service.saveForLater({ ...draft, testoInput: 'Nuovo' }, '/cerchio', '', id)).toBe(id);
    expect(service.getSavedDesigns().length).toBe(1);
    expect(service.getSavedDesigns()[0].draft.testoInput).toBe('Nuovo');
  });

  it('deletes only the selected design', () => {
    const service = new CookieDesignService();
    const first = service.saveForLater(draft, '/cerchio');
    const second = service.saveForLater(draft, '/cuore');
    service.removeSavedDesign(first);
    expect(new CookieDesignService().getSavedDesigns().map(value => value.id)).toEqual([second]);
  });

  it('preserves biscuits saved from another open tab', () => {
    const firstTab = new CookieDesignService();
    const secondTab = new CookieDesignService();
    const first = firstTab.saveForLater(draft, '/cerchio');
    const second = secondTab.saveForLater(draft, '/cuore');
    expect(firstTab.getSavedDesigns().length).toBe(2);
    firstTab.removeSavedDesign(first);
    expect(secondTab.getSavedDesigns().map(value => value.id)).toEqual([second]);
  });

  it('does not lose saved designs on a failed storage write', () => {
    const service = new CookieDesignService();
    const id = service.saveForLater(draft, '/cerchio');
    (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');
    expect(() => service.saveForLater({ ...draft, testoInput: 'Modificato' }, '/cerchio', '', id)).toThrow();
    expect(service.getSavedDesigns()[0].draft.testoInput).toBe('Auguri');
    expect(new CookieDesignService().getSavedDesigns()[0].draft.testoInput).toBe('Auguri');
    expect(() => service.removeSavedDesign(id)).toThrow();
    expect(service.getSavedDesigns().length).toBe(1);
  });

  it('migrates the earlier single-draft format without automatically resuming it', () => {
    stored.set('cookie-design-v1', JSON.stringify({ version: 1, route: '/cuore', draft }));
    const service = new CookieDesignService();
    expect(service.getSavedDesigns()[0].draft).toEqual(draft);
    expect(service.draft).toBeNull();
    expect(stored.has('cookie-design-v1')).toBeFalse();
    expect(new CookieDesignService().getSavedDesigns().length).toBe(1);
  });

  it('rejects malformed drafts and unknown save destinations', () => {
    stored.set('cookie-saved-designs-v2', '{broken');
    expect(new CookieDesignService().getSavedDesigns()).toEqual([]);
    expect(() => new CookieDesignService().saveForLater(draft, '/unknown')).toThrow();
  });
});
