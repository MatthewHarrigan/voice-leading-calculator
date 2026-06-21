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
    expect(layout[0]).toEqual({ row: 0, col: 0, span: 4, rowStart: true, rowEnd: false });
    expect(layout[2]).toEqual({ row: 0, col: 8, span: 4, rowStart: false, rowEnd: true });
    expect(layout[3]).toEqual({ row: 2, col: 8, span: 4, rowStart: true, rowEnd: true });
  });

  test('re-bases the grid at each section so a wide bar cannot indent later sections', () => {
    // Mirrors the real Stella: a 5-cell bar in section A drifts the cumulative
    // cell count by one, but section B must still begin flush-left on a new row.
    const c = chart([
      bar({ section: 'A', cell: 0, cells: 4 }),
      bar({ cell: 4, cells: 4 }),
      bar({ cell: 8, cells: 5 }), // wide bar (e.g. two chords + an alternate)
      bar({ cell: 13, cells: 3 }),
      bar({ section: 'B', cell: 16, cells: 4 }), // would be col 0 already…
      bar({ section: 'C', cell: 65, cells: 4 }), // …but this one drifted to col 1
    ]);
    const layout = computeLayout(c);
    expect(layout[2]).toMatchObject({ row: 0, col: 8, span: 4 }); // wide bar clamped to its slot
    expect(layout[3]).toMatchObject({ row: 0, col: 12 }); // next bar stays on the grid
    expect(layout[4]).toMatchObject({ row: 1, col: 0 }); // section B flush-left, new row
    expect(layout[5]).toMatchObject({ row: 2, col: 0 }); // section C flush-left despite drift
  });

  test('packs left-to-right when no cell metadata is present (manual chart)', () => {
    const c = chart(Array.from({ length: 6 }, () => bar()));
    const layout = computeLayout(c);
    // 4/4 bars => 4 per 16-cell row.
    expect(layout[0]).toEqual({ row: 0, col: 0, span: 4, rowStart: true, rowEnd: false });
    expect(layout[3]).toEqual({ row: 0, col: 12, span: 4, rowStart: false, rowEnd: true });
    expect(layout[4]).toEqual({ row: 1, col: 0, span: 4, rowStart: true, rowEnd: false });
  });

  test('falls back to packing if any measure is missing cell metadata', () => {
    const c = chart([bar({ cell: 0, cells: 4 }), bar(), bar({ cell: 8, cells: 4 })]);
    const layout = computeLayout(c);
    expect(layout[0]).toEqual({ row: 0, col: 0, span: 4, rowStart: true, rowEnd: false });
    expect(layout[1]).toEqual({ row: 0, col: 4, span: 4, rowStart: false, rowEnd: false });
    expect(layout[2]).toEqual({ row: 0, col: 8, span: 4, rowStart: false, rowEnd: true });
  });

  test('snaps an off-grid imported measure to the nearest four-cell bar slot', () => {
    const c = chart([bar({ cell: 14, cells: 4 })]);
    // cell 14 rounds to the last slot (col 12) rather than rendering inset at 14.
    expect(computeLayout(c)[0]).toEqual({ row: 0, col: 12, span: 4, rowStart: true, rowEnd: true });
  });

  test('marks the first and last bar of each row for barline drawing', () => {
    const c = chart(Array.from({ length: 5 }, () => bar()));
    const layout = computeLayout(c);
    // Row 0 spans bars 0–3; bar 4 starts row 1.
    expect(layout[0].rowStart).toBe(true);
    expect(layout[3].rowEnd).toBe(true);
    expect(layout[4].rowStart).toBe(true);
    expect(layout[4].rowEnd).toBe(true); // last bar overall
  });
});
