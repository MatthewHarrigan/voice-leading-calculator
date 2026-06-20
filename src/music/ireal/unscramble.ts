// Byte-exact de-obfuscation of the iReal Pro `irealb://` music payload.
//
// The newer `irealb://` scheme scrambles the chord string and prefixes it with
// `1r34LbKcu7`. The body is processed in 50-character blocks; each block swaps
// two index ranges (0..4 ↔ 49..45 and 10..23 ↔ 39..26). The final block of
// length ≤ 51 is left untouched. After unscrambling, three compressed
// abbreviations are expanded: `Kcl`→`| x`, `LZ`→` |`, `XyQ`→`   `.
//
// The swap is its own inverse, so the same routine both scrambles and
// unscrambles a block — `scramble` below reuses it for serialization.
//
// Algorithm credited to Stephen Irons' Lua parser (ironss/accompaniser) and
// matched against infojunkie/ireal-musicxml and pianosnake/ireal-reader.

export const MUSIC_PREFIX = '1r34LbKcu7';

/** Swap the two obfuscation index ranges within a single 50-character block. */
function obfusc50(s: string): string {
  const out = s.split('');
  // First 5 chars swap with the last 5.
  for (let i = 0; i < 5; i++) {
    out[49 - i] = s[i];
    out[i] = s[49 - i];
  }
  // Chars 10..23 swap with 39..26.
  for (let i = 10; i < 24; i++) {
    out[49 - i] = s[i];
    out[i] = s[49 - i];
  }
  return out.join('');
}

/** Reverse the block obfuscation only (no abbreviation substitution). */
function deobfuscateBlocks(input: string): string {
  let s = input;
  let r = '';
  while (s.length > 51) {
    r += obfusc50(s.substring(0, 50));
    s = s.substring(50);
  }
  return r + s;
}

/**
 * Unscramble an `irealb://` music payload (with or without the `1r34LbKcu7`
 * prefix) into the plain token string, expanding the compressed abbreviations.
 */
export function unscramble(payload: string): string {
  const body = payload.startsWith(MUSIC_PREFIX) ? payload.slice(MUSIC_PREFIX.length) : payload;
  const r = deobfuscateBlocks(body);
  return r.replace(/Kcl/g, '| x').replace(/LZ/g, ' |').replace(/XyQ/g, '   ');
}

/**
 * Scramble a plain token string back into an `irealb://` payload body (without
 * the prefix). The block swap is self-inverse, so we reuse it directly. We do
 * NOT re-introduce the `Kcl`/`LZ`/`XyQ` abbreviations — iReal Pro reads the
 * expanded tokens fine, and avoiding them keeps the round-trip lossless.
 */
export function scramble(tokens: string): string {
  return deobfuscateBlocks(tokens);
}
