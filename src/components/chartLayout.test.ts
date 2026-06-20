import { describe, expect, test } from 'vitest';
import { computeLayout } from './chartLayout';
import type { IRealChart, IRealMeasure } from '@/music/ireal/types';

function chart(measures: IRealMeasure[]): IRealChart {
  return { title: 't', timeSignature: [4, 4], measures };
}
let n = 0;
const bar = (over: Partial<IRealMeasure> = {}): IRealMeasure => ({ id: `m${n++}`, chords: [], ...over });

describe('computeLayout', () => {
  test('honours imported absolute cell positions (4 bars/row, ending alignment)', () => {
    const c = chart([
      bar({ cell: 0, cells: 4 }),
      bar({ cell: 4, cells: 4 }),
      bar({ cell: 8, cells: 4 }), // 1st-ending column
      bar({ cell: 40, cells: 4 }), // 2nd ending, pushed under the 1st (col 8, row 2)
    ]);
    const layout = computeLayout(c);
    expect(layout[0]).toEqual({ row: 0, col: 0, span: 4 });
    expect(layout[2]).toEqual({ row: 0, col: 8, span: 4 });
    expect(layout[3]).toEqual({ row: 2, col: 8, span: 4 });
  });

  test('packs left-to-right when no cell metadata is present (manual chart)', () => {
    const c = chart(Array.from({ length: 6 }, () => bar()));
    const layout = computeLayout(c);
    // 4/4 bars => 4 per 16-cell row.
    expect(layout[0]).toEqual({ row: 0, col: 0, span: 4 });
    expect(layout[3]).toEqual({ row: 0, col: 12, span: 4 });
    expect(layout[4]).toEqual({ row: 1, col: 0, span: 4 });
  });

  test('falls back to packing if any measure is missing cell metadata', () => {
    const c = chart([bar({ cell: 0, cells: 4 }), bar(), bar({ cell: 8, cells: 4 })]);
    const layout = computeLayout(c);
    expect(layout[0]).toEqual({ row: 0, col: 0, span: 4 });
    expect(layout[1]).toEqual({ row: 0, col: 4, span: 4 });
    expect(layout[2]).toEqual({ row: 0, col: 8, span: 4 });
  });

  test('clamps an over-wide imported measure to the row boundary', () => {
    const c = chart([bar({ cell: 14, cells: 4 })]);
    expect(computeLayout(c)[0]).toEqual({ row: 0, col: 14, span: 2 });
  });
});
