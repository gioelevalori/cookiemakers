import { EditorOrderService } from '../editor-order.service';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieDesignService, SavedCookieDesign } from '../cookie-design.service';
import { CartService } from '../cart.service';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly designState = inject(CookieDesignService);
  private readonly cart = inject(CartService);
  private readonly order = inject(EditorOrderService);
  readonly homeCreations = ['1.jpeg', '2.jpeg', '3.jpeg', '4.jpeg', '5.jpeg', '6.jpeg'];
  heroMessage = 'Per te';
  heroEdited = false;
  showcaseReady = false;
  savedDesigns = this.designState.getSavedDesigns();
  savedDesignError = '';

  ngOnInit(): void {
    this.order.reset();
    this.cart.startNew();
    this.designState.clearSession();
  }

  resumeDesign(saved: SavedCookieDesign): void {
    this.designState.draft = saved.draft;
    this.designState.editingSavedId = saved.id;
    void this.router.navigate([saved.route]);
  }

  removeSavedDesign(saved: SavedCookieDesign): void {
    try {
      this.designState.removeSavedDesign(saved.id);
      this.savedDesigns = this.designState.getSavedDesigns();
      this.savedDesignError = '';
    } catch {
      this.savedDesignError = 'Impossibile eliminare la bozza su questo dispositivo.';
    }
  }

  savedShapeTitle(route: string): string {
    return this.cookieShapes.find(shape => shape.route === route)?.title || 'Biscotto';
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.showcaseReady = true);
  }

  startDesign(): void {
    this.saveHeroDesign();
    void this.router.navigate(['/cerchio']);
  }

  saveHeroDesign(): void {
    this.designState.draft = {
      testoInput: this.heroMessage.trim(), testoDueInput: '', testoTreInput: '',
      selectedFontFamily: 'CocoGothic', fontSize: 36, selectedColor: '#202925',
      selectedColorSfondo: '', croppedImage: '', textPosition: { x: 0, y: 0 }
    };
  }

  readonly cookieShapes = [
    { title: 'Rettangolo', route: '/rettangolo', shape: 'rectangle' },
    { title: 'Cerchio', route: '/cerchio', shape: 'circle' },
    { title: 'Quadrato', route: '/quadrato', shape: 'square' },
    { title: 'Esagono', route: '/esagono', shape: 'hexagon' },
    { title: 'Cuore', route: '/cuore', shape: 'heart' },
  ];

}
