import { RESIZE_EDGES, type PanelId, type ResizeEdge } from '../domain';
import { useAppStore } from '../state/store';
import { usePointerGesture } from './pointerGesture';

/** Where each invisible resize strip sits on the panel, and its cursor. Presentation only. */
const EDGE_CLASSES: Record<ResizeEdge, string> = {
  n: 'inset-x-2 top-0 h-1.5 cursor-ns-resize',
  s: 'inset-x-2 bottom-0 h-1.5 cursor-ns-resize',
  e: 'inset-y-2 right-0 w-1.5 cursor-ew-resize',
  w: 'inset-y-2 left-0 w-1.5 cursor-ew-resize',
  ne: 'top-0 right-0 size-2 cursor-nesw-resize',
  nw: 'top-0 left-0 size-2 cursor-nwse-resize',
  se: 'right-0 bottom-0 size-2 cursor-nwse-resize',
  sw: 'bottom-0 left-0 size-2 cursor-nesw-resize',
};

/** The edges and corners of a floating panel; dragging one resizes the panel. */
export function ResizeEdges({ panelId }: { panelId: PanelId }) {
  return RESIZE_EDGES.map((edge) => <ResizeEdgeStrip key={edge} panelId={panelId} edge={edge} />);
}

type ResizeEdgeStripProps = { panelId: PanelId; edge: ResizeEdge };

function ResizeEdgeStrip({ panelId, edge }: ResizeEdgeStripProps) {
  const startResize = useAppStore((s) => s.startResize);
  const handlers = usePointerGesture({
    active: useAppStore((s) => s.resize?.panelId === panelId && s.resize.edge === edge),
    start: (pointer, viewport) => startResize(panelId, edge, pointer, viewport),
    move: useAppStore((s) => s.moveResize),
    end: useAppStore((s) => s.endResize),
    cancel: useAppStore((s) => s.cancelResize),
    // The resize raises the panel itself; the panel's own raise must not run too.
    stopPropagation: true,
  });

  return (
    <div
      data-testid={`resize-${edge}`}
      aria-hidden="true"
      className={`absolute z-10 touch-none ${EDGE_CLASSES[edge]}`}
      {...handlers}
    />
  );
}
