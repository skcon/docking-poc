import { describe, expect, it } from 'vitest';
import { dockedRect, dockPanel, dockTargetAt, normalizeDocks, previewRect } from './docking';
import { defaultLayout } from './layout';
import { undockPanel } from './undock';
import type { Layout, PanelId, Side, Slot, Viewport } from './types';

const viewport: Viewport = { width: 1280, height: 800, top: 40 };

function withDocked(layout: Layout, id: PanelId, side: Side, column: number, slot: Slot): Layout {
  return {
    ...layout,
    panels: {
      ...layout.panels,
      [id]: { ...layout.panels[id], placement: { kind: 'docked', side, column, slot } },
    },
  };
}

describe('dock target at the screen edge of an empty side', () => {
  it('offers a new column within 80 px of the left edge', () => {
    expect(dockTargetAt(defaultLayout(), viewport, { x: 80, y: 200 }, 'counter')).toEqual({
      side: 'left',
      column: 0,
      slot: 0,
      kind: 'new-column',
    });
  });

  it('offers nothing farther than 80 px from every edge', () => {
    expect(dockTargetAt(defaultLayout(), viewport, { x: 81, y: 200 }, 'counter')).toBeNull();
    expect(dockTargetAt(defaultLayout(), viewport, { x: 1199, y: 200 }, 'counter')).toBeNull();
  });

  it('offers a new column within 80 px of the right edge', () => {
    expect(dockTargetAt(defaultLayout(), viewport, { x: 1200, y: 200 }, 'counter')).toEqual({
      side: 'right',
      column: 0,
      slot: 0,
      kind: 'new-column',
    });
  });

  it('never offers anything while the pointer is over the action bar', () => {
    expect(dockTargetAt(defaultLayout(), viewport, { x: 10, y: 20 }, 'counter')).toBeNull();
  });

  it('ignores the dragged panel’s own docked placement', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'left', 0, 0);

    expect(dockTargetAt(layout, viewport, { x: 10, y: 200 }, 'counter')?.kind).toBe('new-column');
  });
});

describe('dock target over a docked column', () => {
  const oneInLeft = withDocked(defaultLayout(), 'increment', 'left', 0, 0);

  // The map runs from y = 40 to y = 800, so a column's halves meet at y = 420.
  it('stacks into the top half when the pointer is in the upper half of the column', () => {
    expect(dockTargetAt(oneInLeft, viewport, { x: 100, y: 419 }, 'counter')).toEqual({
      side: 'left',
      column: 0,
      slot: 0,
      kind: 'stack',
    });
  });

  it('stacks into the bottom half when the pointer is in the lower half of the column', () => {
    expect(dockTargetAt(oneInLeft, viewport, { x: 100, y: 420 }, 'counter')).toEqual({
      side: 'left',
      column: 0,
      slot: 1,
      kind: 'stack',
    });
  });

  it('stacks into the column under the pointer, not the nearest edge', () => {
    const layout = withDocked(oneInLeft, 'decrement', 'left', 1, 0);

    expect(dockTargetAt(layout, viewport, { x: 360, y: 100 }, 'counter')).toEqual({
      side: 'left',
      column: 1,
      slot: 0,
      kind: 'stack',
    });
  });

  it('offers nothing over a column that already holds two panels', () => {
    const full = withDocked(
      withDocked(defaultLayout(), 'increment', 'left', 0, 0),
      'decrement',
      'left',
      0,
      1,
    );

    expect(dockTargetAt(full, viewport, { x: 10, y: 100 }, 'counter')).toBeNull();
  });
});

