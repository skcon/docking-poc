import { describe, expect, it } from 'vitest';
import { defaultLayout } from './layout';
import { clampToViewport } from './viewport';
import type { Layout, PanelId, Rect, Viewport } from './types';

function layoutWith(id: PanelId, rect: Rect): Layout {
  const layout = defaultLayout();
  return {
    ...layout,
    panels: {
      ...layout.panels,
      [id]: { id, placement: { kind: 'floating', rect }, lastFloatingRect: rect },
    },
  };
}

function rectOf(layout: Layout, id: PanelId): Rect {
  const placement = layout.panels[id].placement;
  if (placement.kind !== 'floating') throw new Error(`${id} is not floating`);
  return placement.rect;
}

describe('clamping floating panels when the browser window is resized', () => {
  it('pulls a panel stranded past the right edge back into view', () => {
    const layout = layoutWith('counter', { x: 1300, y: 200, width: 320, height: 240 });
    const smaller: Viewport = { width: 1024, height: 768, top: 40 };

    expect(rectOf(clampToViewport(layout, smaller), 'counter')).toEqual({
      x: 704,
      y: 200,
      width: 320,
      height: 240,
    });
  });

  it('pulls a panel stranded below the window up until its handle is visible', () => {
    const layout = layoutWith('counter', { x: 400, y: 900, width: 320, height: 240 });
    const shorter: Viewport = { width: 1280, height: 700, top: 40 };

    // Handle is 32 px tall: its top can be no lower than 700 - 32.
    expect(rectOf(clampToViewport(layout, shorter), 'counter').y).toBe(668);
  });

  it('narrows a panel wider than the window so its whole handle fits', () => {
    const layout = layoutWith('counter', { x: 100, y: 200, width: 1200, height: 240 });
    const narrower: Viewport = { width: 1024, height: 768, top: 40 };

    expect(rectOf(clampToViewport(layout, narrower), 'counter')).toEqual({
      x: 0,
      y: 200,
      width: 1024,
      height: 240,
    });
  });

  it('leaves panels that are already in view, and docked panels, untouched', () => {
    const layout = defaultLayout();
    const docked: Layout = {
      ...layout,
      panels: {
        ...layout.panels,
        counter: { ...layout.panels.counter, placement: { kind: 'docked', zone: 'left', slot: 0 } },
      },
    };

    expect(clampToViewport(docked, { width: 1280, height: 800, top: 40 })).toBe(docked);
  });
});
