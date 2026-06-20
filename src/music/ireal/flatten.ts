// Expand an iReal Pro chart's notation into a linear performance order.
//
// Resolves one/two-bar repeats, then runs a small sequencer-style interpreter
// that follows repeat barlines, 1st/2nd/3rd endings (voltas), and the common
// navigation directives (D.C. / D.S. al Coda / al Fine, To Coda, Fine). The
// result is a flat list of measures with concrete chords, ready to drive
// diagrams, the voice-leading optimiser, and playback.

import { uid } from '../song';
import type { IRealChord, IRealChart, IRealMeasure } from './types';

const GUARD_LIMIT = 100000;

function cloneChords(chords: IRealChord[]): IRealChord[] {
  return chords.map((c) => ({ ...c, id: uid('c'), alternate: c.alternate ? { ...c.alternate } : c.alternate }));
}

/** Replace one/two-bar repeat measures with copies of the preceding measure(s). */
export function resolveBarRepeats(measures: IRealMeasure[]): IRealMeasure[] {
  const out: IRealMeasure[] = [];
  for (let i = 0; i < measures.length; i++) {
    const m = measures[i];
    if (m.barRepeat && m.chords.length === 0) {
      const back = m.barRepeat === 2 ? 2 : 1;
      const src = out[out.length - back] ?? out[out.length - 1];
      const chords = src ? cloneChords(src.chords) : [];
      const { barRepeat, ...rest } = m;
      void barRepeat;
      out.push({ ...rest, chords });
    } else {
      out.push(m);
    }
  }
  return out;
}

/** Number of times a repeat block beginning at `start` should play. */
function passesFor(measures: IRealMeasure[], start: number): number {
  let maxEnding = 0;
  let override = 0;
  let seenClose = false;
  for (let i = start; i < measures.length; i++) {
    const m = measures[i];
    if (i > start && m.open === 'repeat') break; // a new repeat block begins
    if (m.ending != null) maxEnding = Math.max(maxEnding, m.ending);
    const sm = /(\d+)x/.exec(m.staffText ?? '');
    if (sm) override = Math.max(override, parseInt(sm[1], 10));
    if (m.close === 'repeat') {
      seenClose = true;
      continue;
    }
    if (seenClose && m.ending == null) break; // past the trailing voltas
  }
  return override > 0 ? override : Math.max(2, maxEnding);
}

interface RepeatFrame {
  start: number;
  count: number;
  passes: number;
}

/** Skip a volta whose number does not match the current pass. */
function skipVolta(measures: IRealMeasure[], from: number, stack: RepeatFrame[]): number {
  let pc = from;
  while (pc < measures.length) {
    const m = measures[pc];
    if (m.close === 'repeat') {
      if (stack.length) stack.pop(); // crossing the repeat barline exits the block
      return pc + 1;
    }
    pc++;
    const next = measures[pc];
    if (next && next.ending != null) return pc; // reached the next volta
  }
  return pc;
}

export interface FlattenOptions {
  /** Repeat the whole expanded form this many times (for looped playback). */
  wholeRepeats?: number;
}

/** Expand bar-repeats, repeats, endings and navigation into performance order. */
export function flattenMeasures(measures: IRealMeasure[]): IRealMeasure[] {
  const resolved = resolveBarRepeats(measures);
  const out: IRealMeasure[] = [];
  const stack: RepeatFrame[] = [];

  const codaIndices = resolved.map((m, i) => (m.coda ? i : -1)).filter((i) => i >= 0);
  const toCodaIndex = codaIndices[0] ?? -1;
  const codaTargetIndex = codaIndices.length > 1 ? codaIndices[codaIndices.length - 1] : -1;
  const segnoIndex = resolved.findIndex((m) => m.segno);
  const fineIndex = resolved.findIndex((m) => /fine/i.test(m.directive ?? ''));

  let armedToCoda = false;
  let stopAtFine = false;
  let pc = 0;
  let guard = 0;

  while (pc < resolved.length && guard++ < GUARD_LIMIT) {
    const m = resolved[pc];
    // Open a repeat frame only on first entry — not when we jump back to it
    // (the frame is still on the stack and tracks the pass count).
    if (m.open === 'repeat' && (stack.length === 0 || stack[stack.length - 1].start !== pc)) {
      stack.push({ start: pc, count: 0, passes: passesFor(resolved, pc) });
    }

    // Volta: skip a bracket that does not belong to the current pass.
    if (m.ending != null && stack.length) {
      const pass = stack[stack.length - 1].count + 1;
      if (m.ending !== pass) {
        pc = skipVolta(resolved, pc, stack);
        continue;
      }
    }

    out.push(m);

    // "To Coda" jump (armed by a prior D.C./D.S. al Coda).
    if (armedToCoda && pc === toCodaIndex && codaTargetIndex >= 0) {
      armedToCoda = false;
      pc = codaTargetIndex;
      continue;
    }
    if (stopAtFine && pc === fineIndex) break;

    const dir = m.directive ?? '';
    if (/D\.S\./i.test(dir)) {
      if (/Coda/i.test(dir)) armedToCoda = true;
      if (/Fine/i.test(dir)) stopAtFine = true;
      if (segnoIndex >= 0) {
        pc = segnoIndex;
        continue;
      }
    } else if (/D\.C\./i.test(dir)) {
      if (/Coda/i.test(dir)) armedToCoda = true;
      if (/Fine/i.test(dir)) stopAtFine = true;
      pc = 0;
      continue;
    }

    if (m.close === 'repeat' && stack.length) {
      const top = stack[stack.length - 1];
      top.count += 1;
      if (top.count < top.passes) {
        pc = top.start;
        continue;
      }
      stack.pop();
    }
    pc += 1;
  }

  return out;
}

/** Flatten a whole chart (optionally repeating the entire form). */
export function flattenChart(chart: IRealChart, options: FlattenOptions = {}): IRealMeasure[] {
  const once = flattenMeasures(chart.measures);
  const reps = Math.max(1, options.wholeRepeats ?? 1);
  if (reps === 1) return once;
  const out: IRealMeasure[] = [];
  for (let r = 0; r < reps; r++) {
    once.forEach((m) => out.push({ ...m, id: uid('m'), chords: cloneChords(m.chords) }));
  }
  return out;
}
