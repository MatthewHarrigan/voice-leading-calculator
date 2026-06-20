// Layout maths for the iReal Pro 16-cell grid, shared by the chart view and the
// mirrored diagram grid. Kept out of the component files so fast-refresh stays
// happy (component modules should only export components).

import type { IRealChart, IRealMeasure } from '@/music/ireal/types';

export const CELLS_PER_ROW = 16;

export interface Placement {
  row: number;
  col: number;
  span: number;
  /** First measure on its row (gets a left barline). */
  rowStart: boolean;
  /** Last measure on its row (gets a closing barline on the right). */
  rowEnd: boolean;
}

/**
 * Lay measures out on iReal Pro's 16-cell grid: when the chart carries imported
 * cell positions we honour them exactly (so 4 bars fall per line and 2nd-time
 * bars align under 1st-time bars); otherwise we pack bars left-to-right.
 *
 * The grid is re-based at every section/rehearsal mark: like iReal Pro, a new
 * section begins a fresh line flush at the left margin, and cells are measured
 * relative to that section's start. This keeps endings aligned within a section
 * (via the imported padding) while preventing a wide bar's cell drift from
 * indenting later sections (e.g. a 2-chord-with-alternate bar in Stella).
 */
export function computeLayout(chart: IRealChart): Placement[] {
  const ms = chart.measures;
  const hasGrid = ms.length > 0 && ms.every((m) => typeof m.cell === 'number' && typeof m.cells === 'number');

  const base: { row: number; col: number; span: number }[] = [];
  if (hasGrid) {
    let sectionBaseCell = 0;
    let sectionBaseRow = 0;
    let prevRow = 0;
    ms.forEach((m, idx) => {
      // A section mark after the first bar starts a new line, re-based here.
      if (idx > 0 && m.section != null) {
        sectionBaseCell = m.cell!;
        sectionBaseRow = prevRow + 1;
      }
      const rel = m.cell! - sectionBaseCell;
      const col = ((rel % CELLS_PER_ROW) + CELLS_PER_ROW) % CELLS_PER_ROW;
      const row = sectionBaseRow + Math.floor(rel / CELLS_PER_ROW);
      const span = Math.min(Math.max(1, m.cells!), CELLS_PER_ROW - col);
      base.push({ row, col, span });
      prevRow = row;
    });
  } else {
    let row = 0;
    let col = 0;
    for (const m of ms) {
      const span = Math.min(Math.max(1, m.cells ?? (m.timeSig ?? chart.timeSignature)[0]), CELLS_PER_ROW);
      if (col + span > CELLS_PER_ROW) {
        row += 1;
        col = 0;
      }
      base.push({ row, col, span });
      col += span;
      if (col >= CELLS_PER_ROW) {
        row += 1;
        col = 0;
      }
    }
  }

  // Mark the first and last measure of each row so the lead-sheet renderer can
  // draw a left barline at the start and a closing barline at the end of a line.
  return base.map((p, i) => ({
    ...p,
    rowStart: p.col === 0 || i === 0 || base[i - 1].row !== p.row,
    rowEnd: i === base.length - 1 || base[i + 1].row !== p.row,
  }));
}

/** Structural (barline + row-edge) CSS classes for a measure, shared by views. */
export function structuralClasses(m: IRealMeasure, place: Placement): string {
  return [
    m.open ? `open-${m.open}` : '',
    m.close ? `close-${m.close}` : '',
    place.rowStart ? 'row-start' : '',
    place.rowEnd ? 'row-end' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
