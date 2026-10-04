import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { FormControl } from '@angular/forms';
import { COOKIE_FONTS } from '../cookie-design.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-maker-text',
  templateUrl: './maker-text.component.html',
  styleUrls: ['../editor-panel.css']
})
export class MakerTextComponent {
  private readonly sheet = inject(MatBottomSheetRef, { optional: true });
  close(): void { this.sheet?.dismiss(); }
  @Input() embedded = false;
  @Input() message = '';
  @Input() message2 = '';
  @Input() message3 = '';
  @Input() font = 'CocoGothic';
  @Input() fontSize = 36;
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
  

  increaseFontSize() {
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
