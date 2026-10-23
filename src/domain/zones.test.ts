import { describe, expect, it } from 'vitest';
import { defaultLayout } from './layout';
import type { Layout, PanelId, Rect, SlotId, Viewport, ZoneId } from './types';
import { dockedRect, dropTargetAt } from './zones';

const viewport: Viewport = { width: 1280, height: 800, top: 40 };

function withDocked(layout: Layout, id: PanelId, zone: ZoneId, slot: SlotId): Layout {
  return {
    ...layout,
    panels: {
      ...layout.panels,
      [id]: { ...layout.panels[id], placement: { kind: 'docked', zone, slot } },
    },
  };
}

describe('drop target while dragging a floating panel', () => {
  it('targets the left zone when the pointer is within 80 px of the left edge', () => {
    expect(dropTargetAt(defaultLayout(), viewport, { x: 80, y: 200 }, 'counter')?.zone).toBe(
      'left',
    );
  });

  it('targets nothing when the pointer is farther than 80 px from every edge', () => {
    expect(dropTargetAt(defaultLayout(), viewport, { x: 81, y: 200 }, 'counter')).toBeNull();
  });

  it('targets the right and bottom zones within 80 px of their edges', () => {
    expect(dropTargetAt(defaultLayout(), viewport, { x: 1200, y: 300 }, 'counter')?.zone).toBe(
      'right',
    );
    expect(dropTargetAt(defaultLayout(), viewport, { x: 640, y: 720 }, 'counter')?.zone).toBe(
      'bottom',
    );
  });

  it('lets the nearest edge win near a corner', () => {
    // 30 px from the left edge, 60 px from the bottom edge.
    expect(dropTargetAt(defaultLayout(), viewport, { x: 30, y: 740 }, 'counter')?.zone).toBe(
      'left',
    );
    // 60 px from the right edge, 10 px from the bottom edge.
    expect(dropTargetAt(defaultLayout(), viewport, { x: 1220, y: 790 }, 'counter')?.zone).toBe(
      'bottom',
    );
  });

  it('never targets anything while the pointer is over the action bar', () => {
    expect(dropTargetAt(defaultLayout(), viewport, { x: 10, y: 20 }, 'counter')).toBeNull();
  });
});

describe('slot choice', () => {
  // The map runs from y = 40 to y = 800, so a column's halves meet at y = 420.
  it('picks the top slot of a column in its upper half and the bottom slot in its lower half', () => {
    expect(dropTargetAt(defaultLayout(), viewport, { x: 10, y: 410 }, 'counter')).toEqual({
      zone: 'left',
      slot: 0,
    });
    expect(dropTargetAt(defaultLayout(), viewport, { x: 1270, y: 430 }, 'counter')).toEqual({
      zone: 'right',
      slot: 1,
    });
  });

  // The bottom strip runs between the 350 px columns, from x = 350 to x = 930: halves meet at 640.
  it('picks the left slot of the bottom strip in its left half and the right slot in its right half', () => {
    expect(dropTargetAt(defaultLayout(), viewport, { x: 630, y: 790 }, 'counter')).toEqual({
      zone: 'bottom',
      slot: 0,
    });
    expect(dropTargetAt(defaultLayout(), viewport, { x: 650, y: 790 }, 'counter')).toEqual({
      zone: 'bottom',
      slot: 1,
    });
  });

  it('falls back to the free slot when the chosen one is taken', () => {
    const layout = withDocked(defaultLayout(), 'increment', 'left', 0);

    expect(dropTargetAt(layout, viewport, { x: 10, y: 100 }, 'counter')).toEqual({
      zone: 'left',
      slot: 1,
    });
  });

  it('targets nothing when the nearest zone is full', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'increment', 'bottom', 0),
      'decrement',
      'bottom',
      1,
    );

    expect(dropTargetAt(layout, viewport, { x: 640, y: 790 }, 'counter')).toBeNull();
  });
});

describe('docked panel geometry', () => {
  it('gives a lone docked panel the full 350 px column below the action bar', () => {
    const layout = withDocked(defaultLayout(), 'counter', 'left', 1);

    expect(dockedRect(layout, viewport, 'counter')).toEqual({
      x: 0,
      y: 40,
      width: 350,
      height: 760,
    });
  });

  it('splits a column evenly between two docked panels, top slot first', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'right', 1),
      'increment',
      'right',
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

  it('places bottom strip slots side by side between the columns', () => {
    const layout = withDocked(
      withDocked(defaultLayout(), 'counter', 'bottom', 0),
      'increment',
      'bottom',
      1,
    );

    // The strip is 1280 - 2 * 350 = 580 px wide, so each slot gets half of it.
    expect(dockedRect(layout, viewport, 'counter')).toEqual({
      x: 350,
      y: 560,
      width: 290,
      height: 240,
    });
    expect(dockedRect(layout, viewport, 'increment')).toEqual({
      x: 640,
      y: 560,
      width: 290,
      height: 240,
    });
  });

  it('caps each bottom strip slot at 350 px on a wide screen', () => {
    const wide: Viewport = { width: 1920, height: 1080, top: 40 };
    const layout = withDocked(defaultLayout(), 'counter', 'bottom', 1);

    expect(dockedRect(layout, wide, 'counter')).toEqual({
      x: 700,
      y: 840,
      width: 350,
      height: 240,
    });
  });

  it('never overlaps panels docked in different zones', () => {
    const layout = withDocked(
      withDocked(withDocked(defaultLayout(), 'counter', 'left', 0), 'increment', 'right', 1),
      'decrement',
      'bottom',
      0,
    );
    const rects = (['counter', 'increment', 'decrement'] as const).map((id) => {
      const rect = dockedRect(layout, viewport, id);
      if (!rect) throw new Error(`${id} has no docked rect`);
      return rect;
    });
    const overlaps = (a: Rect, b: Rect) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

    for (const a of rects) {
      for (const b of rects) {
        if (a !== b) expect(overlaps(a, b)).toBe(false);
      }
    }
  });

  it('has no docked rect for a floating panel', () => {
    expect(dockedRect(defaultLayout(), viewport, 'counter')).toBeNull();
  });
});
