import { describe, expect, it } from 'vitest';
import { defaultLayout } from './layout';
import { resizeCancel, resizeEnd, resizeMove, resizeStart } from './resize';
import type { Layout, PanelId, Point, Rect, ResizeEdge, Viewport } from './types';

const viewport: Viewport = { width: 1280, height: 800, top: 40 };
const start: Rect = { x: 400, y: 200, width: 320, height: 240 };

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

/** Grab `edge` of the counter panel at `from` and move the pointer to `to`. */
function resizeBy(edge: ResizeEdge, from: Point, to: Point, rect: Rect = start): Rect {
  const started = resizeStart({ layout: layoutWith('counter', rect), resize: null }, viewport, {
    panelId: 'counter',
    edge,
    pointer: from,
  });
  return rectOf(resizeMove(started, viewport, { pointer: to }).layout, 'counter');
}

describe('resizing a floating panel', () => {
  it('widens the panel when its right edge is dragged right', () => {
    expect(resizeBy('e', { x: 720, y: 300 }, { x: 800, y: 330 })).toEqual({
      x: 400,
      y: 200,
      width: 400,
      height: 240,
    });
  });

  it('moves the top-left corner with the pointer, keeping the bottom-right corner fixed', () => {
    expect(resizeBy('nw', { x: 400, y: 200 }, { x: 350, y: 150 })).toEqual({
      x: 350,
      y: 150,
      width: 370,
      height: 290,
    });
  });

  it.each([
    ['n', { x: 400, y: 180, width: 320, height: 260 }],
    ['s', { x: 400, y: 200, width: 320, height: 260 }],
    ['e', { x: 400, y: 200, width: 340, height: 240 }],
    ['w', { x: 380, y: 200, width: 340, height: 240 }],
    ['ne', { x: 400, y: 180, width: 340, height: 260 }],
    ['nw', { x: 380, y: 180, width: 340, height: 260 }],
    ['se', { x: 400, y: 200, width: 340, height: 260 }],
    ['sw', { x: 380, y: 200, width: 340, height: 260 }],
  ] as const)('grows outward from the %s edge when dragged 20 px outward', (edge, expected) => {
    const outward = {
      x: edge.includes('e') ? 20 : edge.includes('w') ? -20 : 0,
      y: edge.includes('s') ? 20 : edge.includes('n') ? -20 : 0,
    };
    expect(resizeBy(edge, { x: 500, y: 300 }, { x: 500 + outward.x, y: 300 + outward.y })).toEqual(
      expected,
    );
  });
});

describe('the minimum floating panel size', () => {
  it('stops shrinking at 200 x 120 when the bottom-right corner is dragged far up and left', () => {
    expect(resizeBy('se', { x: 720, y: 440 }, { x: 0, y: 0 })).toEqual({
      x: 400,
      y: 200,
      width: 200,
      height: 120,
    });
  });

  it('keeps the opposite edges fixed when the top-left corner is dragged far down and right', () => {
    // Right edge stays at 720 and bottom edge at 440.
    expect(resizeBy('nw', { x: 400, y: 200 }, { x: 1200, y: 780 })).toEqual({
      x: 520,
      y: 320,
      width: 200,
      height: 120,
    });
  });
});

describe('keeping the handle on screen while resizing', () => {
  it('stops the top edge at the action bar', () => {
    expect(resizeBy('n', { x: 500, y: 200 }, { x: 500, y: -300 })).toEqual({
      x: 400,
      y: 40,
      width: 320,
      height: 400,
    });
  });

  it('stops the left edge at the left of the screen', () => {
    expect(resizeBy('w', { x: 400, y: 300 }, { x: -300, y: 300 })).toEqual({
      x: 0,
      y: 200,
      width: 720,
      height: 240,
    });
  });

  it('stops the right edge at the right of the screen so the whole handle stays visible', () => {
    expect(resizeBy('e', { x: 720, y: 300 }, { x: 3000, y: 300 })).toEqual({
      x: 400,
      y: 200,
      width: 880,
      height: 240,
    });
  });

  it('lets the bottom edge go below the screen', () => {
    expect(resizeBy('s', { x: 500, y: 440 }, { x: 500, y: 1000 }).height).toBe(800);
  });

  it('stops the top edge where the handle would leave the bottom of the screen', () => {
    // Panel hangs below the screen (bottom at 940); handle top can go no lower than 800 - 32.
    const hanging = { x: 400, y: 700, width: 320, height: 240 };
    expect(resizeBy('n', { x: 500, y: 700 }, { x: 500, y: 900 }, hanging)).toEqual({
      x: 400,
      y: 768,
      width: 320,
      height: 172,
    });
  });
});

describe('the resize lifecycle', () => {
  it('keeps the final size on release, ends the resize and remembers it as the floating size', () => {
    const started = resizeStart({ layout: layoutWith('counter', start), resize: null }, viewport, {
      panelId: 'counter',
      edge: 'se',
      pointer: { x: 720, y: 440 },
    });

    const ended = resizeEnd(started, viewport, { pointer: { x: 760, y: 480 } });

    const expected = { x: 400, y: 200, width: 360, height: 280 };
    expect(rectOf(ended.layout, 'counter')).toEqual(expected);
    expect(ended.layout.panels.counter.lastFloatingRect).toEqual(expected);
    expect(ended.resize).toBeNull();
  });

  it('brings the panel to the front when a resize starts', () => {
    const layout: Layout = {
      ...layoutWith('counter', start),
      zOrder: ['counter', 'increment', 'decrement'],
    };
    const started = resizeStart({ layout, resize: null }, viewport, {
      panelId: 'counter',
      edge: 'e',
      pointer: { x: 720, y: 300 },
    });

    expect(started.layout.zOrder.at(-1)).toBe('counter');
  });

  it('does not resize a docked panel', () => {
    const layout = defaultLayout();
    const docked: Layout = {
      ...layout,
      panels: {
        ...layout.panels,
        counter: {
          ...layout.panels.counter,
          placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
        },
      },
    };
    const started = resizeStart({ layout: docked, resize: null }, viewport, {
      panelId: 'counter',
      edge: 'e',
      pointer: { x: 350, y: 100 },
    });
    const moved = resizeMove(started, viewport, { pointer: { x: 500, y: 100 } });

    expect(started.resize).toBeNull();
    expect(moved.layout.panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'left',
      column: 0,
      slot: 0,
    });
  });
});

describe('cancelling a resize', () => {
  it('restores the layout from before the resize began, z-order included, and ends it', () => {
    const layout: Layout = {
      ...layoutWith('counter', start),
      zOrder: ['counter', 'increment', 'decrement'],
    };
    const started = resizeStart({ layout, resize: null }, viewport, {
      panelId: 'counter',
      edge: 'se',
      pointer: { x: 720, y: 440 },
    });
    const moved = resizeMove(started, viewport, { pointer: { x: 800, y: 500 } });

    const cancelled = resizeCancel(moved);

    expect(cancelled).toEqual({ layout, resize: null });
  });

  it('changes nothing when no resize is in progress', () => {
    const session = { layout: layoutWith('counter', start), resize: null };

    expect(resizeCancel(session)).toBe(session);
  });
});
