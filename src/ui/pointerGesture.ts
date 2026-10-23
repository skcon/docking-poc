import type { PointerEvent } from 'react';
import type { Point, Viewport } from '../domain';
import { currentViewport, pointerOf } from './viewport';

/** The store actions behind a pointer gesture on one element (a handle or a resize edge). */
export type PointerGesture = {
  /** Whether this element's gesture is in progress; moves and releases are ignored otherwise. */
  active: boolean;
  start: (pointer: Point, viewport: Viewport) => void;
  move: (pointer: Point, viewport: Viewport) => void;
  end: (pointer: Point, viewport: Viewport) => void;
  /** Undo the gesture. Must be a no-op when no gesture is in progress. */
  cancel: () => void;
  /** Keep the pointer-down from reaching the panel underneath. */
  stopPropagation?: boolean;
};

/**
 * Pointer handlers for a gesture: a primary-button press captures the pointer (so the gesture
 * stays on the element while the pointer leaves it) and starts it, moves and the release go to
 * the store, and pointercancel or a lost capture cancel it, so it can never stay stuck.
 * Lost capture also follows every normal release, when `cancel` has nothing left to undo.
 */
export function usePointerGesture(gesture: PointerGesture) {
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (gesture.stopPropagation) event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.start(pointerOf(event), currentViewport());
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (gesture.active) gesture.move(pointerOf(event), currentViewport());
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (gesture.active) gesture.end(pointerOf(event), currentViewport());
    },
    onPointerCancel: gesture.cancel,
    onLostPointerCapture: gesture.cancel,
  };
}
