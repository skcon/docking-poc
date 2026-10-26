import { describe, expect, it } from 'vitest';
import { defaultLayout } from './layout';
import type { Layout } from './types';
import { decodeLayout, encodeLayout } from './urlCodec';

/** Counter docked top-left, decrement docked right, increment floating. */
function mixedLayout(): Layout {
  return {
    panels: {
      counter: {
        id: 'counter',
        placement: { kind: 'docked', side: 'left', column: 0, slot: 0 },
        lastFloatingRect: { x: 400, y: 80, width: 320, height: 240 },
      },
      increment: {
        id: 'increment',
        placement: { kind: 'floating', rect: { x: -12.5, y: 300.25, width: 410, height: 205 } },
        lastFloatingRect: { x: -12.5, y: 300.25, width: 410, height: 205 },
      },
      decrement: {
        id: 'decrement',
        placement: { kind: 'docked', side: 'right', column: 0, slot: 0 },
        lastFloatingRect: null,
      },
    },
    zOrder: ['increment', 'decrement', 'counter'],
  };
}

describe('layout URL codec', () => {
  it('round-trips the default layout', () => {
    const layout = defaultLayout();

    expect(decodeLayout(encodeLayout(layout))).toEqual(layout);
  });

  it('round-trips docked and floating panels, last floating rects and z-order', () => {
    const layout = mixedLayout();

    expect(decodeLayout(encodeLayout(layout))).toEqual(layout);
  });

  it('writes a versioned, URL-safe string listing panels back to front', () => {
    const text = encodeLayout(mixedLayout());

    expect(text).toBe(
      'v2' +
        '_increment~f~-12.5~300.25~410~205~-12.5~300.25~410~205' +
        '_decrement~d~right~0~0~n' +
        '_counter~d~left~0~0~400~80~320~240',
    );
    expect(encodeURIComponent(text)).toBe(text);
  });

  it('round-trips a layout with several columns and a 50/50 column on both sides', () => {
    const layout = mixedLayout();
    const multi: Layout = {
      ...layout,
      panels: {
        ...layout.panels,
        increment: {
          ...layout.panels.increment,
          placement: { kind: 'docked', side: 'left', column: 1, slot: 0 },
        },
        decrement: {
          ...layout.panels.decrement,
          placement: { kind: 'docked', side: 'left', column: 1, slot: 1 },
        },
      },
    };

    expect(decodeLayout(encodeLayout(multi))).toEqual(multi);
  });

  it('reads a hand-written version 2 string', () => {
    const layout = decodeLayout(
      'v2_counter~d~right~1~0~n_decrement~f~10~50~200~120~10~50~200~120_increment~d~right~0~0~n',
    );

    expect(layout.zOrder).toEqual(['counter', 'decrement', 'increment']);
    expect(layout.panels.counter.placement).toEqual({
      kind: 'docked',
      side: 'right',
      column: 1,
      slot: 0,
    });
  });

  describe('migrating version 1 links', () => {
    it('moves a real version 1 link to the new model', () => {
      const layout = decodeLayout(
        'v1_decrement~d~bottom~0~659~868~320~240_increment~d~left~1~0~783~320~240_counter~f~662.5~383~320~240~662.5~383~320~240',
      );

      // The bottom zone is gone: its panel floats where it last floated.
      expect(layout.panels.decrement).toEqual({
        id: 'decrement',
        placement: { kind: 'floating', rect: { x: 659, y: 868, width: 320, height: 240 } },
        lastFloatingRect: { x: 659, y: 868, width: 320, height: 240 },
      });
      // A lone panel in the left column's lower slot now fills column 0.
      expect(layout.panels.increment.placement).toEqual({
        kind: 'docked',
        side: 'left',
        column: 0,
        slot: 0,
      });
      expect(layout.panels.counter.placement.kind).toBe('floating');
      expect(layout.zOrder).toEqual(['decrement', 'increment', 'counter']);
    });

    it('keeps both slots of a version 1 column as the two halves of column 0', () => {
      const layout = decodeLayout(
        'v1_counter~d~right~1~n_increment~d~right~0~n_decrement~f~10~50~200~120~10~50~200~120',
      );

      expect(layout.panels.increment.placement).toEqual({
        kind: 'docked',
        side: 'right',
        column: 0,
        slot: 0,
      });
      expect(layout.panels.counter.placement).toEqual({
        kind: 'docked',
        side: 'right',
        column: 0,
        slot: 1,
      });
    });

    it('floats a bottom-zone panel that never floated at the default size and position', () => {
      const layout = decodeLayout(
        'v1_counter~d~bottom~0~n_increment~d~bottom~1~n_decrement~d~left~0~n',
      );

      const floating = { x: 400, y: 80, width: 320, height: 240 };
      expect(layout.panels.counter.placement).toEqual({ kind: 'floating', rect: floating });
      expect(layout.panels.increment.placement).toEqual({ kind: 'floating', rect: floating });
    });

    it('rejects an inconsistent version 1 link', () => {
      const clash = 'v1_counter~d~left~0~n_increment~d~left~0~n_decrement~d~bottom~0~n';
      const twoInBottomSlot = 'v1_counter~d~bottom~0~n_increment~d~bottom~0~n_decrement~d~left~0~n';

      expect(decodeLayout(clash)).toEqual(defaultLayout());
      expect(decodeLayout(twoInBottomSlot)).toEqual(defaultLayout());
    });
  });

  describe('falls back to the default layout without throwing', () => {
    const valid = encodeLayout(mixedLayout());
    const cases: [string, unknown][] = [
      ['missing', undefined],
      ['not a string', { layout: 1 }],
      ['a number', 42],
      ['empty', ''],
      ['garbage', '%%%not-a-layout'],
      ['unknown version', valid.replace(/^v2/, 'v3')],
      ['no version', valid.replace(/^v2_/, '')],
      ['a missing panel', 'v2_counter~d~left~0~0~n_increment~d~left~0~1~n'],
      ['a duplicate panel', 'v2_counter~d~left~0~0~n_counter~d~left~0~1~n_decrement~d~right~0~0~n'],
      ['an unknown panel id', 'v2_counter~d~left~0~0~n_increment~d~left~0~1~n_map~d~right~0~0~n'],
      [
        'the removed bottom side',
        'v2_counter~d~bottom~0~0~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'an out-of-range slot',
        'v2_counter~d~left~0~2~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'a non-numeric column',
        'v2_counter~d~left~a~0~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'a negative column',
        'v2_counter~d~left~-1~0~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'two panels in one slot',
        'v2_counter~d~left~0~0~n_increment~d~left~0~0~n_decrement~d~right~0~0~n',
      ],
      [
        'three panels in one column',
        'v2_counter~d~left~0~0~n_increment~d~left~0~1~n_decrement~d~left~0~1~n',
      ],
      [
        'a gap between columns',
        'v2_counter~d~left~0~0~n_increment~d~left~2~0~n_decrement~d~right~0~0~n',
      ],
      [
        'a column that does not start at the edge',
        'v2_counter~d~left~1~0~n_increment~d~right~0~0~n_decrement~f~10~50~200~120~n',
      ],
      [
        'a lone panel in the bottom slot',
        'v2_counter~d~left~0~1~n_increment~d~right~0~0~n_decrement~f~10~50~200~120~n',
      ],
      [
        'an unknown placement kind',
        'v2_counter~x~left~0~0~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'a non-numeric coordinate',
        'v2_counter~f~a~0~320~240~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'a panel below the minimum size',
        'v2_counter~f~0~0~100~240~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      [
        'a coordinate far off screen',
        'v2_counter~f~9999999~0~320~240~n_increment~d~left~0~1~n_decrement~d~right~0~0~n',
      ],
      ['a truncated rect', 'v2_counter~f~0~0~320~n_increment~d~left~0~1~n_decrement~d~right~0~0~n'],
      ['extra fields', 'v2_counter~d~left~0~0~n~n_increment~d~left~0~1~n_decrement~d~right~0~0~n'],
      ['a truncated link', valid.slice(0, valid.length - 5)],
    ];

    it.each(cases)('%s', (_name, input) => {
      expect(decodeLayout(input)).toEqual(defaultLayout());
    });
  });
});
