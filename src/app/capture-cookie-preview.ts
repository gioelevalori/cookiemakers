import { HEART_CLIP_PATH } from './heart-outline';
import { HEXAGON_CLIP_PATH } from './hexagon-outline';

/** Capture a visible, self-contained copy even while the editor displays 3D. */
export async function captureCookiePreview(source: HTMLElement): Promise<string> {
  await document.fonts.ready;
  const bounds = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.remove('preview-source-hidden');
  clone.style.setProperty('--cookie-heart-clip', HEART_CLIP_PATH);
  clone.style.setProperty('--cookie-hexagon-clip', HEXAGON_CLIP_PATH);
  clone.querySelectorAll('[data-preview-control]').forEach(node => node.remove());
  Object.assign(clone.style, { position: 'relative', top: '0', left: '0', opacity: '1',
    width: bounds.width + 'px', height: bounds.height + 'px', maxHeight: 'none',
    maxWidth: 'none', margin: '0', background: 'transparent' });
  const container = document.createElement('div');
  Object.assign(container.style, { position: 'fixed', top: '0', left: '-10000px', pointerEvents: 'none' });
  container.setAttribute('aria-hidden', 'true');
  container.appendChild(clone);
  document.body.appendChild(container);
  try {
    const { toCanvas } = await import('html-to-image');
    await Promise.all(Array.from(clone.querySelectorAll('img')).map(image => image.decode()));
    const capture = () => toCanvas(clone, { pixelRatio: 2 });
    let canvas = await capture();
    const hasCookie = () => canvas.getContext('2d')!.getImageData(
      Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3] > 0;
    // Chromium can resolve a cold foreignObject rasterization before it paints.
    if (!hasCookie()) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      canvas = await capture();
    }
    if (!hasCookie()) throw new Error('Cookie preview is empty');
    const context = canvas.getContext('2d')!;
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#f0f3f1';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    container.remove();
  }
}
