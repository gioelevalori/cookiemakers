import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuComponent } from './menu.component';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles the mobile menu and its accessible state', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(component.menuOpen).toBeTrue();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    fixture.detectChanges();
    expect(component.menuOpen).toBeFalse();
  });

  it('closes the menu when returning home through the logo', () => {
    component.menuOpen = true;
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.brand').click();
    fixture.detectChanges();
    expect(component.menuOpen).toBeFalse();
  });
});
