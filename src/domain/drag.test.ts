import { describe, expect, it } from 'vitest';
import { dragEnd, dragMove, dragStart } from './drag';
import { defaultLayout } from './layout';
import type { Layout, PanelId, Rect, Viewport } from './types';

const viewport: Viewport = { width: 1280, height: 800, top: 40 };

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

describe('moving a floating panel by its handle', () => {
  it('follows the pointer, keeping the point where the handle was grabbed', () => {
    const layout = layoutWith('counter', { x: 400, y: 100, width: 320, height: 240 });

    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 410, y: 110 },
    });
    const moved = dragMove(started, viewport, { pointer: { x: 610, y: 310 } });

    expect(rectOf(moved.layout, 'counter')).toEqual({ x: 600, y: 300, width: 320, height: 240 });
  });

  function dragTo(pointer: { x: number; y: number }): Rect {
    const layout = layoutWith('counter', { x: 400, y: 100, width: 320, height: 240 });
    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 410, y: 110 },
    });
    return rectOf(dragMove(started, viewport, { pointer }).layout, 'counter');
  }

  it('stops the handle at the left edge of the screen', () => {
    expect(dragTo({ x: -500, y: 300 }).x).toBe(0);
  });

  it('stops the handle at the right edge of the screen, keeping the whole handle visible', () => {
    expect(dragTo({ x: 5000, y: 300 }).x).toBe(1280 - 320);
  });

  it('keeps the handle below the action bar', () => {
    expect(dragTo({ x: 600, y: -500 }).y).toBe(40);
  });

  it('lets the panel body go below the screen but keeps the handle on screen', () => {
    // Handle is 32 px tall: its top can go no lower than 800 - 32.
    expect(dragTo({ x: 600, y: 5000 }).y).toBe(768);
  });

  it('pins a panel wider than the screen to the left edge', () => {
    const layout = layoutWith('counter', { x: 0, y: 100, width: 1500, height: 240 });
    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 10, y: 110 },
    });
    const moved = dragMove(started, viewport, { pointer: { x: 300, y: 110 } });
    expect(rectOf(moved.layout, 'counter').x).toBe(0);
  });
});

describe('releasing a handle drag', () => {
  it('leaves the panel at the release point and ends the drag', () => {
    const layout = layoutWith('counter', { x: 400, y: 100, width: 320, height: 240 });
    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 410, y: 110 },
    });

    const ended = dragEnd(started, viewport, { pointer: { x: 510, y: 210 } });

    expect(rectOf(ended.layout, 'counter')).toEqual({ x: 500, y: 200, width: 320, height: 240 });
    expect(ended.drag).toBeNull();
  });

  it('ignores pointer moves once the drag has ended', () => {
    const layout = layoutWith('counter', { x: 400, y: 100, width: 320, height: 240 });
    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 410, y: 110 },
    });
    const ended = dragEnd(started, viewport, { pointer: { x: 410, y: 110 } });

    const after = dragMove(ended, viewport, { pointer: { x: 900, y: 600 } });

    expect(rectOf(after.layout, 'counter')).toEqual({ x: 400, y: 100, width: 320, height: 240 });
  });
});

describe('docking by dragging to an edge', () => {
  function startDragging() {
    const layout = layoutWith('counter', { x: 400, y: 100, width: 320, height: 240 });
    return dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 410, y: 110 },
    });
  }

  it('shows the drop target while the pointer is near an edge, and clears it when it leaves', () => {
    const nearLeft = dragMove(startDragging(), viewport, { pointer: { x: 20, y: 600 } });
    expect(nearLeft.drag?.dropTarget).toEqual({ zone: 'left', slot: 1 });

    const away = dragMove(nearLeft, viewport, { pointer: { x: 600, y: 400 } });
    expect(away.drag?.dropTarget).toBeNull();
  });

  it('docks the panel into the target slot when released there', () => {
    const ended = dragEnd(startDragging(), viewport, { pointer: { x: 1270, y: 100 } });

    expect(ended.layout.panels.counter.placement).toEqual({
      kind: 'docked',
      zone: 'right',
      slot: 0,
    });
    expect(ended.drag).toBeNull();
  });

  it('keeps the panel floating when released away from every edge', () => {
    const ended = dragEnd(startDragging(), viewport, { pointer: { x: 600, y: 400 } });

    expect(ended.layout.panels.counter.placement.kind).toBe('floating');
  });

  it('keeps the panel floating when released over a full zone', () => {
    const started = startDragging();
    const { panels } = started.layout;
    const leftFull: Layout = {
      ...started.layout,
      panels: {
        ...panels,
        increment: { ...panels.increment, placement: { kind: 'docked', zone: 'left', slot: 0 } },
        decrement: { ...panels.decrement, placement: { kind: 'docked', zone: 'left', slot: 1 } },
      },
    };

    const ended = dragEnd({ ...started, layout: leftFull }, viewport, {
      pointer: { x: 10, y: 300 },
    });

    expect(ended.layout.panels.counter.placement.kind).toBe('floating');
  });
});
