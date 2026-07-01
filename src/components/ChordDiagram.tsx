// Renders a drop-2 voicing as a clean fretboard diagram (Ted Green style).
// Pure presentational SVG: 6 strings, the four active strings carry notes,
// the root is a filled circle, other tones are hollow, with chord-tone labels
// beneath and an optional lead-note label.

import { useMemo } from 'react';
import { chordToneName } from '@/music/chords';
import { pitchClassOf } from '@/music/notes';
import { activeStrings, noteAtFret, pitchClassAtFret, type StringSet } from '@/music/tuning';
import { hasFlatNineAvoidInterval, type Fingering } from '@/music/voicing';

const W = 200;
const BASE_H = 240;
const MARGIN = { top: 35, bottom: 20, left: 25, right: 25 };
const NUM_FRETS = 5;

export interface ChordDiagramProps {
  fingering: Fingering;
  rootDisplay: string;
  stringSet: StringSet;
  title?: string;
  subtitle?: string;
  /** Show the chord title inside the SVG (off when a header sits above it). */
  showTitle?: boolean;
  leadNote?: string | null;
  showIntervals?: boolean;
  highlightAvoid?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ChordDiagram({
  fingering,
  rootDisplay,
  stringSet,
  title,
  subtitle,
  showTitle = true,
  leadNote,
  showIntervals = true,
  highlightAvoid = false,
  className,
  ariaLabel,
}: ChordDiagramProps) {
  const model = useMemo(() => {
    const strings = activeStrings(stringSet);
    const used = strings
      .map((s) => fingering.frets[s])
      .filter((f): f is number => f !== null && f !== undefined && f > 0);
    const minFret = used.length > 0 ? Math.max(0, Math.min(...used) - 1) : 0;
    const height = BASE_H + (leadNote ? 14 : 0);
    const fretboardW = W - MARGIN.left - MARGIN.right;
    const fretboardH = BASE_H - MARGIN.top - MARGIN.bottom;
    const stringSpacing = fretboardW / 5;
    const fretSpacing = fretboardH / NUM_FRETS;
    const rootPc = pitchClassOf(rootDisplay);

    const notes = strings.map((stringIdx) => {
      const fret = fingering.frets[stringIdx];
      if (fret === null || fret === undefined) return null;
      const x = MARGIN.left + stringIdx * stringSpacing;
      const y =
        fret === 0 ? MARGIN.top - 12 : MARGIN.top + (fret - minFret - 0.5) * fretSpacing;
      return {
        stringIdx,
        x,
        y,
        isRoot: pitchClassAtFret(stringIdx, fret) === rootPc,
        note: noteAtFret(stringIdx, fret),
        interval: chordToneName(pitchClassAtFret(stringIdx, fret), rootPc),
      };
    });

    const hasOpen = strings.some((s) => fingering.frets[s] === 0);
    return { strings, minFret, height, hasOpen, fretboardW, fretboardH, stringSpacing, fretSpacing, notes };
  }, [fingering, rootDisplay, stringSet, leadNote]);

  const avoid = highlightAvoid && hasFlatNineAvoidInterval(fingering, stringSet);
  const { minFret, height, hasOpen, fretboardW, fretboardH, stringSpacing, fretSpacing, notes, strings } = model;
  // When the title is rendered above the SVG (guitar sheet), the reserved title
  // band at the top is dead space that reads as a gap before the fretboard. Crop
  // it from the viewBox — but keep headroom for open-string markers (at top-12)
  // when the voicing has any.
  const topCrop = showTitle ? 0 : hasOpen ? 13 : 28;

  return (
    <svg
      className={`chord-diagram${avoid ? ' is-avoid' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`0 ${topCrop} ${W} ${height - topCrop}`}
      role="img"
      aria-label={ariaLabel ?? title ?? 'chord diagram'}
      preserveAspectRatio="xMidYMid meet"
    >
      {showTitle && title && (
        <text x={W / 2} y={15} className="cd-title">
          {title}
          {subtitle ? ` ${subtitle}` : ''}
        </text>
      )}

      {/* Strings (vertical) */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = MARGIN.left + i * stringSpacing;
        return (
          <line key={`s${i}`} x1={x} y1={MARGIN.top} x2={x} y2={MARGIN.top + fretboardH} className="cd-string" />
        );
      })}

      {/* Frets (horizontal) */}
      {Array.from({ length: NUM_FRETS + 1 }, (_, i) => {
        const y = MARGIN.top + i * fretSpacing;
        const isNut = i === 0 && minFret === 0;
        return (
          <line
            key={`f${i}`}
            x1={MARGIN.left}
            y1={y}
            x2={MARGIN.left + fretboardW}
            y2={y}
            className={isNut ? 'cd-nut' : 'cd-fret'}
          />
        );
      })}

      {/* Starting fret label, centred in the left gutter and on the first
          fret row (the CSS centres the glyph on this y). A two-digit number
          at the enlarged size needs the gutter's full width to avoid the
          viewBox clipping it. */}
      {minFret > 0 && (
        <text x={MARGIN.left / 2} y={MARGIN.top + fretSpacing * 0.5} className="cd-fret-label">
          {minFret + 1}
        </text>
      )}

      {/* Note markers */}
      {notes.map((note, i) =>
        note ? (
          <circle
            key={`n${i}`}
            cx={note.x}
            cy={note.y}
            r={10}
            className={note.isRoot ? 'cd-note cd-note-root' : 'cd-note'}
          />
        ) : null,
      )}

      {/* Interval labels */}
      {showIntervals &&
        notes.map((note, i) =>
          note ? (
            <text
              key={`i${i}`}
              x={MARGIN.left + note.stringIdx * stringSpacing}
              y={MARGIN.top + fretboardH + 15}
              className="cd-interval"
            >
              {note.interval}
            </text>
          ) : null,
        )}

      {/* Lead-note label under the top string */}
      {leadNote && (
        <text
          x={MARGIN.left + strings[strings.length - 1] * stringSpacing}
          y={MARGIN.top + fretboardH + 31}
          className="cd-lead"
        >
          {leadNote}
        </text>
      )}
    </svg>
  );
}
