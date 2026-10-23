import { create } from 'zustand';
import { defaultLayout, type Layout } from '../domain';

export type AppState = {
  layout: Layout;
  counter: number;
};

export type AppActions = {
  increment: () => void;
  decrement: () => void;
};

export type AppStore = AppState & AppActions;

function initialState(): AppState {
  return { layout: defaultLayout(), counter: 0 };
}

export const useAppStore = create<AppStore>()((set) => ({
  ...initialState(),
  increment: () => set((s) => ({ counter: s.counter + 1 })),
  decrement: () => set((s) => ({ counter: s.counter - 1 })),
}));

/** Restore the default layout and a zero counter, keeping the actions. */
export function resetStore(): void {
  useAppStore.setState(initialState());
}
