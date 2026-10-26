/** Distance from a screen edge, or a column's inner edge, within which a dragged panel's pointer offers a new column. */
export const EDGE_TRIGGER_PX = 80;

/** Width of every docked column. */
export const COLUMN_WIDTH_PX = 350;

/** Most panels a column holds (stacked 50/50). */
export const PANELS_PER_COLUMN = 2;

/** The map keeps at least this much width: no new column is offered if it would leave less. */
export const MIN_MAP_WIDTH_PX = 300;

/** Smallest size a floating panel may be resized to (spec #2). */
export const MIN_PANEL = { width: 200, height: 120 } as const;

/** Size of a panel that has never floated (spec #2). */
export const DEFAULT_FLOATING = { width: 320, height: 240 } as const;

/** Height of the action bar; the map and columns sit below it (Viewport.top). */
export const ACTION_BAR_HEIGHT_PX = 40;

/**
 * Top-left of the first default floating panel, in window coordinates.
 * Clear of the first left column and the action bar so no default panel starts over a column.
 */
export const DEFAULT_FLOATING_ORIGIN = {
  x: COLUMN_WIDTH_PX + 50,
  y: ACTION_BAR_HEIGHT_PX + 40,
} as const;

/** Offset between consecutive default floating panels so none hides another. */
export const DEFAULT_FLOATING_STAGGER = { x: 40, y: 40 } as const;

/** Height of a panel's handle. Handle clamping keeps this strip on screen. */
export const HANDLE_HEIGHT_PX = 32;

/**
 * How far (CSS px) the pointer must move from where a handle was pressed before the press
 * becomes a drag. A shorter press is a click: it undocks nothing and moves nothing.
 */
export const DRAG_THRESHOLD_PX = 4;
