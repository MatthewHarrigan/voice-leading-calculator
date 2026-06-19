import { useEffect, useRef, useState, type ReactNode } from 'react';
import { activeStrings, frettedMidi, type StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';
import { useStore } from '@/state/store';
import { getChordPlayer } from '@/audio/player';

interface PlayHoldButtonProps {
  fingering: Fingering;
  stringSet: StringSet;
  className?: string;
  style?: React.CSSProperties;
  /** Render-prop children receive the current holding state for custom labels. */
  children?: (holding: boolean) => ReactNode;
}

// A quick tap (released before this) strums the whole chord; a longer press
// rolls an ascending arpeggio for as long as the button is held.
const HOLD_THRESHOLD_MS = 140;
const ARP_INTERVAL_MS = 150;

/**
 * Hold-to-arpeggiate play control. Hold for 2 s → the chord arpeggiates over 2 s
 * (an ascending roll that repeats for the length of the press). A tap strums the
 * chord. Works with mouse, touch, and keyboard (Enter/Space).
 */
export function PlayHoldButton({ fingering, stringSet, className, style, children }: PlayHoldButtonProps) {
  const audioEnabled = useStore((s) => s.audioEnabled);
  const holdTimer = useRef<number | null>(null);
  const arpTimer = useRef<number | null>(null);
  const arpActive = useRef(false);
  const noteIndex = useRef(0);
  const [holding, setHolding] = useState(false);

  const ascendingMidi = () =>
    activeStrings(stringSet)
      .map((s) => {
        const fret = fingering.frets[s];
        return fret === null || fret === undefined ? null : frettedMidi(s, fret);
      })
      .filter((m): m is number => m !== null)
      .sort((a, b) => a - b);

  const stopAll = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (arpTimer.current !== null) {
      clearInterval(arpTimer.current);
      arpTimer.current = null;
    }
    arpActive.current = false;
    setHolding(false);
  };

  useEffect(() => () => stopAll(), []);

  const startArpeggio = () => {
    const notes = ascendingMidi();
    if (notes.length === 0) return;
    arpActive.current = true;
    setHolding(true);
    noteIndex.current = 0;
    const player = getChordPlayer();
    const step = () => {
      player.playNote(notes[noteIndex.current % notes.length]);
      noteIndex.current += 1;
    };
    step(); // first note immediately
    arpTimer.current = window.setInterval(step, ARP_INTERVAL_MS);
  };

  const begin = () => {
    if (!audioEnabled) return;
    void getChordPlayer().resume();
    stopAll();
    holdTimer.current = window.setTimeout(startArpeggio, HOLD_THRESHOLD_MS);
  };

  const end = () => {
    const wasArpeggiating = arpActive.current;
    const wasPressed = holdTimer.current !== null || wasArpeggiating;
    stopAll();
    // A quick tap (released before the arpeggio kicked in) strums the chord.
    if (audioEnabled && wasPressed && !wasArpeggiating) {
      void getChordPlayer().playFingering(fingering, stringSet);
    }
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        begin();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          end();
        }
      }}
      aria-label="Play voicing — tap to strum, hold to arpeggiate"
    >
      {children ? children(holding) : holding ? '♪ arpeggiating…' : '♪ Play · hold to arpeggiate'}
    </button>
  );
}
