import { Fragment, type CSSProperties } from 'react';
import { inversionName } from '@/music/voicing';
import { prettyChordSymbol } from '@/music/ireal/chordParser';
import type { IRealChart, IRealMeasure } from '@/music/ireal/types';
import { computeLayout } from './chartLayout';

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

// Crisp inline glyphs — the Unicode musical symbols (𝄋/𝄌/𝄐) lack font support
// in most browsers and render as broken/stacked tofu.
function CodaGlyph() {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.6" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function SegnoGlyph() {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <path
        d="M16 7c-1-3-6-3-7 0s5 3 4 6-6 3-7 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6.5" cy="7" r="1.3" fill="currentColor" />
      <circle cx="17.5" cy="17" r="1.3" fill="currentColor" />
    </svg>
  );
}
function FermataGlyph() {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" width="14" height="14" aria-hidden focusable="false">
      <path d="M4 16a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
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
            {m.open === 'repeat' && <span className="repeat-dots repeat-dots-open" aria-hidden />}
            {m.close === 'repeat' && <span className="repeat-dots repeat-dots-close" aria-hidden />}
            <div className="measure-marks">
              {m.section && <span className="section-mark">{m.section}</span>}
              {m.timeSig && (
                <span className="time-sig" title={`${m.timeSig[0]}/${m.timeSig[1]}`}>
                  <span>{m.timeSig[0]}</span>
                  <span>{m.timeSig[1]}</span>
                </span>
              )}
              {m.ending != null && <span className="ending-mark">{ROMAN[m.ending] ?? m.ending}.</span>}
              {m.segno && (
                <span className="nav-mark" title="Segno">
                  <SegnoGlyph />
                </span>
              )}
              {m.coda && (
                <span className="nav-mark" title="Coda">
                  <CodaGlyph />
                </span>
              )}
              {m.fermata && (
                <span className="nav-mark" title="Fermata">
                  <FermataGlyph />
                </span>
              )}
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
                    {c.alternate && <span className="sc-alt">{prettyChordSymbol(c.alternate)}</span>}
                    <span className="sc-symbol">
                      {c.symbol}
                      {c.bass ? <span className="sc-bass">/{c.bass}</span> : null}
                    </span>
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
              <div className={`measure-text${m.staffTextAbove && !m.directive ? ' above' : ''}`}>
                {m.directive ?? m.staffText}
              </div>
            )}
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
