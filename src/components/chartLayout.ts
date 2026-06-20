// Layout maths for the iReal Pro 16-cell grid, shared by the chart view and the
// mirrored diagram grid. Kept out of the component files so fast-refresh stays
// happy (component modules should only export components).

import type { IRealChart } from '@/music/ireal/types';

export const CELLS_PER_ROW = 16;

export interface Placement {
  row: number;
  col: number;
  span: number;
}

/**
 * Lay measures out on iReal Pro's 16-cell grid: when the chart carries imported
 * cell positions we honour them exactly (so 4 bars fall per line and 2nd-time
 * bars align under 1st-time bars); otherwise we pack bars left-to-right.
 */
export function computeLayout(chart: IRealChart): Placement[] {
  const ms = chart.measures;
  const hasGrid = ms.length > 0 && ms.every((m) => typeof m.cell === 'number' && typeof m.cells === 'number');
  if (hasGrid) {
    return ms.map((m) => {
      const start = m.cell!;
      const col = start % CELLS_PER_ROW;
      const span = Math.min(Math.max(1, m.cells!), CELLS_PER_ROW - col);
      return { row: Math.floor(start / CELLS_PER_ROW), col, span };
    });
  }
  const out: Placement[] = [];
  let row = 0;
  let col = 0;
  for (const m of ms) {
    const span = Math.min(Math.max(1, m.cells ?? (m.timeSig ?? chart.timeSignature)[0]), CELLS_PER_ROW);
    if (col + span > CELLS_PER_ROW) {
      row += 1;
      col = 0;
    }
    out.push({ row, col, span });
    col += span;
    if (col >= CELLS_PER_ROW) {
      row += 1;
      col = 0;
    }
  }
  return out;
}
