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

// 50ms of 8-bit silence. Looping this through an <audio> element promotes the
// page from iOS's "ambient" audio session (muted by the ringer switch) to a
// "playback" session, so Web Audio actually sounds on a silenced iPhone.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

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
  /** Low MIDI pitch of the chord root — legacy single-root bass fallback. */
  bassMidi?: number;
}

/** One note of a precomputed walking bass line, keyed by absolute in-form beat. */
export interface BassTrackNote {
  midi: number;
  /** Absolute in-form beat onset; fractional for off-beat embellishments. */
  beat: number;
  durationBeats: number;
  /** Loudness 0–1 (ghost notes < 1). Default 1. */
  velocity?: number;
}

export interface ArrangementOptions {
  bpm: number;
  beatsPerBar?: number;
  metronome?: boolean;
  bassline?: boolean;
  /** When true (with bassline), play only the bass — mute the chord strums. */
  soloBass?: boolean;
  /**
   * Precomputed walking bass line for the whole form (one note per beat / two
   * beats). When present it drives the bass instead of the per-event root, so a
   * live style change just swaps this array.
   */
  bassNotes?: BassTrackNote[];
  /** Swing the eighth-note offbeats of the bass line (delays each "and"). */
  swing?: boolean;
  /** When true, loop the whole arrangement until stopped. */
  loop?: boolean;
  /** Play the whole form this many times before stopping (ignored when loop). */
  loopCount?: number;
  /** Click one bar of metronome before the form starts (even with metronome off). */
  countIn?: boolean;
}

