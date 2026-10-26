# docking-poc

Proof of concept for dockable, undockable, resizable panels: drag a panel's handle near the left or right edge to dock it as a full-height column, onto a docked column to stack two panels 50/50, drag it out to float, move and resize it. The layout is encoded in the URL, so a link rebuilds it.

Spec: [#2](https://github.com/skcon/docking-poc/issues/2). Decisions: `docs/adr/`. Vocabulary: `GLOSSARY.md`.

## Stack

Vite, React 19 with the React Compiler, Zustand, TanStack Router, Tailwind CSS, TypeScript (strict), Vitest and Testing Library.

## Scripts

```sh
npm install
npm run dev        # start the dev server
npm test           # unit and UI tests
npm run typecheck
npm run lint
npm run build
```

## Layout

- `src/domain/`: pure TypeScript layout engine (columns, move, resize, dock, undock, stacking) and URL codec
- `src/state/`: Zustand store and the URL-commit rule
- `src/ui/`: React components (action bar, map, panels, drop highlight)
