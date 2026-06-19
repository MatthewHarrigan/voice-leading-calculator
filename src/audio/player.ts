// A small, dependency-free plucked-string synth on the Web Audio API that
// behaves like a real guitar: SIX independent monophonic strings.
//
// Each note is a short additive pluck (fundamental + two quieter, faster-
// decaying partials) shaped by a low-pass filter that closes over the note and
// a fast-attack / exponential-release envelope, summed through a master limiter.
//
// Per-string monophony: each string holds at most one ringing voice. Plucking a
// string damps whatever that same string was playing (a fast release) but leaves
// the other strings ringing — so a new strum/arpeggio interrupts each string only
// as it reaches it. A "sequence" (Play / Play progression) is a single
// cancellable scheduler, so pressing it again restarts rather than layering.

import { frettedMidi, type StringSet, activeStrings } from '@/music/tuning';
import { arrangementSpanBeats } from '@/music/timing';
import type { Fingering } from '@/music/voicing';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const PARTIALS: { ratio: number; gain: number; type: OscillatorType }[] = [
  { ratio: 1, gain: 1.0, type: 'triangle' },
  { ratio: 2, gain: 0.32, type: 'sine' },
  { ratio: 3, gain: 0.12, type: 'sine' },
];

// Default note ring-out (seconds). Real guitar strings sustain for several
// seconds; this is the decay length of a plucked string.
const DEFAULT_SUSTAIN = 3.0;

interface Voice {
  amp: GainNode;
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
  teardown: ReturnType<typeof setTimeout>;
  /** String 0-5 this voice belongs to, or -1 for an untracked (stringless) note. */
  stringIndex: number;
}

export interface SequenceChordInput {
  fingering: Fingering;
  stringSet: StringSet;
}

export interface ArrangementEvent {
  fingering: Fingering;
  stringSet: StringSet;
  /** Absolute beat onset from the start of the chart (0-based). */
  startBeat: number;
  /** Length in beats (controls bass note length). */
  durationBeats: number;
  /** Low MIDI pitch of the chord root, for the optional bass line. */
  bassMidi: number;
}

export interface ArrangementOptions {
  bpm: number;
  beatsPerBar?: number;
  metronome?: boolean;
  bassline?: boolean;
}

