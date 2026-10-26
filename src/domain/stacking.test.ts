import { describe, expect, it } from 'vitest';
import { defaultLayout } from './layout';
import { stackingOf } from './stacking';
import type { Layout } from './types';

describe('stacking panels and the drop highlight', () => {
  it('stacks floating panels back to front by z-order, above the drop highlight', () => {
    const layout: Layout = { ...defaultLayout(), zOrder: ['decrement', 'counter', 'increment'] };

    const { panels, dropHighlight } = stackingOf(layout);

    expect(dropHighlight).toBeLessThan(panels.decrement);
    expect(panels.decrement).toBeLessThan(panels.counter);
    expect(panels.counter).toBeLessThan(panels.increment);
  });

  it('keeps docked panels below the drop highlight and every floating panel, even when in front', () => {
    const layout = defaultLayout();
    const counterDockedInFront: Layout = {
      panels: {
        ...layout.panels,
        counter: {
          ...layout.panels.counter,
          placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
        },
      },
      zOrder: ['increment', 'decrement', 'counter'],
    };

    const { panels, dropHighlight } = stackingOf(counterDockedInFront);

    expect(panels.counter).toBeLessThan(dropHighlight);
    expect(panels.counter).toBeLessThan(panels.increment);
    expect(panels.increment).toBeLessThan(panels.decrement);
  });
});
