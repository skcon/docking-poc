import type { PointerEvent } from 'react';
import { RESIZE_EDGES, type PanelId, type ResizeEdge } from '../domain';
import { useAppStore } from '../state/store';
import { currentViewport, pointerOf } from './viewport';

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

/** Pointer capture keeps the resize on this strip while the pointer moves outside it. */
function ResizeEdgeStrip({ panelId, edge }: ResizeEdgeStripProps) {
  const startResize = useAppStore((s) => s.startResize);
  const moveResize = useAppStore((s) => s.moveResize);
  const endResize = useAppStore((s) => s.endResize);
  const isResizing = useAppStore((s) => s.resize?.panelId === panelId && s.resize.edge === edge);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    startResize(panelId, edge, pointerOf(event), currentViewport());
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isResizing) moveResize(pointerOf(event), currentViewport());
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (isResizing) endResize(pointerOf(event), currentViewport());
  };

  return (
    <div
      data-testid={`resize-${edge}`}
      aria-hidden="true"
      className={`absolute z-10 touch-none ${EDGE_CLASSES[edge]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    />
  );
}
