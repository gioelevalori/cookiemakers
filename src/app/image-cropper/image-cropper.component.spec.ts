import { ImageCropperModule } from './image-cropper.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageCropperComponent } from './image-cropper.component';

describe('ImageCropperComponent', () => {
  let component: ImageCropperComponent;
  let fixture: ComponentFixture<ImageCropperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageCropperModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageCropperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('can resize before any image is loaded without corrupting coordinates', () => {
    const original = { ...component.cropper };
    component.onResize(new Event('resize'));
    expect(component.cropper).toEqual(original);
  });

  // JPEG storage is landscape; EXIF can rotate or mirror it for display.
  const corners = [
    [0, 1, 2, 3], [1, 0, 3, 2], [3, 2, 1, 0], [2, 3, 0, 1],
    [0, 2, 1, 3], [2, 0, 3, 1], [3, 1, 2, 0], [1, 3, 0, 2]
  ];
  for (const orientation of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`preserves preview and cropped pixels for EXIF orientation ${orientation || 'absent'}`, async () => {
      const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 40;
      const context = canvas.getContext('2d')!;
      colors.forEach((color, index) => {
        context.fillStyle = `rgb(${color.join(',')})`;
        context.fillRect((index % 2) * 40, Math.floor(index / 2) * 20, 40, 20);
      });
      const jpeg = Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 1).split(',')[1]), c => c.charCodeAt(0));
      const exif = new Uint8Array([
        0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0,
        73, 73, 42, 0, 8, 0, 0, 0, 1, 0,
        18, 1, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0
      ]);
      const file = new File(orientation ? [jpeg.slice(0, 2), exif, jpeg.slice(2)] : [jpeg], 'photo.jpg', { type: 'image/jpeg' });
      const internals = component as any;
      const load = internals.loadBase64Image.bind(component);
      await new Promise<void>((resolve, reject) => {
        spyOn(internals, 'loadBase64Image').and.callFake((source: string) => {
          load(source);
          const image = internals.originalImage as HTMLImageElement;
          const onload = image.onload!;
          image.onload = event => { onload.call(image, event); resolve(); };
          image.onerror = () => reject(new Error('JPEG decoding failed'));
        });
        component.imageChangedEvent = { target: { files: [file] } };
      });
      const width = orientation >= 5 ? 40 : 80;
      const height = orientation >= 5 ? 80 : 40;
      expect(internals.originalSize).toEqual({ width, height });
      const displayed = fixture.nativeElement.querySelector('.source-image');
      Object.defineProperty(displayed, 'offsetWidth', { configurable: true, value: width });
      component.cropper = { x1: 0, y1: 0, x2: width, y2: height };
      let cropped = '';
      component.imageCropped.subscribe(image => cropped = image);
      internals.crop();
      const output = new Image();
      output.src = cropped;
      await output.decode();
      expect(output.naturalWidth).toBe(width);
      expect(output.naturalHeight).toBe(height);
      canvas.width = width;
      canvas.height = height;
      context.drawImage(output, 0, 0);
      const expected = corners[Math.max(1, orientation) - 1];
      expected.forEach((colorIndex, index) => {
        const pixel = context.getImageData((index % 2 ? 0.75 : 0.25) * width, (index < 2 ? 0.25 : 0.75) * height, 1, 1).data;
        colors[colorIndex].forEach((channel, channelIndex) => {
          expect(Math.abs(pixel[channelIndex] - channel)).toBeLessThan(20);
        });
      });
    });
  }
});
