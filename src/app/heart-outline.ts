export type HeartCurve = readonly [number, number, number, number, number, number];

export const HEART_START = [50, 20] as const;
export const HEART_CURVES: readonly HeartCurve[] = [
  [45, 20, 41, 4, 25, 4],
  [10, 4, 1, 15, 1, 30],
  [1, 52, 23, 68, 46, 94],
  [48, 96.26087, 52, 96.26087, 54, 94],
  [77, 68, 99, 52, 99, 30],
  [99, 15, 90, 4, 75, 4],
  [59, 4, 55, 20, 50, 20]
];

// Sample the same Bezier outline for CSS percentage clipping and Three.js.
const points: string[] = [];
let start: readonly [number, number] = HEART_START;
for (const [x1, y1, x2, y2, x3, y3] of HEART_CURVES) {
  for (let step = 0; step < 24; step++) {
    const t = step / 24, u = 1 - t;
    const x = u ** 3 * start[0] + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x3;
    const y = u ** 3 * start[1] + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3;
    points.push(x.toFixed(4) + '% ' + y.toFixed(4) + '%');
  }
  start = [x3, y3];
}

export const HEART_CLIP_PATH = 'polygon(' + points.join(',') + ')';
