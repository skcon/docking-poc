/**
 * The handle drag lifecycle: pure transitions `(session, viewport, event) => session`.
 *
 * This module only orchestrates; each concern lives in its own module:
 * - move.ts: moving a floating panel and clamping its handle on screen
 * - raise.ts: z-order
 * - zones.ts: dock target and docking
 * - undock.ts: floating a docked panel under the pointer
 */
import { moveFloatingPanel } from './move';
import { floatingRectOf } from './panels';
import { raisePanel } from './raise';
import { undockPanel } from './undock';
import { dockPanel, dockTargetAt } from './zones';
import type { DragEndEvent, DragMoveEvent, DragSession, DragStartEvent, Viewport } from './types';

/**
 * Pointer-down on a panel's handle: raise the panel and remember where it was grabbed.
 * A docked panel is undocked first, floating under the pointer (undock.ts).
 */
export function dragStart(
  session: DragSession,
  viewport: Viewport,
  event: DragStartEvent,
): DragSession {
  const layout = raisePanel(session.layout, event.panelId);
  const floated = undockPanel(layout, viewport, event.panelId, event.pointer);
  if (floated) {
    return {
      layout: floated.layout,
      drag: { panelId: event.panelId, grabOffset: floated.grabOffset, dockTarget: null },
    };
  }
  const rect = floatingRectOf(layout, event.panelId);
  if (!rect) return { layout, drag: null };
  return {
    layout,
    drag: {
      panelId: event.panelId,
      grabOffset: { x: event.pointer.x - rect.x, y: event.pointer.y - rect.y },
      dockTarget: null,
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
  const dockTarget = dockTargetAt(layout, viewport, event.pointer, drag.panelId);
  return { layout, drag: { ...drag, dockTarget } };
}

/** Pointer release: dock into the dock target if there is one, else float at the final position. */
export function dragEnd(
  session: DragSession,
  viewport: Viewport,
  event: DragEndEvent,
): DragSession {
  const moved = dragMove(session, viewport, event);
  if (!moved.drag?.dockTarget) return { layout: moved.layout, drag: null };
  return { layout: dockPanel(moved.layout, moved.drag.panelId, moved.drag.dockTarget), drag: null };
}
