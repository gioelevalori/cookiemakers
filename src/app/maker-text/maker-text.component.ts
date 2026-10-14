import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { FormControl } from '@angular/forms';
import { COOKIE_FONTS } from '../cookie-design.service';
import { cookieTextFits } from '../cookie-text-fit';
import { COOKIE_PALETTE } from '../cookie-product';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-maker-text',
  templateUrl: './maker-text.component.html',
  styleUrls: ['../editor-panel.css']
})
export class MakerTextComponent implements OnInit, OnDestroy {
  private readonly detector = inject(ChangeDetectorRef);
  private readonly fontsLoaded = () => this.detector.markForCheck();
  ngOnInit(): void { document.fonts.addEventListener('loadingdone', this.fontsLoaded); }
  ngOnDestroy(): void { document.fonts.removeEventListener('loadingdone', this.fontsLoaded); }
  private readonly sheet = inject(MatBottomSheetRef, { optional: true });
  close(): void { this.sheet?.dismiss(); }
  @Input() resetVersion = 0;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetVersion'] && !changes['resetVersion'].firstChange) {
      this.inputText2 = false;
      this.inputText3 = false;
      this.colorText.reset();
    }
  }
  @Input() embedded = false;
  @Input() message = '';
  @Input() message2 = '';
  @Input() message3 = '';
  @Input() font = 'CocoGothic';
  @Input() fontSize = 36;
  @Input() previewSource: HTMLElement | null = null;

  get increaseDisabled(): boolean {
    return this.disabled || this.fontSize >= 43 ||
      (!!this.previewSource && !cookieTextFits(this.previewSource, this.fontSize + 1));
  }
  scale = 1;
  colorText: FormControl = new FormControl(null);
  touchUi = false;
  @Input() disabled = false;
  inputText2 = false;
  inputText3 = false;
  @Input() selectedColor = '';

  @Output() messageSent = new EventEmitter<string>();
  @Output() messageSecondSent = new EventEmitter<string>();
  @Output() messageThirdSent = new EventEmitter<string>();
  @Output() textSent = new EventEmitter<string>();
  @Output() fontSent = new EventEmitter<string>();
  @Output() textSize = new EventEmitter<number>();
  @Output() colorSent = new EventEmitter<string>();

  sendMessage() {
    this.messageSent.emit(this.message);
  }

  sendMessageSecond() {
    this.messageSecondSent.emit(this.message2);
  }

  sendMessageThird() {
    this.messageThirdSent.emit(this.message3);
  }

  sendFontMessage() {
    this.fontSent.emit(this.font);
  }

  sendColorMessage() {
    this.colorSent.emit(this.selectedColor);
  }

  readonly fontFamilies = COOKIE_FONTS;
  
  readonly colors = COOKIE_PALETTE.map(value => value.color);
  
  readonly nameColors = COOKIE_PALETTE.map(value => value.name);
  

  increaseFontSize() {
    if (this.increaseDisabled) return;
    this.fontSize = Math.min(43, this.fontSize + 1);
    this.textSize.emit(this.fontSize);
  }
  
  decreaseFontSize() {
    this.fontSize = Math.max(30, this.fontSize - 1);
    this.textSize.emit(this.fontSize);
  }
  
  

  inputTextSecond() {
    this.inputText2 = true;
  }

  inputTextThird() {
    this.inputText3 = true;
  }
}
