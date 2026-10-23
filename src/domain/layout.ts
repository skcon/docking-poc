import { DEFAULT_FLOATING, DEFAULT_FLOATING_ORIGIN, DEFAULT_FLOATING_STAGGER } from './constants';
import type { Layout, PanelId, PanelState, Rect } from './types';

export const PANEL_IDS = [
  'counter',
  'increment',
  'decrement',
] as const satisfies readonly PanelId[];

export const PANEL_TITLES: Record<PanelId, string> = {
  counter: 'Counter',
  increment: 'Increment',
  decrement: 'Decrement',
};

function staggeredRect(index: number): Rect {
  return {
    x: DEFAULT_FLOATING_ORIGIN.x + index * DEFAULT_FLOATING_STAGGER.x,
    y: DEFAULT_FLOATING_ORIGIN.y + index * DEFAULT_FLOATING_STAGGER.y,
    width: DEFAULT_FLOATING.width,
    height: DEFAULT_FLOATING.height,
  };
}

function floatingPanel(id: PanelId, rect: Rect): PanelState {
  return { id, placement: { kind: 'floating', rect }, lastFloatingRect: rect };
}

/** A record with one entry per panel, built from PANEL_IDS. */
export function panelRecord<T>(valueOf: (id: PanelId) => T): Record<PanelId, T> {
  // Every PanelId is in PANEL_IDS, so the entries cover the whole record.
  return Object.fromEntries(PANEL_IDS.map((id) => [id, valueOf(id)])) as Record<PanelId, T>;
}

/** Every panel floating at staggered positions, stacked in PANEL_IDS order. */
export function defaultLayout(): Layout {
  return {
    panels: panelRecord((id) => floatingPanel(id, staggeredRect(PANEL_IDS.indexOf(id)))),
    zOrder: [...PANEL_IDS],
  };
}
