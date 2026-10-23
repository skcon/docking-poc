# Docking

A proof of concept for an app whose windows can be docked into predefined areas of the screen or detached to float freely. It exists to settle how docking should work before the real application is built.

## Language

**Panel**:
A titled window with a handle and arbitrary content, which is either docked or floating.
_Avoid_: Window, widget, tile

**Handle**:
The title strip at the top of a panel; dragging it undocks the panel.
_Avoid_: Title bar, header, grip

**Zone**:
A predefined area of the screen, declared in code, where panels can be docked. It is invisible and not directly interactive.
_Avoid_: Dock area, slot, region, drop target

**Docked panel**:
A panel fixed in a zone, laid out by the zone rather than positioned by the user.
_Avoid_: Pinned panel, attached panel

**Floating panel**:
A panel positioned and sized freely by the user, overlaying the map and any docked panels.
_Avoid_: Detached panel, undocked panel, popout

**Dock**:
To attach a floating panel to a zone, making it a docked panel.
_Avoid_: Snap, pin

**Undock**:
To detach a docked panel from its zone, making it a floating panel.
_Avoid_: Detach, pop out, tear off

**Drop highlight**:
The translucent light-blue overlay shown over a zone while a dragged panel is close enough to dock into it.
_Avoid_: Drop preview, snap guide, drop target

**Action bar**:
The thin bar across the top of the screen holding menus such as File, View and Settings. It is not a zone.
_Avoid_: Menu bar, toolbar, header

**Map**:
The main content area that fills most of the screen behind all panels.
_Avoid_: Canvas, background, viewport

**Slot**:
One of the two positions a zone offers for a docked panel (top or bottom in a column, left or right in the bottom strip). A slot is empty or holds one panel.
_Avoid_: Position, cell, stack index

**Dock target**:
The zone and slot a dragged panel would dock into if released now. It is what the drop highlight shows.
_Avoid_: Drop target, drop zone
