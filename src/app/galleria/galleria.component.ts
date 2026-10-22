import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';

interface GalleryPhoto {
  src: string;
  thumbnail: string;
  title: string;
  alt: string;
  width: number;
  height: number;
}

interface GalleryCollection {
  id: string;
  title: string;
  photos: GalleryPhoto[];
}

const easterPhotos = [
  { title: 'Una Pasqua a colori', alt: 'Assortimento di biscotti pasquali decorati con coniglietti, uova e carote colorate', width: 1920, height: 1280 },
  { title: 'Un coniglietto tra i fiori', alt: 'Biscotto a forma di uovo con orecchie da coniglio e fiori rosa', width: 1600, height: 1600 },
  { title: 'Il cestino delle sorprese', alt: 'Biscotto decorato come un cestino intrecciato con uova pastello', width: 1440, height: 1568 },
  { title: 'Carotine di primavera', alt: 'Biscotti a forma di carota con glassa arancione e foglie verdi', width: 1920, height: 1280 },
  { title: 'Un fiore da regalare', alt: 'Biscotto a forma di fiore rosa con centro giallo e foglie verdi', width: 1600, height: 1600 },
  { title: 'Un piccolo pulcino', alt: 'Biscotto a forma di uovo giallo decorato con un pulcino', width: 1600, height: 1600 },
  { title: 'Dolce coniglietto', alt: 'Biscotto a forma di coniglietto bianco con orecchie e nasino rosa', width: 1600, height: 1600 },
  { title: 'Dettagli di Pasqua', alt: 'Tre biscotti a forma di uovo con decorazioni floreali, ovetti e cestino', width: 1920, height: 1280 },
  { title: 'Un rametto di primavera', alt: 'Biscotto a forma di rametto decorato con foglie verdi', width: 1600, height: 1600 },
  { title: 'Un pensiero di pace', alt: 'Biscotto a forma di colomba bianca con un piccolo fiore rosa', width: 1600, height: 1600 }
].map((photo, index) => {
  const base = `assets/gallery/pasqua/pasqua-${String(index + 1).padStart(2, '0')}`;
  return { ...photo, src: `${base}.webp`, thumbnail: `${base}-thumb.webp` };
});

@Component({
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-galleria',
  templateUrl: './galleria.component.html',
  styleUrls: ['./galleria.component.css']
})
export class GalleriaComponent {
  // Add future occasions here when their photographs are available.
  readonly collections: GalleryCollection[] = [{
    id: 'pasqua', title: 'Pasqua',
    photos: easterPhotos
  }];
  @ViewChild('photoDialog') photoDialog!: ElementRef<HTMLDialogElement>;
  activeCollection = this.collections[0];
  selectedIndex = 0;
  get selectedPhoto(): GalleryPhoto { return this.activeCollection.photos[this.selectedIndex]; }

  openPhoto(collection: GalleryCollection, index: number): void {
    this.activeCollection = collection;
    this.selectedIndex = index;
    this.photoDialog.nativeElement.showModal();
  }
  closePhoto(): void { this.photoDialog.nativeElement.close(); }
  stepPhoto(direction: number, event?: Event): void {
    event?.preventDefault();
    this.selectedIndex = (this.selectedIndex + direction + this.activeCollection.photos.length) % this.activeCollection.photos.length;
  }
  closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.photoDialog.nativeElement) this.closePhoto();
  }
}
