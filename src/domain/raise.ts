import type { Layout, PanelId } from './types';

/** Bring the panel to the front of the z-order. Returns the same layout if it is already there. */
export function raisePanel(layout: Layout, panelId: PanelId): Layout {
  if (layout.zOrder[layout.zOrder.length - 1] === panelId) return layout;
  return { ...layout, zOrder: [...layout.zOrder.filter((id) => id !== panelId), panelId] };
}
