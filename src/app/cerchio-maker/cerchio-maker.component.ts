import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject  } from '@angular/core';
import { Router } from '@angular/router';
import { COOKIE_SHAPES, CookieDesignService, normalizeCookieFont } from '../cookie-design.service';
import { takeUntil } from 'rxjs';
import { AbstractControl, FormControl } from '@angular/forms';
import { ThemePalette } from '@angular/material/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MakerTextComponent } from '../maker-text/maker-text.component';
import { MakerSfondoComponent } from '../maker-sfondo/maker-sfondo.component';
import { ImageService } from '../image.service';
import { ColorService } from '../color.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-cerchio-maker',
  templateUrl: './cerchio-maker.component.html',
  styleUrls: ['../cookie-maker.css']
})
export class CerchioMakerComponent {
  @ViewChild('cookiePreview') cookiePreview!: ElementRef<HTMLElement>;
  private readonly router = inject(Router);
  private readonly designState = inject(CookieDesignService);
  readonly cookieShapes = COOKIE_SHAPES;
  editorMode: 'text' | 'background' = 'text';
  previewMode: '2d' | '3d' = '2d';

  ngOnInit(): void {
    if (this.designState.draft) Object.assign(this, this.designState.draft);
    this.selectedFontFamily = normalizeCookieFont(this.selectedFontFamily);
  }

  ngOnDestroy(): void {
    this.designState.draft = {
      testoInput: this.testoInput, testoDueInput: this.testoDueInput, testoTreInput: this.testoTreInput,
      selectedFontFamily: this.selectedFontFamily, fontSize: this.fontSize,
      selectedColor: this.selectedColor, selectedColorSfondo: this.selectedColorSfondo,
      croppedImage: this.croppedImage, textPosition: { ...this.textPosition }
    };
  }
  isGenerating = false;
  resetVersion = 0;
  captureError = '';
  textPosition = { x: 0, y: 0 };
  visibleFont = false;
  visibleBackground = false;
  testoInput = '';
  testoDueInput = '';
  testoTreInput = '';
  fontSize = 36;
  scale = 1;
  selectedFontFamily = 'CocoGothic';
  public disabled = false;
  public color: ThemePalette = 'primary';
  public touchUi = false;
  colorInput = '';
  colorBackground: FormControl = new FormControl(null);
  colorText: FormControl = new FormControl(null);
  imageChangedEvent: any = '';
  croppedImage: any = '';
  cropperReady = false;
  lastMessage = '';
  selectedColor = '';
  selectedColorSfondo = '';

  constructor(private rettangoloWindow: MatBottomSheet,
    private bottomSheet: MatBottomSheet,
    private imageService: ImageService, private colorService: ColorService) {}

    openBottomSheet() {
      const bottomSheetRef = this.bottomSheet.open(MakerTextComponent);
    Object.assign(bottomSheetRef.instance, {
      message: this.testoInput, message2: this.testoDueInput, message3: this.testoTreInput,
      font: this.selectedFontFamily || 'CocoGothic', fontSize: this.fontSize,
      selectedColor: this.selectedColor || '#000000'
    });
  
      bottomSheetRef.instance.messageSent.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((message: string) => {
        this.testoInput = message;
      });
  
      bottomSheetRef.instance.messageSecondSent.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((message2: string) => {
        this.testoDueInput = message2;
      });
  
      bottomSheetRef.instance.messageThirdSent.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((message3: string) => {
        this.testoTreInput = message3;
      });
  
      bottomSheetRef.instance.textSize.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((textSize: number) => {
        this.fontSize = textSize;
      });
  
      bottomSheetRef.instance.fontSent.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((font: string) => {
        this.selectedFontFamily = font;
      });
  
      bottomSheetRef.instance.colorSent.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((selectedColor: string) => {
        this.selectedColor = selectedColor;
      });
    }
  

  openSfondoBottomSheet() {
    const bottomSheetRef = this.bottomSheet.open(MakerSfondoComponent);
    bottomSheetRef.instance.selectedColorSfondo = this.selectedColorSfondo || '#FFFFFF';
    bottomSheetRef.instance.croppedImage = this.croppedImage;

    bottomSheetRef.instance.colorSfondoSent.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((selectedColorSfondo: string) => {
      this.selectedColorSfondo = selectedColorSfondo;
    });

    bottomSheetRef.instance.imageSfondo.pipe(takeUntil(bottomSheetRef.afterDismissed())).subscribe((imageSfondo: any) => {
      this.croppedImage = imageSfondo;
    });
  }

  resetPage() {
    this.resetVersion++;
    this.textPosition = { x: 0, y: 0 };
    this.testoInput = '';
    this.testoDueInput = '';
    this.testoTreInput = '';
    this.fontSize = 36;
    this.selectedFontFamily = 'CocoGothic';
    this.selectedColor = '';
    this.selectedColorSfondo = '';
    this.croppedImage = '';
    this.captureError = '';
  }

  public async generateImage(): Promise<void> {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.captureError = '';
    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      const image = await toPng(this.cookiePreview.nativeElement, { pixelRatio: 2, filter: node => !(node instanceof Element && node.hasAttribute('data-preview-control')), style: { opacity: '1', top: '0', left: '0', margin: '0' } });
      this.imageService.changeImage(image);
      this.colorService.setSelectedShape('cerchio');

      this.colorService.setSelectedColor(this.selectedColor || '#202925');
      this.colorService.setSelectedColorSfondo(this.selectedColorSfondo);
      this.colorService.setSelectedFont(this.selectedFontFamily);
      this.colorService.setSelectedImage(this.croppedImage);
      this.colorService.setSelectedMessage([this.testoInput, this.testoDueInput, this.testoTreInput].filter(Boolean).join(' '));
      await this.router.navigate(['/checkout']);
    } catch {
      this.captureError = 'Impossibile preparare l\'anteprima. Riprova.';
    } finally {
      this.isGenerating = false;
    }
  }

}
