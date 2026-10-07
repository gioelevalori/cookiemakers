import { CartService } from '../cart.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent {
  readonly cart = inject(CartService);
  menuOpen = false;
}
