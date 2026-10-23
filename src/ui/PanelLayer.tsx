import { useState } from 'react';
import { dockedRect, PANEL_TITLES } from '../domain';
import { useAppStore } from '../state/store';
import { DropHighlight } from './DropHighlight';
import { Panel } from './Panel';
import { PANEL_CONTENTS } from './panelContents';
import { currentViewport, useWindowResize } from './viewport';

/**
 * Renders every panel from the store's layout, stacked by z-order. Docked panels sit below
 * the drop highlight, which sits below floating panels (floating panels overlay docked ones).
 */
export function PanelLayer() {
  const layout = useAppStore((s) => s.layout);
  // Docked rects and the drop highlight are derived from the viewport, so re-render on resize.
  const [viewport, setViewport] = useState(currentViewport);
  useWindowResize(setViewport);
  const floatingBase = layout.zOrder.length + 1;

  return (
    <div className="pointer-events-none fixed inset-0 *:pointer-events-auto">
      {layout.zOrder.map((id, index) => {
        const Content = PANEL_CONTENTS[id];
        const docked = layout.panels[id].placement.kind === 'docked';
        return (
          <Panel
            key={id}
            panel={layout.panels[id]}
            title={PANEL_TITLES[id]}
            zIndex={(docked ? 0 : floatingBase) + index + 1}
            dockedRect={dockedRect(layout, viewport, id)}
          >
            <Content />
          </Panel>
        );
      })}
      <DropHighlight viewport={viewport} zIndex={floatingBase} />
    </div>
  );
}
