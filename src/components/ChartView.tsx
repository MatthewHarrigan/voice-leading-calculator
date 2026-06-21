import { Fragment, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { inversionName } from '@/music/voicing';
import { prettyChordSymbol } from '@/music/ireal/chordParser';
import type { IRealChart, IRealMeasure } from '@/music/ireal/types';
import { computeLayout, structuralClasses, type Placement } from './chartLayout';
import {
  BarRepeatSign,
  ChordSymbol,
  EndingBracket,
  MeasureMarks,
  RepeatDots,
  TimeSig,
} from './chartChrome';

interface ChartGridProps {
  chart: IRealChart;
  /** Grid container class (`chart-view lead-sheet` or the diagram grid). */
  gridClassName: string;
  /** Per-measure base class (`chart-measure` or `optimized-measure`). */
  measureBaseClassName: string;
  selectedMeasureId?: string | null;
  insertionMeasureId?: string | null;
  playingMeasureId?: string | null;
  onSelectMeasure?: (id: string) => void;
  ariaLabel?: string;
  /** Render the bar's content (chords or diagrams); not called for repeat bars. */
  renderBody: (m: IRealMeasure, place: Placement) => ReactNode;
}

/**
 * The shared 16-cell lead-sheet grid. It draws all the structural chrome —
 * barlines, section marks, endings, repeat signs, time signatures, simile bars
 * and staff text — so the chord score and the guitar-diagram view are laid out
 * identically. Only the per-bar body (chords vs. diagrams) differs.
 */
export function ChartGrid({
  chart,
  gridClassName,
  measureBaseClassName,
  selectedMeasureId,
  insertionMeasureId,
  playingMeasureId,
  onSelectMeasure,
  ariaLabel,
  renderBody,
}: ChartGridProps) {
  const layout = computeLayout(chart);
  return (
    <div className={gridClassName} aria-label={ariaLabel}>
      {chart.measures.map((m, i) => {
        const place = layout[i];
        const style: CSSProperties = {
          gridColumn: `${place.col + 1} / span ${place.span}`,
          gridRow: place.row + 1,
        };
        const playing = !!playingMeasureId && m.id === playingMeasureId;
        // The leading time signature sits in the left gutter, outside the first
        // bar (iReal style); a mid-tune change still renders inside its bar.
        const leadingTimeSig = i === 0 && m.timeSig;
        const cls = [
          measureBaseClassName,
          'barred',
          structuralClasses(m, place),
          // Both the volta and the section letter float in the lane above the
          // bar; when a bar has both, shift the section letter clear of the
          // volta number.
          m.ending != null ? 'has-ending' : '',
          m.id === selectedMeasureId ? 'measure-selected' : '',
          m.id === insertionMeasureId ? 'measure-insertion' : '',
          playing ? 'measure-playing' : '',
        ]
          .filter(Boolean)
          .join(' ');
        // When the bar is selectable, make it keyboard-operable like a button.
        const interactive = onSelectMeasure
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-label': `Bar ${i + 1}${
                m.chords.length ? `: ${m.chords.map((c) => c.symbol).join(', ')}` : ' (empty)'
              }`,
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectMeasure(m.id);
                }
              },
            }
          : {};
        return (
          <div
            key={m.id}
            className={cls}
            data-measure-id={m.id}
            style={style}
            aria-current={playing ? 'location' : undefined}
            onClick={onSelectMeasure ? () => onSelectMeasure(m.id) : undefined}
            {...interactive}
          >
            {m.ending != null && <EndingBracket ending={m.ending} />}
            {leadingTimeSig && (
              <span className="time-sig-leading">
                <TimeSig sig={m.timeSig!} />
              </span>
            )}
            {m.open === 'repeat' && <RepeatDots side="open" />}
            {m.close === 'repeat' && <RepeatDots side="close" />}
            <MeasureMarks measure={m} />
            <div className="measure-cells">
              {m.timeSig && !leadingTimeSig && <TimeSig sig={m.timeSig} />}
              {m.barRepeat ? <BarRepeatSign n={m.barRepeat} /> : renderBody(m, place)}
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

interface ChartViewProps {
  chart: IRealChart;
  selectedChordId: string | null;
  selectedMeasureId: string | null;
  insertionMeasureId: string | null;
  playingMeasureId?: string | null;
  onSelectChord: (id: string) => void;
  onSelectMeasure: (id: string) => void;
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
  return (
    <ChartGrid
      chart={chart}
      gridClassName="chart-view lead-sheet"
      measureBaseClassName="chart-measure"
      ariaLabel="Chord chart"
      selectedMeasureId={selectedMeasureId}
      insertionMeasureId={insertionMeasureId}
      playingMeasureId={playingMeasureId}
      onSelectMeasure={onSelectMeasure}
      renderBody={(m) =>
        m.chords.length === 0 ? (
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
              {c.alternate && (
                <ChordSymbol className="sc-alt" symbol={prettyChordSymbol(c.alternate)} />
              )}
              <ChordSymbol className="sc-symbol" symbol={c.symbol} />
              {c.targetTopNote && <span className="sc-lead">lead {c.targetTopNote}</span>}
              {Number.isInteger(c.preferredInversion) && (
                <span className="sc-meta">
                  {inversionName(c.preferredInversion!).replace(' Inversion', '')} locked
                </span>
              )}
            </button>
          ))
        )
      }
    />
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
