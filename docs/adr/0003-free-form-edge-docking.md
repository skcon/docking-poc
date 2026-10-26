---
status: proposed
---

# Dock panels into free-form left and right columns

Docked panels form full-height 350 px columns along the left and right screen edges, built from the edge inward. A column holds one panel (full height) or two stacked 50/50. A dragged panel shows a light-blue preview of where it will land: a new column when the pointer is within 80 px of the edge of an empty side or of the inner edge of a side's innermost column (only if at least 300 px of map remain), or the top or bottom half of a one-panel column it is over. The docked layout is always compact: when a panel leaves, the remaining panel of a column takes the full height and the columns further in move toward the edge, at once, not on drop.

We explored this because the predefined zones of ADR 0001 (left, right and bottom, two slots each) force the user to fit the screen to the zones: a lone panel is always 350 px wide, the bottom strip steals map height, and a free edge cannot take more than two panels. The column model lets the arrangement grow with what the user docks and gives the map back as soon as a column goes.

## Trade-offs against ADR 0001

- Gains: no bottom strip and no reserved-but-empty zone space; the number of columns is open (bounded by the minimum map width); the preview shows the real outcome, not a whole zone; gaps never remain.
- Costs: the layout is more dynamic, so docked rects depend on all other docked panels (normalised after every dock and undock); neighbours move the moment a panel is dragged out, where ADR 0001 held its slot until the drop; no bottom dock at all; the URL format needs a version bump and a migration.
- URL: `v2` writes `d~<side>~<column>~<slot>` and is validated strictly. `v1` links still decode: left and right zones map to column 0 of the side with the slot kept (a lone panel then fills the column), and bottom-zone panels float at their last floating rect (or the default floating rect).

## Status

Proposed, as a comparison on the `feature/freeform-docking` branch. ADR 0001 stays accepted on `main` until this one is accepted.
