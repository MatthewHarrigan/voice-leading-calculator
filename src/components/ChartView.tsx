import { Fragment } from 'react';
import { inversionName } from '@/music/voicing';
import type { IRealChart, IRealMeasure } from '@/music/ireal/types';

interface ChartViewProps {
  chart: IRealChart;
  selectedChordId: string | null;
  selectedMeasureId: string | null;
  insertionMeasureId: string | null;
  barsPerRow?: number;
  onSelectChord: (id: string) => void;
  onSelectMeasure: (id: string) => void;
}

const ROMAN = ['', '1', '2', '3', '4'];

function measureClasses(m: IRealMeasure, selected: boolean, insertion: boolean): string {
  return [
    'chart-measure',
    m.open ? `open-${m.open}` : '',
    m.close ? `close-${m.close}` : '',
    selected ? 'measure-selected' : '',
    insertion ? 'measure-insertion' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** A lead-sheet rendering of the chart: rows of bars with iReal-style notation. */
export function ChartView({
  chart,
  selectedChordId,
  selectedMeasureId,
  insertionMeasureId,
  barsPerRow = 4,
  onSelectChord,
  onSelectMeasure,
}: ChartViewProps) {
  const rows: IRealMeasure[][] = [];
  for (let i = 0; i < chart.measures.length; i += barsPerRow) {
    rows.push(chart.measures.slice(i, i + barsPerRow));
  }

  return (
    <div className="chart-view" aria-label="Chord chart">
      {rows.map((row, ri) => (
        <div className="chart-row" key={ri}>
          {row.map((m) => {
            const selected = m.id === selectedMeasureId;
            const insertion = m.id === insertionMeasureId;
            return (
              <div
                key={m.id}
                className={measureClasses(m, selected, insertion)}
                data-measure-id={m.id}
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
                        className={`sequence-chord${c.id === selectedChordId ? ' selected' : ''}${
                          c.small ? ' small' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChord(c.id);
                        }}
                      >
                        <span className="sc-symbol">
                          {c.symbol}
                          {c.bass ? <span className="sc-bass">/{c.bass}</span> : null}
                        </span>
                        {c.alternate && <span className="sc-alt">({c.alternate.root}{c.alternate.quality})</span>}
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

                {(m.staffText || m.directive) && (
                  <div className="measure-text">{m.directive ?? m.staffText}</div>
                )}
              </div>
            );
          })}
          {/* Pad short rows so bars keep a steady width. */}
          {row.length < barsPerRow &&
            Array.from({ length: barsPerRow - row.length }, (_, k) => (
              <div className="chart-measure chart-measure-pad" key={`pad-${k}`} aria-hidden />
            ))}
        </div>
      ))}
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
