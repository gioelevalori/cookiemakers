import { cookieTextFits } from './cookie-text-fit';

describe('Cookie text bounds', () => {
  let source: HTMLElement;
  let box: HTMLElement;
  beforeEach(() => {
    source = document.createElement('div');
    source.className = 'example-boundary';
    source.style.cssText = 'position:relative;width:200px;height:200px';
    const shape = document.createElement('div');
    shape.className = 'cookie-shape circle';
    shape.style.cssText = 'position:absolute;left:20px;top:20px;width:160px;height:160px';
    box = document.createElement('div');
    box.className = 'example-box';
    box.style.cssText = 'position:absolute;left:20px;top:50%;width:160px;translate:0 -50%';
    const text = document.createElement('p');
    text.textContent = 'Auguri';
    text.style.cssText = 'margin:0;font:30px/1.25 Arial;text-align:center;color:#202925';
    box.appendChild(text);
    source.append(shape, box);
    document.body.appendChild(source);
  });
  afterEach(() => source.remove());

  it('allows text that fits the real circle and blocks excessive dimensions', () => {
    expect(cookieTextFits(source, 31)).toBeTrue();
    expect(cookieTextFits(source, 90)).toBeFalse();
  });

  it('rechecks the available space when text is moved toward an edge', () => {
    expect(cookieTextFits(source, 31)).toBeTrue();
    box.style.transform = 'translateX(70px)';
    expect(cookieTextFits(source, 31)).toBeFalse();
    box.style.transform = '';
    expect(cookieTextFits(source, 31)).toBeTrue();
  });

  it('counts all lines and leaves an empty biscuit editable', () => {
    const text = box.querySelector('p')!;
    text.appendChild(document.createElement('br'));
    text.appendChild(document.createTextNode('Auguri'));
    text.appendChild(document.createElement('br'));
    text.appendChild(document.createTextNode('Auguri'));
    expect(cookieTextFits(source, 60)).toBeFalse();
    text.textContent = '';
    expect(cookieTextFits(source, 43)).toBeTrue();
  });
});
