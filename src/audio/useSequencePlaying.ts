import { useEffect, useState } from 'react';
import { getChordPlayer, type TransportState } from './player';

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

/** Reactive transport state: idle / playing / paused. */
export function useTransportState(): TransportState {
  const [state, setState] = useState<TransportState>('idle');
  useEffect(() => {
    const player = getChordPlayer();
    setState(player.getTransportState());
    return player.onTransportChange(setState);
  }, []);
  return state;
}
