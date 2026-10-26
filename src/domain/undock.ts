/**
 * Undocking: turning a docked panel into a floating panel under the pointer.
 */
import { DEFAULT_FLOATING } from './constants';
import { dockedRect, normalizeDocks } from './docking';
import { clampHandleOnScreen } from './move';
import { withFloatingRect } from './panels';
import type { Layout, PanelId, Point, Viewport } from './types';

/** The layout with the panel floated out of its column, and the grab offset the drag continues with. */
export type FloatedFromColumn = { layout: Layout; grabOffset: Point };

/**
 * Float a docked panel under `pointer`, keeping the point where its handle was grabbed.
 * It takes its last floating size, or DEFAULT_FLOATING if it has never floated. If the
 * floating panel is narrower than its docked rect, the horizontal grab offset is scaled
 * proportionally so the pointer stays on the (shorter) handle. The vertical offset is kept:
 * the handle has the same height docked and floating. The handle is kept on screen (which
 * may shift the panel under the pointer). The docked layout closes up at once: a panel left alone
 * in a column takes its full height and columns further in move toward the edge.
 * Returns null if the panel is not docked.
 */
export function undockPanel(
  layout: Layout,
  viewport: Viewport,
  panelId: PanelId,
  pointer: Point,
): FloatedFromColumn | null {
  const docked = dockedRect(layout, viewport, panelId);
  if (!docked) return null;
  const { width, height } = layout.panels[panelId].lastFloatingRect ?? DEFAULT_FLOATING;
  const offsetX = pointer.x - docked.x;
  const offset = {
    x: width < docked.width ? (offsetX * width) / docked.width : offsetX,
    y: pointer.y - docked.y,
  };
  const rect = clampHandleOnScreen(
    { x: pointer.x - offset.x, y: pointer.y - offset.y, width, height },
    viewport,
  );
  // Clamping may shift the panel; the drag continues from where the pointer really is on it.
  const grabOffset = { x: pointer.x - rect.x, y: pointer.y - rect.y };
  return { layout: normalizeDocks(withFloatingRect(layout, panelId, rect)), grabOffset };
}
