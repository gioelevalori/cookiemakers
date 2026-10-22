import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { COOKIE_BUSINESS } from './cookie-product';

@Component({ standalone: false, selector: 'app-customer-experience', changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './customer-experience.component.html', styleUrls: ['./customer-experience.component.css'] })
export class CustomerExperienceComponent {
  @Input() mode: 'steps' | 'details' = 'steps';
  readonly business = COOKIE_BUSINESS;
  readonly packages = [
    { id: 'singola', icon: 'redeem', title: 'Un pensiero per ciascuno', copy: 'Una confezione singola da immaginare come segnaposto o piccolo ringraziamento.', label: 'Confezione singola' },
    { id: 'scatola', icon: 'inventory_2', title: 'Un regalo da aprire', copy: 'Una scatola da comporre con colori, dediche e biscotti pensati per chi la riceve.', label: 'Scatola regalo' },
    { id: 'evento', icon: 'celebration', title: 'Una festa coordinata', copy: 'Confezioni e dettagli abbinati al tema del tuo evento, da scegliere insieme.', label: 'Confezione per evento' }
  ];
}
