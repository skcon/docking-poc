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
