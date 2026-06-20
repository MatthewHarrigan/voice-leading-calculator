// Shared lead-sheet chrome — the structural marks, signs and chord typesetting
// used by BOTH the chord score and the guitar-diagram grid so the two views are
// laid out identically (iReal Pro parity). Every export is a component, so this
// module stays fast-refresh friendly.

import type { IRealMeasure } from '@/music/ireal/types';

const ROMAN: Record<number, string> = { 1: '1', 2: '2', 3: '3' };

// Crisp inline glyphs — the Unicode musical symbols (𝄋/𝄌/𝄐) lack font support
// in most browsers and render as broken/stacked tofu.
export function CodaGlyph() {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" width="15" height="15" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.6" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
export function SegnoGlyph() {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" width="15" height="15" aria-hidden focusable="false">
      <path
        d="M16 7c-1-3-6-3-7 0s5 3 4 6-6 3-7 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6.5" cy="7" r="1.3" fill="currentColor" />
      <circle cx="17.5" cy="17" r="1.3" fill="currentColor" />
    </svg>
  );
}
export function FermataGlyph() {
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" width="15" height="15" aria-hidden focusable="false">
      <path d="M4 16a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Tall stacked time-signature fraction that leads a bar, as on a real staff. */
export function TimeSig({ sig }: { sig: [number, number] }) {
  return (
    <span className="time-sig" title={`${sig[0]}/${sig[1]}`}>
      <span>{sig[0]}</span>
      <span>{sig[1]}</span>
    </span>
  );
}

/** The simile (one-bar `%`) or double-bar-repeat sign drawn as crisp SVG. */
export function BarRepeatSign({ n }: { n: 1 | 2 }) {
  return (
    <span className="bar-repeat" title={`${n}-bar repeat`} aria-label={`${n} bar repeat`}>
      <svg viewBox="0 0 44 36" width="34" height="28" aria-hidden focusable="false">
        {n === 2 && <line x1="13" y1="29" x2="23" y2="7" stroke="currentColor" strokeWidth="2.4" />}
        <line x1="21" y1="29" x2="31" y2="7" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="16.5" cy="11.5" r="2.1" fill="currentColor" />
        <circle cx="27.5" cy="24.5" r="2.1" fill="currentColor" />
      </svg>
    </span>
  );
}

/** Repeat-sign dots drawn beside a thick {/} barline. */
export function RepeatDots({ side }: { side: 'open' | 'close' }) {
  return <span className={`repeat-dots repeat-dots-${side}`} aria-hidden />;
}

/** Full-width ending ("house") bracket drawn across the top of the bar. */
export function EndingBracket({ ending }: { ending: number }) {
  return (
    <span className="ending-mark" aria-label={`ending ${ending}`}>
      {ROMAN[ending] ?? ending}.
    </span>
  );
}

/** Section letter (A/B/C…), nav glyphs and fermata that sit above the bar. */
export function MeasureMarks({ measure }: { measure: IRealMeasure }) {
  const hasAny = measure.section || measure.segno || measure.coda || measure.fermata;
  if (!hasAny) return null;
  return (
    <div className="measure-marks">
      {measure.section && <span className="section-mark">{measure.section}</span>}
      <span className="measure-marks-spacer" />
      {measure.segno && (
        <span className="nav-mark" title="Segno">
          <SegnoGlyph />
        </span>
      )}
      {measure.coda && (
        <span className="nav-mark" title="Coda">
          <CodaGlyph />
        </span>
      )}
      {measure.fermata && (
        <span className="nav-mark" title="Fermata">
          <FermataGlyph />
        </span>
      )}
    </div>
  );
}

// Beautify accidentals for display only (the underlying symbol text is kept on
// the model; this never changes what the chord *is*).
function prettyAccidentals(s: string): string {
  return s.replace(/b/g, '♭').replace(/#/g, '♯');
}

/**
 * Jazz chord typesetting: a large root with a smaller, raised quality cluster
 * and a normal-size slash bass — the iReal Pro look. The concatenated text is
 * preserved (modulo b→♭ / #→♯) so it still reads as the same chord.
 */
export function ChordSymbol({ symbol, className }: { symbol: string; className?: string }) {
  const slash = symbol.indexOf('/');
  const head = slash >= 0 ? symbol.slice(0, slash) : symbol;
  const bass = slash >= 0 ? symbol.slice(slash + 1) : undefined;
  const m = /^([A-G])([#b♯♭]?)(.*)$/.exec(head);

  return (
    <span className={`chord-symbol${className ? ` ${className}` : ''}`}>
      {m ? (
        <>
          <span className="cs-root">
            {m[1]}
            {m[2] && <span className="cs-acc">{prettyAccidentals(m[2])}</span>}
          </span>
          {m[3] && <span className="cs-qual">{prettyAccidentals(m[3])}</span>}
        </>
      ) : (
        <span className="cs-root">{prettyAccidentals(head)}</span>
      )}
      {bass && <span className="cs-bass">/{prettyAccidentals(bass)}</span>}
    </span>
  );
}
