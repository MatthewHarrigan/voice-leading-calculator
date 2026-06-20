import { Fragment, type CSSProperties } from 'react';
import { inversionName } from '@/music/voicing';
import type { IRealChart, IRealMeasure } from '@/music/ireal/types';

interface ChartViewProps {
  chart: IRealChart;
  selectedChordId: string | null;
  selectedMeasureId: string | null;
  insertionMeasureId: string | null;
  playingMeasureId?: string | null;
  onSelectChord: (id: string) => void;
  onSelectMeasure: (id: string) => void;
}

const ROMAN = ['', '1', '2', '3', '4'];
const CELLS_PER_ROW = 16;

interface Placement {
  row: number;
  col: number;
  span: number;
}

/**
 * Lay measures out on iReal Pro's 16-cell grid: when the chart carries imported
 * cell positions we honour them exactly (so 4 bars fall per line and 2nd-time
 * bars align under 1st-time bars); otherwise we pack bars left-to-right.
 */
function computeLayout(chart: IRealChart): Placement[] {
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

function measureClasses(m: IRealMeasure, selected: boolean, insertion: boolean, playing: boolean): string {
  return [
    'chart-measure',
    m.open ? `open-${m.open}` : '',
    m.close ? `close-${m.close}` : '',
    selected ? 'measure-selected' : '',
    insertion ? 'measure-insertion' : '',
    playing ? 'measure-playing' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** A lead-sheet rendering of the chart on iReal Pro's 16-cell layout grid. */
export function ChartView({
  chart,
  selectedChordId,
  selectedMeasureId,
  insertionMeasureId,
  playingMeasureId,
  onSelectChord,
  onSelectMeasure,
}: ChartViewProps) {
  const layout = computeLayout(chart);

  return (
    <div className="chart-view" aria-label="Chord chart">
      {chart.measures.map((m, i) => {
        const place = layout[i];
        const style: CSSProperties = {
          gridColumn: `${place.col + 1} / span ${place.span}`,
          gridRow: place.row + 1,
        };
        const selected = m.id === selectedMeasureId;
        const insertion = m.id === insertionMeasureId;
        const playing = !!playingMeasureId && m.id === playingMeasureId;
        return (
          <div
            key={m.id}
            className={measureClasses(m, selected, insertion, playing)}
            data-measure-id={m.id}
            style={style}
            onClick={() => onSelectMeasure(m.id)}
          >
            <div className="measure-marks">
              {m.section && <span className="section-mark">{m.section}</span>}
              {m.timeSig && (
                <span className="time-sig">
                  {m.timeSig[0]}/{m.timeSig[1]}
                </span>
              )}
              {m.ending != null && <span className="ending-mark">{ROMAN[m.ending] ?? m.ending}.</span>}
              {m.segno && <span className="nav-mark" title="Segno">𝄋</span>}
              {m.coda && <span className="nav-mark" title="Coda">𝄌</span>}
              {m.fermata && <span className="nav-mark" title="Fermata">𝄐</span>}
            </div>

            <div className="measure-cells">
              {m.barRepeat ? (
                <span className="bar-repeat" title={`${m.barRepeat}-bar repeat`}>
                  {m.barRepeat === 2 ? '⁄⁄' : '%'}
                </span>
              ) : m.chords.length === 0 ? (
                <span className="measure-empty">+</span>
              ) : (
                m.chords.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`sequence-chord${c.id === selectedChordId ? ' selected' : ''}${c.small ? ' small' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectChord(c.id);
                    }}
                  >
                    <span className="sc-symbol">
                      {c.symbol}
                      {c.bass ? <span className="sc-bass">/{c.bass}</span> : null}
                    </span>
                    {c.alternate && (
                      <span className="sc-alt">
                        ({c.alternate.root}
                        {c.alternate.quality})
                      </span>
                    )}
                    {c.targetTopNote && <span className="sc-lead">lead {c.targetTopNote}</span>}
                    {Number.isInteger(c.preferredInversion) && (
                      <span className="sc-meta">
                        {inversionName(c.preferredInversion!).replace(' Inversion', '')} locked
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {(m.staffText || m.directive) && <div className="measure-text">{m.directive ?? m.staffText}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Compact, non-interactive chart summary (e.g. for previews). */
export function ChartSummary({ chart }: { chart: IRealChart }) {
  return (
    <span className="chart-summary">
      {chart.measures.map((m, i) => (
        <Fragment key={m.id}>
          {i > 0 && ' | '}
          {m.barRepeat ? '%' : m.chords.map((c) => c.symbol).join(' ') || '—'}
        </Fragment>
      ))}
    </span>
  );
}
