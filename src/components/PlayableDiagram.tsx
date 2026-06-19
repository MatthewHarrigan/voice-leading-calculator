import type { ReactNode } from 'react';
import { hasFlatNineAvoidInterval, inversionName } from '@/music/voicing';
import { usePlayChord } from '@/audio/useAudio';
import { ChordDiagram } from './ChordDiagram';
import { useInspector, type InspectChord } from './inspectorContext';

interface PlayableDiagramProps {
  chord: InspectChord;
  caption?: ReactNode;
  showIntervals?: boolean;
  highlightAvoid?: boolean;
  /** 'card' wraps in a bordered card; 'bare' renders just the diagram. */
  variant?: 'card' | 'bare';
  className?: string;
}

/** A clickable chord diagram: strums on click and opens the voicing inspector. */
export function PlayableDiagram({
  chord,
  caption,
  showIntervals = true,
  highlightAvoid = false,
  variant = 'card',
  className,
}: PlayableDiagramProps) {
  const play = usePlayChord();
  const { inspect } = useInspector();
  const avoid = highlightAvoid && hasFlatNineAvoidInterval(chord.fingering, chord.stringSet);

  const handleActivate = () => {
    play(chord.fingering, chord.stringSet);
    inspect(chord);
  };

  const label = `${chord.symbol} ${inversionName(chord.inversion)}`;

  const diagram = (
    <ChordDiagram
      fingering={chord.fingering}
      rootDisplay={chord.rootDisplay}
      stringSet={chord.stringSet}
      title={chord.title ?? label}
      leadNote={chord.leadNote ?? null}
      showIntervals={showIntervals}
      highlightAvoid={highlightAvoid}
      ariaLabel={label}
    />
  );

  if (variant === 'bare') {
    return (
      <div
        className={`progression-chord${className ? ` ${className}` : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        }}
      >
        {diagram}
      </div>
    );
  }

  return (
    <div
      className={`chord-card${avoid ? ' is-avoid' : ''}${className ? ` ${className}` : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleActivate()}
    >
      {avoid && <span className="avoid-flag">b9</span>}
      {diagram}
      {caption && <div className="card-caption">{caption}</div>}
    </div>
  );
}
