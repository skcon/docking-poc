/**
 * The resize lifecycle for floating panels: pure transitions `(session, viewport, event) => session`.
 * Docked panels are not resizable (spec #2), so starting a resize on one is a no-op.
 */
import { clamp } from './clamp';
import { HANDLE_HEIGHT_PX, MIN_PANEL } from './constants';
import { floatingRectOf, withFloatingRect } from './panels';
import { raisePanel } from './raise';
import type {
  Rect,
  ResizeEdge,
  ResizeEndEvent,
  ResizeMoveEvent,
  ResizeSession,
  ResizeStartEvent,
  Viewport,
} from './types';

/** Every edge and corner a floating panel can be resized from. */
export const RESIZE_EDGES = [
  'n',
  's',
  'e',
  'w',
  'ne',
  'nw',
  'se',
  'sw',
] as const satisfies readonly ResizeEdge[];

/** Pointer-down on a floating panel's edge or corner: raise it and remember the starting rect. */
export function resizeStart(
  session: ResizeSession,
  _viewport: Viewport,
  event: ResizeStartEvent,
): ResizeSession {
  const layout = raisePanel(session.layout, event.panelId);
  const rect = floatingRectOf(layout, event.panelId);
  if (!rect) return { layout, resize: null };
  return {
    layout,
    resize: {
      panelId: event.panelId,
      edge: event.edge,
      startLayout: session.layout,
      startPointer: event.pointer,
      startRect: rect,
    },
  };
}

/** Pointer move while resizing: the grabbed edges follow the pointer. */
export function resizeMove(
  session: ResizeSession,
  viewport: Viewport,
  event: ResizeMoveEvent,
): ResizeSession {
  const { resize } = session;
  if (!resize) return session;
  const dx = event.pointer.x - resize.startPointer.x;
  const dy = event.pointer.y - resize.startPointer.y;
  const rect = resizedRect(resize.startRect, resize.edge, dx, dy, viewport);
  return { layout: withFloatingRect(session.layout, resize.panelId, rect), resize };
}

/** Pointer release: apply the final size and end the resize. */
export function resizeEnd(
  session: ResizeSession,
  viewport: Viewport,
  event: ResizeEndEvent,
): ResizeSession {
  return { layout: resizeMove(session, viewport, event).layout, resize: null };
}

/**
 * The gesture was cancelled (pointercancel, or the edge lost pointer capture): restore the
 * layout from before the resize began and end the resize.
 */
export function resizeCancel(session: ResizeSession): ResizeSession {
  return session.resize ? { layout: session.resize.startLayout, resize: null } : session;
}

/**
 * Move the grabbed edges of `start` by (dx, dy). Each moved edge stops at the minimum size
 * (the opposite edge stays put) and where the handle would leave the screen: left at 0, right at
 * the window width, top between the action bar and a handle height above the bottom.
 * The bottom edge may go below the screen, as when moving.
 */
function resizedRect(
  start: Rect,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  viewport: Viewport,
): Rect {
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (edge.includes('w')) left = clamp(left + dx, 0, right - MIN_PANEL.width);
  if (edge.includes('e')) right = clamp(right + dx, left + MIN_PANEL.width, viewport.width);
  if (edge.includes('n')) {
    const lowest = Math.min(bottom - MIN_PANEL.height, viewport.height - HANDLE_HEIGHT_PX);
    top = clamp(top + dy, viewport.top, lowest);
  }
  if (edge.includes('s')) bottom = Math.max(bottom + dy, top + MIN_PANEL.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
