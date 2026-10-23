import { useEffect } from 'react';
import { ACTION_BAR_HEIGHT_PX, type Point, type Viewport } from '../domain';

/** The current window as the domain's Viewport (window coordinates, map below the action bar). */
export function currentViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight, top: ACTION_BAR_HEIGHT_PX };
}

/** A pointer event's position in window coordinates. */
export function pointerOf(event: { clientX: number; clientY: number }): Point {
  return { x: event.clientX, y: event.clientY };
}

/** Report the window's size to `onChange` whenever the browser window is resized. */
export function useWindowResize(onChange: (viewport: Viewport) => void): void {
  useEffect(() => {
    const report = () => onChange(currentViewport());
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }, [onChange]);
}
