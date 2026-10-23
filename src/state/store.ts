import { create } from 'zustand';
import {
  clampToViewport,
  defaultLayout,
  dragEnd,
  dragMove,
  dragStart,
  raisePanel,
  resizeEnd,
  resizeMove,
  resizeStart,
  type DragSession,
  type DragState,
  type Layout,
  type PanelId,
  type Point,
  type ResizeEdge,
  type ResizeSession,
  type ResizeState,
  type Viewport,
} from '../domain';

export type AppState = {
  layout: Layout;
  /** The in-progress handle drag, or null. Transient: never persisted. */
  drag: DragState;
  /** The in-progress resize of a floating panel, or null. Transient: never persisted. */
  resize: ResizeState;
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
  /** Pointer-down on a floating panel's resize edge or corner. */
  startResize: (panelId: PanelId, edge: ResizeEdge, pointer: Point, viewport: Viewport) => void;
  /** Pointer move while a resize edge is captured. */
  moveResize: (pointer: Point, viewport: Viewport) => void;
  /** Pointer up or cancel on a captured resize edge. */
  endResize: (pointer: Point, viewport: Viewport) => void;
  /** The browser window changed size: pull floating panels back into view. */
  changeViewport: (viewport: Viewport) => void;
};

export type AppStore = AppState & AppActions;

function initialState(): AppState {
  return { layout: defaultLayout(), drag: null, resize: null, counter: 0 };
}

function session(s: AppState): DragSession {
  return { layout: s.layout, drag: s.drag };
}

function resizeSession(s: AppState): ResizeSession {
  return { layout: s.layout, resize: s.resize };
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
  startResize: (panelId, edge, pointer, viewport) =>
    set((s) => resizeStart(resizeSession(s), viewport, { panelId, edge, pointer })),
  moveResize: (pointer, viewport) =>
    set((s) => resizeMove(resizeSession(s), viewport, { pointer })),
  endResize: (pointer, viewport) => set((s) => resizeEnd(resizeSession(s), viewport, { pointer })),
  changeViewport: (viewport) => set((s) => ({ layout: clampToViewport(s.layout, viewport) })),
}));

/** Restore the default layout, no drag or resize and a zero counter, keeping the actions. */
export function resetStore(): void {
  useAppStore.setState(initialState());
}
