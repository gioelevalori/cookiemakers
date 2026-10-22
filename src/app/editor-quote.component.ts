import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { EditorOrderService } from './editor-order.service';

@Component({ standalone: false, selector: 'app-editor-quote', changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './editor-quote.component.html', styleUrls: ['./editor-quote.component.css'] })
export class EditorQuoteComponent {
  @Input() disabled = false;
  expanded = window.matchMedia('(min-width: 961px)').matches;
  readonly order = inject(EditorOrderService);
  changeQuantity(delta: number): void { this.order.quantityControl.setValue(Math.max(10, (Number(this.order.quantity) || 10) + delta)); }
  goToOrder(): void { document.getElementById('order-actions')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}
