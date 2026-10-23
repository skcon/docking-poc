/**
 * The handle drag lifecycle: pure transitions `(session, viewport, event) => session`.
 *
 * This module only orchestrates; each concern lives in its own module:
 * - move.ts: moving a floating panel and clamping its handle on screen
 * - raise.ts: z-order
 * - zones.ts: dock target and docking
 * - undock.ts: floating a docked panel under the pointer
 */
import { DRAG_THRESHOLD_PX } from './constants';
import { moveFloatingPanel } from './move';
import { floatingRectOf } from './panels';
import { raisePanel } from './raise';
import { undockPanel } from './undock';
import { dockedRect, dockPanel, dockTargetAt } from './zones';
import type {
  ActiveDrag,
  DragEndEvent,
  DragMoveEvent,
  DragSession,
  DragStartEvent,
  Layout,
  Point,
  Viewport,
} from './types';

/**
 * Pointer-down on a panel's handle: raise the panel and remember where it was grabbed.
 * Nothing moves yet: the press becomes a drag once the pointer passes DRAG_THRESHOLD_PX.
 */
export function dragStart(
  session: DragSession,
  viewport: Viewport,
  event: DragStartEvent,
): DragSession {
  const layout = raisePanel(session.layout, event.panelId);
  const rect = floatingRectOf(layout, event.panelId) ?? dockedRect(layout, viewport, event.panelId);
  if (!rect) return { layout, drag: null };
  return {
    layout,
    drag: {
      panelId: event.panelId,
      startPointer: event.pointer,
      moved: false,
      grabOffset: { x: event.pointer.x - rect.x, y: event.pointer.y - rect.y },
      dockTarget: null,
    },
  };
}

/**
 * Pointer move while dragging. Within DRAG_THRESHOLD_PX of the press nothing happens. Past it,
 * a docked panel is undocked under the press point (undock.ts), and the panel then follows the
 * pointer at its grab offset, targeting the zone a release would dock it into.
 */
export function dragMove(
  session: DragSession,
  viewport: Viewport,
  event: DragMoveEvent,
): DragSession {
  const { drag } = session;
  if (!drag) return session;
  if (!drag.moved && !pastThreshold(drag, event.pointer)) return session;
  const moving = drag.moved
    ? { layout: session.layout, drag }
    : beginMoving(session.layout, viewport, drag);
  const topLeft = {
    x: event.pointer.x - moving.drag.grabOffset.x,
    y: event.pointer.y - moving.drag.grabOffset.y,
  };
  const layout = moveFloatingPanel(moving.layout, viewport, drag.panelId, topLeft);
  const dockTarget = dockTargetAt(layout, viewport, event.pointer, drag.panelId);
  return { layout, drag: { ...moving.drag, dockTarget } };
}

function pastThreshold(drag: ActiveDrag, pointer: Point): boolean {
  const distance = Math.hypot(pointer.x - drag.startPointer.x, pointer.y - drag.startPointer.y);
  return distance > DRAG_THRESHOLD_PX;
}

/** The press has become a drag: float a docked panel out of its zone under the press point. */
function beginMoving(
  layout: Layout,
  viewport: Viewport,
  drag: ActiveDrag,
): { layout: Layout; drag: ActiveDrag } {
  const floated = undockPanel(layout, viewport, drag.panelId, drag.startPointer);
  if (!floated) return { layout, drag: { ...drag, moved: true } };
  return { layout: floated.layout, drag: { ...drag, moved: true, grabOffset: floated.grabOffset } };
}

/**
 * Pointer release: dock into the dock target if there is one, else float at the final position.
 * A release without a drag (a click) leaves the panel where it was.
 */
export function dragEnd(
  session: DragSession,
  viewport: Viewport,
  event: DragEndEvent,
): DragSession {
  const moved = dragMove(session, viewport, event);
  if (!moved.drag?.dockTarget) return { layout: moved.layout, drag: null };
  return { layout: dockPanel(moved.layout, moved.drag.panelId, moved.drag.dockTarget), drag: null };
}
