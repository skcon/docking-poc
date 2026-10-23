---
status: accepted
---

# Build a custom docking engine instead of adopting dockview-react

Zones are predefined, fixed edge areas (left, right, bottom), each holding at most two panels, and the whole layout round-trips through the URL via a Zustand store. We built a small engine of pure domain functions driven by pointer events rather than adopting `dockview-react`, because dockview is organised around user-built groups and splits and keeps its own layout state, so mapping our zone model and URL-encoded store onto it would mean fighting its model. The POC (spec #2) confirmed the choice: the engine covers move, resize, dock, undock, cancel and viewport clamping in pure TypeScript with 126 unit and UI tests and no docking dependency.

## Considered Options

- **dockview-react**: mature drag, floating and popout support, but its model (arbitrary groups and splits, internal layout serialization) does not match predefined zones. Popout windows are out of scope. Not verified against its current docs (the build sandbox could not reach them); revisit if popout windows or user-defined splits become requirements.
- **Other docking libraries** (e.g. rc-dock, FlexLayout): same group-and-split model; not evaluated in depth.

## Consequences

- We own hit-testing, drag handling, z-order and resize behaviour. Real-browser pointer details had to be handled explicitly: a 4 px drag threshold so clicking a docked handle does not undock it, cancel on `pointercancel` and lost pointer capture, and a stable DOM order (stacking via z-index only) so pointer capture survives raising a panel.
- While a docked panel is dragged out, its slot still counts as occupied for layout, so its neighbour does not jump mid-drag; a lone panel fills its column only after the drop.
- Choices made during the POC that the spec left open: the bottom zone is 240 px high; column space is reserved even when a column is empty, so zones never overlap; bottom-strip slots are left-aligned, capped at 350 px, and chosen by the slot rect under the pointer; the drop highlight covers the whole zone.
- Known gaps: keyboard docking, popout windows, responsive layouts below 1024 px.
