import { describe, expect, it } from 'vitest';
import { dragCancel, dragEnd, dragMove, dragStart } from './drag';
import { dockedRect } from './docking';
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

  it('shows the dock target while the pointer is near an edge, and clears it when it leaves', () => {
    const nearLeft = dragMove(startDragging(), viewport, { pointer: { x: 20, y: 600 } });
    expect(nearLeft.drag?.dockTarget).toEqual({
      side: 'left',
      column: 0,
      slot: 0,
      kind: 'new-column',
    });

    const away = dragMove(nearLeft, viewport, { pointer: { x: 600, y: 400 } });
    expect(away.drag?.dockTarget).toBeNull();
  });

  it('docks the panel into the target when released there', () => {
    const ended = dragEnd(startDragging(), viewport, { pointer: { x: 1270, y: 100 } });

    expect(ended.layout.panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'right',
      column: 0,
      slot: 0,
    });
    expect(ended.drag).toBeNull();
  });

  it('keeps the panel floating when released away from every edge', () => {
    const ended = dragEnd(startDragging(), viewport, { pointer: { x: 600, y: 400 } });

    expect(ended.layout.panels.counter.placement.kind).toBe('floating');
  });

  it('keeps the panel floating when released over a full column', () => {
    const started = startDragging();
    const { panels } = started.layout;
    const leftFull: Layout = {
      ...started.layout,
      panels: {
        ...panels,
        increment: {
          ...panels.increment,
          placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
        },
        decrement: {
          ...panels.decrement,
          placement: { kind: 'docked', side: 'left', column: 0, slot: 1 },
        },
      },
    };

    const ended = dragEnd({ ...started, layout: leftFull }, viewport, {
      pointer: { x: 10, y: 300 },
    });

    expect(ended.layout.panels.counter.placement.kind).toBe('floating');
  });

  it('stacks the panel onto a column with one panel, 50/50', () => {
    const started = startDragging();
    const { panels } = started.layout;
    const oneDocked: Layout = {
      ...started.layout,
      panels: {
        ...panels,
        increment: {
          ...panels.increment,
          placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
        },
      },
    };
    const over = dragMove({ ...started, layout: oneDocked }, viewport, {
      pointer: { x: 100, y: 600 },
    });
    expect(over.drag?.dockTarget).toEqual({ side: 'left', column: 0, slot: 1, kind: 'stack' });

    const ended = dragEnd(over, viewport, { pointer: { x: 100, y: 600 } });

    expect(dockedRect(ended.layout, viewport, 'increment')).toEqual({
      x: 0,
      y: 40,
      width: 350,
      height: 380,
    });
    expect(dockedRect(ended.layout, viewport, 'counter')).toEqual({
      x: 0,
      y: 420,
      width: 350,
      height: 380,
    });
  });
});

