/**
 * The handle drag lifecycle: pure transitions `(session, viewport, event) => session`.
 *
 * This module only orchestrates; each concern lives in its own module:
 * - move.ts: moving a floating panel and clamping its handle on screen
 * - raise.ts: z-order
 * Extension points for later tickets are marked below.
 */
import { moveFloatingPanel } from './move';
import { floatingRectOf } from './panels';
import { raisePanel } from './raise';
import type { DragEndEvent, DragMoveEvent, DragSession, DragStartEvent, Viewport } from './types';

/** Pointer-down on a panel's handle: raise the panel and remember where it was grabbed. */
export function dragStart(
  session: DragSession,
  _viewport: Viewport,
  event: DragStartEvent,
): DragSession {
  const layout = raisePanel(session.layout, event.panelId);
  const rect = floatingRectOf(layout, event.panelId);
  // Extension point (#7 undock): a docked panel has no floating rect here. Undocking derives
  // its grab offset from dockedRect() and floats it at lastFloatingRect ?? DEFAULT_FLOATING.
  if (!rect) return { layout, drag: null };
  return {
    layout,
    drag: {
      panelId: event.panelId,
      grabOffset: { x: event.pointer.x - rect.x, y: event.pointer.y - rect.y },
      dropTarget: null,
    },
  };
}

/** Pointer move while dragging: the panel follows the pointer at its grab offset. */
export function dragMove(
  session: DragSession,
  viewport: Viewport,
  event: DragMoveEvent,
): DragSession {
  const { drag } = session;
  if (!drag) return session;
  const topLeft = {
    x: event.pointer.x - drag.grabOffset.x,
    y: event.pointer.y - drag.grabOffset.y,
  };
  const layout = moveFloatingPanel(session.layout, viewport, drag.panelId, topLeft);
  // Extension point (#6 drop highlight): set drag.dropTarget from
  // dropTargetAt(layout, viewport, event.pointer, drag.panelId).
  return { layout, drag };
}

/** Pointer release: apply the final position and end the drag. */
export function dragEnd(
  session: DragSession,
  viewport: Viewport,
  event: DragEndEvent,
): DragSession {
  const moved = dragMove(session, viewport, event);
  // Extension point (#6 dock): if the drag has a dropTarget, dock the panel there instead.
  return { layout: moved.layout, drag: null };
}
