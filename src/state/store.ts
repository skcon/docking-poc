import { create } from 'zustand';
import {
  defaultLayout,
  dragEnd,
  dragMove,
  dragStart,
  raisePanel,
  type DragSession,
  type DragState,
  type Layout,
  type PanelId,
  type Point,
  type Viewport,
} from '../domain';

export type AppState = {
  layout: Layout;
  /** The in-progress handle drag, or null. Transient: never persisted. */
  drag: DragState;
  counter: number;
};

export type AppActions = {
  increment: () => void;
  decrement: () => void;
  /** Bring a panel to the front (pointer-down anywhere on it). */
  raisePanel: (panelId: PanelId) => void;
  /** Pointer-down on a panel's handle. */
  startDrag: (panelId: PanelId, pointer: Point, viewport: Viewport) => void;
  /** Pointer move while a handle is captured. */
  moveDrag: (pointer: Point, viewport: Viewport) => void;
  /** Pointer up or cancel on a captured handle. */
  endDrag: (pointer: Point, viewport: Viewport) => void;
};

export type AppStore = AppState & AppActions;

function initialState(): AppState {
  return { layout: defaultLayout(), drag: null, counter: 0 };
}

function session(s: AppState): DragSession {
  return { layout: s.layout, drag: s.drag };
}

export const useAppStore = create<AppStore>()((set) => ({
  ...initialState(),
  increment: () => set((s) => ({ counter: s.counter + 1 })),
  decrement: () => set((s) => ({ counter: s.counter - 1 })),
  raisePanel: (panelId) => set((s) => ({ layout: raisePanel(s.layout, panelId) })),
  startDrag: (panelId, pointer, viewport) =>
    set((s) => dragStart(session(s), viewport, { panelId, pointer })),
  moveDrag: (pointer, viewport) => set((s) => dragMove(session(s), viewport, { pointer })),
  endDrag: (pointer, viewport) => set((s) => dragEnd(session(s), viewport, { pointer })),
}));

/** Restore the default layout, no drag and a zero counter, keeping the actions. */
export function resetStore(): void {
  useAppStore.setState(initialState());
}
