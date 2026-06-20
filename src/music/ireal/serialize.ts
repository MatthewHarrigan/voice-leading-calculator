// Serialize an IRealChart back to an `irealb://` URL (and an iReal-style HTML
// export). The block scramble is self-inverse, so we reuse it to re-obfuscate;
// chords/barlines are emitted as plain tokens (no Kcl/LZ/XyQ abbreviations),
// which iReal Pro reads back without trouble.

import { scramble, MUSIC_PREFIX } from './unscramble';
import type { IRealChart, IRealChordRef, IRealMeasure } from './types';

function refToken(ref: IRealChordRef): string {
  return ref.root + ref.quality + (ref.bass ? `/${ref.bass}` : '');
}

function chordToken(chord: IRealMeasure['chords'][number]): string {
  if (chord.noChord) return 'n';
  let t = refToken(chord);
  if (chord.alternate) t += `(${refToken(chord.alternate)})`;
  return t;
}

function openToken(open: IRealMeasure['open']): string {
  if (open === 'repeat') return '{';
  if (open === 'double') return '[';
  return '';
}

function closeToken(close: IRealMeasure['close']): string {
  switch (close) {
    case 'final':
      return 'Z';
    case 'repeat':
      return '}';
    case 'double':
      return ']';
    default:
      return '|';
  }
}

function keyToIReal(key: string | undefined): string {
  if (!key) return 'C';
  const m = /^([A-G][#b]?)\s*(minor|min|m)?$/i.exec(key.trim());
  if (!m) return key.trim();
  return m[2] ? `${m[1]}-` : m[1];
}

/** Build the plain (unscrambled) iReal music token string for a chart. */
export function buildMusicTokens(chart: IRealChart): string {
  let out = '';
  chart.measures.forEach((m, idx) => {
    out += openToken(m.open);
    if (m.section) out += `*${m.section}`;
    if (m.timeSig) out += `T${m.timeSig[0]}${m.timeSig[1] === 8 && m.timeSig[0] === 12 ? '2' : m.timeSig[1]}`;
    if (m.ending != null) out += `N${m.ending}`;
    if (m.segno) out += 'S';
    if (m.coda) out += 'Q';
    if (m.fermata) out += 'f';
    if (m.staffText) out += `<${m.staffText}>`;
    if (m.directive) out += `<${m.directive}>`;
    if (m.barRepeat === 1) out += 'x';
    else if (m.barRepeat === 2) out += 'r';
    else out += m.chords.map(chordToken).join(',');
    const isLast = idx === chart.measures.length - 1;
    out += closeToken(m.close ?? (isLast ? 'final' : 'single'));
  });
  return out;
}

/** Serialize a chart to an `irealb://` URL. */
export function toIRealURL(chart: IRealChart): string {
  const tokens = buildMusicTokens(chart);
  const music = MUSIC_PREFIX + encodeURIComponent(scramble(tokens));
  const fields = [
    encodeURIComponent(chart.title || 'Untitled'),
    encodeURIComponent(chart.composer ?? ''),
    '',
    encodeURIComponent(chart.style ?? ''),
    encodeURIComponent(keyToIReal(chart.key)),
    '',
    music,
    encodeURIComponent(chart.style ?? ''),
    String(chart.tempo ?? 0),
    String(chart.repeats ?? 0),
  ];
  return `irealb://${fields.join('=')}===`;
}

/** An iReal-Pro-style single-song HTML export (a link plus a readable title). */
export function toIRealHTML(chart: IRealChart): string {
  const url = toIRealURL(chart);
  const title = chart.title || 'Untitled';
  const composer = chart.composer ? ` - ${chart.composer}` : '';
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${safe(title)}</title></head>
<body>
<h1>iReal Pro</h1>
<p>Song: 1</p>
<a href="${safe(url)}">${safe(title)}${safe(composer)}</a>
</body>
</html>
`;
}
