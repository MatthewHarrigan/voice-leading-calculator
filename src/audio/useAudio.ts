import { useCallback } from 'react';
import { useStore } from '@/state/store';
import type { StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';
import { getChordPlayer } from './player';

/** Returns a stable callback that strums a fingering when audio is enabled. */
export function usePlayChord() {
  const audioEnabled = useStore((s) => s.audioEnabled);
  return useCallback(
    (fingering: Fingering, stringSet: StringSet) => {
      if (!audioEnabled) return;
      void getChordPlayer().playFingering(fingering, stringSet);
    },
    [audioEnabled],
  );
}
