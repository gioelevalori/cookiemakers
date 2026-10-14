import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChiSiamoComponent } from './chi-siamo.component';

describe('ChiSiamoComponent', () => {
  let component: ChiSiamoComponent;
  let fixture: ComponentFixture<ChiSiamoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChiSiamoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('presents the brochure as accessible text with product-specific ingredient information separate', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toBe('Nonna Delizia');
    expect(page.querySelectorAll('.story-section').length).toBe(3);
    expect(page.textContent).toContain('burro');
    expect(page.textContent).toContain('ghiaccia reale');
    expect(page.querySelector('.food-information')?.textContent).toContain('non sostituiscono');
    expect(page.textContent).not.toContain('niente chimica');
    expect(page.textContent).not.toContain('collezione della settimana');
    expect(new URL(component.whatsapp).pathname).toBe('/393491687845');
  });
});
