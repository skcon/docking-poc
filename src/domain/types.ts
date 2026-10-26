export type PanelId = 'counter' | 'increment' | 'decrement';

/** The screen edge a column hugs. */
export type Side = 'left' | 'right';

/** A position in a column: 0 = top, 1 = bottom. */
export type Slot = 0 | 1;

export type Rect = { x: number; y: number; width: number; height: number };

/** `top` is the action bar height; the map area sits below it. */
export type Viewport = { width: number; height: number; top: number };

/**
 * A docked panel sits in a column of a side. Column 0 is at the screen edge, higher columns
 * further in. A column holds one panel (slot 0, full height) or two (slot 0 on top, slot 1 below).
 * Docked placements are kept compact by normalizeDocks: columns and slots are contiguous.
 */
export type PanelPlacement =
  { kind: 'floating'; rect: Rect } | { kind: 'docked'; side: Side; column: number; slot: Slot };

export type PanelState = {
  id: PanelId;
  placement: PanelPlacement;
  lastFloatingRect: Rect | null;
};

export type Layout = {
  panels: Record<PanelId, PanelState>;
  /** Back to front. */
  zOrder: PanelId[];
};

/** A position in window coordinates (CSS px), e.g. a pointer. */
export type Point = { x: number; y: number };

/**
 * Where a dragged panel would dock if released now. `new-column` puts it alone in a new column
 * at `column` (columns from there inward shift one further in; slot is 0). `stack` puts it in
 * the existing one-panel column `column`, in `slot` (top or bottom half).
 */
export type DockTarget = { side: Side; column: number; slot: Slot; kind: 'new-column' | 'stack' };

/**
 * The in-progress handle drag. Transient: never persisted or put in the URL.
 * `startLayout` is the layout before the drag began (restored if the drag is cancelled).
 * `startPointer` is where the handle was pressed. Until the pointer has moved more than
 * DRAG_THRESHOLD_PX from it, `moved` is false: nothing moves or undocks, and a release is a click.
 * `grabOffset` is the pointer's offset from the dragged panel's top-left.
 * `dockTarget` is where a release would dock the panel (shown by the drop highlight), or null.
 * The dragged panel is floating and not part of the docked layout while `moved`.
 */
export type DragState = {
  panelId: PanelId;
  startLayout: Layout;
  startPointer: Point;
  moved: boolean;
  grabOffset: Point;
  dockTarget: DockTarget | null;
} | null;

/** A drag that is in progress. */
export type ActiveDrag = NonNullable<DragState>;

/** What the drag lifecycle transitions read and return: the layout plus the transient drag. */
export type DragSession = { layout: Layout; drag: DragState };

export type DragStartEvent = { panelId: PanelId; pointer: Point };
export type DragMoveEvent = { pointer: Point };
export type DragEndEvent = { pointer: Point };

/** The edge or corner of a floating panel being dragged to resize it (compass directions). */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * The in-progress resize. Transient: never persisted or put in the URL.
 * `startPointer` and `startRect` are the pointer and the panel's rect when the resize began.
 * `startLayout` is the layout before the resize began (restored if the resize is cancelled).
 */
export type ResizeState = {
  panelId: PanelId;
  edge: ResizeEdge;
  startLayout: Layout;
  startPointer: Point;
  startRect: Rect;
} | null;

/** What the resize lifecycle transitions read and return: the layout plus the transient resize. */
export type ResizeSession = { layout: Layout; resize: ResizeState };

export type ResizeStartEvent = { panelId: PanelId; edge: ResizeEdge; pointer: Point };
export type ResizeMoveEvent = { pointer: Point };
export type ResizeEndEvent = { pointer: Point };
