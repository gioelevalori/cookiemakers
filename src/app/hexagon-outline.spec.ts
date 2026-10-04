import { HEXAGON_CLIP_PATH, HEXAGON_CORNERS } from './hexagon-outline';

describe('Hexagon outline', () => {
  it('rounds all six corners without changing the flat-top orientation', () => {
    expect(HEXAGON_CORNERS.length).toBe(6);
    expect(HEXAGON_CORNERS[0].control).toEqual([25, 0]);
    expect(HEXAGON_CORNERS[1].control).toEqual([75, 0]);
    expect(HEXAGON_CLIP_PATH.slice(8, -1).split(',').length).toBe(78);
    for (const { entry, control, exit } of HEXAGON_CORNERS) {
      expect(entry).not.toEqual(control);
      expect(exit).not.toEqual(control);
      expect(entry).not.toEqual(exit);
    }
  });
});
