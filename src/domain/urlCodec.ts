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
import { ZONES } from './zones';

/** The schema version written into every encoded layout. Bump it (and migrate) on format changes. */
export const LAYOUT_CODEC_VERSION = 1;

/** Coordinates beyond this magnitude (CSS px) are treated as corrupt input. */
export const MAX_COORDINATE_PX = 100_000;

const PANEL_SEPARATOR = '_';
const FIELD_SEPARATOR = '~';
const NULL_RECT = 'n';

export function encodeLayout(layout: Layout): string {
  const panels = layout.zOrder.map((id) => encodePanel(layout.panels[id]));
  return [`v${LAYOUT_CODEC_VERSION}`, ...panels].join(PANEL_SEPARATOR);
}

function encodePanel(panel: PanelState): string {
  const last = panel.lastFloatingRect ? encodeRect(panel.lastFloatingRect) : [NULL_RECT];
  return [panel.id, ...encodePlacement(panel.placement), ...last].join(FIELD_SEPARATOR);
}

function encodePlacement(placement: PanelPlacement): string[] {
  return placement.kind === 'floating'
    ? ['f', ...encodeRect(placement.rect)]
    : ['d', placement.zone, String(placement.slot)];
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
  const zOrder = [...panels.keys()];
  if (!slotsAreUnique([...panels.values()])) return null;

  const panelOf = (id: PanelId) => panels.get(id);
  const counter = panelOf('counter');
  const increment = panelOf('increment');
  const decrement = panelOf('decrement');
  if (!counter || !increment || !decrement) return null;
  return { panels: { counter, increment, decrement }, zOrder };
}

function parsePanel(encoded: string): PanelState | null {
  const [id, kind, ...rest] = encoded.split(FIELD_SEPARATOR);
  if (!isPanelId(id)) return null;

  const placementFieldCount = kind === 'f' ? 4 : kind === 'd' ? 2 : -1;
  if (placementFieldCount < 0) return null;
  const placementFields = rest.slice(0, placementFieldCount);
  const lastFields = rest.slice(placementFieldCount);

  const placement = kind === 'f' ? parseFloating(placementFields) : parseDocked(placementFields);
  if (!placement) return null;

  const lastIsNull = lastFields.length === 1 && lastFields[0] === NULL_RECT;
  const lastFloatingRect = lastIsNull ? null : parseRect(lastFields);
  if (!lastIsNull && !lastFloatingRect) return null;

  return { id, placement, lastFloatingRect };
}

function parseFloating(fields: string[]): PanelPlacement | null {
  const rect = parseRect(fields);
  return rect ? { kind: 'floating', rect } : null;
}

function parseDocked(fields: string[]): PanelPlacement | null {
  const [zone, slot] = fields;
  if (!isZoneId(zone)) return null;
  if (slot !== '0' && slot !== '1') return null;
  const slotId: SlotId = slot === '0' ? 0 : 1;
  return { kind: 'docked', zone, slot: slotId };
}

function parseRect(fields: string[]): Rect | null {
  if (fields.length !== 4) return null;
  const numbers = fields.map(parseCoordinate);
  const [x, y, width, height] = numbers;
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return null;
  }
  if (x === null || y === null || width === null || height === null) return null;
  if (width < MIN_PANEL.width || height < MIN_PANEL.height) return null;
  return { x, y, width, height };
}

/** A finite number within MAX_COORDINATE_PX written in plain decimal notation, or null. */
function parseCoordinate(field: string): number | null {
  if (!/^-?\d+(\.\d+)?(e-\d+)?$/.test(field)) return null;
  const value = Number(field);
  return Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE_PX ? value : null;
}

function slotsAreUnique(panels: PanelState[]): boolean {
  const taken = new Set<string>();
  for (const { placement } of panels) {
    if (placement.kind !== 'docked') continue;
    const key = `${placement.zone}${FIELD_SEPARATOR}${String(placement.slot)}`;
    if (taken.has(key)) return false;
    taken.add(key);
  }
  return true;
}

function isPanelId(value: string | undefined): value is PanelId {
  return PANEL_IDS.some((id) => id === value);
}

function isZoneId(value: string | undefined): value is ZoneId {
  return ZONES.some((zone) => zone.id === value);
}
