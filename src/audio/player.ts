// A tiny dependency-free plucked-string synth built on the Web Audio API.
//
// We use Karplus-Strong synthesis (a short burst of noise fed through a tuned
// delay line with light low-pass damping) which gives a convincingly guitar-like
// pluck without any samples or external libraries. Each played string is offset
// slightly in time to imitate a strum.

import { frettedMidi, type StringSet, activeStrings } from '@/music/tuning';
import type { Fingering } from '@/music/voicing';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class ChordPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
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

  /** Pluck a single MIDI note. */
  private pluck(midi: number, when: number, duration = 1.6): void {
    const ctx = this.ensureContext();
    const freq = midiToFreq(midi);
    const sampleRate = ctx.sampleRate;
    const noiseLength = Math.floor(sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, noiseLength, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Tuned comb/delay line = the "string".
    const delay = ctx.createDelay();
    delay.delayTime.value = 1 / freq;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.96;
    const damping = ctx.createBiquadFilter();
    damping.type = 'lowpass';
    damping.frequency.value = Math.min(freq * 6 + 800, sampleRate / 2 - 1000);

    const body = ctx.createBiquadFilter();
    body.type = 'bandpass';
    body.frequency.value = 400;
    body.Q.value = 0.7;

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(0.5, when + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    source.connect(delay);
    delay.connect(damping);
    damping.connect(feedback);
    feedback.connect(delay);
    damping.connect(body);
    body.connect(amp);
    amp.connect(this.master!);

    source.start(when);
    source.stop(when + 0.05);
    window.setTimeout(() => {
      try {
        source.disconnect();
        delay.disconnect();
        feedback.disconnect();
        damping.disconnect();
        body.disconnect();
        amp.disconnect();
      } catch {
        /* already torn down */
      }
    }, (when - ctx.currentTime + duration + 0.2) * 1000);
  }

  /** Strum the played notes of a fingering, low to high. */
  async playFingering(fingering: Fingering, stringSet: StringSet, strum = 0.035): Promise<void> {
    try {
      await this.resume();
      const ctx = this.ensureContext();
      const start = ctx.currentTime + 0.02;
      const strings = activeStrings(stringSet);
      let voice = 0;
      for (const stringIndex of strings) {
        const fret = fingering.frets[stringIndex];
        if (fret === null || fret === undefined) continue;
        this.pluck(frettedMidi(stringIndex, fret), start + voice * strum);
        voice += 1;
      }
    } catch {
      /* Web Audio unavailable (e.g. headless/no gesture) — fail silently. */
    }
  }

  /** Play a bare list of MIDI notes (used for melody preview). */
  async playMidi(notes: number[], strum = 0.0): Promise<void> {
    try {
      await this.resume();
      const ctx = this.ensureContext();
      const start = ctx.currentTime + 0.02;
      notes.forEach((midi, i) => this.pluck(midi, start + i * strum));
    } catch {
      /* no audio available */
    }
  }
}

let shared: ChordPlayer | null = null;
export function getChordPlayer(): ChordPlayer {
  if (!shared) shared = new ChordPlayer();
  return shared;
}
