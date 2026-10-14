import { TestBed } from '@angular/core/testing';
import { AppModule } from './app.module';
import { CookieIngredientsComponent } from './cookie-ingredients.component';
import { COOKIE_INGREDIENTS } from './cookie-product';

describe('Ingredient information', () => {
  it('emphasizes supplied allergen segments and renders ingredient data as text', async () => {
    const previous = COOKIE_INGREDIENTS.classic;
    try {
      COOKIE_INGREDIENTS.classic = [{ label: 'Test-only recipe', parts: [{ text: 'Plain, ' }, { text: 'Allergen', allergen: true }, { text: '<script>example</script>' }], traces: [{ text: 'Trace allergen', allergen: true }] }];
      await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
      const fixture = TestBed.createComponent(CookieIngredientsComponent);
      fixture.detectChanges();
      expect(Array.from(fixture.nativeElement.querySelectorAll('strong')).map((element: any) => element.textContent)).toEqual(['Allergen', 'Trace allergen']);
      expect(fixture.nativeElement.querySelector('script')).toBeNull();
      fixture.destroy();
    } finally { COOKIE_INGREDIENTS.classic = previous; }
  });
  it('does not fabricate an ingredient list when the recipe sheet is unavailable', async () => {
    await TestBed.configureTestingModule({ imports: [AppModule] }).compileComponents();
    const fixture = TestBed.createComponent(CookieIngredientsComponent);
    fixture.componentInstance.recipe = 'lactose-free';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Richiedi la lista completa');
    expect(fixture.nativeElement.textContent).toContain('non indica');
    fixture.destroy();
  });
});
