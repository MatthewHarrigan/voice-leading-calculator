import { useEffect, useState } from 'react';
import { getChordPlayer } from './player';

/** The current in-form playback beat (-1 when idle), for driving a playhead. */
export function usePlaybackBeat(): number {
  const [beat, setBeat] = useState(-1);
  useEffect(() => getChordPlayer().onBeat(setBeat), []);
  return beat;
}
