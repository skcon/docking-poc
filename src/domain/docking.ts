/**
 * Docking: the free-form column model. Docked panels form full-height columns of
 * COLUMN_WIDTH_PX along the left and right screen edges, laid out from the edge inward; a
 * column holds one panel or two stacked 50/50. Pure functions of (layout, viewport); docked
 * rects are derived, never stored.
 */
import { COLUMN_WIDTH_PX, EDGE_TRIGGER_PX, MIN_MAP_WIDTH_PX, PANELS_PER_COLUMN } from './constants';
import { PANEL_IDS } from './layout';
import type {
  DockTarget,
  Layout,
  PanelId,
  PanelState,
  Point,
  Rect,
  Side,
  Slot,
  Viewport,
} from './types';

const SIDES = ['left', 'right'] as const satisfies readonly Side[];

type DockedPlacement = Extract<PanelState['placement'], { kind: 'docked' }>;

function dockedPlacementOf(panel: PanelState): DockedPlacement | null {
  return panel.placement.kind === 'docked' ? panel.placement : null;
}

/** The docked panels on a side, ordered by column, then slot (PANEL_IDS order breaks ties). */
function dockedOnSide(layout: Layout, side: Side, exceptId?: PanelId) {
  return PANEL_IDS.flatMap((id) => {
    const placement = dockedPlacementOf(layout.panels[id]);
    return id !== exceptId && placement?.side === side ? [{ id, placement }] : [];
  }).sort((a, b) => a.placement.column - b.placement.column || a.placement.slot - b.placement.slot);
}

/**
 * Close every gap: on each side, columns are numbered 0, 1, 2... from the edge keeping their
 * order, and a lone panel takes slot 0 (so it is full height). A column given more than two
 * panels is split in two. Returns the same layout when it is already compact.
 */
export function normalizeDocks(layout: Layout): Layout {
  const compact = new Map<PanelId, DockedPlacement>();
  for (const side of SIDES) {
    const docked = dockedOnSide(layout, side);
    let column = -1;
    let previousColumn: number | null = null;
    let slot = 0;
    for (const { id, placement } of docked) {
      if (placement.column !== previousColumn || slot >= PANELS_PER_COLUMN) {
        column += 1;
        slot = 0;
      }
      previousColumn = placement.column;
      compact.set(id, { kind: 'docked', side, column, slot: slot as Slot });
      slot += 1;
    }
  }
  const changed = [...compact].filter(([id, next]) => {
    const current = dockedPlacementOf(layout.panels[id]);
    return current?.column !== next.column || current.slot !== next.slot;
  });
  if (changed.length === 0) return layout;
  const panels = { ...layout.panels };
  for (const [id, placement] of changed) panels[id] = { ...panels[id], placement };
  return { ...layout, panels };
}

/** How many panels each column of a side holds, from the edge inward, ignoring `exceptId`. */
function columnSizes(layout: Layout, side: Side, exceptId?: PanelId): number[] {
  const sizes: number[] = [];
  for (const { placement } of dockedOnSide(layout, side, exceptId)) {
    sizes[placement.column] = (sizes[placement.column] ?? 0) + 1;
  }
  return Array.from(sizes, (size) => size ?? 0);
}

function columnX(viewport: Viewport, side: Side, column: number): number {
  return side === 'left'
    ? column * COLUMN_WIDTH_PX
    : viewport.width - (column + 1) * COLUMN_WIDTH_PX;
}

/** A column's rect, or the top or bottom half of it when `slot` is given. */
function columnRect(viewport: Viewport, side: Side, column: number, slot: Slot | null): Rect {
  const height = viewport.height - viewport.top;
  const x = columnX(viewport, side, column);
  if (slot === null) return { x, y: viewport.top, width: COLUMN_WIDTH_PX, height };
  const half = height / PANELS_PER_COLUMN;
  return { x, y: viewport.top + slot * half, width: COLUMN_WIDTH_PX, height: half };
}

/**
 * The rect of a docked panel, derived from its side, column and slot, or null if it is
 * floating. A lone panel takes the full column height; two share it 50/50.
 */
export function dockedRect(layout: Layout, viewport: Viewport, panelId: PanelId): Rect | null {
  const placement = dockedPlacementOf(layout.panels[panelId]);
  if (!placement) return null;
  const { side, column, slot } = placement;
  const peers = dockedOnSide(layout, side).filter((p) => p.placement.column === column);
  return columnRect(viewport, side, column, peers.length > 1 ? slot : null);
}

