// Single source of truth: global settings + the editable chart.
// Derived data (optimised voicings, analysis) is computed in components.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CHORD_TYPES, chordSymbol, type ChordTypeId } from '@/music/chords';
import { pitchClassOf, sharpName } from '@/music/notes';
import type { StringSet } from '@/music/tuning';
import {
  createEmptySong,
  flattenSong,
  sequenceBarCount,
  uid,
  type SequenceChord,
  type Song,
} from '@/music/song';

export type Theme = 'light' | 'dark';
export type SortMode = 'default' | 'string';

export interface InsertionPoint {
  barIndex: number;
  beat: number;
  duration: number;
}

interface AppState {
  // --- global settings ---
  stringSet: StringSet;
  avoidB9: boolean;
  sortMode: SortMode;
  theme: Theme;
  audioEnabled: boolean;
  startingInversion: number;

  // --- editable chart (flat runtime model) ---
  chartTitle: string;
  chartKey: string;
  chart: SequenceChord[];
  selectedChordId: string | null;
  insertion: InsertionPoint;

  // --- saved charts ---
  savedPresets: Song[];

  // --- actions ---
  setStringSet: (s: StringSet) => void;
  setAvoidB9: (v: boolean) => void;
  setSortMode: (m: SortMode) => void;
  toggleTheme: () => void;
  setAudioEnabled: (v: boolean) => void;
  setStartingInversion: (n: number) => void;

  addChord: (input: AddChordInput) => void;
  updateChord: (id: string, patch: Partial<SequenceChord>) => void;
  removeChord: (id: string) => void;
  moveChord: (id: string, barIndex: number, beat: number) => void;
  setPreferredInversion: (id: string, inversion: number | null) => void;
  selectChord: (id: string | null) => void;
  setInsertion: (point: Partial<InsertionPoint>) => void;
  clearChart: () => void;
  loadSong: (song: Song) => void;
  saveCurrentAs: (title: string) => void;
  deleteSavedPreset: (id: string) => void;
}

export interface AddChordInput {
  root: string;
  chordType: ChordTypeId;
  barIndex?: number;
  beat?: number;
  duration?: number;
  targetTopNote?: string;
}

function makeSequenceChord(input: AddChordInput, stringSet: StringSet): SequenceChord {
  const duration = Math.max(1, Math.min(4, input.duration ?? 4));
  return {
    id: uid(),
    root: sharpName(pitchClassOf(input.root)),
    displayRoot: input.root,
    chordType: input.chordType,
    symbol: chordSymbol(input.root, input.chordType),
    barIndex: input.barIndex ?? 0,
    beat: input.beat ?? 1,
    durationBeats: duration,
    stringSet,
    targetTopNote: input.targetTopNote || undefined,
  };
}

/** Find the next open (barIndex, beat) slot that fits `duration` beats. */
function findOpenSlot(
  chart: SequenceChord[],
  startBar: number,
  startBeat: number,
  duration: number,
): { barIndex: number; beat: number } {
  const occupied = (bar: number, beat: number) =>
    chart.some(
      (c) => c.barIndex === bar && beat >= c.beat && beat < c.beat + c.durationBeats,
    );
  let bar = startBar;
  let beat = startBeat;
  for (let guard = 0; guard < 512; guard++) {
    let fits = beat + duration <= 5;
    if (fits) {
      for (let b = beat; b < beat + duration; b++) {
        if (occupied(bar, b)) {
          fits = false;
          break;
        }
      }
    }
    if (fits) return { barIndex: bar, beat };
    beat += 1;
    if (beat > 4) {
      beat = 1;
      bar += 1;
    }
  }
  return { barIndex: bar, beat: 1 };
}

const DEFAULT_INSERTION: InsertionPoint = { barIndex: 0, beat: 1, duration: 4 };

/** Repair or reject a persisted chord so a stale/garbage blob can't crash the app. */
function normalizeSeqChord(raw: unknown, defaultStringSet: StringSet): SequenceChord | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const displayRoot = typeof c.displayRoot === 'string' ? c.displayRoot : (c.root as string);
  const chordType = c.chordType as ChordTypeId;
  if (typeof displayRoot !== 'string' || !CHORD_TYPES[chordType]) return null;
  let root: string;
  try {
    root = sharpName(pitchClassOf(displayRoot));
  } catch {
    return null;
  }
  const inv = c.preferredInversion;
  return {
    id: typeof c.id === 'string' ? c.id : uid(),
    root,
    displayRoot,
    chordType,
    symbol: chordSymbol(displayRoot, chordType),
    barIndex: Number.isFinite(c.barIndex) ? (c.barIndex as number) : 0,
    beat: Number.isFinite(c.beat) ? (c.beat as number) : 1,
    durationBeats: Number.isFinite(c.durationBeats) ? (c.durationBeats as number) : 4,
    stringSet: c.stringSet === 'upper' ? 'upper' : defaultStringSet,
    targetTopNote: typeof c.targetTopNote === 'string' ? c.targetTopNote : undefined,
    preferredInversion:
      Number.isInteger(inv) && (inv as number) >= 0 && (inv as number) <= 3
        ? (inv as number)
        : undefined,
  };
}

