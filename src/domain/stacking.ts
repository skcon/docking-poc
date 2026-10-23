/** The stacking policy of the panel layer: which panel or overlay paints above which. */
import { panelRecord } from './layout';
import type { Layout, PanelId } from './types';

/** z-indices for every panel and the drop highlight. */
export type Stacking = { panels: Record<PanelId, number>; dropHighlight: number };

/**
 * Docked panels sit below the drop highlight, which sits below every floating panel (floating
 * panels overlay docked ones). Within each group, panels stack back to front by z-order.
 * All values are positive.
 */
export function stackingOf(layout: Layout): Stacking {
  const dropHighlight = layout.zOrder.length + 1;
  return {
    panels: panelRecord((id) => {
      const depth = layout.zOrder.indexOf(id) + 1;
      return layout.panels[id].placement.kind === 'docked' ? depth : dropHighlight + depth;
    }),
    dropHighlight,
  };
}
