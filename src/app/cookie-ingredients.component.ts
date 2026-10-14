import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { COOKIE_INGREDIENTS, CookieRecipe, recipeLabel, whatsappUrl } from './cookie-product';

@Component({
  standalone: false,
  selector: 'app-cookie-ingredients',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <details>
      <summary>Ingredienti e allergeni</summary>
      <p class="recipe-label">Impasto {{ label.toLowerCase() }}</p>
      <ng-container *ngIf="lists.length; else pending">
        <section *ngFor="let list of lists">
          <h3>{{ list.label }}</h3>
          <p><ng-container *ngFor="let part of list.parts"><strong *ngIf="part.allergen; else plain">{{ part.text }}</strong><ng-template #plain>{{ part.text }}</ng-template></ng-container></p>
          <p *ngIf="list.traces.length">Pu&ograve; contenere: <ng-container *ngFor="let part of list.traces"><strong *ngIf="part.allergen; else trace">{{ part.text }}</strong><ng-template #trace>{{ part.text }}</ng-template></ng-container></p>
        </section>
      </ng-container>
      <ng-template #pending><p>Richiedi la lista completa degli ingredienti e degli allergeni del biscotto e delle decorazioni prima di confermare l'ordine.</p></ng-template>
      <p *ngIf="recipe === 'lactose-free'">La scelta senza lattosio non indica l'assenza di altri allergeni. Per esigenze alimentari, verifica con noi ingredienti e possibili tracce.</p>
      <a [href]="contactUrl" target="_blank" rel="noopener noreferrer">Richiedi informazioni su WhatsApp</a>
    </details>
  `,
  styles: [`
    :host { display: block; }
    details { border-top: 1px solid #dde6e0; border-bottom: 1px solid #dde6e0; padding: 12px 0; font-size: 14px; line-height: 1.6; }
    summary { cursor: pointer; min-height: 32px; align-content: center; color: #253b33; font-weight: 600; }
    summary:focus-visible { outline: 2px solid #205a48; outline-offset: 3px; }
    p { margin: 12px 0; color: #52665b; }
    h3 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; }
    strong { font-weight: 800; color: #253b33; }
    a { color: #205a48; text-decoration: underline; }
  `]
})
export class CookieIngredientsComponent {
  @Input() recipe: CookieRecipe = 'classic';
  get label(): string { return recipeLabel(this.recipe); }
  get lists() { return COOKIE_INGREDIENTS[this.recipe] || []; }
  get contactUrl(): string { return whatsappUrl(`Ciao! Vorrei la lista completa degli ingredienti e degli allergeni per un biscotto con impasto ${this.label.toLowerCase()}, incluse copertura, cialda di zucchero e possibili tracce.`); }
}
