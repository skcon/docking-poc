import { useId, type PointerEvent, type ReactNode } from 'react';
import { HANDLE_HEIGHT_PX, type PanelId, type PanelState, type Rect } from '../domain';
import { useAppStore } from '../state/store';
import { ResizeEdges } from './ResizeEdges';
import { currentViewport, pointerOf } from './viewport';

type PanelProps = {
  panel: PanelState;
  title: string;
  zIndex: number;
  /** Where the zone lays this panel out when it is docked (from the domain's dockedRect). */
  dockedRect?: Rect | null;
  children: ReactNode;
};

export function Panel({ panel, title, zIndex, dockedRect, children }: PanelProps) {
  const titleId = useId();
  const raisePanel = useAppStore((s) => s.raisePanel);
  const rect = panel.placement.kind === 'floating' ? panel.placement.rect : dockedRect;
  if (!rect) return null;
  const { x, y, width, height } = rect;

  return (
    <section
      aria-labelledby={titleId}
      data-panel-id={panel.id}
      data-placement={panel.placement.kind}
      className="absolute flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg"
      style={{ left: x, top: y, width, height, zIndex }}
      onPointerDown={() => raisePanel(panel.id)}
    >
      <Handle id={titleId} panelId={panel.id} title={title} />
      <div className="flex flex-1 items-center justify-center p-4">{children}</div>
      {/* Only floating panels are resizable; docked panels must not render ResizeEdges. */}
      {panel.placement.kind === 'floating' && <ResizeEdges panelId={panel.id} />}
    </section>
  );
}

type HandleProps = { id: string; panelId: PanelId; title: string };

/** Dragging the handle moves the panel. Pointer capture keeps the drag on the handle. */
function Handle({ id, panelId, title }: HandleProps) {
  const startDrag = useAppStore((s) => s.startDrag);
  const moveDrag = useAppStore((s) => s.moveDrag);
  const endDrag = useAppStore((s) => s.endDrag);
  const isDragging = useAppStore((s) => s.drag?.panelId === panelId);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startDrag(panelId, pointerOf(event), currentViewport());
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isDragging) moveDrag(pointerOf(event), currentViewport());
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (isDragging) endDrag(pointerOf(event), currentViewport());
  };

  return (
    <div
      data-testid="handle"
      className="flex shrink-0 cursor-grab touch-none items-center bg-slate-700 px-3 text-sm font-medium text-white select-none active:cursor-grabbing"
      style={{ height: HANDLE_HEIGHT_PX }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <h2 id={id}>{title}</h2>
    </div>
  );
}
