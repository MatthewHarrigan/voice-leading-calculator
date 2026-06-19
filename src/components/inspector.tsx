import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { stringSetLabel } from '@/music/tuning';
import { fretSpan, inversionName, topNoteOf, voiceRows } from '@/music/voicing';
import { ChordDiagram } from './ChordDiagram';
import { Modal } from './Modal';
import { PlayHoldButton } from './PlayHoldButton';
import { InspectorContext, type InspectChord } from './inspectorContext';

function VoicingInspector({ chord }: { chord: InspectChord }) {
  const rows = voiceRows(chord.fingering, chord.rootDisplay, chord.stringSet);
  const top = topNoteOf(chord.fingering, chord.stringSet);
  const span = fretSpan(chord.fingering, chord.stringSet);

  return (
    <div className="modal-body">
      <div>
        <ChordDiagram
          fingering={chord.fingering}
          rootDisplay={chord.rootDisplay}
          stringSet={chord.stringSet}
          title={`${chord.symbol} ${inversionName(chord.inversion)}`}
          leadNote={chord.leadNote ?? null}
        />
        <PlayHoldButton
          fingering={chord.fingering}
          stringSet={chord.stringSet}
          className="btn btn-primary btn-sm"
          style={{ width: '100%', marginTop: 10 }}
        />
        <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 6 }}>
          Hold longer for a slower strum — the roll spans how long you hold
        </p>
      </div>

      <div className="inspector">
        <h4>Voicing Inspector</h4>
        <dl>
          <dt>Chord</dt>
          <dd>{chord.symbol}</dd>
          <dt>Inversion</dt>
          <dd>{inversionName(chord.inversion).replace(' Inversion', '')}</dd>
          <dt>String set</dt>
          <dd>
            {chord.stringSet} ({stringSetLabel(chord.stringSet)})
          </dd>
          <dt>Top voice</dt>
          <dd>{top ?? '—'}</dd>
          <dt>Fret span</dt>
          <dd>{span} fret{span === 1 ? '' : 's'}</dd>
          {chord.targetTopNote && (
            <>
              <dt>Lead target</dt>
              <dd>{chord.targetTopNote}</dd>
            </>
          )}
        </dl>

        <table className="voice-table">
          <thead>
            <tr>
              <th>String</th>
              <th>Fret</th>
              <th>Note</th>
              <th>Tone</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="voice-row" key={row.stringIndex}>
                <td>{row.stringLabel}</td>
                <td>{row.fret ?? '—'}</td>
                <td>{row.note ?? '—'}</td>
                <td>{row.interval ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [chord, setChord] = useState<InspectChord | null>(null);
  const inspect = useCallback((c: InspectChord) => setChord(c), []);
  const api = useMemo(() => ({ inspect }), [inspect]);

  return (
    <InspectorContext.Provider value={api}>
      {children}
      {chord && (
        <Modal
          title={chord.title ?? `${chord.symbol} ${inversionName(chord.inversion)}`}
          onClose={() => setChord(null)}
        >
          <VoicingInspector chord={chord} />
        </Modal>
      )}
    </InspectorContext.Provider>
  );
}
