import { describe, expect, it } from 'vitest';
import { defaultLayout } from './layout';
import type { Layout } from './types';
import { decodeLayout, encodeLayout } from './urlCodec';

/** Counter docked top-left, decrement docked bottom-right, increment floating; counter in front. */
function mixedLayout(): Layout {
  return {
    panels: {
      counter: {
        id: 'counter',
        placement: { kind: 'docked', zone: 'left', slot: 0 },
        lastFloatingRect: { x: 400, y: 80, width: 320, height: 240 },
      },
      increment: {
        id: 'increment',
        placement: { kind: 'floating', rect: { x: -12.5, y: 300.25, width: 410, height: 205 } },
        lastFloatingRect: { x: -12.5, y: 300.25, width: 410, height: 205 },
      },
      decrement: {
        id: 'decrement',
        placement: { kind: 'docked', zone: 'bottom', slot: 1 },
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
      'v1' +
        '_increment~f~-12.5~300.25~410~205~-12.5~300.25~410~205' +
        '_decrement~d~bottom~1~n' +
        '_counter~d~left~0~400~80~320~240',
    );
    expect(encodeURIComponent(text)).toBe(text);
  });

  it('reads a hand-written version 1 string', () => {
    const layout = decodeLayout(
      'v1_counter~d~right~1~n_decrement~f~10~50~200~120~10~50~200~120_increment~d~right~0~n',
    );

    expect(layout.zOrder).toEqual(['counter', 'decrement', 'increment']);
    expect(layout.panels.counter.placement).toEqual({ kind: 'docked', zone: 'right', slot: 1 });
    expect(layout.panels.decrement.placement).toEqual({
      kind: 'floating',
      rect: { x: 10, y: 50, width: 200, height: 120 },
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
      ['unknown version', valid.replace(/^v1/, 'v2')],
      ['no version', valid.replace(/^v1_/, '')],
      ['a missing panel', 'v1_counter~d~left~0~n_increment~d~left~1~n'],
      ['a duplicate panel', 'v1_counter~d~left~0~n_counter~d~left~1~n_decrement~d~right~0~n'],
      ['an unknown panel id', 'v1_counter~d~left~0~n_increment~d~left~1~n_map~d~right~0~n'],
      ['an unknown zone', 'v1_counter~d~top~0~n_increment~d~left~1~n_decrement~d~right~0~n'],
      ['an out-of-range slot', 'v1_counter~d~left~2~n_increment~d~left~1~n_decrement~d~right~0~n'],
      [
        'two panels in one slot',
        'v1_counter~d~left~0~n_increment~d~left~0~n_decrement~d~right~0~n',
      ],
      [
        'an unknown placement kind',
        'v1_counter~x~left~0~n_increment~d~left~1~n_decrement~d~right~0~n',
      ],
      [
        'a non-numeric coordinate',
        'v1_counter~f~a~0~320~240~n_increment~d~left~1~n_decrement~d~right~0~n',
      ],
      [
        'a panel below the minimum size',
        'v1_counter~f~0~0~100~240~n_increment~d~left~1~n_decrement~d~right~0~n',
      ],
      [
        'a coordinate far off screen',
        'v1_counter~f~9999999~0~320~240~n_increment~d~left~1~n_decrement~d~right~0~n',
      ],
      ['a truncated rect', 'v1_counter~f~0~0~320~n_increment~d~left~1~n_decrement~d~right~0~n'],
      ['extra fields', 'v1_counter~d~left~0~n~n_increment~d~left~1~n_decrement~d~right~0~n'],
      ['a truncated link', valid.slice(0, valid.length - 5)],
    ];

    it.each(cases)('%s', (_name, input) => {
      expect(decodeLayout(input)).toEqual(defaultLayout());
    });
  });
});
