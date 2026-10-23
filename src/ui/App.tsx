import { ActionBar } from './ActionBar';
import { PanelLayer } from './PanelLayer';
import { useAppStore } from '../state/store';
import { useWindowResize } from './viewport';

export function App() {
  useWindowResize(useAppStore((s) => s.changeViewport));
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <ActionBar />
      <main aria-label="Map" className="flex-1 bg-blue-600" />
      <PanelLayer />
    </div>
  );
}
