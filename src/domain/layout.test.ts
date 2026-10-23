import { describe, expect, it } from 'vitest';
import { defaultLayout, PANEL_IDS } from './layout';

describe('defaultLayout', () => {
  it('floats all three panels at 320 x 240', () => {
    const layout = defaultLayout();

    for (const id of ['counter', 'increment', 'decrement'] as const) {
      const placement = layout.panels[id].placement;
      expect(placement.kind).toBe('floating');
      if (placement.kind !== 'floating') continue;
      expect(placement.rect.width).toBe(320);
      expect(placement.rect.height).toBe(240);
    }
  });

  it('staggers the panels so each one is offset down and right of the previous', () => {
    const layout = defaultLayout();
    const rects = PANEL_IDS.map((id) => {
      const placement = layout.panels[id].placement;
      if (placement.kind !== 'floating') throw new Error(`${id} is not floating`);
      return placement.rect;
    });

    const [first, second, third] = rects;
    expect(second?.x).toBeGreaterThan(first?.x ?? Infinity);
    expect(second?.y).toBeGreaterThan(first?.y ?? Infinity);
    expect(third?.x).toBeGreaterThan(second?.x ?? Infinity);
    expect(third?.y).toBeGreaterThan(second?.y ?? Infinity);
  });

  it('stacks every panel exactly once in the z-order', () => {
    expect([...defaultLayout().zOrder].sort()).toEqual(['counter', 'decrement', 'increment']);
  });
});