describe('undocking by dragging a docked panel’s handle', () => {
  /** counter docked alone in the left column, i.e. at { x: 0, y: 40, width: 350, height: 760 }. */
  function dockedLeft(lastFloatingRect: Rect | null): Layout {
    const layout = defaultLayout();
    return {
      ...layout,
      panels: {
        ...layout.panels,
        counter: {
          id: 'counter',
          placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
          lastFloatingRect,
        },
      },
    };
  }

  it('floats the panel under the pointer at its last floating size, keeping the grab offset', () => {
    const layout = dockedLeft({ x: 900, y: 500, width: 400, height: 300 });

    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });

    const justPastThreshold = dragMove(started, viewport, { pointer: { x: 105, y: 50 } });
    expect(justPastThreshold.layout.panels.counter.placement).toEqual({
      kind: 'floating',
      rect: { x: 5, y: 40, width: 400, height: 300 },
    });
    const moved = dragMove(started, viewport, { pointer: { x: 600, y: 400 } });
    expect(rectOf(moved.layout, 'counter')).toEqual({ x: 500, y: 390, width: 400, height: 300 });
  });

  it('uses 320 x 240 if the panel has never floated, scaling the grab offset to stay on the handle', () => {
    // Grabbed at x 175 of the 350 px docked handle: halfway, so halfway along the 320 px handle.
    const started = dragStart({ layout: dockedLeft(null), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 175, y: 50 },
    });
    const moved = dragMove(started, viewport, { pointer: { x: 180, y: 50 } });

    expect(rectOf(moved.layout, 'counter')).toEqual({ x: 20, y: 40, width: 320, height: 240 });
    expect(moved.drag?.grabOffset).toEqual({ x: 160, y: 10 });
  });

  it('keeps the whole handle on screen and the pointer on it when undocking near the right edge', () => {
    const layout = defaultLayout();
    const dockedRight: Layout = {
      ...layout,
      panels: {
        ...layout.panels,
        // Docked alone at { x: 930, y: 40, width: 350, height: 760 }, last floated 500 wide.
        counter: {
          id: 'counter',
          placement: { kind: 'docked', side: 'right', column: 0, slot: 0 },
          lastFloatingRect: { x: 100, y: 100, width: 500, height: 300 },
        },
      },
    };

    const started = dragStart({ layout: dockedRight, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 1270, y: 50 },
    });
    const moved = dragMove(started, viewport, { pointer: { x: 1170, y: 150 } });

    // The handle is kept on screen (x 780), so the pointer is 490 px along it.
    expect(rectOf(moved.layout, 'counter')).toEqual({ x: 680, y: 140, width: 500, height: 300 });
  });

  /** counter in the top slot of the left column, increment in its bottom slot. */
  function sharedLeftColumn(): Layout {
    const layout = dockedLeft(null);
    return {
      ...layout,
      panels: {
        ...layout.panels,
        increment: {
          ...layout.panels.increment,
          placement: { kind: 'docked', side: 'left', column: 0, slot: 1 },
        },
      },
      zOrder: ['counter', 'increment', 'decrement'],
    };
  }

  it('lets the remaining panel fill the column as soon as the other floats', () => {
    const started = dragStart({ layout: sharedLeftColumn(), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });
    expect(dockedRect(started.layout, viewport, 'increment')?.height).toBe(380);

    const moved = dragMove(started, viewport, { pointer: { x: 640, y: 400 } });

    expect(moved.layout.panels.increment.placement).toEqual({
      kind: 'docked',
      side: 'left',
      column: 0,
      slot: 0,
    });
    expect(dockedRect(moved.layout, viewport, 'increment')).toEqual({
      x: 0,
      y: 40,
      width: 350,
      height: 760,
    });
  });

  it('moves the columns further in toward the edge as soon as a column’s only panel floats', () => {
    const layout = dockedLeft(null);
    const twoColumns: Layout = {
      ...layout,
      panels: {
        ...layout.panels,
        decrement: {
          ...layout.panels.decrement,
          placement: { kind: 'docked', side: 'left', column: 1, slot: 0 },
        },
      },
    };
    const started = dragStart({ layout: twoColumns, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });
    const moved = dragMove(started, viewport, { pointer: { x: 640, y: 400 } });

    expect(dockedRect(moved.layout, viewport, 'decrement')?.x).toBe(0);
  });

  it('brings the panel it floated out of its column to the front', () => {
    const started = dragStart({ layout: sharedLeftColumn(), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });

    expect(started.layout.zOrder).toEqual(['increment', 'decrement', 'counter']);
  });

  it('can dock the panel again in the same gesture, even back onto its old column, on top', () => {
    const started = dragStart({ layout: sharedLeftColumn(), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });
    const away = dragMove(started, viewport, { pointer: { x: 640, y: 400 } });
    const backToRight = dragEnd(away, viewport, { pointer: { x: 1270, y: 100 } });
    const backToOldSlot = dragEnd(away, viewport, { pointer: { x: 20, y: 100 } });

    expect(backToRight.layout.panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'right',
      column: 0,
      slot: 0,
    });
    expect(backToOldSlot.layout.panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'left',
      column: 0,
      slot: 0,
    });
  });

  it('remembers the floating size, so docking and undocking again restores it', () => {
    const started = dragStart({ layout: dockedLeft(null), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });
    const redocked = dragEnd(started, viewport, { pointer: { x: 1270, y: 100 } });
    const again = dragStart(redocked, viewport, {
      panelId: 'counter',
      pointer: { x: 1000, y: 50 },
    });
    const floatedAgain = dragMove(again, viewport, { pointer: { x: 900, y: 300 } });

    const { width, height } = rectOf(floatedAgain.layout, 'counter');
    expect({ width, height }).toEqual({ width: 320, height: 240 });
  });
});

describe('the drag threshold', () => {
  function dockedLeftAlone(): Layout {
    const layout = defaultLayout();
    return {
      ...layout,
      panels: {
        ...layout.panels,
        counter: {
          id: 'counter',
          placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
          lastFloatingRect: null,
        },
      },
    };
  }

  it('leaves a docked panel docked when its handle is clicked without moving', () => {
    const started = dragStart({ layout: dockedLeftAlone(), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });
    const ended = dragEnd(started, viewport, { pointer: { x: 100, y: 50 } });

    expect(ended.layout.panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'left',
      column: 0,
      slot: 0,
    });
    expect(ended.drag).toBeNull();
  });

  it('undocks only once the pointer has moved more than 4 px from where it was pressed', () => {
    const started = dragStart({ layout: dockedLeftAlone(), drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });

    const within = dragMove(started, viewport, { pointer: { x: 103, y: 52 } });
    expect(within.layout.panels.counter.placement.kind).toBe('docked');

    const past = dragMove(within, viewport, { pointer: { x: 105, y: 50 } });
    expect(past.layout.panels.counter.placement.kind).toBe('floating');
  });

  it('does not move a floating panel while the pointer stays within the threshold', () => {
    const layout = layoutWith('counter', { x: 400, y: 100, width: 320, height: 240 });
    const started = dragStart({ layout, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 410, y: 110 },
    });

    const within = dragMove(started, viewport, { pointer: { x: 413, y: 110 } });

    expect(rectOf(within.layout, 'counter')).toEqual({ x: 400, y: 100, width: 320, height: 240 });
  });
});

describe('cancelling a handle drag', () => {
  it('restores the layout from before the drag began and ends it, docking nothing', () => {
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
    const started = dragStart({ layout: docked, drag: null }, viewport, {
      panelId: 'counter',
      pointer: { x: 100, y: 50 },
    });
    // Undocked and hovering the right edge.
    const moved = dragMove(started, viewport, { pointer: { x: 1270, y: 300 } });
    expect(moved.drag?.dockTarget).not.toBeNull();

    expect(dragCancel(moved)).toEqual({ layout: docked, drag: null });
  });

  it('changes nothing when no drag is in progress', () => {
    const session = { layout: defaultLayout(), drag: null };

    expect(dragCancel(session)).toBe(session);
  });
});
