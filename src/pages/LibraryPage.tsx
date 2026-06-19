import { useMemo, useState } from 'react';
import { CHORD_CATEGORIES, CHORD_TYPES, type ChordTypeId } from '@/music/chords';
import { generateChordVoicing, inversionName, type Inversion } from '@/music/voicing';
import { useStore } from '@/state/store';
import { NoteSelect } from '@/components/pickers';
import { PlayableDiagram } from '@/components/PlayableDiagram';
import type { InspectChord } from '@/components/inspectorContext';

const INVERSIONS: Inversion[] = [0, 1, 2, 3];

export function LibraryPage() {
  const stringSet = useStore((s) => s.stringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const [root, setRoot] = useState('C');

  const rows = useMemo(() => {
    return CHORD_CATEGORIES.map((category) => ({
      ...category,
      chords: category.types.map((typeId: ChordTypeId) => ({
        typeId,
        voicings: INVERSIONS.map((inv) => generateChordVoicing(root, typeId, inv, stringSet)),
      })),
    }));
  }, [root, stringSet]);

  return (
    <div>
      <div className="page-header">
        <h1>Drop 2 Chord Inversions</h1>
        <p>
          Every four-part chord type, voiced as a drop 2 on the {stringSet === 'upper' ? 'D-G-B-E' : 'A-D-G-B'}{' '}
          strings. Click a diagram to hear it and open the voicing inspector.
        </p>
      </div>

      <div className="control-bar">
        <div className="control-group">
          <span className="label">Root</span>
          <NoteSelect value={root} onChange={setRoot} aria-label="Root note" />
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {avoidB9 ? 'Voicings with a minor-9th (b9) clash are flagged in red.' : 'b9 highlighting off.'}
        </div>
      </div>

      {rows.map((category) => (
        <section key={category.category}>
          <h2 className="section-title">{category.label}</h2>
          {category.chords.map(({ typeId, voicings }) => (
            <div key={typeId} className="assignment-group">
              <h3>
                {root}
                {CHORD_TYPES[typeId].symbol} · {CHORD_TYPES[typeId].formula}
              </h3>
              <div className="assignment-grid">
                {voicings.map((voicing, inv) =>
                  voicing ? (
                    <PlayableDiagram
                      key={inv}
                      chord={toInspect(voicing, root, typeId, stringSet)}
                      caption={inversionName(inv).replace(' Inversion', '')}
                      highlightAvoid={avoidB9}
                    />
                  ) : (
                    <div key={inv} className="chord-card" aria-disabled>
                      <div className="card-caption">No voicing</div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <section>
        <h2 className="section-title">Fourths</h2>
        <p className="section-note">
          Common quartal voicings: a root-inversion maj7♭5 and a 2nd-inversion 7sus4 stack the
          chord in fourths for an open, modern sound.
        </p>
        <div className="assignment-grid">
          {(
            [
              { typeId: 'maj7b5' as ChordTypeId, inv: 0 as Inversion, caption: 'maj7♭5 · root' },
              { typeId: 'dom7sus4' as ChordTypeId, inv: 2 as Inversion, caption: '7sus4 · 2nd' },
            ]
          ).map(({ typeId, inv, caption }) => {
            const voicing = generateChordVoicing(root, typeId, inv, stringSet);
            return voicing ? (
              <PlayableDiagram
                key={`${typeId}-${inv}`}
                chord={toInspect(voicing, root, typeId, stringSet)}
                caption={caption}
                highlightAvoid={avoidB9}
              />
            ) : null;
          })}
        </div>
      </section>
    </div>
  );
}

function toInspect(
  voicing: NonNullable<ReturnType<typeof generateChordVoicing>>,
  root: string,
  typeId: ChordTypeId,
  stringSet: 'middle' | 'upper',
): InspectChord {
  return {
    fingering: voicing,
    rootDisplay: root,
    chordType: typeId,
    symbol: voicing.symbol,
    inversion: voicing.inversion,
    stringSet,
  };
}
