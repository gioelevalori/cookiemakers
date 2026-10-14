import { ChangeDetectionStrategy, Component  } from '@angular/core';
import { whatsappUrl } from '../cookie-product';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-chi-siamo',
  templateUrl: './chi-siamo.component.html',
  styleUrls: ['./chi-siamo.component.css']
})
export class ChiSiamoComponent {
  readonly whatsapp = whatsappUrl('Ciao! Vorrei informazioni sui biscotti personalizzati di Nonna Delizia e My Cookie Delight.');
}
