/** The viewport-change transition: keep floating panels in view when the browser window resizes. */
import { MIN_PANEL } from './constants';
import { PANEL_IDS } from './layout';
import { clampHandleOnScreen } from './move';
import { floatingRectOf, withFloatingRect } from './panels';
import type { Layout, Rect, Viewport } from './types';

/**
 * Pull every floating panel back so its whole handle is on screen. A panel wider than the
 * window is narrowed to fit (never below the minimum width). Docked panels are unchanged.
 * Returns the same layout when nothing moved.
 */
export function clampToViewport(layout: Layout, viewport: Viewport): Layout {
  return PANEL_IDS.reduce((current, id) => {
    const rect = floatingRectOf(current, id);
    if (!rect) return current;
    const clamped = clampHandleOnScreen(fitWidth(rect, viewport), viewport);
    return sameRect(rect, clamped) ? current : withFloatingRect(current, id, clamped);
  }, layout);
}

function fitWidth(rect: Rect, viewport: Viewport): Rect {
  const width = Math.max(Math.min(rect.width, viewport.width), MIN_PANEL.width);
  return width === rect.width ? rect : { ...rect, width };
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