function isPlausibleSong(raw: unknown): boolean {
  return (
    !!raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { sections?: unknown }).sections) &&
    typeof (raw as { id?: unknown }).id === 'string'
  );
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      stringSet: 'middle',
      avoidB9: true,
      sortMode: 'default',
      theme: 'light',
      audioEnabled: true,
      startingInversion: 0,

      chartTitle: 'Untitled Chart',
      chartKey: 'C',
      chart: [],
      selectedChordId: null,
      insertion: { ...DEFAULT_INSERTION },

      savedPresets: [],

      setStringSet: (stringSet) =>
        set((state) => ({
          stringSet,
          chart: state.chart.map((c) => ({ ...c, stringSet })),
        })),
      setAvoidB9: (avoidB9) => set({ avoidB9 }),
      setSortMode: (sortMode) => set({ sortMode }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setStartingInversion: (startingInversion) => set({ startingInversion }),

      addChord: (input) =>
        set((state) => {
          const duration = Math.max(1, Math.min(4, input.duration ?? state.insertion.duration));
          const slot = findOpenSlot(
            state.chart,
            input.barIndex ?? state.insertion.barIndex,
            input.beat ?? state.insertion.beat,
            duration,
          );
          const chord = makeSequenceChord(
            { ...input, ...slot, duration },
            state.stringSet,
          );
          const next = [...state.chart, chord];
          const nextBeatPos = slot.beat + duration;
          const insertion: InsertionPoint = {
            barIndex: nextBeatPos > 4 ? slot.barIndex + 1 : slot.barIndex,
            beat: ((nextBeatPos - 1) % 4) + 1,
            duration,
          };
          return { chart: next, insertion };
        }),

      updateChord: (id, patch) =>
        set((state) => ({
          chart: state.chart.map((c) => {
            if (c.id !== id) return c;
            const merged = { ...c, ...patch };
            if (patch.displayRoot) {
              merged.root = sharpName(pitchClassOf(patch.displayRoot));
              merged.symbol = chordSymbol(patch.displayRoot, merged.chordType);
            } else if (patch.chordType) {
              merged.symbol = chordSymbol(merged.displayRoot, patch.chordType);
            }
            return merged;
          }),
        })),

      removeChord: (id) =>
        set((state) => ({
          chart: state.chart.filter((c) => c.id !== id),
          selectedChordId: state.selectedChordId === id ? null : state.selectedChordId,
        })),

      moveChord: (id, barIndex, beat) =>
        set((state) => ({
          chart: state.chart.map((c) => (c.id === id ? { ...c, barIndex, beat } : c)),
        })),

      setPreferredInversion: (id, inversion) =>
        set((state) => ({
          chart: state.chart.map((c) =>
            c.id === id
              ? { ...c, preferredInversion: inversion === null ? undefined : inversion }
              : c,
          ),
        })),

      selectChord: (selectedChordId) => set({ selectedChordId }),

      setInsertion: (point) => set((state) => ({ insertion: { ...state.insertion, ...point } })),

      clearChart: () =>
        set({ chart: [], selectedChordId: null, insertion: { ...DEFAULT_INSERTION } }),

      loadSong: (song) =>
        set((state) => ({
          chart: flattenSong(song, state.stringSet),
          chartTitle: song.title,
          chartKey: song.key ?? 'C',
          selectedChordId: null,
          insertion: { ...DEFAULT_INSERTION },
        })),

      saveCurrentAs: (title) =>
        set((state) => {
          const barCount = Math.max(sequenceBarCount(state.chart), 1);
          const bars = Array.from({ length: barCount }, (_, i) => ({
            id: `b${i + 1}`,
            beats: 4,
            chords: [] as Song['sections'][number]['bars'][number]['chords'],
          }));
          [...state.chart]
            .sort((a, b) => a.barIndex - b.barIndex || a.beat - b.beat)
            .forEach((c) => {
              const idx = Math.max(0, Math.min(bars.length - 1, c.barIndex));
              bars[idx].chords.push({
                beat: c.beat,
                duration: c.durationBeats,
                root: c.displayRoot,
                chordType: c.chordType,
                ...(c.targetTopNote ? { targetTopNote: c.targetTopNote } : {}),
                ...(Number.isInteger(c.preferredInversion)
                  ? { preferredInversion: c.preferredInversion }
                  : {}),
              });
            });
          const song: Song = {
            id: `saved-${uid('id')}`,
            title,
            key: state.chartKey,
            timeSignature: [4, 4],
            sections: [{ id: 'main', name: 'Main', bars }],
          };
          const existingIndex = state.savedPresets.findIndex((p) => p.title === title);
          const savedPresets =
            existingIndex >= 0
              ? state.savedPresets.map((p, i) => (i === existingIndex ? song : p))
              : [...state.savedPresets, song];
          return { savedPresets, chartTitle: title };
        }),

      deleteSavedPreset: (id) =>
        set((state) => ({ savedPresets: state.savedPresets.filter((p) => p.id !== id) })),
    }),
    {
      name: 'vlc:v2',
      version: 1,
      // Validate/repair persisted data so a stale shape from an older build
      // can never feed undefined roots into the engine on load.
      migrate: (persisted: unknown) => {
        if (!persisted || typeof persisted !== 'object') return persisted as never;
        const p = persisted as Record<string, unknown>;
        const stringSet: StringSet = p.stringSet === 'upper' ? 'upper' : 'middle';
        return {
          ...p,
          chart: Array.isArray(p.chart)
            ? p.chart.map((c) => normalizeSeqChord(c, stringSet)).filter((c): c is SequenceChord => c !== null)
            : [],
          savedPresets: Array.isArray(p.savedPresets) ? p.savedPresets.filter(isPlausibleSong) : [],
        } as never;
      },
      partialize: (state) => ({
        stringSet: state.stringSet,
        avoidB9: state.avoidB9,
        sortMode: state.sortMode,
        theme: state.theme,
        audioEnabled: state.audioEnabled,
        startingInversion: state.startingInversion,
        chartTitle: state.chartTitle,
        chartKey: state.chartKey,
        chart: state.chart,
        savedPresets: state.savedPresets,
      }),
    },
  ),
);

export { createEmptySong };
