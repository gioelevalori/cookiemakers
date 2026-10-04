import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { FormControl } from '@angular/forms';
import { ThemePalette } from '@angular/material/core';

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
  close(): void { this.sheet?.dismiss(); }
  removeImage(): void {
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
  }
  @Input() disabled = false;
  touchUi = false;
  color: ThemePalette = 'primary';
  imageChangedEvent: any = '';
  @Input() croppedImage = '';
  cropperReady = false;

  @Input() selectedColorSfondo = '';

  @Output() colorSfondo = new EventEmitter<any>();
  @Output() imageSfondo = new EventEmitter<any>();

  @Output() colorSfondoSent = new EventEmitter<string>();

  colors = [
    '#FFFFFF', 
    '#FF0000',
    '#00FFFF',
    '#000000',
    '#A791D9',
    '#FC6C05',
    '#81DB81',
    '#FAFAFA',
    '#40C8F5',
  ];

  nameColors = [
    'Bianco',
    'Rosso',
    'Ciano',
    'Nero',
    'Lavanda',
    'Arancione',
    'Menta',
    'Grigio Chiaro',
    'Blu Cielo',
  ];

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
    this.imageError = '';
    this.cropperReady = false;
    this.croppedImage = '';
    this.imageChangedEvent = { target: { files: [file] } };
    event.target.value = '';
  }
  imageCropped(image: string) {
    this.croppedImage = image;
    if (this.embedded) this.imageSfondo.emit(image);
  }
  imageLoaded() {
    this.cropperReady = true;
  }
  imageLoadFailed () {
    this.imageError = 'Immagine non valida. Scegli un file JPEG, PNG o GIF.';
    this.cropperReady = false;
  }

}
