import type { Layout, PanelId, Rect } from './types';

/** The panel's rect if it is floating, otherwise null. */
export function floatingRectOf(layout: Layout, panelId: PanelId): Rect | null {
  const placement = layout.panels[panelId].placement;
  return placement.kind === 'floating' ? placement.rect : null;
}

/**
 * Float the panel at `rect`, also recording it as the panel's last floating rect
 * (so a later undock restores this size).
 */
export function withFloatingRect(layout: Layout, panelId: PanelId, rect: Rect): Layout {
  return {
    ...layout,
    panels: {
      ...layout.panels,
      [panelId]: { id: panelId, placement: { kind: 'floating', rect }, lastFloatingRect: rect },
    },
  };
}
