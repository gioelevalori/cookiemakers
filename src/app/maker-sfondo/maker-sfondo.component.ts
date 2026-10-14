import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { FormControl } from '@angular/forms';
import { ThemePalette } from '@angular/material/core';
import { COOKIE_PALETTE, CookieCovering } from '../cookie-product';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-maker-sfondo',
  templateUrl: './maker-sfondo.component.html',
  styleUrls: ['../editor-panel.css']
})
export class MakerSfondoComponent {
  private readonly sheet = inject(MatBottomSheetRef, { optional: true });
  imageError = '';
  imageQualityWarning = '';
  private uploadVersion = 0;
  @Output() originalImageChange = new EventEmitter<{ dataUrl: string; fileName: string }>();
  close(): void { this.sheet?.dismiss(); }
  removeImage(): void {
    this.uploadVersion++;
    this.originalImageChange.emit({ dataUrl: '', fileName: '' });
    this.imageQualityWarning = '';
    this.croppedImage = '';
    this.imageChangedEvent = null;
    this.cropperReady = false;
    this.imageSfondo.emit('');
  }
  colorBackground: FormControl = new FormControl(null);
  @Input() embedded = false;
  @Input() resetVersion = 0;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetVersion'] && !changes['resetVersion'].firstChange) this.removeImage();
    if (changes['croppedImage']) this.checkImageQuality(this.croppedImage);
  }
  @Input() disabled = false;
  touchUi = false;
  color: ThemePalette = 'primary';
  imageChangedEvent: any = '';
  @Input() croppedImage = '';
  cropperReady = false;

  @Input() selectedColorSfondo = '';
  @Input() covering: CookieCovering = 'royal-icing';
  @Output() coveringChange = new EventEmitter<CookieCovering>();

  selectCovering(value: CookieCovering): void {
    this.covering = value;
    this.coveringChange.emit(value);
    if (!this.selectedColorSfondo) {
      this.selectedColorSfondo = '#FFFFFF';
      this.sendColorSfondoMessage();
    }
  }

  @Output() colorSfondo = new EventEmitter<any>();
  @Output() imageSfondo = new EventEmitter<any>();

  @Output() colorSfondoSent = new EventEmitter<string>();

  readonly colors = COOKIE_PALETTE.map(value => value.color);

  readonly nameColors = COOKIE_PALETTE.map(value => value.name);

  sendColorSfondoMessage() {
    this.colorSfondoSent.emit(this.selectedColorSfondo);
  }

  sendImageSfondoMessage() {
    this.imageSfondo.emit(this.croppedImage);
  }

  fileChangeEvent(event: any): void {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.imageError = 'Il file supera 10 MB. Scegli un\'immagine piu piccola.';
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      this.imageLoadFailed();
      return;
    }
    this.imageError = '';
    const version = ++this.uploadVersion;
    this.originalImageChange.emit({ dataUrl: '', fileName: '' });
    const reader = new FileReader();
    reader.onload = () => {
      if (version === this.uploadVersion && typeof reader.result === 'string') {
        this.originalImageChange.emit({ dataUrl: reader.result, fileName: file.name });
      }
    };
    reader.readAsDataURL(file);
    this.cropperReady = false;
    this.croppedImage = '';
    this.imageChangedEvent = { target: { files: [file] } };
    event.target.value = '';
  }
  imageCropped(image: string) {
    this.croppedImage = image;
    this.checkImageQuality(image);
    if (this.embedded) this.imageSfondo.emit(image);
  }
  imageLoaded() {
    this.cropperReady = true;
  }
  imageLoadFailed () {
    this.uploadVersion++;
    this.originalImageChange.emit({ dataUrl: '', fileName: '' });
    this.imageQualityWarning = '';
    this.imageError = 'Immagine non valida. Scegli un file JPEG, PNG o GIF.';
    this.cropperReady = false;
  }

  private checkImageQuality(source: string): void {
    this.imageQualityWarning = '';
    if (!source) return;
    const image = new Image();
    image.onload = () => {
      if (this.croppedImage !== source) return;
      if (Math.min(image.naturalWidth, image.naturalHeight) < 600) {
        this.imageQualityWarning = `Il ritaglio è di ${image.naturalWidth} × ${image.naturalHeight} pixel: potrebbe risultare poco nitido in stampa. Scegli una foto più grande o un ritaglio più ampio.`;
      }
    };
    image.src = source;
  }

}
