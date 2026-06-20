// The optimised guitar voicings rendered on the SAME lead-sheet grid as the
// chord score, so the guitar view is laid out identically to the chart: section
// marks, barlines, repeat/simile signs and time signatures all mirror the score,
// with a chord symbol + fretboard diagram in each bar.

import { topNoteOf } from '@/music/voicing';
import type { SequenceChord } from '@/music/song';
import type { OptimizedChord } from '@/music/voiceLeading';
import type { IRealChart } from '@/music/ireal/types';
import { ChartGrid } from './ChartView';
import { ChordSymbol } from './chartChrome';
import { PlayableDiagram } from './PlayableDiagram';

type OptimizedSeqChord = OptimizedChord<SequenceChord>;

interface GuitarChartViewProps {
  chart: IRealChart;
  /** Optimised voicings for each authored measure (first pass through the form). */
  byMeasure: Map<string, OptimizedSeqChord[]>;
  playingMeasureId?: string | null;
}

/** A guitar-diagram lead sheet — the score's twin, voicings instead of symbols. */
export function GuitarChartView({ chart, byMeasure, playingMeasureId }: GuitarChartViewProps) {
  return (
    <ChartGrid
      chart={chart}
      gridClassName="optimized-grid optimized-chart-grid diagram-sheet"
      measureBaseClassName="optimized-measure"
      ariaLabel="Guitar chord diagrams"
      playingMeasureId={playingMeasureId}
      renderBody={(m) => {
        const chords = byMeasure.get(m.id);
        if (!chords || chords.length === 0) return null;
        const playing = !!playingMeasureId && m.id === playingMeasureId;
        return chords.map((c) => <DiagramCell key={c.id} chord={c} playing={playing} />);
      }}
    />
  );
}

function DiagramCell({ chord, playing }: { chord: OptimizedSeqChord; playing: boolean }) {
  const lead = topNoteOf(chord.fingering, chord.stringSet);
  return (
    <div className="diagram-cell">
      <ChordSymbol className="diagram-symbol" symbol={chord.symbol} />
      <PlayableDiagram
        variant="bare"
        showTitle={false}
        className={`optimized-chord${playing ? ' playing' : ''}`}
        chord={{
          fingering: chord.fingering,
          rootDisplay: chord.displayRoot,
          chordType: chord.chordType,
          symbol: chord.symbol,
          inversion: chord.inversion,
          stringSet: chord.stringSet,
          leadNote: lead,
          targetTopNote: chord.targetTopNote,
        }}
      />
    </div>
  );
}
