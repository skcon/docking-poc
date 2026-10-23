/** Distance from an app edge within which a dragged panel's pointer makes that zone a candidate (spec #2). */
export const EDGE_TRIGGER_PX = 80;

/** Width of the left and right columns, and the cap on each bottom-strip slot (spec #2). */
export const ZONE_WIDTH_PX = 350;

/** Smallest size a floating panel may be resized to (spec #2). */
export const MIN_PANEL = { width: 200, height: 120 } as const;

/** Size of a panel that has never floated (spec #2). */
export const DEFAULT_FLOATING = { width: 320, height: 240 } as const;

/** Height of the action bar; the map and zones sit below it (Viewport.top). */
export const ACTION_BAR_HEIGHT_PX = 40;

/**
 * Top-left of the first default floating panel, in window coordinates.
 * Clear of the left column and the action bar so no default panel starts over a zone.
 */
export const DEFAULT_FLOATING_ORIGIN = {
  x: ZONE_WIDTH_PX + 50,
  y: ACTION_BAR_HEIGHT_PX + 40,
} as const;

/** Offset between consecutive default floating panels so none hides another. */
export const DEFAULT_FLOATING_STAGGER = { x: 40, y: 40 } as const;

/** Height of a panel's handle. Handle clamping keeps this strip on screen. */
export const HANDLE_HEIGHT_PX = 32;

/**
 * Height of the bottom strip. Spec #2 does not fix it; this POC uses the default floating
 * panel height so a docked panel keeps a familiar shape.
 */
export const BOTTOM_ZONE_HEIGHT_PX = 240;

/**
 * How far (CSS px) the pointer must move from where a handle was pressed before the press
 * becomes a drag. A shorter press is a click: it undocks nothing and moves nothing.
 */
export const DRAG_THRESHOLD_PX = 4;
