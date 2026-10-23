---
status: accepted
---

# Build a custom docking engine instead of adopting dockview-react

Zones are predefined, fixed edge areas (left, right, bottom), each holding at most two panels, and the whole layout round-trips through the URL via a Zustand store. We build a small engine of pure domain functions plus pointer events rather than adopting `dockview-react`, because dockview is organised around user-built groups and splits and keeps its own layout state, so mapping our zone model and URL-encoded store onto it would mean fighting its model. The custom engine is also easier to unit test.

## Considered Options

- **dockview-react**: mature drag, floating and popout support, but its model (arbitrary groups and splits, internal layout serialization) does not match predefined zones. Popout windows are out of scope. Not verified against its current docs in this session; revisit if the custom engine proves costly.
- **Other docking libraries** (e.g. rc-dock, FlexLayout): same group-and-split model; not evaluated in depth.

## Consequences

- We own hit-testing, drag handling, z-order and resize behaviour, and must test them ourselves.
- No third-party docking dependency, so no extra approval is needed for it.
