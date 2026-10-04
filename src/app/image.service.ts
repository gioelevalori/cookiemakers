import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  
  private imageData = new BehaviorSubject<string>('');
  currentImage = this.imageData.asObservable();

  constructor() { }

  changeImage(imageData: string) {
    this.imageData.next(imageData);
  }
}
