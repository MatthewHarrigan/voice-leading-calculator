import { useCallback, useEffect, useRef, useState } from 'react';
import type { StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';
import { useStore } from '@/state/store';
import { getChordPlayer } from './player';

const DEFAULT_MAX_MS = 1000;
// A press shorter than this is a "click" (block chord); longer plants the bass
// note then rolls the rest on release.
const LEAD_DELAY_MS = 110;

interface HoldStrumOptions {
  /** Max hold (ms). The resulting strum spans at most this long. */
  maxMs?: number;
  /** Optional progress callback (0..1) for a fill animation; omit for none. */
  onProgress?: (fraction: number) => void;
}

/**
 * Shared press-and-hold-to-strum gesture, modelled on plucking a guitar:
 *  - press plants the lowest (bass) string immediately and lets it ring;
 *  - release rolls the remaining strings out over a span equal to how long the
 *    lead note was held (a quick tap plays them together → a block chord).
 * Returns the press state and begin/end/cancel handlers so callers can wire
 * pointer + keyboard events (and, optionally, drive a fill bar via onProgress).
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
  const leadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Time the lead (bass) note was sounded, or 0 if the press was still too
  // short to count as a hold (in which case a release plays a block chord).
  const leadAtRef = useRef(0);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearLeadTimer = useCallback(() => {
    if (leadTimerRef.current !== null) {
      clearTimeout(leadTimerRef.current);
      leadTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopRaf();
    clearLeadTimer();
    pressingRef.current = false;
    setPressing(false);
    onProgress?.(0);
  }, [clearLeadTimer, onProgress, stopRaf]);

  useEffect(
    () => () => {
      stopRaf();
      clearLeadTimer();
    },
    [clearLeadTimer, stopRaf],
  );

  const begin = useCallback(() => {
    if (!audioEnabled || pressingRef.current) return;
    startRef.current = performance.now();
    leadAtRef.current = 0;
    pressingRef.current = true;
    setPressing(true);
    onProgress?.(0);
    // Wait a beat: a very short click should play all strings together (handled
    // in end()). Only once the press passes the threshold do we plant the bass.
    leadTimerRef.current = setTimeout(() => {
      leadAtRef.current = performance.now();
      void getChordPlayer().strumLead(fingering, stringSet);
    }, LEAD_DELAY_MS);
    if (onProgress) {
      const tick = () => {
        onProgress(Math.min(1, (performance.now() - startRef.current) / maxMs));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [audioEnabled, fingering, maxMs, onProgress, stringSet]);

  const cancel = useCallback(() => {
    if (!pressingRef.current) return;
    reset();
  }, [reset]);

  const end = useCallback(() => {
    if (!pressingRef.current) return;
    const leadAt = leadAtRef.current;
    reset();
    if (!audioEnabled) return;
    const player = getChordPlayer();
    if (leadAt) {
      // Held long enough to plant the bass: roll the rest out over how long the
      // lead note had been ringing before release.
      const held = Math.min(maxMs, performance.now() - leadAt);
      void player.strumRest(fingering, stringSet, held / 1000);
    } else {
      // Very short click: all strings together (block chord).
      void player.playFingering(fingering, stringSet, 0);
    }
  }, [audioEnabled, fingering, maxMs, reset, stringSet]);

  return { pressing, begin, end, cancel };
}
