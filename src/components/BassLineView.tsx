// A lead-sheet-style readout of the generated walking bass line: one row of
// bars (four to a line, like iReal), each bar showing its beats as note name +
// Friedland analysis label (R, 5, 8, ♭7, U/chr, L/dom, sc …). This is the
// pedagogical payoff — you see *why* each note was chosen, not just hear it.

import { useMemo } from 'react';
import type { BassNote } from '@/music/walkingBass';
import { parseKey, spellNoteInKey } from '@/music/notes';

interface BassLineViewProps {
  notes: BassNote[];
  /** Flat performance-order measures (carry a stable id; repeats share an id). */
  measures: { id: string }[];
  /** Absolute start beat of each flat measure. */
  barStartBeats: number[];
  chartKey?: string;
  /** Flat bar index currently sounding, or -1. */
  playingIndex: number;
  /** Absolute in-form beat currently sounding, or -1. */
  playBeat: number;
}

const BARS_PER_ROW = 4;

export function BassLineView({
  notes,
  measures,
  barStartBeats,
  chartKey,
  playingIndex,
  playBeat,
}: BassLineViewProps) {
  const key = useMemo(() => parseKey(chartKey), [chartKey]);

  // Bucket notes into their flat bar, then keep the first appearance of each
  // measure id (later repeat passes share the id and the same line).
  const bars = useMemo(() => {
    const byBar = new Map<number, BassNote[]>();
    for (const n of notes) {
      let bar = barStartBeats.length - 1;
      for (let i = 0; i < barStartBeats.length; i++) {
        const start = barStartBeats[i];
        const end = i + 1 < barStartBeats.length ? barStartBeats[i + 1] : Infinity;
        if (n.beat >= start && n.beat < end) {
          bar = i;
          break;
        }
      }
      const list = byBar.get(bar);
      if (list) list.push(n);
      else byBar.set(bar, [n]);
    }
    const seen = new Set<string>();
    const out: { barIndex: number; id: string; notes: BassNote[] }[] = [];
    measures.forEach((m, barIndex) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      const list = (byBar.get(barIndex) ?? []).slice().sort((a, b) => a.beat - b.beat);
      out.push({ barIndex, id: m.id, notes: list });
    });
    return out;
  }, [notes, measures, barStartBeats]);

  if (bars.length === 0) return null;

  const playingId = playingIndex >= 0 ? measures[playingIndex]?.id : null;
  const playingBarStart = playingIndex >= 0 ? barStartBeats[playingIndex] : -1;
  const relBeat = playBeat >= 0 && playingBarStart >= 0 ? playBeat - playingBarStart : -1;

  // Chunk bars into rows of four.
  const rows: (typeof bars)[] = [];
  for (let i = 0; i < bars.length; i += BARS_PER_ROW) rows.push(bars.slice(i, i + BARS_PER_ROW));

  return (
    <div className="bassline-view" data-testid="bassline-view">
      <div className="bassline-title">Walking bass line</div>
      {rows.map((row, ri) => (
        <div className="bassline-row" key={ri}>
          {row.map((bar) => {
            const isPlaying = bar.id === playingId;
            return (
              <div className={`bassline-bar${isPlaying ? ' playing' : ''}`} key={bar.id}>
                {bar.notes.length === 0 ? (
                  <div className="bassline-beat empty">·</div>
                ) : (
                  bar.notes.map((n) => {
                    const offset = n.beat - barStartBeats[bar.barIndex];
                    const active =
                      isPlaying && relBeat >= offset && relBeat < offset + n.durationBeats;
                    return (
                      <div
                        className={`bassline-beat${active ? ' active' : ''}`}
                        key={n.beat}
                        style={{ flexGrow: n.durationBeats }}
                      >
                        <span className="bassline-note">{spellNoteInKey(n.midi % 12, key)}</span>
                        <span className="bassline-label">{n.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
          {/* Pad short final rows so bars keep a constant width across rows. */}
          {Array.from({ length: BARS_PER_ROW - row.length }).map((_, i) => (
            <div className="bassline-bar spacer" key={`pad-${i}`} aria-hidden />
          ))}
        </div>
      ))}
    </div>
  );
}
