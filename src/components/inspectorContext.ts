import { createContext, useContext } from 'react';
import type { ChordTypeId } from '@/music/chords';
import type { StringSet } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';

export interface InspectChord {
  fingering: Fingering;
  rootDisplay: string;
  chordType: ChordTypeId;
  symbol: string;
  inversion: number;
  stringSet: StringSet;
  targetTopNote?: string | null;
  leadNote?: string | null;
  title?: string;
}

export interface InspectorApi {
  inspect: (chord: InspectChord) => void;
}

export const InspectorContext = createContext<InspectorApi | null>(null);

export function useInspector(): InspectorApi {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error('useInspector must be used within InspectorProvider');
  return ctx;
}
