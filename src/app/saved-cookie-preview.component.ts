import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { captureCookiePreview } from './capture-cookie-preview';
import { COOKIE_SHAPES, SavedCookieDesign } from './cookie-design.service';

@Component({
  selector: 'app-saved-cookie-preview',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./cookie-maker.css', './saved-cookie-preview.css'],
  template: `
    <img *ngIf="image" class="saved-preview-image" [src]="image" [alt]="'Anteprima del biscotto ' + shapeTitle" width="320" height="320" />
    <p *ngIf="error" class="saved-preview-error" role="status">{{ error }}</p>
    <div *ngIf="!saved.preview" #source class="example-boundary saved-preview-source" aria-hidden="true">
      <div class="cookie-shadow"><div class="cookie-shape" [ngClass]="shape">
        <div class="cookie-icing" [style.background-color]="saved.draft.selectedColorSfondo || 'transparent'"></div>
        <img *ngIf="saved.draft.croppedImage" class="cookie-image" [src]="saved.draft.croppedImage" alt="" />
      </div></div>
      <div class="example-box" [style.transform]="'translate3d(' + saved.draft.textPosition.x + 'px,' + saved.draft.textPosition.y + 'px,0)'">
        <p [style.font-size.px]="saved.draft.fontSize" [style.font-family]="saved.draft.selectedFontFamily" [style.color]="saved.draft.selectedColor || '#202925'">{{ saved.draft.testoInput }}<br *ngIf="saved.draft.testoDueInput" />{{ saved.draft.testoDueInput }}<br *ngIf="saved.draft.testoTreInput" />{{ saved.draft.testoTreInput }}</p>
      </div>
    </div>`
})
export class SavedCookiePreviewComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() saved!: SavedCookieDesign;
  @ViewChild('source') source!: ElementRef<HTMLElement>;
  image = '';
  error = '';
  private viewReady = false;
  private destroyed = false;
  private generation = 0;

  get shape(): string { return COOKIE_SHAPES.find(value => value.route === this.saved.route)?.shape || 'circle'; }
  get shapeTitle(): string { return COOKIE_SHAPES.find(value => value.route === this.saved.route)?.title || ''; }

  ngOnChanges(): void {
    this.image = this.saved.preview;
    if (this.viewReady && !this.image) void this.generate();
  }
  ngAfterViewInit(): void {
    this.viewReady = true;
    if (!this.image) void this.generate();
  }
  ngOnDestroy(): void { this.destroyed = true; }

  private async generate(): Promise<void> {
    const generation = ++this.generation;
    try {
      const image = await captureCookiePreview(this.source.nativeElement);
      if (!this.destroyed && generation === this.generation) this.image = image;
    } catch {
      if (!this.destroyed) this.error = 'Anteprima non disponibile';
    }
  }
}
