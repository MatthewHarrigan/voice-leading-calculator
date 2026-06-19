import { useRef, type ReactNode } from 'react';
import { hasFlatNineAvoidInterval, inversionName } from '@/music/voicing';
import { useHoldStrum } from '@/audio/useHoldStrum';
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

// A second press within this window counts as a double-click → open the inspector.
const DOUBLE_MS = 280;

/**
 * A chord diagram you play and inspect like the strings themselves:
 *  - press (tap or hold) strums the chord using the hold-to-strum logic
 *    (quick = block chord, hold = a roll spanning the hold) — no fill animation;
 *  - double-click / double-tap opens the voicing inspector ("info box").
 */
export function PlayableDiagram({
  chord,
  caption,
  showIntervals = true,
  highlightAvoid = false,
  variant = 'card',
  className,
}: PlayableDiagramProps) {
  const { inspect } = useInspector();
  const { begin, end, cancel } = useHoldStrum(chord.fingering, chord.stringSet);
  const lastUpRef = useRef(0);
  const avoid = highlightAvoid && hasFlatNineAvoidInterval(chord.fingering, chord.stringSet);
  const label = `${chord.symbol} ${inversionName(chord.inversion)}`;

  // Suppress the *second* press of a double-click from re-playing; the inspector
  // is opened reliably by the native onDoubleClick handler below.
  const handleUp = () => {
    const now = performance.now();
    if (now - lastUpRef.current < DOUBLE_MS) {
      lastUpRef.current = 0;
      cancel();
    } else {
      lastUpRef.current = now;
      end();
    }
  };

  const gesture = {
    role: 'button' as const,
    tabIndex: 0,
    title: 'Press to play · double-click for details',
    'aria-label': `${label} — press to play, double-click for details`,
    onPointerDown: (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      begin();
    },
    onPointerUp: handleUp,
    onPointerCancel: cancel,
    onDoubleClick: () => {
      cancel();
      inspect(chord);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        begin();
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        end();
      }
    },
  };

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
      <div className={`progression-chord${className ? ` ${className}` : ''}`} {...gesture}>
        {diagram}
      </div>
    );
  }

  return (
    <div
      className={`chord-card${avoid ? ' is-avoid' : ''}${className ? ` ${className}` : ''}`}
      {...gesture}
    >
      {avoid && <span className="avoid-flag">b9</span>}
      {diagram}
      {caption && <div className="card-caption">{caption}</div>}
    </div>
  );
}
