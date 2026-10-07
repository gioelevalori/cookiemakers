import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageService } from '../image.service';
import { ColorService } from '../color.service';
import { DeliveryService } from '../delivery.service';
import { CookieDesignService } from '../cookie-design.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-template-pdf',
  templateUrl: './template-pdf.component.html',
  styleUrls: ['./template-pdf.component.css']
})
export class TemplatePdfComponent {
  readonly delivery = inject(DeliveryService);
  readonly designState = inject(CookieDesignService);
  readonly draft = this.designState.draft;
  readonly textLines = [this.draft?.testoInput || '', this.draft?.testoDueInput || '', this.draft?.testoTreInput || ''];
  @ViewChild('contentToConvert') contentToConvert!: ElementRef<HTMLElement>;
  private readonly destroyRef = inject(DestroyRef);
  imageData = '';
  message = '';
  selectedShape = '';
  selectedColor = '';
  selectedColorSfondo = '';
  selectedFont = '';
  selectedImage = '';
  exporting = false;
  exportError = '';

  constructor(images: ImageService, readonly colors: ColorService) {
    images.currentImage.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.imageData = value);
    colors.message.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.message = value);
    colors.selectedShape.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedShape = value);
    colors.selectedColor.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedColor = value);
    colors.selectedColorSfondo.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedColorSfondo = value);
    colors.selectedFont.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedFont = value);
    colors.selectedImage.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedImage = value);
  }

  async downloadPdf(): Promise<void> {
    if (!this.imageData || this.exporting) return;
    this.exporting = true;
    this.exportError = '';
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await document.fonts.ready;
      await Promise.all(Array.from(this.contentToConvert.nativeElement.querySelectorAll('img')).map(image => image.decode()));
      // The library supports pagebreak options, which its bundled typings omit.
      const options = {
        margin: 10,
        filename: 'my-cookie-delight.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['css'], avoid: ['.sheet-section', '.color-item'] },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
      await html2pdf().set(options).from(this.contentToConvert.nativeElement).save();
    } catch {
      this.exportError = 'Impossibile creare il PDF. Riprova.';
    } finally {
      this.exporting = false;
    }
  }
}
