import { encodeLayout } from '../domain';
import type { AppState } from './store';

/**
 * Whether the store change from `previous` to `state` is a point where the layout is written to
 * the URL. Never while a drag or resize is in progress. When one ends, only if the layout differs
 * from the one it began with: a click without movement or a cancelled gesture writes nothing.
 */
export function shouldWriteLayoutToUrl(state: AppState, previous: AppState): boolean {
  if (state.drag || state.resize) return false;
  const gesture = previous.drag ?? previous.resize;
  if (!gesture) return false;
  return encodeLayout(state.layout) !== encodeLayout(gesture.startLayout);
}
