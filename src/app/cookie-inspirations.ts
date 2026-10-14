import { CookieDraft } from './cookie-design.service';

export interface CookieInspiration {
  title: string;
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
  { title: 'Compleanno', route: '/cerchio', shape: 'circle', draft: { ...blank, testoInput: 'Auguri!', testoDueInput: 'Sofia', selectedFontFamily: 'PhotoShoot', selectedColor: '#9d4357', selectedColorSfondo: '#FAFAFA' } },
  { title: 'Matrimonio', route: '/cuore', shape: 'heart', draft: { ...blank, testoInput: 'A & L', testoDueInput: 'Grazie', selectedFontFamily: 'PhotoShoot', selectedColorSfondo: '#FAFAFA' } },
  { title: 'Nascita', route: '/quadrato', shape: 'square', draft: { ...blank, testoInput: 'Benvenuto', testoDueInput: 'Luca', selectedColorSfondo: '#D8EEF1' } },
  { title: 'Un grazie', route: '/esagono', shape: 'hexagon', draft: { ...blank, testoInput: 'Grazie', testoDueInput: 'di cuore', selectedColor: '#205a48', selectedColorSfondo: '#FAFAFA' } }
];
