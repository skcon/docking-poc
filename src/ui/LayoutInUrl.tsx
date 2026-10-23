import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { encodeLayout } from '../domain';
import { useAppStore, type AppState } from '../state/store';
import { currentViewport } from './viewport';

/** A drag (not a click) or resize just ended: the points where the layout is written to the URL. */
function interactionEnded(state: AppState, previous: AppState): boolean {
  return (
    (previous.drag?.moved === true && state.drag === null) ||
    (previous.resize !== null && state.resize === null)
  );
}

/**
 * Keeps the layout in the `layout` search param. Loads it from the URL on open (and when the
 * URL changes from outside), and writes it once per drop, move end or resize end with replace
 * navigation, so history is not flooded. Renders nothing.
 */
export function LayoutInUrl() {
  const { layout: encoded } = useSearch({ from: '__root__' });
  const navigate = useNavigate();
  const loadLayout = useAppStore((s) => s.loadLayout);
  const lastWritten = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (encoded !== undefined && encoded === lastWritten.current) return;
    loadLayout(encoded, currentViewport());
  }, [encoded, loadLayout]);

  useEffect(
    () =>
      useAppStore.subscribe((state, previous) => {
        if (!interactionEnded(state, previous)) return;
        const layout = encodeLayout(state.layout);
        lastWritten.current = layout;
        void navigate({ to: '.', search: (prev) => ({ ...prev, layout }), replace: true });
      }),
    [navigate],
  );

  return null;
}
