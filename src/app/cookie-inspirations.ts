import { CookieDraft } from './cookie-design.service';

export interface CookieInspiration {
  title: string;
  theme: string;
  icon: string;
  description: string;
  route: string;
  shape: string;
  draft: CookieDraft;
}

const blank: CookieDraft = {
  testoInput: '', testoDueInput: '', testoTreInput: '',
  selectedFontFamily: 'CocoGothic', fontSize: 36, selectedColor: '#202925',
  selectedColorSfondo: '', croppedImage: '', textPosition: { x: 0, y: 0 }
};

export const COOKIE_INSPIRATIONS: readonly CookieInspiration[] = [
  { title: 'Compleanno', theme: 'birthday', icon: 'celebration', description: 'Una dedica dolce per chi spegne le candeline.', route: '/cerchio', shape: 'circle', draft: { ...blank, testoInput: 'Auguri!', testoDueInput: 'Sofia', selectedFontFamily: 'BeckMan', selectedColor: '#77333B', selectedColorSfondo: '#FFC478' } },
  { title: 'Matrimonio', theme: 'wedding', icon: 'favorite', description: 'Un piccolo grazie per un giorno indimenticabile.', route: '/cuore', shape: 'heart', draft: { ...blank, testoInput: 'A & L', testoDueInput: 'Grazie', selectedFontFamily: 'PhotoShoot', selectedColor: '#68384E', selectedColorSfondo: '#E8BAC8' } },
  { title: 'Nascita', theme: 'baby', icon: 'child_care', description: 'Un nome, un nuovo inizio, una dolce sorpresa.', route: '/quadrato', shape: 'square', draft: { ...blank, testoInput: 'Benvenuto', testoDueInput: 'Luca', selectedFontFamily: 'CocoGothic', selectedColor: '#4E3C78', selectedColorSfondo: '#DDD4F3' } },
  { title: 'Un grazie', theme: 'thanks', icon: 'local_florist', description: 'Per dire qualcosa di bello, anche senza un motivo.', route: '/esagono', shape: 'hexagon', draft: { ...blank, testoInput: 'Grazie', testoDueInput: 'di cuore', selectedFontFamily: 'PhotoShoot', selectedColor: '#FFF3D3', selectedColorSfondo: '#245B50' } }
];
