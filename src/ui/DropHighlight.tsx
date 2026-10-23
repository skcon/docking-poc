import { zoneRect, type Viewport } from '../domain';
import { useAppStore } from '../state/store';

type DropHighlightProps = { viewport: Viewport; zIndex: number };

/** Light-blue translucent overlay over the zone a release would dock the dragged panel into. */
export function DropHighlight({ viewport, zIndex }: DropHighlightProps) {
  const zone = useAppStore((s) => s.drag?.dockTarget?.zone ?? null);
  if (zone === null) return null;
  const { x, y, width, height } = zoneRect(viewport, zone);

  return (
    <div
      data-testid="drop-highlight"
      data-zone={zone}
      aria-hidden="true"
      className="pointer-events-none absolute border-2 border-sky-300 bg-sky-300/40"
      style={{ left: x, top: y, width, height, zIndex }}
    />
  );
}
