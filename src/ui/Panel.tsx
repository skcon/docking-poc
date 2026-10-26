import { useId, type ReactNode } from 'react';
import { HANDLE_HEIGHT_PX, type PanelId, type PanelState, type Rect } from '../domain';
import { useAppStore } from '../state/store';
import { ResizeEdges } from './ResizeEdges';
import { usePointerGesture } from './pointerGesture';

type PanelProps = {
  panel: PanelState;
  title: string;
  zIndex: number;
  /** Where its column lays this panel out when it is docked (from the domain's dockedRect). */
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

/** Dragging the handle moves the panel (undocking it if docked). */
function Handle({ id, panelId, title }: HandleProps) {
  const startDrag = useAppStore((s) => s.startDrag);
  const handlers = usePointerGesture({
    active: useAppStore((s) => s.drag?.panelId === panelId),
    start: (pointer, viewport) => startDrag(panelId, pointer, viewport),
    move: useAppStore((s) => s.moveDrag),
    end: useAppStore((s) => s.endDrag),
    cancel: useAppStore((s) => s.cancelDrag),
  });

  return (
    <div
      data-testid="handle"
      className="flex shrink-0 cursor-grab touch-none items-center bg-slate-700 px-3 text-sm font-medium text-white select-none active:cursor-grabbing"
      style={{ height: HANDLE_HEIGHT_PX }}
      {...handlers}
    >
      <h2 id={id}>{title}</h2>
    </div>
  );
}
