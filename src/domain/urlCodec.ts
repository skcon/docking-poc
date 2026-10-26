/**
 * The layout URL codec: turns a Layout into a compact, URL-safe string and back.
 *
 * Format (version 2), using only characters encodeURIComponent leaves alone:
 *
 *   v2_<panel>_<panel>_<panel>        panels listed back to front (the z-order)
 *   <panel> = <id>~<placement>~<last> fields separated by `~`
 *   <placement> = f~x~y~w~h            floating, its rect
 *               | d~<side>~<column>~<slot>   docked (column 0 is at the screen edge)
 *   <last>      = x~y~w~h | n          lastFloatingRect, or null
 *
 * e.g. `v2_counter~d~left~0~0~400~80~320~240_increment~f~440~120~320~240~440~120~320~240_...`
 *
 * Version 1 (predefined zones: `d~<left|right|bottom>~<slot>`) is still read and migrated:
 * a left or right zone becomes column 0 of that side with the slot kept, and a bottom-zone
 * panel floats at its last floating rect (or the default floating rect).
 *
 * Decoding never throws: any malformed, unknown-version, out-of-range or inconsistent input
 * gives the default layout. Transient state (drag, resize) and the counter are never encoded.
 */
import { DEFAULT_FLOATING, DEFAULT_FLOATING_ORIGIN, MIN_PANEL } from './constants';
import { normalizeDocks } from './docking';
import { defaultLayout, PANEL_IDS } from './layout';
import type { Layout, PanelId, PanelPlacement, PanelState, Rect, Side, Slot } from './types';

/** The schema version written into every encoded layout. Bump it (and migrate) on format changes. */
export const LAYOUT_CODEC_VERSION = 2;

/** Coordinates beyond this magnitude (CSS px) are treated as corrupt input. */
export const MAX_COORDINATE_PX = 100_000;

const PANEL_SEPARATOR = '_';
const FIELD_SEPARATOR = '~';
const NULL_RECT = 'n';
const RECT_FIELD_COUNT = 4;

/** How each placement kind is written: its code. */
const PLACEMENT_CODES = {
  floating: 'f',
  docked: 'd',
} as const satisfies Record<PanelPlacement['kind'], string>;

/** A version 1 dock: a predefined zone and the slot in it. */
type LegacyDock = { zone: Side | 'bottom'; slot: Slot };

type FloatingPlacement = Extract<PanelPlacement, { kind: 'floating' }>;
type DockedPlacement = Extract<PanelPlacement, { kind: 'docked' }>;

/** A panel as written in one version's format, whose dock is of type `D`. */
type ParsedPanel<D> = {
  id: PanelId;
  placement: FloatingPlacement | { kind: 'docked'; dock: D };
  lastFloatingRect: Rect | null;
};

/** How a version writes the fields that follow the `d` of a docked placement. */
type DockFormat<D> = { fieldCount: number; parse: (fields: string[]) => D | null };

const SIDES = ['left', 'right'] as const satisfies readonly Side[];
const SLOTS = [0, 1] as const satisfies readonly Slot[];

const DOCK_V2: DockFormat<DockedPlacement> = {
  fieldCount: 3,
  parse: ([side, column, slot]) => {
    const slotId = SLOTS.find((id) => String(id) === slot);
    if (!isSide(side) || !isColumnIndex(column) || slotId === undefined) return null;
    return { kind: 'docked', side, column: Number(column), slot: slotId };
  },
};

const DOCK_V1: DockFormat<LegacyDock> = {
  fieldCount: 2,
  parse: ([zone, slot]) => {
    const slotId = SLOTS.find((id) => String(id) === slot);
    return (isSide(zone) || zone === 'bottom') && slotId !== undefined
      ? { zone, slot: slotId }
      : null;
  },
};

export function encodeLayout(layout: Layout): string {
  const panels = layout.zOrder.map((id) => encodePanel(layout.panels[id]));
  return [`v${LAYOUT_CODEC_VERSION}`, ...panels].join(PANEL_SEPARATOR);
}

function encodePanel(panel: PanelState): string {
  const last = panel.lastFloatingRect ? encodeRect(panel.lastFloatingRect) : [NULL_RECT];
  return [panel.id, ...encodePlacement(panel.placement), ...last].join(FIELD_SEPARATOR);
}

function encodePlacement(placement: PanelPlacement): string[] {
  const code = PLACEMENT_CODES[placement.kind];
  return placement.kind === 'floating'
    ? [code, ...encodeRect(placement.rect)]
    : [code, placement.side, String(placement.column), String(placement.slot)];
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
  if (version === 'v2') return layoutFromV2(parsePanels(encodedPanels, DOCK_V2));
  if (version === 'v1') return layoutFromV1(parsePanels(encodedPanels, DOCK_V1));
  return null;
}

