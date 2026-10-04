import { ChangeDetectionStrategy, Component  } from '@angular/core';
import { HEART_CLIP_PATH } from './heart-outline';
import { HEXAGON_CLIP_PATH } from './hexagon-outline';

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  host: { '[style.--cookie-heart-clip]': 'heartClipPath', '[style.--cookie-hexagon-clip]': 'hexagonClipPath' },
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly heartClipPath = HEART_CLIP_PATH;
  readonly hexagonClipPath = HEXAGON_CLIP_PATH;
  title = 'cookieMaker';
}
