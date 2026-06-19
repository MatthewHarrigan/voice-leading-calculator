// Pure beat-grid maths for arrangement playback (no audio, unit-tested).

/** Absolute 0-based beat of a chord at (barIndex, beat) in a given metre. */
export function beatPosition(barIndex: number, beat: number, beatsPerBar = 4): number {
  return barIndex * beatsPerBar + (beat - 1);
}

/** Total beats an arrangement spans (end of the last-ending event). */
export function arrangementSpanBeats(
  events: { startBeat: number; durationBeats: number }[],
): number {
  return events.reduce((max, e) => Math.max(max, e.startBeat + Math.max(1, e.durationBeats)), 0);
}
