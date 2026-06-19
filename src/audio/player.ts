// A small, dependency-free plucked-string synth on the Web Audio API.
//
// Each note is a short additive pluck: a fundamental plus a couple of quieter,
// faster-decaying partials, shaped by a low-pass filter that closes over the
// note (the classic "pluck" brightness decay) and a fast-attack / exponential
// release amplitude envelope. A gentle limiter on the master bus keeps strummed
// chords from clipping. No samples, no network, always in tune.
//
// Only ONE thing plays at a time: every public play method first calls
// stopAll(), which fades out any sounding/scheduled voices and cancels any
// running sequence, so repeated presses never stack into overlapping audio.

import { frettedMidi, type StringSet, activeStrings } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Relative amplitude of each partial (fundamental, 2nd, 3rd harmonic).
const PARTIALS: { ratio: number; gain: number; type: OscillatorType }[] = [
  { ratio: 1, gain: 1.0, type: 'triangle' },
  { ratio: 2, gain: 0.32, type: 'sine' },
  { ratio: 3, gain: 0.12, type: 'sine' },
];

interface Voice {
  amp: GainNode;
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
  teardown: ReturnType<typeof setTimeout>;
}

export interface SequenceChordInput {
  fingering: Fingering;
  stringSet: StringSet;
}

export class ChordPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private seqToken = 0;
  private seqTimer: ReturnType<typeof setTimeout> | null = null;

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
  }

  /** Stop everything currently sounding or scheduled, and cancel any sequence. */
  stopAll(fade = 0.04): void {
    // Invalidate any running sequence loop and pending tick.
    this.seqToken += 1;
    if (this.seqTimer !== null) {
      clearTimeout(this.seqTimer);
      this.seqTimer = null;
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of [...this.voices]) {
      try {
        voice.amp.gain.cancelScheduledValues(now);
        voice.amp.gain.setTargetAtTime(0.0001, now, 0.012);
        voice.oscillators.forEach((o) => {
          try {
            o.stop(now + fade + 0.03);
          } catch {
            /* not started / already stopped */
          }
        });
      } catch {
        /* ignore */
      }
      clearTimeout(voice.teardown);
      voice.teardown = setTimeout(() => this.disposeVoice(voice), (fade + 0.2) * 1000);
    }
  }

  /** Schedule a single pluck at absolute time `when`. Does not stop other voices. */
  private pluck(midi: number, when: number, duration = 1.4): void {
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
      teardown: setTimeout(
        () => this.disposeVoice(voice),
        Math.max(0, (when - ctx.currentTime + duration + 0.2) * 1000),
      ),
    };
    this.voices.add(voice);
  }

  /** Strum the played notes of a fingering starting at `when` (internal). */
  private strumAt(fingering: Fingering, stringSet: StringSet, when: number, strum = 0.045): void {
    let voice = 0;
    for (const stringIndex of activeStrings(stringSet)) {
      const fret = fingering.frets[stringIndex];
      if (fret === null || fret === undefined) continue;
      this.pluck(frettedMidi(stringIndex, fret), when + voice * strum);
      voice += 1;
    }
  }

  /** Ascending MIDI pitches of a fingering, low to high. */
  private orderedMidi(fingering: Fingering, stringSet: StringSet): number[] {
    return activeStrings(stringSet)
      .map((s) => {
        const fret = fingering.frets[s];
        return fret === null || fret === undefined ? null : frettedMidi(s, fret);
      })
      .filter((m): m is number => m !== null)
      .sort((a, b) => a - b);
  }

  /** Strum a single chord (replaces any current playback). */
  async playFingering(fingering: Fingering, stringSet: StringSet): Promise<void> {
    try {
      await this.resume();
      this.stopAll();
      this.strumAt(fingering, stringSet, this.ensureContext().currentTime + 0.02);
    } catch {
      /* no audio available */
    }
  }

  /** Play a single MIDI note (replaces any current playback). */
  async playNote(midi: number, duration = 1.4): Promise<void> {
    try {
      await this.resume();
      this.stopAll();
      this.pluck(midi, this.ensureContext().currentTime + 0.02, duration);
    } catch {
      /* no audio available */
    }
  }

  /**
   * Single ascending arpeggio of the chord spread evenly over `totalSeconds`
   * (the gesture length). Does not loop. Replaces any current playback.
   */
  async arpeggiate(fingering: Fingering, stringSet: StringSet, totalSeconds: number): Promise<void> {
    try {
      await this.resume();
      this.stopAll();
      const ctx = this.ensureContext();
      const notes = this.orderedMidi(fingering, stringSet);
      if (notes.length === 0) return;
      const start = ctx.currentTime + 0.02;
      const span = Math.max(0, totalSeconds);
      const spacing = notes.length > 1 ? span / (notes.length - 1) : 0;
      const dur = Math.min(3.5, Math.max(1.2, spacing * 1.5 + 0.9));
      notes.forEach((midi, i) => this.pluck(midi, start + i * spacing, dur));
    } catch {
      /* no audio available */
    }
  }

  /**
   * Play a list of chords in time, one strum every `gapSeconds`. Replaces any
   * current playback; pressing again restarts cleanly (no overlap). Chords are
   * triggered just-in-time so only the current few voices are ever live.
   */
  async playSequence(chords: SequenceChordInput[], gapSeconds = 0.7): Promise<void> {
    try {
      await this.resume();
      this.stopAll();
      if (chords.length === 0) return;
      const ctx = this.ensureContext();
      const token = ++this.seqToken;
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
        }
      };
      tick();
    } catch {
      /* no audio available */
    }
  }

  /** Play a bare list of MIDI notes (replaces any current playback). */
  async playMidi(notes: number[], strum = 0.0): Promise<void> {
    try {
      await this.resume();
      this.stopAll();
      const start = this.ensureContext().currentTime + 0.02;
      notes.forEach((midi, i) => this.pluck(midi, start + i * strum));
    } catch {
      /* no audio available */
    }
  }

  /** Release the audio context and any pending teardown timers. */
  dispose(): void {
    this.stopAll();
    this.voices.forEach((v) => clearTimeout(v.teardown));
    this.voices.clear();
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
