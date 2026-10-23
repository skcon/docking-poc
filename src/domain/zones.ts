/**
 * Zones: the code-declared areas panels dock into, and the geometry derived from them.
 * Pure functions of (layout, viewport); docked rects are derived, never stored.
 */
import { BOTTOM_ZONE_HEIGHT_PX, EDGE_TRIGGER_PX, ZONE_WIDTH_PX } from './constants';
import type { DockTarget, Layout, PanelId, Point, Rect, SlotId, Viewport, ZoneId } from './types';

/** The screen edge a zone hugs. */
export type ZoneEdge = 'left' | 'right' | 'bottom';

export type ZoneDefinition = {
  readonly id: ZoneId;
  readonly edge: ZoneEdge;
  /** How many slots the zone offers (spec #2: two per zone). */
  readonly capacity: number;
  /** How its slots are arranged: stacked top to bottom (column) or side by side (strip). */
  readonly slotAxis: 'vertical' | 'horizontal';
};

/** The three zones (spec #2). Order breaks ties when the pointer is equally near two edges. */
export const ZONES = [
  { id: 'left', edge: 'left', capacity: 2, slotAxis: 'vertical' },
  { id: 'right', edge: 'right', capacity: 2, slotAxis: 'vertical' },
  { id: 'bottom', edge: 'bottom', capacity: 2, slotAxis: 'horizontal' },
] as const satisfies readonly ZoneDefinition[];

function zoneById(id: ZoneId): ZoneDefinition {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Unknown zone ${id}`);
  return zone;
}

/**
 * The area a zone covers, in window coordinates. Columns are ZONE_WIDTH_PX wide and run the
 * full height below the action bar; the bottom strip sits between them, so zones never overlap.
 */
export function zoneRect(viewport: Viewport, zoneId: ZoneId): Rect {
  const mapHeight = viewport.height - viewport.top;
  switch (zoneById(zoneId).edge) {
    case 'left':
      return { x: 0, y: viewport.top, width: ZONE_WIDTH_PX, height: mapHeight };
    case 'right':
      return {
        x: viewport.width - ZONE_WIDTH_PX,
        y: viewport.top,
        width: ZONE_WIDTH_PX,
        height: mapHeight,
      };
    case 'bottom':
      return {
        x: ZONE_WIDTH_PX,
        y: viewport.height - BOTTOM_ZONE_HEIGHT_PX,
        width: Math.max(0, viewport.width - 2 * ZONE_WIDTH_PX),
        height: BOTTOM_ZONE_HEIGHT_PX,
      };
  }
}

/** The slot under the pointer: which half of the zone (along its slot axis) the pointer is in. */
function slotByPointerHalf(zone: ZoneDefinition, viewport: Viewport, pointer: Point): SlotId {
  const rect = zoneRect(viewport, zone.id);
  if (zone.slotAxis === 'vertical') return pointer.y < rect.y + rect.height / 2 ? 0 : 1;
  return pointer.x < rect.x + rect.width / 2 ? 0 : 1;
}

const SLOT_IDS = [0, 1] as const satisfies readonly SlotId[];

/** The slots a zone offers, in order. */
function slotsOf(zone: ZoneDefinition): readonly SlotId[] {
  return SLOT_IDS.slice(0, zone.capacity);
}

/** The slots the zone with this id offers, in order. */
export function zoneSlots(zoneId: ZoneId): readonly SlotId[] {
  return slotsOf(zoneById(zoneId));
}

/** The panels docked in a zone, keyed by slot, ignoring `exceptId` (e.g. the dragged panel). */
function occupiedSlots(layout: Layout, zoneId: ZoneId, exceptId?: PanelId): Set<SlotId> {
  const slots = new Set<SlotId>();
  for (const panel of Object.values(layout.panels)) {
    if (panel.id === exceptId || panel.placement.kind !== 'docked') continue;
    if (panel.placement.zone === zoneId) slots.add(panel.placement.slot);
  }
  return slots;
}

/** The preferred slot if free, else the first free slot, else null (the zone is full). */
function freeSlot(zone: ZoneDefinition, taken: Set<SlotId>, preferred: SlotId): SlotId | null {
  if (!taken.has(preferred)) return preferred;
  return slotsOf(zone).find((slot) => !taken.has(slot)) ?? null;
}

function distanceToEdge(edge: ZoneEdge, viewport: Viewport, pointer: Point): number {
  switch (edge) {
    case 'left':
      return pointer.x;
    case 'right':
      return viewport.width - pointer.x;
    case 'bottom':
      return viewport.height - pointer.y;
  }
}

/**
 * The zones within EDGE_TRIGGER_PX of the pointer, nearest edge first (ZONES order breaks ties).
 * None while the pointer is over the action bar.
 */
function zonesInReach(viewport: Viewport, pointer: Point): ZoneDefinition[] {
  if (pointer.y < viewport.top) return [];
  return ZONES.map((zone) => ({ zone, distance: distanceToEdge(zone.edge, viewport, pointer) }))
    .filter(({ distance }) => distance <= EDGE_TRIGGER_PX)
    .sort((a, b) => a.distance - b.distance)
    .map(({ zone }) => zone);
}

/**
 * The zone and slot a release at `pointer` would dock `draggedId` into, or null.
 * Of the zones whose edge is within EDGE_TRIGGER_PX, the nearest one with a free slot wins
 * (a full zone is never a candidate). The slot follows the pointer, falling back to the free slot.
 */
export function dockTargetAt(
  layout: Layout,
  viewport: Viewport,
  pointer: Point,
  draggedId: PanelId,
): DockTarget | null {
  for (const zone of zonesInReach(viewport, pointer)) {
    const taken = occupiedSlots(layout, zone.id, draggedId);
    const slot = freeSlot(zone, taken, slotByPointerHalf(zone, viewport, pointer));
    if (slot !== null) return { zone: zone.id, slot };
  }
  return null;
}

/** Dock the panel into `target`, keeping its last floating rect so a later undock restores it. */
export function dockPanel(layout: Layout, panelId: PanelId, target: DockTarget): Layout {
  const panel = layout.panels[panelId];
  return {
    ...layout,
    panels: {
      ...layout.panels,
      [panelId]: { ...panel, placement: { kind: 'docked', zone: target.zone, slot: target.slot } },
    },
  };
}

/**
 * The rect of a docked panel, derived from its zone and slot, or null if it is floating.
 * Column: a lone panel takes the full height, two split it evenly (slot 0 on top).
 * Bottom strip: slots sit side by side from the strip's left end, each half the strip
 * but capped at ZONE_WIDTH_PX.
 */
export function dockedRect(layout: Layout, viewport: Viewport, panelId: PanelId): Rect | null {
  const placement = layout.panels[panelId].placement;
  if (placement.kind !== 'docked') return null;
  const zone = zoneById(placement.zone);
  const area = zoneRect(viewport, zone.id);

  if (zone.slotAxis === 'horizontal') {
    const width = Math.min(ZONE_WIDTH_PX, area.width / zone.capacity);
    return { ...area, x: area.x + placement.slot * width, width };
  }

  const alone = occupiedSlots(layout, zone.id, panelId).size === 0;
  if (alone) return area;
  const height = area.height / zone.capacity;
  return { ...area, y: area.y + placement.slot * height, height };
}
