// Parse an iReal Pro `irealb://` / `irealbook://` URL into one or more charts.
//
// The header is a list of `=`-separated fields; the music field is unscrambled
// (for `irealb://`) and tokenized into measures. Songs in a playlist are
// separated by `===`, with the playlist name trailing.

import { uid } from '../song';
import { unscramble, MUSIC_PREFIX } from './unscramble';
import { parseChordToken, prettyChordSymbol } from './chordParser';
import type { BarlineClose, BarlineOpen, IRealChart, IRealMeasure, IRealPlaylist } from './types';

const SCHEME_RE = /(irealb(?:ook)?):\/\/(.*)$/s;

/** Does this text look like an iReal Pro link? */
export function looksLikeIReal(text: string): boolean {
  return /irealb(?:ook)?:\/\//.test(text);
}

function decode(payload: string): string {
  try {
    return decodeURIComponent(payload);
  } catch {
    // Some exports double-encode or contain stray %; fall back to a lenient pass.
    return payload.replace(/%([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
}

function normalizeTitle(title: string): string {
  return title.replace(/^(.*)(, )(A|The)$/, '$3 $1').trim();
}

function normalizeComposer(composer: string): string {
  const parts = composer.trim().split(/\s+/);
  // iReal stores "Last First"; swap a simple two-name pair to "First Last".
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  return composer.trim();
}

function normalizeKey(key: string): string {
  const k = key.trim();
  if (!k) return 'C';
  if (k.endsWith('-')) return `${k.slice(0, -1)} minor`;
  return k;
}

function parseTimeSig(a: string, b: string): [number, number] {
  if (`${a}${b}` === '12') return [12, 8];
  return [parseInt(a, 10), parseInt(b, 10)];
}

const DIRECTIVE_RE = /\b(D\.C\.|D\.S\.)( al (Coda|Fine|1st End\.|2nd End\.|3rd End\.))?|Fine|To Coda/i;

/** Even-as-possible integer beat split that sums to `total` (each ≥ 1). */
function distributeBeats(n: number, total: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, k) => Math.max(1, base + (k < rem ? 1 : 0)));
}

interface PendingMeasure extends Omit<IRealMeasure, 'id'> {
  _open?: BarlineOpen;
  /** Absolute layout cell of each chord (parallel to `chords`). */
  _cells?: number[];
}

/** Tokenize the unscrambled music string into measures, preserving the cell grid. */
export function tokenizeMeasures(music: string, initialTimeSig: [number, number]): IRealMeasure[] {
  const measures: IRealMeasure[] = [];
  let running: [number, number] = initialTimeSig;
  let smallOn = false;

  // iReal Pro lays cells out 16 per row; spaces/spacers are real cells, so we
  // track an absolute cell cursor to recover line breaks and ending alignment.
  let cellCursor = 0;
  let measureStartCell = 0;

  const blank = (): PendingMeasure => ({ chords: [] });
  let cur = blank();

  const isReal = (m: PendingMeasure) =>
    m.chords.length > 0 ||
    m.barRepeat != null ||
    m.section != null ||
    m.ending != null ||
    m.coda ||
    m.segno ||
    m.fermata ||
    m.staffText != null ||
    m.directive != null;

  const push = () => {
    if (isReal(cur)) {
      const startCell = measureStartCell;
      const width = Math.max(1, cellCursor - startCell);
      const barBeats = running[0];
      const cells = cur._cells ?? [];
      const { _open, _cells, ...rest } = cur;
      void _cells;
      const measure: IRealMeasure = { id: uid('m'), ...rest, cell: startCell, cells: width };
      if (_open) measure.open = _open;
      if (measure.chords.length > 0) {
        if (cells.length === measure.chords.length) {
          // Beats from cell spans (accurate to how the chart was written).
          measure.chords.forEach((ch, k) => {
            const offset = cells[k] - startCell;
            const nextOffset = k + 1 < cells.length ? cells[k + 1] - startCell : width;
            const span = Math.max(1, nextOffset - offset);
            ch.beats = Math.max(1, Math.round((span * barBeats) / width));
          });
        } else {
          const splits = distributeBeats(measure.chords.length, barBeats);
          measure.chords.forEach((ch, k) => (ch.beats = splits[k] ?? 1));
        }
      }
      measures.push(measure);
      cur = blank();
    }
    measureStartCell = cellCursor;
  };

  const closeBar = (close: BarlineClose) => {
    cur.close = close;
    push();
  };

  const openBar = (open: BarlineOpen) => {
    if (cur.chords.length > 0 || cur.barRepeat != null) push();
    cur._open = open;
  };

  let i = 0;
  const n = music.length;
  while (i < n) {
    const rest = music.slice(i);

    // Time signature (T + numerator + denominator).
    const ts = /^T(\d)(\d)/.exec(rest);
    if (ts) {
      running = parseTimeSig(ts[1], ts[2]);
      cur.timeSig = running;
      i += 3;
      continue;
    }

    // Ending bracket (N + digit).
    const end = /^N(\d)/.exec(rest);
    if (end) {
      cur.ending = parseInt(end[1], 10);
      i += 2;
      continue;
    }

    // Section / rehearsal mark (* + letter).
    const sec = /^\*([A-Za-z])/.exec(rest);
    if (sec) {
      cur.section = sec[1];
      i += 2;
      continue;
    }

    // Staff text / directive.
    const text = /^<(.*?)>/.exec(rest);
    if (text) {
      const body = text[1].replace(/^\*\d\d/, '').trim(); // strip vertical-offset prefix
      if (DIRECTIVE_RE.test(body)) cur.directive = body;
      else if (body) cur.staffText = body;
      i += text[0].length;
      continue;
    }

    // A chord (occupies one layout cell).
    const chord = parseChordToken(rest);
    if (chord) {
      (cur._cells ??= []).push(cellCursor);
      cellCursor += 1;
      cur.chords.push({
        id: uid('c'),
        ...chord.ref,
        alternate: chord.alternate,
        beats: 0,
        small: smallOn || undefined,
        symbol: prettyChordSymbol(chord.ref),
      });
      i += chord.length;
      continue;
    }

    // Single-character tokens.
    const ch = music[i];
    switch (ch) {
      case '|':
        closeBar('single');
        break;
      case '[':
        openBar('double');
        break;
      case ']':
        closeBar('double');
        break;
      case '{':
        openBar('repeat');
        break;
      case '}':
        closeBar('repeat');
        break;
      case 'Z':
        closeBar('final');
        break;
      case 'n':
        (cur._cells ??= []).push(cellCursor);
        cellCursor += 1;
        cur.chords.push({
          id: uid('c'),
          root: '',
          quality: '',
          chordType: null,
          beats: 0,
          noChord: true,
          symbol: 'N.C.',
        });
        break;
      case 'x':
        cur.barRepeat = 1;
        cellCursor += 1;
        break;
      case 'r':
        cur.barRepeat = 2;
        cellCursor += 1;
        break;
      case 's':
        smallOn = true;
        break;
      case 'l':
        smallOn = false;
        break;
      case 'S':
        cur.segno = true;
        break;
      case 'Q':
        cur.coda = true;
        break;
      case 'f':
        cur.fermata = true;
        break;
      case ' ':
        cellCursor += 1; // an empty layout cell
        break;
      default:
        // comma (separator), p (slash), U (end), Y (vertical spacer), unknown.
        break;
    }
    i += 1;
  }
  // Flush any trailing measure.
  push();

  if (measures.length > 0 && !measures[0].timeSig) measures[0].timeSig = initialTimeSig;
  return measures;
}

function parseSongFields(scheme: string, song: string): IRealChart | null {
  const fields = song.split('=');
  if (fields.length < 5) return null;

  if (scheme === 'irealbook') {
    // Plaintext: Title=Composer=Style=Key=n=Music
    const music = fields[5] ?? '';
    if (!music.trim()) return null;
    const timeSignature: [number, number] = [4, 4];
    return {
      title: normalizeTitle(fields[0] ?? 'Untitled'),
      composer: normalizeComposer(fields[1] ?? ''),
      style: (fields[2] ?? '').trim(),
      key: normalizeKey(fields[3] ?? 'C'),
      timeSignature,
      measures: tokenizeMeasures(music, timeSignature),
    };
  }

  // New format: anchor on the music field (the one bearing the prefix).
  let musicIndex = fields.findIndex((f) => f.includes(MUSIC_PREFIX));
  if (musicIndex < 0) musicIndex = 6;
  const rawMusic = fields[musicIndex] ?? '';
  const prefixPos = rawMusic.indexOf(MUSIC_PREFIX);
  if (prefixPos < 0) return null;
  const music = unscramble(rawMusic.slice(prefixPos));

  const title = normalizeTitle(fields[0] ?? 'Untitled');
  const composer = normalizeComposer(fields[1] ?? '');
  const style = (fields[musicIndex - 3] ?? '').trim();
  const key = normalizeKey(fields[musicIndex - 2] ?? 'C');
  const bpm = parseInt(fields[musicIndex + 2] ?? '', 10);
  const repeats = parseInt(fields[musicIndex + 3] ?? '', 10);
  const timeSignature: [number, number] = [4, 4];

  return {
    title,
    composer,
    style,
    key,
    tempo: Number.isFinite(bpm) && bpm > 0 ? bpm : undefined,
    repeats: Number.isFinite(repeats) && repeats > 0 ? repeats : undefined,
    timeSignature,
    measures: tokenizeMeasures(music, timeSignature),
  };
}

/** Parse a full iReal Pro URL into a playlist (one or more charts). */
export function parseIRealURL(input: string): IRealPlaylist {
  const trimmed = input.trim();
  const m = SCHEME_RE.exec(trimmed);
  if (!m) throw new Error('Not an iReal Pro link (expected irealb:// or irealbook://).');
  const scheme = m[1];
  const decoded = decode(m[2]);

  const parts = decoded.split('===');
  let name: string | undefined;
  if (parts.length > 1) name = parts.pop();
  const songs = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => parseSongFields(scheme, p))
    .filter((s): s is IRealChart => s !== null);

  if (songs.length === 0) throw new Error('No songs found in the iReal Pro link.');
  return { name: name?.trim() || undefined, songs };
}

/** Parse the first song from an iReal Pro URL, or null on failure. */
export function parseIRealSong(input: string): IRealChart | null {
  try {
    return parseIRealURL(input).songs[0] ?? null;
  } catch {
    return null;
  }
}
