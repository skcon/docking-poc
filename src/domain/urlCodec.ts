/**
 * The layout URL codec: turns a Layout into a compact, URL-safe string and back.
 *
 * Format (version 1), using only characters encodeURIComponent leaves alone:
 *
 *   v1_<panel>_<panel>_<panel>        panels listed back to front (the z-order)
 *   <panel> = <id>~<placement>~<last> fields separated by `~`
 *   <placement> = f~x~y~w~h            floating, its rect
 *               | d~<zone>~<slot>      docked
 *   <last>      = x~y~w~h | n          lastFloatingRect, or null
 *
 * e.g. `v1_counter~d~left~0~400~80~320~240_increment~f~440~120~320~240~440~120~320~240_...`
 *
 * Decoding never throws: any malformed, unknown-version, out-of-range or inconsistent input
 * gives the default layout. Transient state (drag, resize) and the counter are never encoded.
 */
import { MIN_PANEL } from './constants';
import { defaultLayout, PANEL_IDS } from './layout';
import type { Layout, PanelId, PanelPlacement, PanelState, Rect, SlotId, ZoneId } from './types';
import { ZONES, zoneSlots } from './zones';

/** The schema version written into every encoded layout. Bump it (and migrate) on format changes. */
export const LAYOUT_CODEC_VERSION = 1;

/** Coordinates beyond this magnitude (CSS px) are treated as corrupt input. */
export const MAX_COORDINATE_PX = 100_000;

const PANEL_SEPARATOR = '_';
const FIELD_SEPARATOR = '~';
const NULL_RECT = 'n';
const RECT_FIELD_COUNT = 4;

/** How each placement kind is written: its code and how many fields follow the code. */
const PLACEMENT_CODES = {
  floating: { code: 'f', fieldCount: RECT_FIELD_COUNT },
  docked: { code: 'd', fieldCount: 2 },
} as const satisfies Record<PanelPlacement['kind'], { code: string; fieldCount: number }>;

export function encodeLayout(layout: Layout): string {
  const panels = layout.zOrder.map((id) => encodePanel(layout.panels[id]));
  return [`v${LAYOUT_CODEC_VERSION}`, ...panels].join(PANEL_SEPARATOR);
}

function encodePanel(panel: PanelState): string {
  const last = panel.lastFloatingRect ? encodeRect(panel.lastFloatingRect) : [NULL_RECT];
  return [panel.id, ...encodePlacement(panel.placement), ...last].join(FIELD_SEPARATOR);
}

function encodePlacement(placement: PanelPlacement): string[] {
  const { code } = PLACEMENT_CODES[placement.kind];
  return placement.kind === 'floating'
    ? [code, ...encodeRect(placement.rect)]
    : [code, placement.zone, String(placement.slot)];
}

function encodeRect(rect: Rect): string[] {
  return [rect.x, rect.y, rect.width, rect.height].map(String);
}

/** Parse an encoded layout, or return the default layout if `text` is not a valid one. */
export function decodeLayout(text: unknown): Layout {
  return parseLayout(text) ?? defaultLayout();
}

function parseLayout(text: unknown): Layout | null {
  if (typeof text !== 'string') return null;
  const [version, ...encodedPanels] = text.split(PANEL_SEPARATOR);
  if (version !== `v${LAYOUT_CODEC_VERSION}`) return null;
  if (encodedPanels.length !== PANEL_IDS.length) return null;

  const panels = new Map<PanelId, PanelState>();
  for (const encoded of encodedPanels) {
    const panel = parsePanel(encoded);
    if (!panel || panels.has(panel.id)) return null;
    panels.set(panel.id, panel);
  }
  if (!PANEL_IDS.every((id) => panels.has(id))) return null;
  if (!slotsAreUnique([...panels.values()])) return null;
  // Checked above: the map holds exactly one panel per PanelId.
  return { panels: Object.fromEntries(panels) as Layout['panels'], zOrder: [...panels.keys()] };
}

function parsePanel(encoded: string): PanelState | null {
  const [id, code, ...rest] = encoded.split(FIELD_SEPARATOR);
  if (!isPanelId(id)) return null;
  const kind = placementKindOf(code);
  if (!kind) return null;

  const { fieldCount } = PLACEMENT_CODES[kind];
  const placementFields = rest.slice(0, fieldCount);
  const lastFields = rest.slice(fieldCount);

  const placement =
    kind === 'floating' ? parseFloating(placementFields) : parseDocked(placementFields);
  if (!placement) return null;

  const lastIsNull = lastFields.length === 1 && lastFields[0] === NULL_RECT;
  const lastFloatingRect = lastIsNull ? null : parseRect(lastFields);
  if (!lastIsNull && !lastFloatingRect) return null;

  return { id, placement, lastFloatingRect };
}

function placementKindOf(code: string | undefined): PanelPlacement['kind'] | null {
  if (code === PLACEMENT_CODES.floating.code) return 'floating';
  if (code === PLACEMENT_CODES.docked.code) return 'docked';
  return null;
}

function parseFloating(fields: string[]): PanelPlacement | null {
  const rect = parseRect(fields);
  return rect ? { kind: 'floating', rect } : null;
}

function parseDocked(fields: string[]): PanelPlacement | null {
  const [zone, encodedSlot] = fields;
  if (!isZoneId(zone)) return null;
  const slot = zoneSlots(zone).find((id) => String(id) === encodedSlot);
  return slot === undefined ? null : { kind: 'docked', zone, slot };
}

function parseRect(fields: string[]): Rect | null {
  if (fields.length !== RECT_FIELD_COUNT) return null;
  const [x, y, width, height] = fields.map(parseCoordinate);
  if (x == null || y == null || width == null || height == null) return null;
  if (width < MIN_PANEL.width || height < MIN_PANEL.height) return null;
  return { x, y, width, height };
}

/** A finite number within MAX_COORDINATE_PX written in plain decimal notation, or null. */
function parseCoordinate(field: string): number | null {
  if (!/^-?\d+(\.\d+)?(e-\d+)?$/.test(field)) return null;
  const value = Number(field);
  return Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE_PX ? value : null;
}

/** No two docked panels share a zone and slot. */
function slotsAreUnique(panels: PanelState[]): boolean {
  const taken = new Map<ZoneId, Set<SlotId>>();
  for (const { placement } of panels) {
    if (placement.kind !== 'docked') continue;
    const slots = taken.get(placement.zone) ?? new Set<SlotId>();
    if (slots.has(placement.slot)) return false;
    taken.set(placement.zone, slots.add(placement.slot));
  }
  return true;
}

function isPanelId(value: string | undefined): value is PanelId {
  return PANEL_IDS.some((id) => id === value);
}

function isZoneId(value: string | undefined): value is ZoneId {
  return ZONES.some((zone) => zone.id === value);
}
