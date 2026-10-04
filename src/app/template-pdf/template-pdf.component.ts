import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageService } from '../image.service';
import { ColorService } from '../color.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-template-pdf',
  templateUrl: './template-pdf.component.html',
  styleUrls: ['./template-pdf.component.css']
})
export class TemplatePdfComponent {
  @ViewChild('contentToConvert') contentToConvert!: ElementRef<HTMLElement>;
  private readonly destroyRef = inject(DestroyRef);
  imageData = '';
  message = '';
  selectedShape = '';
  selectedColor = '';
  selectedColorSfondo = '';
  selectedFont = '';
  exporting = false;
  exportError = '';

  constructor(images: ImageService, colors: ColorService) {
    images.currentImage.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.imageData = value);
    colors.message.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.message = value);
    colors.selectedShape.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedShape = value);
    colors.selectedColor.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedColor = value);
    colors.selectedColorSfondo.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedColorSfondo = value);
    colors.selectedFont.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => this.selectedFont = value);
  }

  async downloadPdf(): Promise<void> {
    if (!this.imageData || this.exporting) return;
    this.exporting = true;
    this.exportError = '';
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await document.fonts.ready;
      await html2pdf().set({
        margin: 10,
        filename: 'my-cookie-delight.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(this.contentToConvert.nativeElement).save();
    } catch {
      this.exportError = 'Impossibile creare il PDF. Riprova.';
    } finally {
      this.exporting = false;
    }
  }
}
