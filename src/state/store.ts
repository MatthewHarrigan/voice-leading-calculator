// Single source of truth: global settings + the editable iReal-style chart.
// Derived data (optimised voicings, analysis, the flat performance order) is
// computed in components from the chart.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type ChordTypeId } from '@/music/chords';
import type { BassFeel, BassStyle } from '@/music/walkingBass';
import { parseKey, pitchClassOf } from '@/music/notes';
import type { StringSet } from '@/music/tuning';
import {
  chartToSequence,
  chordFromType,
  createEmptyChart,
  sequenceToChart,
  songToChart,
  transposeChart,
} from '@/music/chart';
import { parseIRealIndex, parseIRealURL, type IRealIndex } from '@/music/ireal/parse';
import type { BarlineClose, BarlineOpen, IRealChart, IRealChord, IRealMeasure } from '@/music/ireal/types';
import { createEmptySong, uid, type SequenceChord, type Song } from '@/music/song';

export type Theme = 'light' | 'dark';
export type SortMode = 'default' | 'string';

/** A tune saved into a custom playlist — the verbatim iReal chunk, re-parsed on open. */
export interface SavedTune {
  title: string;
  composer: string;
  scheme: string;
  chunk: string;
}
/** A user-curated, named set of tunes (persisted). */
export interface UserPlaylist {
  id: string;
  name: string;
  entries: SavedTune[];
}
/** Which lead sheet the Sequence Builder shows: chord score, guitar diagrams, or both. */
export type ChartViewMode = 'chart' | 'guitar' | 'both';

interface AppState {
  // --- global settings ---
  stringSet: StringSet;
  avoidB9: boolean;
  sortMode: SortMode;
  theme: Theme;
  audioEnabled: boolean;
  startingInversion: number;
  tempo: number; // BPM
  metronome: boolean;
  bassline: boolean;
  bassSolo: boolean;
  bassStyle: BassStyle; // which rung of the walking-bass ladder to generate
  bassFeel: BassFeel; // half-note "two" feel vs quarter-note "four" feel
  bassSwing: boolean; // swing the bass line's offbeats
  bassGhosts: boolean; // add ghost-note skips
  bassAnticipate: boolean; // push chord-change downbeats early
  bassTriplets: boolean; // roll triplet "drops" into targets
  bassAmount: number; // embellishment density 0..1
  repeatForm: boolean; // loop the whole chart during playback
  chartViewMode: ChartViewMode;

  // --- editable chart ---
  chart: IRealChart;
  selectedChordId: string | null;
  selectedMeasureId: string | null;
  /** Measure new chords are appended to (defaults to the last measure). */
  insertionMeasureId: string | null;

  // --- saved charts ---
  savedCharts: IRealChart[];

  // --- loaded playlist (in-memory only; raw source kept under a dedicated
  // localStorage key so a large playlist never bloats the persisted state) ---
  playlist: IRealIndex | null;

  // --- user-curated playlists (persisted) ---
  userPlaylists: UserPlaylist[];

  // --- setters ---
  setStringSet: (s: StringSet) => void;
  setAvoidB9: (v: boolean) => void;
  setSortMode: (m: SortMode) => void;
  toggleTheme: () => void;
  setAudioEnabled: (v: boolean) => void;
  setStartingInversion: (n: number) => void;
  setTempo: (n: number) => void;
  setMetronome: (v: boolean) => void;
  setBassline: (v: boolean) => void;
  setBassSolo: (v: boolean) => void;
  setBassStyle: (s: BassStyle) => void;
  setBassFeel: (f: BassFeel) => void;
  setBassSwing: (v: boolean) => void;
  setBassGhosts: (v: boolean) => void;
  setBassAnticipate: (v: boolean) => void;
  setBassTriplets: (v: boolean) => void;
  setBassAmount: (v: number) => void;
  setRepeatForm: (v: boolean) => void;
  setChartViewMode: (m: ChartViewMode) => void;

  // --- chart meta ---
  setChartTitle: (title: string) => void;
  setChartKey: (key: string) => void;
  setChartStyle: (style: string) => void;
  setChartRepeats: (n: number) => void;
  setTimeSignature: (sig: [number, number]) => void;
  transpose: (semitones: number) => void;
  transposeToKey: (tonic: string) => void;

  // --- chords ---
  addChord: (input: AddChordInput) => void;
  updateChord: (id: string, patch: ChordPatch) => void;
  removeChord: (id: string) => void;
  setPreferredInversion: (id: string, inversion: number | null) => void;
  selectChord: (id: string | null) => void;

