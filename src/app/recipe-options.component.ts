import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CookieRecipe } from './cookie-product';

@Component({
  standalone: false,
  selector: 'app-recipe-options',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <fieldset [disabled]="disabled">
      <legend>Impasto</legend>
      <div class="recipe-options">
        <label><input type="radio" name="cookieRecipe" value="classic" [checked]="recipe === 'classic'" (change)="recipeChange.emit('classic')" />Classica</label>
        <label><input type="radio" name="cookieRecipe" value="lactose-free" [checked]="recipe === 'lactose-free'" (change)="recipeChange.emit('lactose-free')" />Senza lattosio</label>
      </div>
    </fieldset>
    <app-cookie-ingredients [recipe]="recipe"></app-cookie-ingredients>
  `,
  styles: [`
    :host { display: block; margin: 0 0 24px; }
    fieldset { border: 0; padding: 0; margin: 0 0 16px; }
    legend { font-size: 14px; margin-bottom: 8px; }
    .recipe-options { display: flex; gap: 8px 24px; flex-wrap: wrap; }
    label { display: flex; align-items: center; gap: 8px; min-height: 44px; font-size: 14px; cursor: pointer; }
    input { accent-color: #205a48; width: 18px; height: 18px; }
  `]
})
export class RecipeOptionsComponent {
  @Input() recipe: CookieRecipe = 'classic';
  @Input() disabled = false;
  @Output() recipeChange = new EventEmitter<CookieRecipe>();
}
