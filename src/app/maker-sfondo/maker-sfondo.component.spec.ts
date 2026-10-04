import { AppModule } from '../app.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakerSfondoComponent } from './maker-sfondo.component';

describe('RettangoloMakerSfondoComponent', () => {
  let component: MakerSfondoComponent;
  let fixture: ComponentFixture<MakerSfondoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MakerSfondoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates the parent preview immediately when an embedded image is cropped', () => {
    component.embedded = true;
    const emitted = spyOn(component.imageSfondo, 'emit');
    component.imageCropped('data:image/jpeg;base64,example');
    expect(emitted).toHaveBeenCalledWith('data:image/jpeg;base64,example');
  });

  it('clears the cropper after a design reset', () => {
    component.croppedImage = 'data:image/jpeg;base64,example';
    component.cropperReady = true;
    component.ngOnChanges({ resetVersion: { previousValue: 0, currentValue: 1, firstChange: false, isFirstChange: () => false } });
    expect(component.croppedImage).toBe('');
    expect(component.cropperReady).toBeFalse();
  });
});
