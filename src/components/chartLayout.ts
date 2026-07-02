// Layout maths for the iReal Pro 16-cell grid, shared by the chart view and the
// mirrored diagram grid. Kept out of the component files so fast-refresh stays
// happy (component modules should only export components).

import type { IRealChart, IRealMeasure } from '@/music/ireal/types';

export const CELLS_PER_ROW = 16;
/** Cells allotted to one bar (iReal packs four bars per 16-cell row). */
export const BAR_CELLS = 4;

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
    // iReal lays four four-cell bars per 16-cell row. We honour the imported
    // grid for row breaks and ending alignment, but a single bar can carry extra
    // cells (e.g. two chords plus an alternate). Snap each bar to the four-cell
    // bar grid so one wide bar can't knock the rest of its row — or later rows —
    // out of the 0/4/8/12 columns; spans then tile up to the next bar.
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
      const row = sectionBaseRow + Math.floor(rel / CELLS_PER_ROW);
      const rawCol = ((rel % CELLS_PER_ROW) + CELLS_PER_ROW) % CELLS_PER_ROW;
      let col = Math.min(Math.round(rawCol / BAR_CELLS) * BAR_CELLS, CELLS_PER_ROW - BAR_CELLS);
      // Keep bars on the same row strictly left-to-right.
      const prev = base[idx - 1];
      if (idx > 0 && prev.row === row && col <= prev.col) {
        col = Math.min(prev.col + BAR_CELLS, CELLS_PER_ROW - BAR_CELLS);
      }
      base.push({ row, col, span: Math.max(1, m.cells!) });
      prevRow = row;
    });
    // Span: fill up to the next bar on the row (or the row end), but never wider
    // than the bar's own cell count.
    base.forEach((p, idx) => {
      const next = base[idx + 1];
      const limit = next && next.row === p.row ? next.col : CELLS_PER_ROW;
      p.span = Math.max(1, Math.min(p.span, limit - p.col));
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

/**
 * Re-flow a 16-cell layout as two-bar lines for narrow screens: each authored
 * row splits into two display rows of 8 cells, and columns/spans double so the
 * same 16-column CSS grid renders both densities. Row-edge flags (which drive
 * the drawn barlines) are recomputed for the new line breaks.
 */
export function splitLayoutInHalf(layout: Placement[]): Placement[] {
  const half = CELLS_PER_ROW / 2;
  const out = layout.map((p) => {
    const second = p.col >= half ? 1 : 0;
    const relCol = p.col - second * half;
    const span = Math.max(1, Math.min(p.span, half - relCol));
    return { ...p, row: p.row * 2 + second, col: relCol * 2, span: span * 2 };
  });
  return out.map((p, i) => ({
    ...p,
    rowStart: p.col === 0 || i === 0 || out[i - 1].row !== p.row,
    rowEnd: i === out.length - 1 || out[i + 1].row !== p.row,
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
