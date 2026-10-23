import { describe, expect, it } from 'vitest';
import { dragStart } from './drag';
import { defaultLayout } from './layout';
import { raisePanel } from './raise';
import type { Layout } from './types';

const viewport = { width: 1280, height: 800, top: 40 };

function stackedBackToFront(): Layout {
  return { ...defaultLayout(), zOrder: ['counter', 'increment', 'decrement'] };
}

describe('raising a panel', () => {
  it('brings a clicked panel to the front, keeping the others in order', () => {
    expect(raisePanel(stackedBackToFront(), 'counter').zOrder).toEqual([
      'increment',
      'decrement',
      'counter',
    ]);
  });

  it('leaves the layout untouched when the panel is already in front', () => {
    const layout = stackedBackToFront();

    expect(raisePanel(layout, 'decrement')).toBe(layout);
  });

  it('brings a panel to the front when its handle drag starts', () => {
    const started = dragStart({ layout: stackedBackToFront(), drag: null }, viewport, {
      panelId: 'increment',
      pointer: { x: 500, y: 150 },
    });

    expect(started.layout.zOrder).toEqual(['counter', 'decrement', 'increment']);
  });
});