describe('dock target at the inner edge of a side’s innermost column', () => {
  it('offers a new column next to the innermost left column within 80 px', () => {
    const layout = withDocked(defaultLayout(), 'increment', 'left', 0, 0);

    expect(dockTargetAt(layout, viewport, { x: 350, y: 200 }, 'counter')).toEqual({
      side: 'left',
      column: 1,
      slot: 0,
      kind: 'new-column',
    });
    expect(dockTargetAt(layout, viewport, { x: 430, y: 200 }, 'counter')?.column).toBe(1);
    expect(dockTargetAt(layout, viewport, { x: 431, y: 200 }, 'counter')).toBeNull();
  });

  it('offers a new column next to the innermost right column within 80 px', () => {
    const layout = withDocked(defaultLayout(), 'increment', 'right', 0, 0);

    expect(dockTargetAt(layout, viewport, { x: 929, y: 200 }, 'counter')).toEqual({
      side: 'right',
      column: 1,
      slot: 0,
      kind: 'new-column',
    });
    expect(dockTargetAt(layout, viewport, { x: 850, y: 200 }, 'counter')?.column).toBe(1);
    expect(dockTargetAt(layout, viewport, { x: 849, y: 200 }, 'counter')).toBeNull();
  });

  it('offers the next column after the innermost one when a side has several', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'increment', 'left', 0, 0),
      'decrement',
      'left',
      1,
      0,
    );

    expect(
      dockTargetAt(layout, { ...viewport, width: 1920 }, { x: 750, y: 200 }, 'counter'),
    ).toEqual({
      side: 'left',
      column: 2,
      slot: 0,
      kind: 'new-column',
    });
  });

  it('offers no new column that would leave less than 300 px of map', () => {
    // 1280 - 300 = 980 px for columns: two docked (700) plus a new one (1050) does not fit.
    const layout = withDocked(
      withDocked(defaultLayout(), 'increment', 'left', 0, 0),
      'decrement',
      'left',
      1,
      0,
    );

    expect(dockTargetAt(layout, viewport, { x: 750, y: 200 }, 'counter')).toBeNull();
    // Nor at the other, still empty, side's edge.
    expect(dockTargetAt(layout, viewport, { x: 1270, y: 200 }, 'counter')).toBeNull();
  });

  it('offers a new column exactly when 300 px of map remain', () => {
    const exact: Viewport = { width: 1000, height: 800, top: 40 };
    const layout = withDocked(defaultLayout(), 'increment', 'left', 0, 0);

    // 350 + 350 + 300 = 1000.
    expect(dockTargetAt(layout, exact, { x: 360, y: 200 }, 'counter')?.kind).toBe('new-column');
    expect(
      dockTargetAt(layout, { ...exact, width: 999 }, { x: 360, y: 200 }, 'counter'),
    ).toBeNull();
  });
});

describe('docking a panel into a target', () => {
  it('docks into a new column on an empty side', () => {
    const target = { side: 'right', column: 0, slot: 0, kind: 'new-column' } as const;

    expect(dockPanel(defaultLayout(), 'counter', target).panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'right',
      column: 0,
      slot: 0,
    });
  });

  it('stacks below a lone panel when the target is the bottom half', () => {
    const layout = withDocked(defaultLayout(), 'increment', 'left', 0, 0);
    const docked = dockPanel(layout, 'counter', {
      side: 'left',
      column: 0,
      slot: 1,
      kind: 'stack',
    });

    expect(docked.panels.increment.placement).toMatchObject({ column: 0, slot: 0 });
    expect(docked.panels.counter.placement).toMatchObject({ column: 0, slot: 1 });
  });

  it('puts the dragged panel on top, and the lone panel below, when the target is the top half', () => {
    const layout = withDocked(defaultLayout(), 'increment', 'left', 0, 0);
    const docked = dockPanel(layout, 'counter', {
      side: 'left',
      column: 0,
      slot: 0,
      kind: 'stack',
    });

    expect(docked.panels.counter.placement).toMatchObject({ column: 0, slot: 0 });
    expect(docked.panels.increment.placement).toMatchObject({ column: 0, slot: 1 });
  });

  it('appends a new column inside the innermost one', () => {
    const layout = withDocked(defaultLayout(), 'increment', 'left', 0, 0);
    const docked = dockPanel(layout, 'counter', {
      side: 'left',
      column: 1,
      slot: 0,
      kind: 'new-column',
    });

    expect(docked.panels.increment.placement).toMatchObject({ column: 0 });
    expect(docked.panels.counter.placement).toMatchObject({ column: 1 });
  });

  it('keeps the panel’s last floating rect', () => {
    const layout = defaultLayout();
    const docked = dockPanel(layout, 'counter', {
      side: 'left',
      column: 0,
      slot: 0,
      kind: 'new-column',
    });

    expect(docked.panels.counter.lastFloatingRect).toEqual(layout.panels.counter.lastFloatingRect);
  });
});

