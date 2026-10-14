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
  it('uses yellow instead of cyan and a visibly distinct grey, preserving sky blue', () => {
    expect(component.colors[2]).toBe('#FFD43B');
    expect(component.colors[7]).toBe('#B8BEC4');
    expect(component.colors[8]).toBe('#40C8F5');
  });
  it('applies the chosen covering to a natural biscuit and preserves an existing colour', () => {
    const material = spyOn(component.coveringChange, 'emit');
    const colour = spyOn(component.colorSfondoSent, 'emit');
    component.selectCovering('sugar-paste');
    expect(material).toHaveBeenCalledWith('sugar-paste');
    expect(colour).toHaveBeenCalledWith('#FFFFFF');
    component.selectedColorSfondo = '#FFD43B';
    component.selectCovering('royal-icing');
    expect(component.selectedColorSfondo).toBe('#FFD43B');
  });

  it('preserves the complete uploaded file independently of the crop', async () => {
    const file = new File(['original bytes'], 'photo.png', { type: 'image/png' });
    const captured = new Promise<{ dataUrl: string; fileName: string }>(resolve => {
      component.originalImageChange.subscribe(image => { if (image.dataUrl) resolve(image); });
    });
    component.fileChangeEvent({ target: { files: [file], value: 'photo.png' } });
    const original = await captured;
    expect(original.fileName).toBe('photo.png');
    expect(atob(original.dataUrl.split(',')[1])).toBe('original bytes');
    component.imageCropped('data:image/png;base64,crop');
    expect(original.dataUrl).not.toBe(component.croppedImage);
    const cleared = spyOn(component.originalImageChange, 'emit');
    component.removeImage();
    expect(cleared).toHaveBeenCalledWith({ dataUrl: '', fileName: '' });
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

  for (const size of [100, 800]) {
    it(`checks the resolution of a ${size}px cropped image`, async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const source = canvas.toDataURL();
      const loaded = new Image();
      loaded.src = source;
      await loaded.decode();
      component.imageCropped(source);
      // Allow the component's image load callback to run for the same decoded URL.
      await new Promise(resolve => setTimeout(resolve, 50));
      if (size < 600) expect(component.imageQualityWarning).toContain('poco nitido');
      else expect(component.imageQualityWarning).toBe('');
      component.removeImage();
      expect(component.imageQualityWarning).toBe('');
    });
  }
});
