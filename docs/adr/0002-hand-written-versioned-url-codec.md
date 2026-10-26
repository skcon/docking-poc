---
status: accepted
---

# Encode the layout in the URL with a hand-written, versioned codec

The panel arrangement lives in a single `layout` search param (TanStack Router) so a link rebuilds the layout, with no backend. We use a compact hand-written text format prefixed with a schema version (`v1_<panel>~f~x~y~w~h~<last rect>_...`, panels listed back to front so the order is the z-order) instead of JSON plus zod or lz-string, to stay within the approved dependencies and keep links readable. Decoding validates everything by hand and falls back to the default layout on any malformed, unknown-version or inconsistent value without throwing. Because shared links must keep working, any format change bumps the version and adds a migration from the previous one rather than editing `v1` in place. The URL is written with `replace` only when a gesture ends with a changed layout, or when a click raises a panel; the counter is never in the URL.

Versions: `v1` (predefined zones) is superseded on the `feature/freeform-docking` branch by `v2`, which writes docked placements as `d~<side>~<column>~<slot>` (ADR 0003). `v1` links are still decoded and migrated: left and right zones become column 0 of that side, bottom-zone panels float at their last floating rect. `v2` is validated strictly (contiguous columns and slots, at most two panels per column).