describe('keeping the docked layout compact', () => {
  it('moves columns toward the edge to close a gap', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'right', 2, 0);

    expect(normalizeDocks(layout).panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'right',
      column: 0,
      slot: 0,
    });
  });

  it('makes a lone panel in a column take the top slot', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'left', 0, 1);

    expect(normalizeDocks(layout).panels.counter.placement).toMatchObject({ column: 0, slot: 0 });
  });

  it('keeps the order of columns and of slots, per side', () => {
    const layout = withDocked(
      withDocked(withDocked(defaultLayout(), 'counter', 'left', 4, 1), 'increment', 'left', 4, 0),
      'decrement',
      'left',
      2,
      0,
    );
    const { panels } = normalizeDocks(layout);

    expect(panels.decrement.placement).toMatchObject({ column: 0, slot: 0 });
    expect(panels.increment.placement).toMatchObject({ column: 1, slot: 0 });
    expect(panels.counter.placement).toMatchObject({ column: 1, slot: 1 });
  });

  it('returns the same layout when it is already compact', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'left', 0, 0),
      'increment',
      'right',
      0,
      0,
    );

    expect(normalizeDocks(layout)).toBe(layout);
  });
});

describe('docked panel geometry', () => {
  it('gives a lone panel the full 350 px column below the action bar, from the left edge', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'left', 0, 0);

    expect(dockedRect(layout, viewport, 'counter')).toEqual({
      x: 0,
      y: 40,
      width: 350,
      height: 760,
    });
  });

  it('lays left columns out from the left edge inward', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'left', 1, 0);

    expect(dockedRect(layout, viewport, 'counter')?.x).toBe(350);
  });

  it('lays right columns out from the right edge inward', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'right', 0, 0),
      'increment',
      'right',
      1,
      0,
    );

    expect(dockedRect(layout, viewport, 'counter')?.x).toBe(930);
    expect(dockedRect(layout, viewport, 'increment')?.x).toBe(580);
  });

  it('splits a column 50/50 between two panels, slot 0 on top', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'right', 0, 1),
      'increment',
      'right',
      0,
      0,
    );

    expect(dockedRect(layout, viewport, 'increment')).toEqual({
      x: 930,
      y: 40,
      width: 350,
      height: 380,
    });
    expect(dockedRect(layout, viewport, 'counter')).toEqual({
      x: 930,
      y: 420,
      width: 350,
      height: 380,
    });
  });

  it('follows the viewport, keeping right columns on the right edge', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'right', 0, 0);

    expect(dockedRect(layout, { width: 900, height: 600, top: 40 }, 'counter')).toEqual({
      x: 550,
      y: 40,
      width: 350,
      height: 560,
    });
  });

  it('has no docked rect for a floating panel', () => {
    expect(dockedRect(defaultLayout(), viewport, 'counter')).toBeNull();
  });
});

describe('undocking closes up the layout', () => {
  const pointer = { x: 100, y: 50 };

  it('gives the remaining panel of a 50/50 column the full height', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'left', 0, 0),
      'increment',
      'left',
      0,
      1,
    );
    const floated = undockPanel(layout, viewport, 'increment', pointer);

    expect(floated && dockedRect(floated.layout, viewport, 'counter')).toEqual({
      x: 0,
      y: 40,
      width: 350,
      height: 760,
    });
  });

  it('moves the columns further in toward the edge when a column disappears', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'left', 0, 0),
      'decrement',
      'left',
      1,
      0,
    );
    const floated = undockPanel(layout, viewport, 'counter', pointer);

    expect(floated && dockedRect(floated.layout, viewport, 'decrement')?.x).toBe(0);
  });
});

describe('the dock preview', () => {
  it('covers the whole new column', () => {
    const target = { side: 'left', column: 1, slot: 0, kind: 'new-column' } as const;

    expect(previewRect(viewport, target)).toEqual({ x: 350, y: 40, width: 350, height: 760 });
    expect(previewRect(viewport, { ...target, side: 'right', column: 0 })).toEqual({
      x: 930,
      y: 40,
      width: 350,
      height: 760,
    });
  });

  it('covers the half of the column the panel will take', () => {
    const top = { side: 'left', column: 0, slot: 0, kind: 'stack' } as const;

    expect(previewRect(viewport, top)).toEqual({ x: 0, y: 40, width: 350, height: 380 });
    expect(previewRect(viewport, { ...top, slot: 1 })).toEqual({
      x: 0,
      y: 420,
      width: 350,
      height: 380,
    });
  });
});
