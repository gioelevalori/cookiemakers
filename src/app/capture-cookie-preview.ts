import { HEART_CURVES, HEART_START } from './heart-outline';
import { HEXAGON_CORNERS } from './hexagon-outline';

function outline(element: HTMLElement, x: number, y: number, width: number, height: number): Path2D {
  const path = new Path2D();
  if (element.classList.contains('heart')) {
    path.moveTo(x + width * HEART_START[0] / 100, y + height * HEART_START[1] / 100);
    for (const [a, b, c, d, e, f] of HEART_CURVES) path.bezierCurveTo(x + width * a / 100, y + height * b / 100, x + width * c / 100, y + height * d / 100, x + width * e / 100, y + height * f / 100);
  } else if (element.classList.contains('hexagon')) {
    const first = HEXAGON_CORNERS[0].entry;
    path.moveTo(x + width * first[0] / 100, y + height * first[1] / 100);
    for (const { entry, control, exit } of HEXAGON_CORNERS) {
      path.lineTo(x + width * entry[0] / 100, y + height * entry[1] / 100);
      path.quadraticCurveTo(x + width * control[0] / 100, y + height * control[1] / 100, x + width * exit[0] / 100, y + height * exit[1] / 100);
    }
  } else if (element.classList.contains('circle')) {
    path.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else {
    const radius = Math.min(parseFloat(getComputedStyle(element).borderRadius) || 8, width / 2, height / 2);
    path.moveTo(x + radius, y);
    path.lineTo(x + width - radius, y);
    path.quadraticCurveTo(x + width, y, x + width, y + radius);
    path.lineTo(x + width, y + height - radius);
    path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    path.lineTo(x + radius, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - radius);
    path.lineTo(x, y + radius);
    path.quadraticCurveTo(x, y, x + radius, y);
  }
  path.closePath();
  return path;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function cover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawnWidth = image.naturalWidth * scale, drawnHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
}

/** Draw the actual design directly, without browser-dependent SVG foreignObject capture. */
export async function captureCookiePreview(source: HTMLElement): Promise<string> {
  await document.fonts.ready;
  const bounds = source.getBoundingClientRect();
  if (!bounds.width || !bounds.height) throw new Error('Cookie preview has no size');
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bounds.width * 2);
  canvas.height = Math.round(bounds.height * 2);
  const context = canvas.getContext('2d')!;
  context.scale(2, 2);
  context.fillStyle = '#f0f3f1';
  context.fillRect(0, 0, bounds.width, bounds.height);
  const shape = source.querySelector<HTMLElement>('.cookie-shape')!;
  const rect = shape.getBoundingClientRect();
  const x = rect.left - bounds.left, y = rect.top - bounds.top;
  const path = outline(shape, x, y, rect.width, rect.height);
  context.save();
  context.shadowColor = '#253b332b'; context.shadowBlur = 8; context.shadowOffsetY = 8;
  context.fillStyle = '#e1cb9d'; context.fill(path);
  context.restore();
  context.save(); context.clip(path);
  const textureUrl = getComputedStyle(shape).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
  if (textureUrl) cover(context, await loadImage(textureUrl), x, y, rect.width, rect.height);
  context.restore();
  const icing = shape.querySelector<HTMLElement>('.cookie-icing')!;
  const icingRect = icing.getBoundingClientRect();
  const ix = icingRect.left - bounds.left, iy = icingRect.top - bounds.top;
  context.fillStyle = getComputedStyle(icing).backgroundColor;
  context.fill(outline(shape, ix, iy, icingRect.width, icingRect.height));
  const photo = shape.querySelector<HTMLImageElement>('.cookie-image');
  if (photo) {
    const photoRect = photo.getBoundingClientRect();
    const px = photoRect.left - bounds.left, py = photoRect.top - bounds.top;
    context.save(); context.clip(outline(shape, px, py, photoRect.width, photoRect.height));
    cover(context, await loadImage(photo.src), px, py, photoRect.width, photoRect.height);
    context.restore();
  }
  const text = source.querySelector<HTMLElement>('.example-box p');
  if (text?.textContent?.trim()) {
    const style = getComputedStyle(text), textRect = text.getBoundingClientRect();
    const fontSize = parseFloat(style.fontSize), lineHeight = parseFloat(style.lineHeight) || fontSize * 1.25;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color; context.textAlign = 'center'; context.textBaseline = 'alphabetic';
    const lines = [''];
    text.childNodes.forEach(node => {
      if (node.nodeName === 'BR') lines.push('');
      else if (node.nodeType === Node.TEXT_NODE) lines[lines.length - 1] += node.textContent || '';
    });
    let lineIndex = 0;
    const metrics = context.measureText('Mg');
    const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
    const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2;
    const baseline = textRect.top - bounds.top + (lineHeight - ascent - descent) / 2 + ascent;
    for (const line of lines) {
      let wrapped = '';
      for (const character of line.trim().replace(/\s+/g, ' ')) {
        if (wrapped && context.measureText(wrapped + character).width > textRect.width) {
          context.fillText(wrapped, textRect.left - bounds.left + textRect.width / 2, baseline + lineIndex++ * lineHeight);
          wrapped = character;
        } else wrapped += character;
      }
      context.fillText(wrapped, textRect.left - bounds.left + textRect.width / 2, baseline + lineIndex++ * lineHeight);
    }
  }
  return canvas.toDataURL('image/png');
}
