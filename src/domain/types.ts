export type PanelId = 'counter' | 'increment' | 'decrement';

export type ZoneId = 'left' | 'right' | 'bottom';

/** Column: 0 = top, 1 = bottom. Bottom strip: 0 = left, 1 = right. */
export type SlotId = 0 | 1;

export type Rect = { x: number; y: number; width: number; height: number };

/** `top` is the action bar height; the map area sits below it. */
export type Viewport = { width: number; height: number; top: number };

export type PanelPlacement =
  { kind: 'floating'; rect: Rect } | { kind: 'docked'; zone: ZoneId; slot: SlotId };

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
 * The in-progress handle drag. Transient: never persisted or put in the URL.
 * `grabOffset` is the pointer's offset from the dragged panel's top-left when the drag began.
 * `dropTarget` is the zone and slot a release would dock into (set by drop-target logic, #6).
 */
export type DragState = {
  panelId: PanelId;
  grabOffset: Point;
  dropTarget: { zone: ZoneId; slot: SlotId } | null;
} | null;

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
 */
export type ResizeState = {
  panelId: PanelId;
  edge: ResizeEdge;
  startPointer: Point;
  startRect: Rect;
} | null;

/** What the resize lifecycle transitions read and return: the layout plus the transient resize. */
export type ResizeSession = { layout: Layout; resize: ResizeState };

export type ResizeStartEvent = { panelId: PanelId; edge: ResizeEdge; pointer: Point };
export type ResizeMoveEvent = { pointer: Point };
export type ResizeEndEvent = { pointer: Point };
