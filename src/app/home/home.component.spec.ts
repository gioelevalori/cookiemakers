import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { CookieDesignService } from '../cookie-design.service';
import { Router } from '@angular/router';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('links to the bakery story without replacing the cookie configurator', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('#bakery-title')?.textContent).toBe('Nonna Delizia');
    expect(page.querySelector('.bakery-story a')?.getAttribute('href')).toBe('/chisiamo');
    expect(page.querySelectorAll('.shape-link').length).toBe(5);
  });

  it('starts the circle design with the dedication and original cookie font', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.heroMessage = ' Auguri ';
    component.startDesign();
    expect(TestBed.inject(CookieDesignService).draft?.testoInput).toBe('Auguri');
    expect(TestBed.inject(CookieDesignService).draft?.selectedFontFamily).toBe('CocoGothic');
    expect(navigate).toHaveBeenCalledWith(['/cerchio']);
  });

  it('discards an unsaved editing session on returning to the homepage', () => {
    const state = TestBed.inject(CookieDesignService);
    component.heroMessage = 'Prima';
    component.saveHeroDesign();
    const fresh = TestBed.createComponent(HomeComponent);
    fresh.detectChanges();
    expect(fresh.componentInstance.heroEdited).toBeFalse();
    expect(state.draft).toBeNull();
    fresh.destroy();
  });
});
