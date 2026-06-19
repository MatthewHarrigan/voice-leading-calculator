import { useCallback, useRef } from 'react';
import type { StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';
import { useHoldStrum } from '@/audio/useHoldStrum';

interface PlayHoldButtonProps {
  fingering: Fingering;
  stringSet: StringSet;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Press-and-hold play control with a fill bar. A quick tap plays a block chord;
 * holding fills the button left→right (up to 1 s) and, on release, strums the
 * chord as a single ascending roll spanning the held time. Mouse/touch/keyboard.
 */
export function PlayHoldButton({ fingering, stringSet, className, style }: PlayHoldButtonProps) {
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const setFill = useCallback((fraction: number) => {
    if (fillRef.current) fillRef.current.style.width = `${Math.min(1, fraction) * 100}%`;
  }, []);
  const { pressing, begin, end, cancel } = useHoldStrum(fingering, stringSet, { onProgress: setFill });

  return (
    <button
      type="button"
      className={`strum-btn ${className ?? ''}`}
      style={style}
      data-pressing={pressing}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        begin();
      }}
      onPointerUp={end}
      onPointerCancel={cancel}
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
      aria-label="Play voicing — hold to set the strum length"
    >
      <span ref={fillRef} className="strum-fill" aria-hidden="true" />
      <span className="strum-label">▶ Play</span>
    </button>
  );
}
