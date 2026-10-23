import { useState } from 'react';
import { dockedRectDuringDrag, PANEL_IDS, PANEL_TITLES, stackingOf } from '../domain';
import { useAppStore } from '../state/store';
import { DropHighlight } from './DropHighlight';
import { Panel } from './Panel';
import { PANEL_CONTENTS } from './panelContents';
import { currentViewport, useWindowResize } from './viewport';

/** Renders every panel from the store's layout and the drop highlight, stacked by stackingOf. */
export function PanelLayer() {
  const layout = useAppStore((s) => s.layout);
  const drag = useAppStore((s) => s.drag);
  // Docked rects and the drop highlight are derived from the viewport, so re-render on resize.
  const [viewport, setViewport] = useState(currentViewport);
  useWindowResize(setViewport);
  const stacking = stackingOf(layout);

  return (
    <div className="pointer-events-none fixed inset-0 *:pointer-events-auto">
      {/* Stable DOM order (PANEL_IDS), stacked by zIndex: reordering DOM nodes would release
          the handle's pointer capture when a drag raises (or undocks) its panel. */}
      {PANEL_IDS.map((id) => {
        const Content = PANEL_CONTENTS[id];
        return (
          <Panel
            key={id}
            panel={layout.panels[id]}
            title={PANEL_TITLES[id]}
            zIndex={stacking.panels[id]}
            dockedRect={dockedRectDuringDrag({ layout, drag }, viewport, id)}
          >
            <Content />
          </Panel>
        );
      })}
      <DropHighlight viewport={viewport} zIndex={stacking.dropHighlight} />
    </div>
  );
}
