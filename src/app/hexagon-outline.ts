const vertices = [[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]] as const;
const cornerCut = 0.08;

export const HEXAGON_CORNERS = vertices.map(([x, y], index) => {
  const previous = vertices[(index + vertices.length - 1) % vertices.length];
  const next = vertices[(index + 1) % vertices.length];
  return {
    entry: [x + (previous[0] - x) * cornerCut, y + (previous[1] - y) * cornerCut] as const,
    control: [x, y] as const,
    exit: [x + (next[0] - x) * cornerCut, y + (next[1] - y) * cornerCut] as const
  };
});

// Quadratic corner fillets are shared by the CSS clip and the extruded mesh.
export const HEXAGON_CLIP_PATH = 'polygon(' + HEXAGON_CORNERS.flatMap(({ entry, control, exit }) =>
  Array.from({ length: 13 }, (_, step) => {
    const t = step / 12, u = 1 - t;
    const x = u ** 2 * entry[0] + 2 * u * t * control[0] + t ** 2 * exit[0];
    const y = u ** 2 * entry[1] + 2 * u * t * control[1] + t ** 2 * exit[1];
    return x.toFixed(4) + '% ' + y.toFixed(4) + '%';
  })
).join(',') + ')';
