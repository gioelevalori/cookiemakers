import { cookieOutline, drawCookieText } from './capture-cookie-preview';

const cache = new WeakMap<HTMLElement, { key: string; fits: boolean }>();

/** Test actual glyph pixels against the same curved outline used for order previews. */
export function cookieTextFits(source: HTMLElement, fontSize: number): boolean {
  const text = source.querySelector<HTMLElement>('.example-box p');
  const box = source.querySelector<HTMLElement>('.example-box');
  const shape = source.querySelector<HTMLElement>('.cookie-shape');
  if (!text?.textContent?.trim() || !box || !shape) return true;
  const bounds = source.getBoundingClientRect(), shapeBounds = shape.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return false;
  const style = getComputedStyle(text), shapeStyle = getComputedStyle(shape);
  const key = [fontSize, bounds.width, bounds.height,
    shapeBounds.left - bounds.left, shapeBounds.top - bounds.top, shapeBounds.width, shapeBounds.height,
    shapeStyle.clipPath, shapeStyle.borderRadius, box.style.transform, text.innerHTML,
    style.fontFamily, style.fontWeight, style.fontStyle, document.fonts.check(fontSize + 'px ' + style.fontFamily)].join('|');
  const previous = cache.get(source);
  if (previous?.key === key) return previous.fits;

  const clone = source.cloneNode(false) as HTMLElement;
  clone.classList.remove('preview-source-hidden');
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    position: 'fixed', top: '0', left: '-10000px', opacity: '1', pointerEvents: 'none',
    width: bounds.width + 'px', height: bounds.height + 'px', maxWidth: 'none', maxHeight: 'none', margin: '0'
  });
  const copiedBox = box.cloneNode(true) as HTMLElement;
  copiedBox.querySelectorAll('[data-preview-control]').forEach(node => node.remove());
  const copiedText = copiedBox.querySelector<HTMLElement>('p')!;
  copiedText.style.fontSize = fontSize + 'px';
  clone.appendChild(copiedBox);
  document.body.appendChild(clone);
  let fits = true;
  try {
    const padding = 64;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(bounds.width) + padding * 2;
    canvas.height = Math.ceil(bounds.height) + padding * 2;
    const context = canvas.getContext('2d')!;
    context.translate(padding, padding);
    drawCookieText(context, copiedText, clone.getBoundingClientRect());
    context.resetTransform();
    const outline = cookieOutline(shape, shapeBounds.left - bounds.left, shapeBounds.top - bounds.top, shapeBounds.width, shapeBounds.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 24) continue;
      const index = (i - 3) / 4;
      const x = index % canvas.width - padding, y = Math.floor(index / canvas.width) - padding;
      if (!context.isPointInPath(outline, x - 2, y) || !context.isPointInPath(outline, x + 2, y) ||
          !context.isPointInPath(outline, x, y - 2) || !context.isPointInPath(outline, x, y + 2)) {
        fits = false;
        break;
      }
    }
  } finally { clone.remove(); }
  cache.set(source, { key, fits });
  return fits;
}
