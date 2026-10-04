// color.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ColorService {
  private selectedShapeSubject = new BehaviorSubject<string>('');
  selectedShape = this.selectedShapeSubject.asObservable();

  setSelectedShape(shape: string) {
    this.selectedShapeSubject.next(shape);
  }

  private selectedColorSubject = new BehaviorSubject<string>('');
  selectedColor = this.selectedColorSubject.asObservable();

  setSelectedColor(color: string) {
    this.selectedColorSubject.next(color);
  }

  private selectedColorSfondoSubject = new BehaviorSubject<string>('');
  selectedColorSfondo = this.selectedColorSfondoSubject.asObservable();

  setSelectedColorSfondo(colorSfondo: string) {
    this.selectedColorSfondoSubject.next(colorSfondo);
  }

  private selectedMessageSubject = new BehaviorSubject<string>('');
  message = this.selectedMessageSubject.asObservable();

  setSelectedMessage(message: string) {
    this.selectedMessageSubject.next(message);
  }

  private selectedFontSubject = new BehaviorSubject<string>('');
  selectedFont = this.selectedFontSubject.asObservable();

  setSelectedFont(font: string) {
    this.selectedFontSubject.next(font);
  }

  private selectedImageSubject = new BehaviorSubject<string>('');
  selectedImage = this.selectedImageSubject.asObservable();

  setSelectedImage(image: string) {
    this.selectedImageSubject.next(image);
  }
}
