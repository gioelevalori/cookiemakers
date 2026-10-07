import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CookieDesignService } from '../cookie-design.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  readonly designState = inject(CookieDesignService);
  readonly cookieShapes = [
    { title: 'Rettangolo', route: '/rettangolo', shape: 'rectangle' },
    { title: 'Cerchio', route: '/cerchio', shape: 'circle' },
    { title: 'Quadrato', route: '/quadrato', shape: 'square' },
    { title: 'Esagono', route: '/esagono', shape: 'hexagon' },
    { title: 'Cuore', route: '/cuore', shape: 'heart' },
  ];

  readonly galleryImages = ['1.jpeg', '2.jpeg', '3.jpeg', '4.jpeg', '5.jpeg', '6.jpeg'];
}
