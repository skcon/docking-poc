import type { ReactNode } from 'react';
import type { PanelId } from '../domain';
import { useAppStore } from '../state/store';

function CounterDisplay() {
  const counter = useAppStore((s) => s.counter);
  return (
    <output role="status" className="text-5xl font-semibold tabular-nums">
      {counter}
    </output>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700 active:bg-slate-900"
    >
      {label}
    </button>
  );
}

function IncrementControl() {
  const increment = useAppStore((s) => s.increment);
  return <ActionButton label="Increment" onClick={increment} />;
}

function DecrementControl() {
  const decrement = useAppStore((s) => s.decrement);
  return <ActionButton label="Decrement" onClick={decrement} />;
}

export const PANEL_CONTENTS: Record<PanelId, () => ReactNode> = {
  counter: CounterDisplay,
  increment: IncrementControl,
  decrement: DecrementControl,
};
