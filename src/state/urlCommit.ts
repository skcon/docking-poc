import { encodeLayout, type Layout } from '../domain';
import type { AppState } from './store';

/**
 * Whether the store change from `previous` to `state` is a point where the layout is written to
 * the URL:
 * - never while a drag or resize is in progress;
 * - when one ends, only if the layout differs from the one it began with (so a click without
 *   movement or a cancelled gesture writes nothing, but a click that raised the panel does);
 * - outside a gesture, when a raise changed only the z-order. Loading a layout and clamping to
 *   the viewport replace the panels and are not commit points.
 */
export function shouldWriteLayoutToUrl(state: AppState, previous: AppState): boolean {
  if (state.drag || state.resize) return false;
  const gesture = previous.drag ?? previous.resize;
  if (gesture) return encodeLayout(state.layout) !== encodeLayout(gesture.startLayout);
  return raisedOnly(state.layout, previous.layout);
}

function raisedOnly(layout: Layout, previous: Layout): boolean {
  if (layout.panels !== previous.panels) return false;
  return layout.zOrder.some((id, index) => previous.zOrder[index] !== id);
}
