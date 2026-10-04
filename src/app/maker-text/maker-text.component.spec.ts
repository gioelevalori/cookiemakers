import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakerTextComponent } from './maker-text.component';

describe('MakerTextComponent', () => {
  let component: MakerTextComponent;
  let fixture: ComponentFixture<MakerTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MakerTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers the project fonts and emits the chosen family', () => {
    expect(component.fontFamilies).toEqual(['CocoGothic', 'BeckMan', 'PhotoShoot']);
    const emitted = spyOn(component.fontSent, 'emit');
    component.font = 'PhotoShoot';
    component.sendFontMessage();
    expect(emitted).toHaveBeenCalledWith('PhotoShoot');
  });

  it('keeps font sizes within the supported bounds and emits the resulting size', () => {
    const emitted = spyOn(component.textSize, 'emit');
    component.fontSize = 43;
    component.increaseFontSize();
    expect(emitted).toHaveBeenCalledWith(43);
    component.fontSize = 30;
    component.decreaseFontSize();
    expect(emitted).toHaveBeenCalledWith(30);
  });
});
