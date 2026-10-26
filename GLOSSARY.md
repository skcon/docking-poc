# Docking

A proof of concept for an app whose windows can be docked into columns along the screen edges or detached to float freely. It exists to settle how docking should work before the real application is built.

## Language

**Panel**:
A titled window with a handle and arbitrary content, which is either docked or floating.
_Avoid_: Window, widget, tile

**Handle**:
The title strip at the top of a panel; dragging it undocks the panel.
_Avoid_: Title bar, header, grip

**Side**:
The left or right screen edge. Docked panels are arranged in columns along a side; there is no bottom side.
_Avoid_: Zone, edge, dock area

**Column**:
A full-height strip of 350 px below the action bar, holding one docked panel (full height) or two stacked 50/50 (top then bottom). Columns on a side are numbered from the screen edge inward and are always contiguous, so removing one pulls the ones further in toward the edge.
_Avoid_: Zone, lane, strip, dock area

**Docked panel**:
A panel fixed in a column, laid out by its column rather than positioned by the user.
_Avoid_: Pinned panel, attached panel

**Floating panel**:
A panel positioned and sized freely by the user, overlaying the map and any docked panels.
_Avoid_: Detached panel, undocked panel, popout

**Dock**:
To attach a floating panel to a column (a new one or an existing one-panel one), making it a docked panel.
_Avoid_: Snap, pin

**Undock**:
To detach a docked panel from its column, making it a floating panel. The layout closes up at once.
_Avoid_: Detach, pop out, tear off

**Drop highlight**:
The translucent light-blue box that previews exactly where a dragged panel would land: a whole new column, or the top or bottom half of a column it would stack into.
_Avoid_: Drop preview, snap guide, drop target

**Action bar**:
The thin bar across the top of the screen holding menus such as File, View and Settings. Docked columns start below it.
_Avoid_: Menu bar, toolbar, header

**Map**:
The main content area that fills most of the screen behind all panels.
_Avoid_: Canvas, background, viewport

**Slot**:
The top or bottom position of a panel within a column. A lone panel takes slot 0 and the full height.
_Avoid_: Position, cell, stack index

**Dock target**:
The side, column and slot a dragged panel would dock into if released now, either as a new column or stacked into an existing one. It is what the drop highlight shows.
_Avoid_: Drop target, drop zone, zone
