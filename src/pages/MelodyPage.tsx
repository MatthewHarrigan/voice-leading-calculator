import { useState } from 'react';
import { CHORD_CATEGORIES, CHORD_TYPES, type ChordTypeId } from '@/music/chords';
import { pitchClassOf } from '@/music/notes';
import { analyzeMelodicLine } from '@/music/melody';
import { frettedMidi, guideStringLabel, topString, type StringSet } from '@/music/tuning';
import { generateChordVoicing, topNoteOf, type ChordVoicing, type Inversion } from '@/music/voicing';
import { useStore } from '@/state/store';
import { ChordTypeSelect, NoteSelect } from '@/components/pickers';
import { PlayableDiagram } from '@/components/PlayableDiagram';

interface MelodyMatch {
  voicing: ChordVoicing;
  root: string;
  chordType: ChordTypeId;
  substituted: boolean;
}

/** Find an inversion whose top voice equals the target note. */
function findVoicingWithTopNote(
  root: string,
  chordType: ChordTypeId,
  note: string,
  stringSet: StringSet,
): ChordVoicing | null {
  const targetPc = pitchClassOf(note);
  for (let inv = 0; inv < 4; inv++) {
    const voicing = generateChordVoicing(root, chordType, inv as Inversion, stringSet);
    const top = voicing ? topNoteOf(voicing, stringSet) : null;
    if (voicing && top && pitchClassOf(top) === targetPc) return voicing;
  }
  return null;
}

/** Try the requested chord, then same-family substitutions, to put `note` on top. */
function findMelodyChord(
  root: string,
  chordType: ChordTypeId,
  note: string,
  stringSet: StringSet,
): MelodyMatch | null {
  const exact = findVoicingWithTopNote(root, chordType, note, stringSet);
  if (exact) return { voicing: exact, root, chordType, substituted: false };

  const category = CHORD_TYPES[chordType].category;
  const siblings = CHORD_CATEGORIES.find((c) => c.category === category)?.types ?? [];
  for (const sibling of siblings) {
    if (sibling === chordType) continue;
    const voicing = findVoicingWithTopNote(root, sibling, note, stringSet);
    if (voicing) return { voicing, root, chordType: sibling, substituted: true };
  }
  return null;
}

export function MelodyPage() {
  const stringSet = useStore((s) => s.stringSet);
  const [note, setNote] = useState('E');
  const [root, setRoot] = useState('C');
  const [chordType, setChordType] = useState<ChordTypeId>('maj7');
  const [match, setMatch] = useState<MelodyMatch | null>(null);
  const [searched, setSearched] = useState(false);
  const [line, setLine] = useState<MelodyMatch[]>([]);

  const find = () => {
    setMatch(findMelodyChord(root, chordType, note, stringSet));
    setSearched(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Melody Finder</h1>
        <p>
          Choose a melody note and a chord, and find a drop 2 inversion that places that note on top
          (the {guideStringLabel(stringSet)}). If the exact chord can&rsquo;t carry the note, a
          same-family substitution is suggested.
        </p>
      </div>

      <div className="control-bar">
        <div className="control-group">
          <span className="label">Melody note</span>
          <NoteSelect value={note} onChange={setNote} aria-label="Melody note" />
        </div>
        <div className="control-group">
          <span className="label">Chord root</span>
          <NoteSelect value={root} onChange={setRoot} aria-label="Chord root" />
        </div>
        <div className="control-group">
          <span className="label">Chord type</span>
          <ChordTypeSelect value={chordType} onChange={setChordType} aria-label="Chord type" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={find} style={{ alignSelf: 'flex-end' }}>
          Find Voicing
        </button>
      </div>

      {!searched && line.length === 0 && (
        <p className="empty-hint">
          Try it: E on top of Cmaj7 finds the 2nd inversion. Each find can be added to a melody
          line below, with the voice-leading between voicings analysed as you go.
        </p>
      )}

      {searched && !match && (
        <p className="empty-hint">
          No voicing (or family substitution) places {note} on top of {root}
          {CHORD_TYPES[chordType].symbol} on this string set. Try another inversion-friendly note.
        </p>
      )}

      {match && (
        <section style={{ marginBottom: 24 }}>
          {match.substituted && (
            <p className="muted">
              {root}
              {CHORD_TYPES[chordType].symbol} can&rsquo;t place {note} on top here — substituting{' '}
              <strong>
                {match.root}
                {CHORD_TYPES[match.chordType].symbol}
              </strong>{' '}
              (same family).
            </p>
          )}
          <div style={{ maxWidth: 200 }}>
            <PlayableDiagram
              chord={{
                fingering: match.voicing,
                rootDisplay: match.root,
                chordType: match.chordType,
                symbol: match.voicing.symbol,
                inversion: match.voicing.inversion,
                stringSet,
                leadNote: note,
                targetTopNote: note,
              }}
              caption={`melody ${note}`}
              highlightAvoid
            />
          </div>
          <button
            className="btn btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setLine((l) => [...l, match])}
          >
            Add to melody line
          </button>
        </section>
      )}

      {line.length > 0 && (
        <section>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="section-title" style={{ border: 0 }}>
              Melody line
            </h2>
            <button className="btn btn-sm btn-danger" onClick={() => setLine([])}>
              Clear line
            </button>
          </div>
          <div className="progression-chords">
            {line.map((m, i) => (
              <PlayableDiagram
                key={i}
                variant="bare"
                chord={{
                  fingering: m.voicing,
                  rootDisplay: m.root,
                  chordType: m.chordType,
                  symbol: m.voicing.symbol,
                  inversion: m.voicing.inversion,
                  stringSet,
                  leadNote: topNoteOf(m.voicing, stringSet),
                }}
              />
            ))}
          </div>
          {line.length >= 2 && <MelodyLineAnalysis line={line} stringSet={stringSet} />}
        </section>
      )}
    </div>
  );
}

function MelodyLineAnalysis({ line, stringSet }: { line: MelodyMatch[]; stringSet: StringSet }) {
  const ts = topString(stringSet);
  const notes = line.map((m) => topNoteOf(m.voicing, stringSet) ?? '?');
  const pitches = line
    .map((m) => {
      const fret = m.voicing.frets[ts];
      return fret === null || fret === undefined ? null : frettedMidi(ts, fret);
    })
    .filter((p): p is number => p !== null);
  const analysis = analyzeMelodicLine(pitches);

  return (
    <div className="analysis-panel" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Melody line analysis</h3>
      <p className="muted" style={{ fontSize: 13 }}>
        {notes.join(' → ')}
      </p>
      <div>
        <strong>{analysis.smoothnessPct}%</strong> of moves are steps or common tones ·{' '}
        {analysis.stepwise} step{analysis.stepwise === 1 ? '' : 's'}, {analysis.leaps} leap
        {analysis.leaps === 1 ? '' : 's'}, {analysis.commonTones} common tone
        {analysis.commonTones === 1 ? '' : 's'}
      </div>
      <div className="guide-line-sequence">
        {analysis.steps.map((s, i) => (
          <div className="guide-line-note" key={i}>
            <strong>
              {notes[i]}→{notes[i + 1]}
            </strong>
            <span>{s.kind === 'common-tone' ? 'common' : s.kind}</span>
            <span>
              {s.direction === 'same' ? '·' : s.direction === 'up' ? '▲' : '▼'} {Math.abs(s.semitones)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
