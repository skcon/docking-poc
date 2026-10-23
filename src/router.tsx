import { createRootRoute, createRouter, type RouterHistory } from '@tanstack/react-router';
import { App } from './ui/App';
import { LayoutInUrl } from './ui/LayoutInUrl';

/** The root route's search params. `layout` is an encoded Layout (domain/urlCodec); no counter. */
export type RootSearch = { layout?: string };

export function validateRootSearch(search: Record<string, unknown>): RootSearch {
  return typeof search.layout === 'string' ? { layout: search.layout } : {};
}

function Root() {
  return (
    <>
      <LayoutInUrl />
      <App />
    </>
  );
}

const rootRoute = createRootRoute({ component: Root, validateSearch: validateRootSearch });

/** Build the app router; tests pass a memory history. */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree: rootRoute, history });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
