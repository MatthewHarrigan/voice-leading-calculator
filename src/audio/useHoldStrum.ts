import { useCallback, useEffect, useRef, useState } from 'react';
import type { StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';
import { useStore } from '@/state/store';
import { getChordPlayer } from './player';

const DEFAULT_MAX_MS = 1000;

interface HoldStrumOptions {
  /** Max hold (ms). The resulting strum spans at most this long. */
  maxMs?: number;
  /** Optional progress callback (0..1) for a fill animation; omit for none. */
  onProgress?: (fraction: number) => void;
}

/**
 * Shared press-and-hold-to-strum gesture. A very short press plays the chord as
 * a block (all strings together, handled by ChordPlayer.arpeggiate); a longer
 * hold spreads the ascending roll across the held time. Returns the press state
 * and begin/end/cancel handlers so callers can wire pointer + keyboard events
 * (and, optionally, drive a fill bar via onProgress).
 */
export function useHoldStrum(
  fingering: Fingering,
  stringSet: StringSet,
  options: HoldStrumOptions = {},
) {
  const audioEnabled = useStore((s) => s.audioEnabled);
  const maxMs = options.maxMs ?? DEFAULT_MAX_MS;
  const onProgress = options.onProgress;
  const [pressing, setPressing] = useState(false);
  const pressingRef = useRef(false);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => () => stopRaf(), [stopRaf]);

  const begin = useCallback(() => {
    if (!audioEnabled || pressingRef.current) return;
    void getChordPlayer().resume();
    startRef.current = performance.now();
    pressingRef.current = true;
    setPressing(true);
    onProgress?.(0);
    if (onProgress) {
      const tick = () => {
        onProgress(Math.min(1, (performance.now() - startRef.current) / maxMs));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [audioEnabled, maxMs, onProgress]);

  const cancel = useCallback(() => {
    if (!pressingRef.current) return;
    stopRaf();
    pressingRef.current = false;
    setPressing(false);
    onProgress?.(0);
  }, [onProgress, stopRaf]);

  const end = useCallback(() => {
    if (!pressingRef.current) return;
    stopRaf();
    pressingRef.current = false;
    setPressing(false);
    onProgress?.(0);
    if (!audioEnabled) return;
    const held = Math.min(maxMs, performance.now() - startRef.current);
    void getChordPlayer().arpeggiate(fingering, stringSet, held / 1000);
  }, [audioEnabled, fingering, maxMs, onProgress, stopRaf, stringSet]);

  return { pressing, begin, end, cancel };
}
