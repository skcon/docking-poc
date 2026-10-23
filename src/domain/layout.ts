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

/** All three panels floating at staggered positions, stacked in PANEL_IDS order. */
export function defaultLayout(): Layout {
  const panelAt = (id: PanelId) => floatingPanel(id, staggeredRect(PANEL_IDS.indexOf(id)));
  return {
    panels: {
      counter: panelAt('counter'),
      increment: panelAt('increment'),
      decrement: panelAt('decrement'),
    },
    zOrder: [...PANEL_IDS],
  };
}
