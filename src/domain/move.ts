import { clamp } from './clamp';
import { HANDLE_HEIGHT_PX } from './constants';
import { floatingRectOf, withFloatingRect } from './panels';
import type { Layout, PanelId, Point, Rect, Viewport } from './types';

/**
 * Shift `rect` (keeping its size) so its whole handle is on screen: within the window
 * horizontally, and between the action bar and the bottom of the window vertically.
 * The panel body may hang below the screen. A panel wider than the screen is pinned left.
 */
export function clampHandleOnScreen(rect: Rect, viewport: Viewport): Rect {
  return {
    ...rect,
    x: clamp(rect.x, 0, viewport.width - rect.width),
    y: clamp(rect.y, viewport.top, viewport.height - HANDLE_HEIGHT_PX),
  };
}

/**
 * Move a floating panel so its top-left is at `topLeft`, clamped so its handle stays on screen.
 * Non-floating panels are unchanged.
 */
export function moveFloatingPanel(
  layout: Layout,
  viewport: Viewport,
  panelId: PanelId,
  topLeft: Point,
): Layout {
  const rect = floatingRectOf(layout, panelId);
  if (!rect) return layout;
  const moved = clampHandleOnScreen({ ...rect, x: topLeft.x, y: topLeft.y }, viewport);
  return withFloatingRect(layout, panelId, moved);
}
