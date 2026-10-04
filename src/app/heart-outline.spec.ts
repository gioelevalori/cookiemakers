import { HEART_CLIP_PATH, HEART_CURVES, HEART_START } from './heart-outline';

describe('Heart outline', () => {
  it('uses a closed curved contour with rounded lobes', () => {
    expect(HEART_CURVES.length).toBe(7);
    const last = HEART_CURVES[HEART_CURVES.length - 1];
    expect(last.slice(4)).toEqual([...HEART_START]);
    expect(HEART_CLIP_PATH.startsWith('polygon(')).toBeTrue();
  });

  it('samples a symmetric outline inside the cookie bounds', () => {
    const points = HEART_CLIP_PATH.slice(8, -1).split(',').map(point => point.split(' ').map(parseFloat));
    expect(points.length).toBe(168);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
      expect(points.some(([otherX, otherY]) => Math.abs(otherX + x - 100) < 0.0002 && Math.abs(otherY - y) < 0.0002)).toBeTrue();
    }
  });
});
