import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieDesignService } from './cookie-design.service';
import { COOKIE_INSPIRATIONS, CookieInspiration } from './cookie-inspirations';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-cookie-inspirations',
  templateUrl: './cookie-inspirations.component.html',
  styleUrls: ['./cookie-inspirations.component.css']
})
export class CookieInspirationsComponent {
  readonly inspirations = COOKIE_INSPIRATIONS;
  private readonly designs = inject(CookieDesignService);
  private readonly router = inject(Router);

  startInspiration(inspiration: CookieInspiration): void {
    this.designs.draft = { ...inspiration.draft, textPosition: { ...inspiration.draft.textPosition } };
    void this.router.navigate([inspiration.route]);
  }
}