/** The drop highlight's rect: where the panel would land if released at `target`. */
export function previewRect(viewport: Viewport, target: DockTarget): Rect {
  const slot = target.kind === 'stack' ? target.slot : null;
  return columnRect(viewport, target.side, target.column, slot);
}

/** The stack target for the column under the pointer, if it holds one panel; else a dead end. */
function stackTargetAt(layout: Layout, viewport: Viewport, pointer: Point, draggedId: PanelId) {
  for (const side of SIDES) {
    const sizes = columnSizes(layout, side, draggedId);
    for (const [column, size] of sizes.entries()) {
      const rect = columnRect(viewport, side, column, null);
      if (pointer.x < rect.x || pointer.x >= rect.x + rect.width) continue;
      if (size >= PANELS_PER_COLUMN) return { found: true, target: null } as const;
      const upperHalf = pointer.y < rect.y + rect.height / PANELS_PER_COLUMN;
      const slot: Slot = upperHalf ? 0 : 1;
      return { found: true, target: { side, column, slot, kind: 'stack' } } as const;
    }
  }
  return { found: false } as const;
}

/**
 * The new column offered when the pointer is within EDGE_TRIGGER_PX of where a side's docked
 * columns end (the screen edge on an empty side), if MIN_MAP_WIDTH_PX of map would remain.
 */
function newColumnTargetAt(
  layout: Layout,
  viewport: Viewport,
  pointer: Point,
  draggedId: PanelId,
): DockTarget | null {
  const columns = SIDES.map((side) => columnSizes(layout, side, draggedId).length);
  const dockedWidth = columns.reduce((sum, count) => sum + count * COLUMN_WIDTH_PX, 0);
  if (dockedWidth + COLUMN_WIDTH_PX > viewport.width - MIN_MAP_WIDTH_PX) return null;
  for (const [index, side] of SIDES.entries()) {
    const column = columns[index] ?? 0;
    // Where the side's docked columns end (the screen edge itself on an empty side).
    const innerEdge =
      side === 'left' ? column * COLUMN_WIDTH_PX : viewport.width - column * COLUMN_WIDTH_PX;
    const beyond = side === 'left' ? pointer.x - innerEdge : innerEdge - pointer.x;
    if (beyond <= EDGE_TRIGGER_PX) return { side, column, slot: 0, kind: 'new-column' };
  }
  return null;
}

/**
 * Where a release at `pointer` would dock `draggedId`, or null. The dragged panel is ignored
 * (it is not part of the layout while dragged). In priority order:
 * - over a docked column: stack into its half under the pointer (null if the column is full);
 * - within EDGE_TRIGGER_PX of the screen edge of a side with no columns, or of the inner edge
 *   of a side's innermost column: a new column there, if MIN_MAP_WIDTH_PX of map would remain;
 * - otherwise null. Over the action bar there is never a target.
 */
export function dockTargetAt(
  layout: Layout,
  viewport: Viewport,
  pointer: Point,
  draggedId: PanelId,
): DockTarget | null {
  if (pointer.y < viewport.top) return null;
  const stack = stackTargetAt(layout, viewport, pointer, draggedId);
  return stack.found ? stack.target : newColumnTargetAt(layout, viewport, pointer, draggedId);
}

/**
 * Dock the panel at `target`, keeping its last floating rect so a later undock restores it,
 * then close up the layout. A new column pushes the columns from its index inward one further
 * in; a stack leaves the existing panel in the other half.
 */
export function dockPanel(layout: Layout, panelId: PanelId, target: DockTarget): Layout {
  const panels = { ...layout.panels };
  for (const { id, placement } of dockedOnSide(layout, target.side, panelId)) {
    if (target.kind === 'new-column' && placement.column >= target.column) {
      panels[id] = { ...panels[id], placement: { ...placement, column: placement.column + 1 } };
    }
    if (target.kind === 'stack' && placement.column === target.column) {
      const slot: Slot = target.slot === 0 ? 1 : 0;
      panels[id] = { ...panels[id], placement: { ...placement, slot } };
    }
  }
  const { side, column, slot } = target;
  panels[panelId] = {
    ...panels[panelId],
    placement: { kind: 'docked', side, column, slot: target.kind === 'stack' ? slot : 0 },
  };
  return normalizeDocks({ ...layout, panels });
}
