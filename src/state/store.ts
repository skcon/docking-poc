import { create } from 'zustand';
import {
  clampToViewport,
  decodeLayout,
  defaultLayout,
  dragCancel,
  dragEnd,
  dragMove,
  dragStart,
  encodeLayout,
  raisePanel,
  resizeCancel,
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
  /** Pointer up on a captured handle. */
  endDrag: (pointer: Point, viewport: Viewport) => void;
  /** Pointer cancel or lost capture on a handle: undo the drag. No-op without a drag. */
  cancelDrag: () => void;
  /** Pointer-down on a floating panel's resize edge or corner. */
  startResize: (panelId: PanelId, edge: ResizeEdge, pointer: Point, viewport: Viewport) => void;
  /** Pointer move while a resize edge is captured. */
  moveResize: (pointer: Point, viewport: Viewport) => void;
  /** Pointer up on a captured resize edge. */
  endResize: (pointer: Point, viewport: Viewport) => void;
  /** Pointer cancel or lost capture on a resize edge: undo the resize. No-op without one. */
  cancelResize: () => void;
  /** The browser window changed size: pull floating panels back into view. */
  changeViewport: (viewport: Viewport) => void;
  /**
   * Rebuild the layout from an encoded layout (the URL), pulled into view. Malformed input
   * gives the default layout; text that already encodes the current layout changes nothing.
   */
  loadLayout: (encoded: unknown, viewport: Viewport) => void;
};

export type AppStore = AppState & AppActions;

function initialState(): AppState {
  return { layout: defaultLayout(), drag: null, resize: null, counter: 0 };
}

function dragSession(s: AppState): DragSession {
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
    set((s) => dragStart(dragSession(s), viewport, { panelId, pointer })),
  moveDrag: (pointer, viewport) => set((s) => dragMove(dragSession(s), viewport, { pointer })),
  endDrag: (pointer, viewport) => set((s) => dragEnd(dragSession(s), viewport, { pointer })),
  cancelDrag: () => set((s) => dragCancel(dragSession(s))),
  startResize: (panelId, edge, pointer, viewport) =>
    set((s) => resizeStart(resizeSession(s), viewport, { panelId, edge, pointer })),
  moveResize: (pointer, viewport) =>
    set((s) => resizeMove(resizeSession(s), viewport, { pointer })),
  endResize: (pointer, viewport) => set((s) => resizeEnd(resizeSession(s), viewport, { pointer })),
  cancelResize: () => set((s) => resizeCancel(resizeSession(s))),
  changeViewport: (viewport) => set((s) => ({ layout: clampToViewport(s.layout, viewport) })),
  loadLayout: (encoded, viewport) =>
    set((s) =>
      encoded === encodeLayout(s.layout)
        ? s
        : { layout: clampToViewport(decodeLayout(encoded), viewport) },
    ),
}));

/** Restore the default layout, no drag or resize and a zero counter, keeping the actions. */
export function resetStore(): void {
  useAppStore.setState(initialState());
}
