import { Fragment, useMemo, useState } from 'react';
import { generateProgressions, type ProgressionType } from '@/music/progressions';
import { useStore } from '@/state/store';
import { PlayableDiagram } from '@/components/PlayableDiagram';
import { getChordPlayer } from '@/audio/player';

export function ProgressionsPage() {
  const stringSet = useStore((s) => s.stringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const audioEnabled = useStore((s) => s.audioEnabled);
  const [type, setType] = useState<ProgressionType>('major');

  const patterns = useMemo(
    () => generateProgressions(type, stringSet, { avoidB9 }),
    [type, stringSet, avoidB9],
  );

  const playProgression = (chords: typeof patterns[number]['chords']) => {
    if (!audioEnabled) return;
    getChordPlayer().playSequence(
      chords.map((c) => ({ fingering: c.voicing, stringSet: c.stringSet })),
      0.85,
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Voice-Leading Progressions</h1>
        <p>
          The four smoothest drop 2 ii-V-I patterns, ranked by total fret movement. Roots are fixed
          at D-G-C; the optimiser searches every inversion combination.
        </p>
      </div>

      <div className="control-bar">
        <div className="control-group">
          <span className="label">Progression</span>
          <div className="segmented">
            <button className={type === 'major' ? 'active' : ''} onClick={() => setType('major')}>
              Major ii-V-I
            </button>
            <button className={type === 'minor' ? 'active' : ''} onClick={() => setType('minor')}>
              Minor ii-V-i
            </button>
          </div>
        </div>
      </div>

      {patterns.length === 0 && (
        <p className="empty-hint">No voicings found with the current interval filter.</p>
      )}

      {patterns.map((pattern, index) => (
        <div className="progression" key={index}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>
              {type === 'major' ? 'Major ii-V-I' : 'Minor ii-V-i'} — Pattern {index + 1}
            </h3>
            {audioEnabled && (
              <button className="btn btn-sm" onClick={() => playProgression(pattern.chords)}>
                ♪ Play
              </button>
            )}
          </div>
          <div className="progression-chords">
            {pattern.chords.map((chord, chordIndex) => (
              <Fragment key={chordIndex}>
                <PlayableDiagram
                  variant="bare"
                  chord={{
                    fingering: chord.voicing,
                    rootDisplay: chord.root,
                    chordType: chord.type,
                    symbol: chord.symbol,
                    inversion: chord.inversion,
                    stringSet: chord.stringSet,
                  }}
                />
                {chordIndex < pattern.chords.length - 1 && <div className="progression-arrow">→</div>}
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