  // --- measures ---
  selectMeasure: (id: string | null) => void;
  setInsertionMeasure: (id: string | null) => void;
  patchMeasure: (id: string, patch: MeasurePatch) => void;
  insertMeasureAfter: (id: string | null) => void;
  deleteMeasure: (id: string) => void;

  // --- chart lifecycle ---
  clearChart: () => void;
  newChart: () => void;
  loadChart: (chart: IRealChart) => void;
  loadSong: (song: Song) => void;
  importIRealText: (text: string) => { ok: true; title: string } | { ok: false; error: string };
  addSavedCharts: (charts: IRealChart[]) => void;
  saveCurrentAs: (title: string) => void;
  deleteSavedChart: (id: string) => void;

  // --- playlist (runtime loader) ---
  setPlaylist: (source: string) => { ok: true; persisted: boolean } | { ok: false; error: string };
  rehydratePlaylist: () => void;
  clearPlaylist: () => void;

  // --- custom playlists ---
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, tune: SavedTune) => void;
  removeFromPlaylist: (id: string, title: string) => void;
}

/** localStorage key for the raw playlist source — kept OUT of the persisted
 * `vlc:v2` blob so editing chords never re-serialises a ~1MB playlist. */
const PLAYLIST_KEY = 'vlc:playlist';

export interface AddChordInput {
  root: string;
  chordType: ChordTypeId;
  beats?: number;
  targetTopNote?: string;
}

export interface ChordPatch {
  root?: string;
  chordType?: ChordTypeId;
  beats?: number;
  targetTopNote?: string | undefined;
}

export interface MeasurePatch {
  open?: BarlineOpen;
  close?: BarlineClose;
  section?: string | undefined;
  ending?: number | undefined;
  timeSig?: [number, number] | undefined;
  barRepeat?: (1 | 2) | undefined;
  coda?: boolean;
  segno?: boolean;
  fermata?: boolean;
  staffText?: string | undefined;
  directive?: string | undefined;
}

const DEFAULT_TEMPO = 100;

function lastMeasure(chart: IRealChart): IRealMeasure {
  return chart.measures[chart.measures.length - 1];
}

/** Re-derive incidental invariants: measure 1 has a time sig, last bar is final. */
function normalize(chart: IRealChart): IRealChart {
  if (chart.measures.length === 0) {
    chart.measures.push({ id: uid('m'), chords: [], timeSig: chart.timeSignature });
  }
  if (!chart.measures[0].timeSig) chart.measures[0].timeSig = chart.timeSignature;
  const last = lastMeasure(chart);
  if (!last.close) last.close = 'final';
  // Only the final measure should carry the 'final' barline.
  chart.measures.forEach((m, i) => {
    if (i < chart.measures.length - 1 && m.close === 'final') m.close = 'single';
  });
  return chart;
}

function barBeatsOf(chart: IRealChart, m: IRealMeasure): number {
  return (m.timeSig ?? chart.timeSignature)[0];
}

function cloneChart(chart: IRealChart): IRealChart {
  return {
    ...chart,
    timeSignature: [...chart.timeSignature] as [number, number],
    measures: chart.measures.map((m) => ({
      ...m,
      timeSig: m.timeSig ? ([...m.timeSig] as [number, number]) : undefined,
      chords: m.chords.map((c) => ({ ...c })),
    })),
  };
}

function findChord(chart: IRealChart, id: string): { m: IRealMeasure; c: IRealChord } | null {
  for (const m of chart.measures) {
    const c = m.chords.find((x) => x.id === id);
    if (c) return { m, c };
  }
  return null;
}