/** Version 2 is read strictly: the docked layout must already be compact (contiguous, no clashes). */
function layoutFromV2(parsed: ParsedPanel<DockedPlacement>[] | null): Layout | null {
  if (!parsed) return null;
  const layout = layoutOf(parsed, ({ placement }) =>
    placement.kind === 'docked' ? placement.dock : placement,
  );
  return normalizeDocks(layout) === layout ? layout : null;
}

/** Migrate version 1: left and right zones become column 0 of that side, the bottom zone floats. */
function layoutFromV1(parsed: ParsedPanel<LegacyDock>[] | null): Layout | null {
  if (!parsed) return null;
  const zones = parsed.flatMap(({ placement }) =>
    placement.kind === 'docked' ? [placement.dock] : [],
  );
  if (new Set(zones.map(({ zone, slot }) => `${zone}${slot}`)).size !== zones.length) return null;
  const layout = layoutOf(parsed, ({ placement, lastFloatingRect }) => {
    if (placement.kind === 'floating') return placement;
    const { zone, slot } = placement.dock;
    if (zone === 'bottom') return { kind: 'floating', rect: lastFloatingRect ?? DEFAULT_RECT };
    return { kind: 'docked', side: zone, column: 0, slot };
  });
  return normalizeDocks(layout);
}

const DEFAULT_RECT: Rect = { ...DEFAULT_FLOATING_ORIGIN, ...DEFAULT_FLOATING };

/** The layout of the panels in the order they were written (the z-order). */
function layoutOf<D>(
  parsed: ParsedPanel<D>[],
  placementOf: (panel: ParsedPanel<D>) => PanelPlacement,
): Layout {
  const states = parsed.map((panel): PanelState => {
    const placement = placementOf(panel);
    // A panel migrated to floating has floated, so its last floating rect is where it is.
    const lastFloatingRect =
      placement.kind === 'floating' && panel.placement.kind === 'docked'
        ? placement.rect
        : panel.lastFloatingRect;
    return { id: panel.id, placement, lastFloatingRect };
  });
  // parsePanels checked that there is exactly one panel per PanelId.
  return {
    panels: Object.fromEntries(states.map((s) => [s.id, s])) as Layout['panels'],
    zOrder: states.map((s) => s.id),
  };
}

/** Every panel of an encoded layout, or null unless there is exactly one per PanelId. */
function parsePanels<D>(encoded: string[], format: DockFormat<D>): ParsedPanel<D>[] | null {
  if (encoded.length !== PANEL_IDS.length) return null;
  const panels: ParsedPanel<D>[] = [];
  for (const text of encoded) {
    const panel = parsePanel(text, format);
    if (!panel || panels.some(({ id }) => id === panel.id)) return null;
    panels.push(panel);
  }
  return PANEL_IDS.every((id) => panels.some((panel) => panel.id === id)) ? panels : null;
}

function parsePanel<D>(encoded: string, format: DockFormat<D>): ParsedPanel<D> | null {
  const [id, code, ...rest] = encoded.split(FIELD_SEPARATOR);
  if (!isPanelId(id)) return null;
  const docked = code === PLACEMENT_CODES.docked;
  if (!docked && code !== PLACEMENT_CODES.floating) return null;

  const fieldCount = docked ? format.fieldCount : RECT_FIELD_COUNT;
  const placementFields = rest.slice(0, fieldCount);
  const lastFields = rest.slice(fieldCount);

  const dock = docked ? format.parse(placementFields) : null;
  const rect = docked ? null : parseRect(placementFields);
  const placement = dock
    ? { kind: 'docked' as const, dock }
    : rect && { kind: 'floating' as const, rect };
  if (!placement) return null;

  const lastIsNull = lastFields.length === 1 && lastFields[0] === NULL_RECT;
  const lastFloatingRect = lastIsNull ? null : parseRect(lastFields);
  if (!lastIsNull && !lastFloatingRect) return null;

  return { id, placement, lastFloatingRect };
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

function isPanelId(value: string | undefined): value is PanelId {
  return PANEL_IDS.some((id) => id === value);
}

function isSide(value: string | undefined): value is Side {
  return SIDES.some((side) => side === value);
}

/** A plain non-negative integer, small enough that a compact layout could have such a column. */
function isColumnIndex(value: string | undefined): value is string {
  return value !== undefined && /^\d+$/.test(value) && Number(value) < PANEL_IDS.length;
}
