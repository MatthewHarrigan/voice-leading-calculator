import { useEffect, useState } from 'react';
import { getChordPlayer } from './player';

/** Reactive flag: true while the chord player is playing a sequence. */
export function useSequencePlaying(): boolean {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const player = getChordPlayer();
    setPlaying(player.isSequencePlaying());
    return player.onSequenceChange(setPlaying);
  }, []);
  return playing;
}
