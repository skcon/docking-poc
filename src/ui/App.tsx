import { ActionBar } from './ActionBar';
import { PanelLayer } from './PanelLayer';

export function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <ActionBar />
      <main aria-label="Map" className="flex-1 bg-blue-600" />
      <PanelLayer />
    </div>
  );
}