export type TransportState = 'idle' | 'playing' | 'paused';

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
  // Live playback options for the running arrangement; the scheduler reads these
  // each beat so tempo / metronome / bass / solo / loop update mid-playback.
  private liveOptions: ArrangementOptions | null = null;
  // Current in-form beat during arrangement playback (-1 when idle), for a playhead.
  private beatListeners = new Set<(beat: number) => void>();
  private transport: TransportState = 'idle';
  private transportListeners = new Set<(state: TransportState) => void>();
  // Handles into the running arrangement's closure so pause/resume can freeze
  // the scheduler and restart its clock without losing its place.
  private arrControl: { schedule: (abs: number) => void; resetClock: () => void; nextAbs: number } | null = null;
  // One-shot: after a resume, the next beat re-strikes chords still sounding at
  // that beat (not just ones that start on it), so playback picks up audibly.
  private resumeRestrike = false;

  /** Subscribe to the current playback beat (-1 when idle). Returns an unsubscribe fn. */
  onBeat(listener: (beat: number) => void): () => void {
    this.beatListeners.add(listener);
    return () => this.beatListeners.delete(listener);
  }

  private emitBeat(beat: number): void {
    this.beatListeners.forEach((l) => {
      try {
        l(beat);
      } catch {
        /* ignore listener errors */
      }
    });
  }

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

  /** Subscribe to transport changes (idle / playing / paused); returns an unsubscribe fn. */
  onTransportChange(listener: (state: TransportState) => void): () => void {
    this.transportListeners.add(listener);
    return () => this.transportListeners.delete(listener);
  }

  getTransportState(): TransportState {
    return this.transport;
  }

  private setTransport(state: TransportState): void {
    if (this.transport === state) return;
    this.transport = state;
    this.transportListeners.forEach((l) => l(state));
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

  // Silent looping <audio> that holds the iOS "playback" session (see SILENT_WAV).
  private sessionKeeper: HTMLAudioElement | null = null;

  /**
   * On touch devices, loop a silent <audio> element so the OS treats the page
   * as media playback — otherwise the iPhone ringer switch mutes all Web
   * Audio. Must be called from inside a user gesture; failures are ignored
   * and retried on the next gesture.
   */
  private ensurePlaybackSession(): void {
    if (this.sessionKeeper) return;
    if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) return;
    try {
      const audio = document.createElement('audio');
      audio.setAttribute('playsinline', '');
      audio.loop = true;
      audio.preload = 'auto';
      audio.src = SILENT_WAV;
      this.sessionKeeper = audio;
      audio.play().catch(() => {
        this.sessionKeeper = null; // no activation yet — retry on a later gesture
      });
    } catch {
      this.sessionKeeper = null;
    }
  }

  /**
   * Some browsers start the context suspended until a user gesture, and iOS
   * additionally parks it as "interrupted" after a call / lock screen. Never
   * rejects.
   */
  async resume(): Promise<void> {
    try {
      this.ensurePlaybackSession();
      const ctx = this.ensureContext();
      if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') await ctx.resume();
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
  private buildVoice(midi: number, when: number, duration: number, stringIndex: number, gain = 1): Voice {
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
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.28 * gain), when + 0.006);
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
  private pluckString(stringIndex: number, midi: number, when: number, duration = DEFAULT_SUSTAIN, gain = 1): void {
    const prev = this.stringVoices[stringIndex];
    if (prev) this.dampVoice(prev, when);
    this.stringVoices[stringIndex] = this.buildVoice(midi, when, duration, stringIndex, gain);
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
    this.liveOptions = null;
    this.arrControl = null;
    this.resumeRestrike = false;
    this.emitBeat(-1);
    this.setSeqPlaying(false);
    this.setTransport('idle');
  }

  /**
   * Freeze the running arrangement at the next beat boundary. Ringing strings
   * are damped; the scheduler's place is kept so resume() picks up exactly
   * where it left off. The sequence still counts as "playing" while paused.
   */
  pause(): void {
    if (this.transport !== 'playing' || !this.arrControl) return;
    if (this.seqTimer !== null) {
      clearTimeout(this.seqTimer);
      this.seqTimer = null;
    }
    if (this.ctx) {
      const now = this.ctx.currentTime;
      for (let s = 0; s <= 6; s++) {
        const voice = this.stringVoices[s];
        if (voice) {
          this.dampVoice(voice, now);
          this.stringVoices[s] = null;
        }
      }
    }
    this.lastChordSig = null;
    this.setTransport('paused');
  }

  /** Continue a paused arrangement from the beat it stopped before. */
  resumePlayback(): void {
    const control = this.arrControl;
    if (this.transport !== 'paused' || !control) return;
    this.setTransport('playing');
    this.resumeRestrike = true;
    control.resetClock();
    control.schedule(control.nextAbs);
  }

  /**
   * Update the running arrangement's options live (tempo, metronome, bass line,
   * bass solo, loop). A no-op when nothing is playing — changes then apply on
   * the next Play.
   */
  setArrangementOptions(patch: Partial<ArrangementOptions>): void {
    if (this.liveOptions) Object.assign(this.liveOptions, patch);
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
      this.liveOptions = { ...options, beatsPerBar: options.beatsPerBar ?? 4 };
      const totalBeats = arrangementSpanBeats(events);
      const token = ++this.seqToken;
      this.setSeqPlaying(true);
      this.setTransport('playing');
      // Incremental beat grid (target time advances by the *current* seconds-per-
      // beat) so a live tempo change re-times from the next beat without a jump.
      let nextTime = performance.now();

      // `abs` is an ever-increasing beat counter so looping stays drift-free.
      // A count-in starts it negative: those beats click but play nothing.
      const scheduleBeat = (abs: number) => {
        if (token !== this.seqToken) return;
        const opts = this.liveOptions;
        if (!opts) return;
        const spb = 60 / Math.max(20, opts.bpm); // seconds per beat
        const beatsPerBar = opts.beatsPerBar ?? 4;
        const at = ctx.currentTime + 0.06;

        if (abs < 0) {
          // Count-in bar: metronome only, accented on its first beat.
          this.metronomeClick(at, abs === -beatsPerBar);
          this.arrControl!.nextAbs = abs + 1;
          nextTime += spb * 1000;
          this.seqTimer = setTimeout(() => scheduleBeat(abs + 1), Math.max(0, nextTime - performance.now()));
          return;
        }

        // Wrap the beat to the form length so every pass (loop or finite repeat)
        // re-fires the chart's events and re-drives the playhead.
        const passes = opts.loop ? Infinity : Math.max(1, opts.loopCount ?? 1);
        const beat = abs % totalBeats;
        this.emitBeat(beat);
        if (opts.metronome) this.metronomeClick(at, beat % beatsPerBar === 0);
        const restrike = this.resumeRestrike;
        this.resumeRestrike = false;
        const soloing = !!(opts.bassline && opts.soloBass);
        if (!soloing) {
          for (const e of events) {
            const sounding = restrike && e.startBeat < beat && e.startBeat + e.durationBeats > beat;
            if (e.startBeat !== beat && !sounding) continue;
            this.strumAt(e.fingering, e.stringSet, at, 0.02);
          }
        }
        if (opts.bassline) {
          if (opts.bassNotes && opts.bassNotes.length) {
            // The walking line: pluck whichever note(s) fall inside this beat's
            // window [beat, beat+1). Fractional onsets (anticipations, ghost
            // skips) schedule partway through; swing delays the "and".
            for (const bn of opts.bassNotes) {
              let offset = bn.beat - beat;
              if (offset < -0.001 || offset >= 0.999) continue;
              if (opts.swing && Math.abs(offset - 0.5) < 0.02) offset = 2 / 3; // swung eighth
              const dur =
                bn.durationBeats >= 1
                  ? Math.min(5, Math.max(1.2, bn.durationBeats * spb + 0.5))
                  : Math.max(0.18, bn.durationBeats * spb);
              this.pluckString(6, bn.midi, at + offset * spb, dur, bn.velocity ?? 1);
            }
          } else {
            // Legacy fallback: one held root per chord event.
            for (const e of events) {
              if (e.startBeat !== beat || e.bassMidi == null) continue;
              const dur = Math.min(5, Math.max(1.4, e.durationBeats * spb + 0.6));
              this.pluckString(6, e.bassMidi, at, dur);
            }
          }
        }
        const next = abs + 1;
        if (next < totalBeats * passes) {
          this.arrControl!.nextAbs = next;
          nextTime += spb * 1000;
          this.seqTimer = setTimeout(() => scheduleBeat(next), Math.max(0, nextTime - performance.now()));
        } else {
          this.seqTimer = null;
          this.liveOptions = null;
          this.arrControl = null;
          this.emitBeat(-1);
          this.setSeqPlaying(false);
          this.setTransport('idle');
        }
      };
      this.arrControl = {
        schedule: scheduleBeat,
        resetClock: () => {
          nextTime = performance.now();
        },
        nextAbs: 0,
      };
      scheduleBeat(options.countIn ? -(options.beatsPerBar ?? 4) : 0);
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
    if (this.sessionKeeper) {
      this.sessionKeeper.pause();
      this.sessionKeeper.src = '';
      this.sessionKeeper = null;
    }
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