/** Repair a persisted chart blob (or convert a legacy SequenceChord[]). */
function normalizeStoredChart(raw: unknown, title: string, key: string): IRealChart {
  try {
    if (Array.isArray(raw)) {
      return normalize(sequenceToChart(raw as SequenceChord[], title || 'Untitled Chart', key || 'C'));
    }
    if (raw && typeof raw === 'object' && Array.isArray((raw as IRealChart).measures)) {
      const chart = raw as IRealChart;
      if (!Array.isArray(chart.measures) || chart.measures.length === 0) return createEmptyChart(title, key);
      return normalize(cloneChart(chart));
    }
  } catch {
    /* fall through */
  }
  return createEmptyChart(title || 'Untitled Chart', key || 'C');
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
      tempo: DEFAULT_TEMPO,
      metronome: false,
      bassline: false,
      bassSolo: false,
      bassStyle: 'walking',
      bassFeel: 'four',
      bassSwing: true,
      bassGhosts: false,
      bassAnticipate: false,
      bassTriplets: false,
      bassAmount: 0.35,
      repeatForm: false,
      chartViewMode: 'both',

      chart: createEmptyChart(),
      selectedChordId: null,
      selectedMeasureId: null,
      insertionMeasureId: null,

      savedCharts: [],
      playlist: null,
      userPlaylists: [],

      setStringSet: (stringSet) => set({ stringSet }),
      setAvoidB9: (avoidB9) => set({ avoidB9 }),
      setSortMode: (sortMode) => set({ sortMode }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setStartingInversion: (startingInversion) => set({ startingInversion }),
      setTempo: (tempo) => set({ tempo: Math.max(40, Math.min(320, Math.round(tempo))) }),
      setMetronome: (metronome) => set({ metronome }),
      setBassline: (bassline) => set({ bassline }),
      setBassSolo: (bassSolo) => set({ bassSolo }),
      setBassStyle: (bassStyle) => set({ bassStyle }),
      setBassFeel: (bassFeel) => set({ bassFeel }),
      setBassSwing: (bassSwing) => set({ bassSwing }),
      setBassGhosts: (bassGhosts) => set({ bassGhosts }),
      setBassAnticipate: (bassAnticipate) => set({ bassAnticipate }),
      setBassTriplets: (bassTriplets) => set({ bassTriplets }),
      setBassAmount: (bassAmount) => set({ bassAmount: Math.max(0, Math.min(1, bassAmount)) }),
      setRepeatForm: (repeatForm) => set({ repeatForm }),
      setChartViewMode: (chartViewMode) => set({ chartViewMode }),

      setChartTitle: (title) => set((s) => ({ chart: { ...s.chart, title } })),
      setChartKey: (key) => set((s) => ({ chart: { ...s.chart, key } })),
      setChartStyle: (style) => set((s) => ({ chart: { ...s.chart, style } })),
      setChartRepeats: (n) =>
        set((s) => ({ chart: { ...s.chart, repeats: Math.max(1, Math.min(16, Math.round(n))) } })),

      setTimeSignature: (sig) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          chart.timeSignature = sig;
          if (chart.measures[0]) chart.measures[0].timeSig = sig;
          return { chart };
        }),

      transpose: (semitones) => set((s) => ({ chart: normalize(transposeChart(s.chart, semitones)) })),

      transposeToKey: (tonic) =>
        set((s) => {
          const prev = parseKey(s.chart.key);
          const curTonic = prev?.tonic ?? 'C';
          let delta = 0;
          try {
            delta = ((pitchClassOf(tonic) - pitchClassOf(curTonic)) % 12 + 12) % 12;
          } catch {
            delta = 0;
          }
          const newKey = prev?.mode === 'minor' ? `${tonic} minor` : tonic;
          return { chart: normalize(transposeChart(s.chart, delta, newKey)) };
        }),

      addChord: (input) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          const beats = Math.max(1, Math.min(8, input.beats ?? 4));
          const targetId = s.insertionMeasureId ?? lastMeasure(chart).id;
          let idx = chart.measures.findIndex((m) => m.id === targetId);
          if (idx < 0) idx = chart.measures.length - 1;
          const measure = chart.measures[idx];
          const used = measure.chords.reduce((sum, c) => sum + (c.beats || 0), 0);
          const cap = barBeatsOf(chart, measure);
          const chord = chordFromType(input.root, input.chordType, beats, {
            targetTopNote: input.targetTopNote,
          });
          let nextInsertion = measure.id;
          if (measure.chords.length === 0 || used + beats <= cap) {
            measure.chords.push(chord);
          } else {
            const fresh: IRealMeasure = { id: uid('m'), chords: [chord] };
            chart.measures.splice(idx + 1, 0, fresh);
            nextInsertion = fresh.id;
          }
          return { chart: normalize(chart), insertionMeasureId: nextInsertion };
        }),

      updateChord: (id, patch) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          const hit = findChord(chart, id);
          if (!hit) return {};
          const replaced = chordFromType(
            patch.root ?? hit.c.root,
            patch.chordType ?? hit.c.chordType ?? 'maj7',
            patch.beats ?? hit.c.beats,
            {
              targetTopNote: 'targetTopNote' in patch ? patch.targetTopNote : hit.c.targetTopNote,
              preferredInversion: hit.c.preferredInversion,
            },
          );
          replaced.id = hit.c.id;
          hit.m.chords = hit.m.chords.map((c) => (c.id === id ? replaced : c));
          return { chart };
        }),

      removeChord: (id) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          const hit = findChord(chart, id);
          if (hit) hit.m.chords = hit.m.chords.filter((c) => c.id !== id);
          return {
            chart: normalize(chart),
            selectedChordId: s.selectedChordId === id ? null : s.selectedChordId,
          };
        }),

      setPreferredInversion: (id, inversion) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          const hit = findChord(chart, id);
          if (hit) {
            if (inversion === null) delete hit.c.preferredInversion;
            else hit.c.preferredInversion = inversion;
          }
          return { chart };
        }),

      selectChord: (selectedChordId) => set({ selectedChordId }),

      selectMeasure: (selectedMeasureId) =>
        set({ selectedMeasureId, insertionMeasureId: selectedMeasureId }),
      setInsertionMeasure: (insertionMeasureId) => set({ insertionMeasureId }),

      patchMeasure: (id, patch) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          const m = chart.measures.find((x) => x.id === id);
          if (!m) return {};
          const rec = m as unknown as Record<string, unknown>;
          Object.entries(patch).forEach(([k, v]) => {
            if (v === undefined) delete rec[k];
            else rec[k] = v;
          });
          return { chart: normalize(chart) };
        }),

      insertMeasureAfter: (id) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          const idx = id ? chart.measures.findIndex((m) => m.id === id) : chart.measures.length - 1;
          const fresh: IRealMeasure = { id: uid('m'), chords: [] };
          chart.measures.splice(idx + 1, 0, fresh);
          return { chart: normalize(chart), selectedMeasureId: fresh.id, insertionMeasureId: fresh.id };
        }),

      deleteMeasure: (id) =>
        set((s) => {
          const chart = cloneChart(s.chart);
          chart.measures = chart.measures.filter((m) => m.id !== id);
          return {
            chart: normalize(chart),
            selectedMeasureId: s.selectedMeasureId === id ? null : s.selectedMeasureId,
            insertionMeasureId: s.insertionMeasureId === id ? null : s.insertionMeasureId,
          };
        }),

      clearChart: () =>
        set((s) => ({
          chart: createEmptyChart('Untitled Chart', s.chart.key ?? 'C'),
          selectedChordId: null,
          selectedMeasureId: null,
          insertionMeasureId: null,
        })),

      newChart: () =>
        set({
          chart: createEmptyChart(),
          selectedChordId: null,
          selectedMeasureId: null,
          insertionMeasureId: null,
        }),

      loadChart: (chart) =>
        set((s) => ({
          chart: normalize(cloneChart(chart)),
          tempo: chart.tempo ?? s.tempo,
          selectedChordId: null,
          selectedMeasureId: null,
          insertionMeasureId: null,
        })),

      addSavedCharts: (charts) =>
        set((s) => {
          const byTitle = new Map(s.savedCharts.map((c) => [c.title, c]));
          charts.forEach((c) => byTitle.set(c.title, { ...cloneChart(c), id: uid('chart'), title: c.title }));
          return { savedCharts: Array.from(byTitle.values()) };
        }),

      loadSong: (song) =>
        set((s) => {
          const chart = normalize(songToChart(song));
          return {
            chart,
            tempo: s.tempo,
            selectedChordId: null,
            selectedMeasureId: null,
            insertionMeasureId: null,
          };
        }),

      importIRealText: (text) => {
        try {
          const playlist = parseIRealURL(text);
          const chart = normalize(cloneChart(playlist.songs[0]));
          set((s) => ({
            chart,
            tempo: chart.tempo ?? s.tempo,
            selectedChordId: null,
            selectedMeasureId: null,
            insertionMeasureId: null,
          }));
          return { ok: true as const, title: chart.title };
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : 'Could not read that link.' };
        }
      },

      saveCurrentAs: (title) =>
        set((s) => {
          const snapshot: IRealChart = { ...cloneChart(s.chart), id: uid('chart'), title };
          const existing = s.savedCharts.findIndex((c) => c.title === title);
          const savedCharts =
            existing >= 0
              ? s.savedCharts.map((c, i) => (i === existing ? snapshot : c))
              : [...s.savedCharts, snapshot];
          return { savedCharts, chart: { ...s.chart, title } };
        }),

      deleteSavedChart: (id) => set((s) => ({ savedCharts: s.savedCharts.filter((c) => c.id !== id) })),

      setPlaylist: (source) => {
        let index: IRealIndex;
        try {
          index = parseIRealIndex(source);
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : 'Could not read that link.' };
        }
        if (index.songs.length === 0) {
          return { ok: false as const, error: 'No songs found in the iReal Pro link.' };
        }
        // Persist the raw source once (not on every edit). A huge playlist may
        // exceed quota — keep it in memory for this session and report that.
        let persisted = true;
        try {
          localStorage.setItem(PLAYLIST_KEY, source);
        } catch {
          persisted = false;
        }
        set({ playlist: index });
        return { ok: true as const, persisted };
      },

      rehydratePlaylist: () => {
        let source: string | null = null;
        try {
          source = localStorage.getItem(PLAYLIST_KEY);
        } catch {
          source = null;
        }
        if (!source) return;
        try {
          set({ playlist: parseIRealIndex(source) });
        } catch {
          try {
            localStorage.removeItem(PLAYLIST_KEY);
          } catch {
            /* ignore */
          }
        }
      },

      clearPlaylist: () => {
        try {
          localStorage.removeItem(PLAYLIST_KEY);
        } catch {
          /* ignore */
        }
        set({ playlist: null });
      },

      createPlaylist: (name) => {
        const id = uid('pl');
        set((s) => ({
          userPlaylists: [...s.userPlaylists, { id, name: name.trim() || 'Untitled', entries: [] }],
        }));
        return id;
      },

      renamePlaylist: (id, name) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),

      deletePlaylist: (id) =>
        set((s) => ({ userPlaylists: s.userPlaylists.filter((p) => p.id !== id) })),

      addToPlaylist: (id, tune) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === id && !p.entries.some((e) => e.title === tune.title)
              ? { ...p, entries: [...p.entries, tune] }
              : p,
          ),
        })),

      removeFromPlaylist: (id, title) =>
        set((s) => ({
          userPlaylists: s.userPlaylists.map((p) =>
            p.id === id ? { ...p, entries: p.entries.filter((e) => e.title !== title) } : p,
          ),
        })),
    }),
    {
      name: 'vlc:v2',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== 'object') return persisted as never;
        const p = persisted as Record<string, unknown>;
        const stringSet: StringSet = p.stringSet === 'upper' ? 'upper' : 'middle';
        const title = typeof p.chartTitle === 'string' ? p.chartTitle : 'Untitled Chart';
        const key = typeof p.chartKey === 'string' ? p.chartKey : 'C';
        // v1 stored chart as SequenceChord[] and savedPresets as Song[].
        const chart = normalizeStoredChart(p.chart, title, key);
        let savedCharts: IRealChart[] = [];
        if (version < 2 && Array.isArray(p.savedPresets)) {
          savedCharts = (p.savedPresets as Song[])
            .map((song): IRealChart | null => {
              try {
                return { ...songToChart(song), id: uid('chart') };
              } catch {
                return null;
              }
            })
            .filter((c): c is IRealChart => c !== null);
        } else if (Array.isArray(p.savedCharts)) {
          savedCharts = (p.savedCharts as IRealChart[]).filter(
            (c) => c && Array.isArray(c.measures),
          );
        }
        return { ...p, stringSet, chart, savedCharts } as never;
      },
      partialize: (state) => ({
        stringSet: state.stringSet,
        avoidB9: state.avoidB9,
        sortMode: state.sortMode,
        theme: state.theme,
        audioEnabled: state.audioEnabled,
        startingInversion: state.startingInversion,
        tempo: state.tempo,
        metronome: state.metronome,
        bassline: state.bassline,
        bassSolo: state.bassSolo,
        bassStyle: state.bassStyle,
        bassFeel: state.bassFeel,
        bassSwing: state.bassSwing,
        bassGhosts: state.bassGhosts,
        bassAnticipate: state.bassAnticipate,
        bassTriplets: state.bassTriplets,
        bassAmount: state.bassAmount,
        repeatForm: state.repeatForm,
        chartViewMode: state.chartViewMode,
        chart: state.chart,
        savedCharts: state.savedCharts,
        userPlaylists: state.userPlaylists,
      }),
    },
  ),
);

export { createEmptySong, createEmptyChart, chartToSequence };
