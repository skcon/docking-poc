import { previewRect, type Viewport } from '../domain';
import { useAppStore } from '../state/store';

type DropHighlightProps = { viewport: Viewport; zIndex: number };

/**
 * Light-blue translucent box showing exactly where a release would dock the dragged panel:
 * a whole new column, or the top or bottom half of a column it would stack into.
 */
export function DropHighlight({ viewport, zIndex }: DropHighlightProps) {
  const target = useAppStore((s) => s.drag?.dockTarget ?? null);
  if (target === null) return null;
  const { x, y, width, height } = previewRect(viewport, target);

  return (
    <div
      data-testid="drop-highlight"
      data-side={target.side}
      data-kind={target.kind}
      aria-hidden="true"
      className="pointer-events-none absolute border-2 border-sky-300 bg-sky-300/40"
      style={{ left: x, top: y, width, height, zIndex }}
    />
  );
}
