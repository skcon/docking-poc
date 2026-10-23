import { PANEL_TITLES } from '../domain';
import { useAppStore } from '../state/store';
import { Panel } from './Panel';
import { PANEL_CONTENTS } from './panelContents';

/** Renders every panel from the store's layout, stacked by z-order. */
export function PanelLayer() {
  const layout = useAppStore((s) => s.layout);

  return (
    <div className="pointer-events-none fixed inset-0 *:pointer-events-auto">
      {layout.zOrder.map((id, index) => {
        const Content = PANEL_CONTENTS[id];
        return (
          <Panel key={id} panel={layout.panels[id]} title={PANEL_TITLES[id]} zIndex={index + 1}>
            <Content />
          </Panel>
        );
      })}
    </div>
  );
}
