import { useEffect, useRef, useState } from 'react';
import type { StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';
import { useStore } from '@/state/store';
import { getChordPlayer } from '@/audio/player';

interface PlayHoldButtonProps {
  fingering: Fingering;
  stringSet: StringSet;
  className?: string;
  style?: React.CSSProperties;
}

// Hold up to this long; the fill bar reaches 100% here and the resulting
// arpeggio spans at most this many seconds.
const MAX_MS = 5000;
// Floor so a quick click still rolls as a fast strum rather than a block chord.
const MIN_MS = 60;

/**
 * Press-and-hold play control. The button fills left→right over up to 5 s while
 * held; on release the chord plays as a single ascending strum whose length
 * equals how long you held (a quick tap = a fast strum, a long hold = a slow
 * arpeggio). Does not loop. Works with mouse, touch, and keyboard.
 */
export function PlayHoldButton({ fingering, stringSet, className, style }: PlayHoldButtonProps) {
  const audioEnabled = useStore((s) => s.audioEnabled);
  const [pressing, setPressing] = useState(false);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const secsRef = useRef<HTMLSpanElement | null>(null);

  const setFill = (fraction: number) => {
    if (fillRef.current) fillRef.current.style.width = `${Math.min(1, fraction) * 100}%`;
    if (secsRef.current) secsRef.current.textContent = (Math.min(MAX_MS, fraction * MAX_MS) / 1000).toFixed(1);
  };

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopRaf();
    },
    [],
  );

  const begin = () => {
    if (!audioEnabled) return;
    void getChordPlayer().resume();
    startRef.current = performance.now();
    setPressing(true);
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      setFill(elapsed / MAX_MS);
      rafRef.current = requestAnimationFrame(tick);
    };
    setFill(0);
    rafRef.current = requestAnimationFrame(tick);
  };

  const end = () => {
    if (!pressing) return;
    stopRaf();
    setPressing(false);
    setFill(0);
    const held = Math.min(MAX_MS, Math.max(MIN_MS, performance.now() - startRef.current));
    if (audioEnabled) void getChordPlayer().arpeggiate(fingering, stringSet, held / 1000);
  };

  return (
    <button
      type="button"
      className={`strum-btn ${className ?? ''}`}
      style={style}
      data-pressing={pressing}
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
      aria-label="Play voicing — hold to set the strum length, release to play"
    >
      <span ref={fillRef} className="strum-fill" aria-hidden="true" />
      <span className="strum-label">
        {pressing ? (
          <>
            ◉ <span ref={secsRef}>0.0</span>s — release to strum
          </>
        ) : (
          '▸ Strum · hold to lengthen (max 5s)'
        )}
      </span>
    </button>
  );
}