export class ChordPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  // Currently-ringing voice per guitar string (index 0-5), like a real fretboard.
  // Index 6 is a virtual monophonic bass "string" used by the bass line.
  private stringVoices: (Voice | null)[] = [null, null, null, null, null, null, null];
  // Signature of the chord currently ringing, so a chord *change* can mute all
  // strings while a same-chord re-trigger keeps the per-string ring-out.
  private lastChordSig: string | null = null;
  private seqToken = 0;
  private seqTimer: ReturnType<typeof setTimeout> | null = null;
  private seqPlaying = false;
  private seqListeners = new Set<(playing: boolean) => void>();

  /** Subscribe to sequence play/stop changes; returns an unsubscribe fn. */
  onSequenceChange(listener: (playing: boolean) => void): () => void {
    this.seqListeners.add(listener);
    return () => this.seqListeners.delete(listener);
  }

  isSequencePlaying(): boolean {
    return this.seqPlaying;
  }

  private setSeqPlaying(playing: boolean): void {
    if (this.seqPlaying === playing) return;
    this.seqPlaying = playing;
    this.seqListeners.forEach((l) => l(playing));
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();

      const master = this.ctx.createGain();
      master.gain.value = 0.5;

      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 24;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;

      master.connect(limiter);
      limiter.connect(this.ctx.destination);
      this.master = master;
    }
    return this.ctx;
  }

  /** Some browsers start the context suspended until a user gesture. Never rejects. */
  async resume(): Promise<void> {
    try {
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended') await ctx.resume();
    } catch {
      /* no audio available / no user gesture yet */
    }
  }

  private disposeVoice(voice: Voice): void {
    clearTimeout(voice.teardown);
    try {
      voice.oscillators.forEach((o) => o.disconnect());
      voice.nodes.forEach((n) => n.disconnect());
      voice.amp.disconnect();
    } catch {
      /* already torn down */
    }
    this.voices.delete(voice);
    if (voice.stringIndex >= 0 && this.stringVoices[voice.stringIndex] === voice) {
      this.stringVoices[voice.stringIndex] = null;
    }
  }

  /** Quickly damp a ringing voice starting at time `at` (a string being re-plucked). */
  private dampVoice(voice: Voice, at: number, release = 0.025): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const gain = voice.amp.gain;
      // cancelAndHoldAtTime anchors the param at its in-progress value so a damp
      // landing mid-attack fades from the audible level rather than popping.
      if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(at);
      else gain.cancelScheduledValues(at);
      gain.setTargetAtTime(0.0001, at, release / 3);
      voice.oscillators.forEach((o) => {
        try {
          o.stop(at + release + 0.04);
        } catch {
          /* not started / already stopped */
        }
      });
    } catch {
      /* ignore */
    }
    clearTimeout(voice.teardown);
    voice.teardown = setTimeout(
      () => this.disposeVoice(voice),
      Math.max(0, (at - ctx.currentTime + release + 0.15) * 1000),
    );
  }

  /** Build and schedule a pluck voice; returns it so the caller can track it. */
  private buildVoice(midi: number, when: number, duration: number, stringIndex: number): Voice {
    const ctx = this.ensureContext();
    const freq = midiToFreq(midi);
    const nyquist = ctx.sampleRate / 2;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    const openFreq = Math.min(freq * 6 + 1500, nyquist - 1000);
    const closeFreq = Math.min(freq * 2 + 300, nyquist - 1000);
    filter.frequency.setValueAtTime(openFreq, when);
    filter.frequency.exponentialRampToValueAtTime(closeFreq, when + duration * 0.9);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.28, when + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    filter.connect(amp);
    amp.connect(this.master!);

    const oscillators: OscillatorNode[] = [];
    const partialGains: AudioNode[] = [];
    for (const partial of PARTIALS) {
      const partialFreq = freq * partial.ratio;
      if (partialFreq >= nyquist) continue;
      const osc = ctx.createOscillator();
      osc.type = partial.type;
      osc.frequency.value = partialFreq;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(partial.gain, when);
      pg.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, partial.gain * 0.04),
        when + duration * (partial.ratio === 1 ? 1 : 0.5),
      );
      osc.connect(pg);
      pg.connect(filter);
      osc.start(when);
      osc.stop(when + duration + 0.05);
      oscillators.push(osc);
      partialGains.push(pg);
    }

    const voice: Voice = {
      amp,
      oscillators,
      nodes: [filter, ...partialGains],
      stringIndex,
      teardown: setTimeout(
        () => this.disposeVoice(voice),
        Math.max(0, (when - ctx.currentTime + duration + 0.2) * 1000),
      ),
    };
    this.voices.add(voice);
    return voice;
  }

  /** Pluck a specific string: damps that string's previous note, lets others ring. */
  private pluckString(stringIndex: number, midi: number, when: number, duration = DEFAULT_SUSTAIN): void {
    const prev = this.stringVoices[stringIndex];
    if (prev) this.dampVoice(prev, when);
    this.stringVoices[stringIndex] = this.buildVoice(midi, when, duration, stringIndex);
  }

  /** A stable key identifying a chord voicing (string set + active frets). */
  private chordSignature(fingering: Fingering, stringSet: StringSet): string {
    return `${stringSet}:${activeStrings(stringSet)
      .map((s) => fingering.frets[s] ?? 'x')
      .join(',')}`;
  }

  /** Damp every ringing guitar string (0-5); the bass slot (6) is left alone. */
  private muteStrings(at: number): void {
    for (let s = 0; s < 6; s++) {
      const voice = this.stringVoices[s];
      if (voice) {
        this.dampVoice(voice, at);
        this.stringVoices[s] = null;
      }
    }
  }

  /**
   * Called as a chord is about to sound: if it differs from the chord currently
   * ringing, mute all the previous chord's strings (a clean chord change). The
   * same chord re-triggered keeps the per-string ring-out behaviour.
   */
  private beforeChord(fingering: Fingering, stringSet: StringSet, at: number): void {
    const sig = this.chordSignature(fingering, stringSet);
    if (this.lastChordSig !== null && this.lastChordSig !== sig) this.muteStrings(at);
    this.lastChordSig = sig;
  }

  /** Strum the played notes of a fingering starting at `when` (internal). */
  private strumAt(fingering: Fingering, stringSet: StringSet, when: number, strum = 0.045): void {
    this.beforeChord(fingering, stringSet, when);
    let voice = 0;
    for (const stringIndex of activeStrings(stringSet)) {
      const fret = fingering.frets[stringIndex];
      if (fret === null || fret === undefined) continue;
      this.pluckString(stringIndex, frettedMidi(stringIndex, fret), when + voice * strum);
      voice += 1;
    }
  }

  /** Cancel any running sequence loop (but let ringing strings decay naturally). */
  private cancelSequence(): void {
    this.seqToken += 1;
    if (this.seqTimer !== null) {
      clearTimeout(this.seqTimer);
      this.seqTimer = null;
    }
    this.setSeqPlaying(false);
  }

  /** Hard stop: damp every string and cancel any sequence. */
  stopAll(): void {
    this.cancelSequence();
    this.lastChordSig = null;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of [...this.voices]) this.dampVoice(voice, now);
  }

  /** Public alias for stopping playback (e.g. a Stop button). */
  stop(): void {
    this.stopAll();
  }

  /**
   * Strum a single chord. `spread` is the seconds between strings (0 = all
   * notes together / block chord). Each string interrupts only its own note.
   */
  async playFingering(fingering: Fingering, stringSet: StringSet, spread = 0.045): Promise<void> {
    try {
      await this.resume();
      this.cancelSequence();
      this.strumAt(fingering, stringSet, this.ensureContext().currentTime + 0.02, spread);
    } catch {
      /* no audio available */
    }
  }

  /** Play a single MIDI note (stringless, used for melody preview). */
  async playNote(midi: number, duration = DEFAULT_SUSTAIN): Promise<void> {
    try {
      await this.resume();
      this.cancelSequence();
      this.buildVoice(midi, this.ensureContext().currentTime + 0.02, duration, -1);
    } catch {
      /* no audio available */
    }
  }

  /** Active strings of a fingering, low→high, with their MIDI pitch. */
  private orderedStrings(fingering: Fingering, stringSet: StringSet): { stringIndex: number; midi: number }[] {
    return activeStrings(stringSet)
      .filter((s) => fingering.frets[s] !== null && fingering.frets[s] !== undefined)
      .map((s) => ({ stringIndex: s, midi: frettedMidi(s, fingering.frets[s]!) }))
      .sort((a, b) => a.midi - b.midi);
  }

  /**
   * Phase 1 of a press-and-hold strum: pluck the lowest string immediately and
   * let it ring (a long sustain) while the player decides how long to hold.
   */
  async strumLead(fingering: Fingering, stringSet: StringSet): Promise<void> {
    try {
      await this.resume();
      this.cancelSequence();
      const strings = this.orderedStrings(fingering, stringSet);
      if (strings.length === 0) return;
      const at = this.ensureContext().currentTime + 0.02;
      this.beforeChord(fingering, stringSet, at);
      this.pluckString(strings[0].stringIndex, strings[0].midi, at, DEFAULT_SUSTAIN + 1);
    } catch {
      /* no audio available */
    }
  }

  /**
   * Phase 2: on release, roll the remaining strings out over `totalSeconds`
   * (the time the lead note was held). A very short hold plays them together.
   */
  async strumRest(fingering: Fingering, stringSet: StringSet, totalSeconds: number): Promise<void> {
    try {
      await this.resume();
      const rest = this.orderedStrings(fingering, stringSet).slice(1);
      if (rest.length === 0) return;
      const start = this.ensureContext().currentTime + 0.02;
      const span = Math.max(0, totalSeconds);
      const BLOCK_MAX = 0.12;
      const spacing = span <= BLOCK_MAX || rest.length < 2 ? 0 : span / (rest.length - 1);
      const dur = Math.min(5, Math.max(2, spacing * 1.5 + 1.6));
      rest.forEach(({ stringIndex, midi }, i) => this.pluckString(stringIndex, midi, start + i * spacing, dur));
    } catch {
      /* no audio available */
    }
  }

  /**
   * Play a list of chords in time, one strum every `gapSeconds`. A single
   * cancellable scheduler: pressing again restarts cleanly. Each chord change
   * interrupts the strings it re-plucks (per-string monophony).
   */
  async playSequence(chords: SequenceChordInput[], gapSeconds = 0.7): Promise<void> {
    try {
      await this.resume();
      this.cancelSequence();
      if (chords.length === 0) return;
      const ctx = this.ensureContext();
      const token = ++this.seqToken;
      this.setSeqPlaying(true);
      let i = 0;
      const tick = () => {
        if (token !== this.seqToken) return; // superseded / stopped
        const chord = chords[i];
        i += 1;
        this.strumAt(chord.fingering, chord.stringSet, ctx.currentTime + 0.02);
        if (i < chords.length) {
          this.seqTimer = setTimeout(tick, gapSeconds * 1000);
        } else {
          this.seqTimer = null;
          this.setSeqPlaying(false);
        }
      };
      tick();
    } catch {
      /* no audio available */
    }
  }

  /** A short metronome click; accented (louder/higher) on the downbeat. */
  private metronomeClick(when: number, accent: boolean): void {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = accent ? 2000 : 1300;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(accent ? 0.4 : 0.22, when + 0.001);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(amp);
    amp.connect(this.master!);
    osc.start(when);
    osc.stop(when + 0.06);
    const voice: Voice = {
      amp,
      oscillators: [osc],
      nodes: [],
      stringIndex: -1,
      teardown: setTimeout(
        () => this.disposeVoice(voice),
        Math.max(0, (when - ctx.currentTime + 0.06 + 0.15) * 1000),
      ),
    };
    this.voices.add(voice);
  }

  /**
   * Play a chart respecting bar/beat placement at a given tempo. Chords strum on
   * their beat; an optional metronome clicks every beat and an optional bass
   * line plucks the root (monophonic) under each chord. A drift-corrected
   * per-beat scheduler drives it; cancellable like any sequence.
   */
  async playArrangement(events: ArrangementEvent[], options: ArrangementOptions): Promise<void> {
    try {
      await this.resume();
      this.cancelSequence();
      if (events.length === 0) return;
      const ctx = this.ensureContext();
      const bpm = Math.max(20, options.bpm);
      const beatsPerBar = options.beatsPerBar ?? 4;
      const spb = 60 / bpm; // seconds per beat
      const totalBeats = arrangementSpanBeats(events);
      const token = ++this.seqToken;
      this.setSeqPlaying(true);
      const t0 = performance.now();

      const scheduleBeat = (beat: number) => {
        if (token !== this.seqToken) return;
        const at = ctx.currentTime + 0.06;
        if (options.metronome) this.metronomeClick(at, beat % beatsPerBar === 0);
        for (const e of events) {
          if (e.startBeat !== beat) continue;
          this.strumAt(e.fingering, e.stringSet, at, 0.02);
          if (options.bassline) {
            const dur = Math.min(5, Math.max(1.4, e.durationBeats * spb + 0.6));
            this.pluckString(6, e.bassMidi, at, dur);
          }
        }
        const next = beat + 1;
        if (next < totalBeats) {
          const targetMs = t0 + next * spb * 1000;
          this.seqTimer = setTimeout(() => scheduleBeat(next), Math.max(0, targetMs - performance.now()));
        } else {
          this.seqTimer = null;
          this.setSeqPlaying(false);
        }
      };
      scheduleBeat(0);
    } catch {
      /* no audio available */
    }
  }

  /** Play a bare list of MIDI notes (stringless). */
  async playMidi(notes: number[], strum = 0.0): Promise<void> {
    try {
      await this.resume();
      this.cancelSequence();
      const start = this.ensureContext().currentTime + 0.02;
      notes.forEach((midi, i) => this.buildVoice(midi, start + i * strum, DEFAULT_SUSTAIN, -1));
    } catch {
      /* no audio available */
    }
  }

  /** Release the audio context and any pending teardown timers. */
  dispose(): void {
    this.cancelSequence();
    this.voices.forEach((v) => clearTimeout(v.teardown));
    this.voices.clear();
    this.stringVoices = [null, null, null, null, null, null, null];
    this.lastChordSig = null;
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
  }
}

let shared: ChordPlayer | null = null;
export function getChordPlayer(): ChordPlayer {
  if (!shared) shared = new ChordPlayer();
  return shared;
}
