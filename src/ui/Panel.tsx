import { useId, type ReactNode } from 'react';
import type { PanelState } from '../domain';

type PanelProps = {
  panel: PanelState;
  title: string;
  zIndex: number;
  children: ReactNode;
};

export function Panel({ panel, title, zIndex, children }: PanelProps) {
  const titleId = useId();
  if (panel.placement.kind !== 'floating') return null;
  const { x, y, width, height } = panel.placement.rect;

  return (
    <section
      aria-labelledby={titleId}
      data-panel-id={panel.id}
      className="absolute flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg"
      style={{ left: x, top: y, width, height, zIndex }}
    >
      <Handle id={titleId} title={title} />
      <div className="flex flex-1 items-center justify-center p-4">{children}</div>
    </section>
  );
}

function Handle({ id, title }: { id: string; title: string }) {
  return (
    <div
      data-testid="handle"
      className="flex h-8 shrink-0 cursor-grab items-center bg-slate-700 px-3 text-sm font-medium text-white select-none"
    >
      <h2 id={id}>{title}</h2>
    </div>
  );
}
