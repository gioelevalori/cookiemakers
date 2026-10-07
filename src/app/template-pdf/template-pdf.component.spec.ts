import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplatePdfComponent } from './template-pdf.component';

describe('TemplatePdfComponent', () => {
  let component: TemplatePdfComponent;
  let fixture: ComponentFixture<TemplatePdfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplatePdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the final image and the applied crop in separate sections', () => {
    component.imageData = 'data:image/png;base64,final';
    component.selectedImage = 'data:image/jpeg;base64,crop';
    component.selectedColor = '#ff0000';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.final-design img').getAttribute('src')).toBe(component.imageData);
    expect(fixture.nativeElement.querySelector('.cropped-photo img').getAttribute('src')).toBe(component.selectedImage);
    expect(fixture.nativeElement.querySelector('.source-photo').textContent).toContain('originale non è disponibile');
    expect(fixture.nativeElement.querySelector('.palette').textContent).toContain('#ff0000');
    expect(fixture.nativeElement.querySelector('.palette').textContent).toContain('Biscotto naturale');
  });
});
