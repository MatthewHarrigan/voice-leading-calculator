// A small, dependency-free plucked-string synth on the Web Audio API.
//
// Each note is a short additive pluck: a fundamental plus a couple of quieter,
// faster-decaying partials, shaped by a low-pass filter that closes over the
// note (the classic "pluck" brightness decay) and a fast-attack / exponential
// release amplitude envelope. A gentle limiter on the master bus keeps strummed
// chords from clipping or sounding harsh. No samples, no network, always in tune.

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

export class ChordPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();

      const master = this.ctx.createGain();
      master.gain.value = 0.5;

      // Soft limiter so a full 4-note strum stays clean.
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

  /** Pluck a single MIDI note with an additive, decaying tone. */
  private pluck(midi: number, when: number, duration = 1.7): void {
    const ctx = this.ensureContext();
    const freq = midiToFreq(midi);
    const nyquist = ctx.sampleRate / 2;

    // Low-pass that opens on attack then closes — gives the plucked brightness sweep.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    const openFreq = Math.min(freq * 6 + 1500, nyquist - 1000);
    const closeFreq = Math.min(freq * 2 + 300, nyquist - 1000);
    filter.frequency.setValueAtTime(openFreq, when);
    filter.frequency.exponentialRampToValueAtTime(closeFreq, when + duration * 0.9);

    // Amplitude envelope: quick attack, exponential release.
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.28, when + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    filter.connect(amp);
    amp.connect(this.master!);

    const oscillators: OscillatorNode[] = [];
    for (const partial of PARTIALS) {
      const partialFreq = freq * partial.ratio;
      if (partialFreq >= nyquist) continue;
      const osc = ctx.createOscillator();
      osc.type = partial.type;
      osc.frequency.value = partialFreq;
      const pg = ctx.createGain();
      // Higher partials fade faster, like a real string.
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
    }

    const cleanupAt = (when - ctx.currentTime + duration + 0.2) * 1000;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      try {
        oscillators.forEach((o) => o.disconnect());
        filter.disconnect();
        amp.disconnect();
      } catch {
        /* already torn down */
      }
    }, Math.max(0, cleanupAt));
    this.timers.add(timer);
  }

  /** Strum the played notes of a fingering, low to high. */
  async playFingering(fingering: Fingering, stringSet: StringSet, strum = 0.045): Promise<void> {
    try {
      await this.resume();
      const ctx = this.ensureContext();
      const start = ctx.currentTime + 0.03;
      let voice = 0;
      for (const stringIndex of activeStrings(stringSet)) {
        const fret = fingering.frets[stringIndex];
        if (fret === null || fret === undefined) continue;
        this.pluck(frettedMidi(stringIndex, fret), start + voice * strum);
        voice += 1;
      }
    } catch {
      /* no audio available */
    }
  }

  /** Play a bare list of MIDI notes (used for melody preview). */
  async playMidi(notes: number[], strum = 0.0): Promise<void> {
    try {
      await this.resume();
      const ctx = this.ensureContext();
      const start = ctx.currentTime + 0.03;
      notes.forEach((midi, i) => this.pluck(midi, start + i * strum));
    } catch {
      /* no audio available */
    }
  }

  /** Release the audio context and any pending teardown timers. */
  dispose(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
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
