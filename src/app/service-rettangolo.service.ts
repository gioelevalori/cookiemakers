import { Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ColorService } from './color.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceRettangoloService {

  test = '';
  constructor(colors: ColorService) {
    colors.message.pipe(takeUntilDestroyed()).subscribe(message => this.test = message);
  }
}
