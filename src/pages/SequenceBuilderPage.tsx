import { useMemo, useState, type CSSProperties } from 'react';
import { type ChordTypeId } from '@/music/chords';
import {
  assignDisplayLanes,
  playbackOrder,
  sequenceBarCount,
  type SequenceChord,
} from '@/music/song';
import {
  generateChordVoicing,
  hasFlatNineAvoidInterval,
  inversionName,
  shouldUseVoicing,
  topNoteOf,
  type Inversion,
} from '@/music/voicing';
import {
  guideLineAnalysis,
  movementTransitions,
  optimizeVoiceLeading,
  type OptimizedChord,
} from '@/music/voiceLeading';

type OptimizedSeqChord = OptimizedChord<SequenceChord>;
import { SONG_PRESETS } from '@/data/presets';
import { useStore } from '@/state/store';
import { ChordTypeSelect, NoteSelect } from '@/components/pickers';
import { PlayableDiagram } from '@/components/PlayableDiagram';
import { useInspector } from '@/components/inspectorContext';
import { getChordPlayer } from '@/audio/player';

export function SequenceBuilderPage() {
  const chart = useStore((s) => s.chart);
  const chartTitle = useStore((s) => s.chartTitle);
  const chartKey = useStore((s) => s.chartKey);
  const stringSet = useStore((s) => s.stringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const startingInversion = useStore((s) => s.startingInversion);
  const setStartingInversion = useStore((s) => s.setStartingInversion);
  const insertion = useStore((s) => s.insertion);
  const setInsertion = useStore((s) => s.setInsertion);
  const selectedChordId = useStore((s) => s.selectedChordId);
  const selectChord = useStore((s) => s.selectChord);
  const addChord = useStore((s) => s.addChord);
  const updateChord = useStore((s) => s.updateChord);
  const removeChord = useStore((s) => s.removeChord);
  const moveChord = useStore((s) => s.moveChord);
  const clearChart = useStore((s) => s.clearChart);
  const loadSong = useStore((s) => s.loadSong);
  const saveCurrentAs = useStore((s) => s.saveCurrentAs);
  const savedPresets = useStore((s) => s.savedPresets);

  const [presetValue, setPresetValue] = useState('');
  const [form, setForm] = useState<{ root: string; chordType: ChordTypeId; duration: number; lead: string }>({
    root: 'C',
    chordType: 'maj7',
    duration: 4,
    lead: '',
  });

  const barCount = Math.max(sequenceBarCount(chart), 1);
  const ordered = useMemo(() => playbackOrder(chart), [chart]);
  const selected = chart.find((c) => c.id === selectedChordId) ?? null;

  const optimized = useMemo(() => {
    if (ordered.length === 0) return null;
    try {
      return optimizeVoiceLeading(ordered, { startingInversion, avoidB9 });
    } catch {
      return null;
    }
  }, [ordered, startingInversion, avoidB9]);

  const transitions = optimized ? movementTransitions(optimized) : [];
  const guide = optimized ? guideLineAnalysis(optimized) : null;

  const handleAdd = () => {
    addChord({
      root: form.root,
      chordType: form.chordType,
      barIndex: insertion.barIndex,
      beat: insertion.beat,
      duration: form.duration,
      targetTopNote: form.lead || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selected) return;
    updateChord(selected.id, {
      displayRoot: form.root,
      chordType: form.chordType,
      durationBeats: form.duration,
      beat: insertion.beat,
      barIndex: insertion.barIndex,
      targetTopNote: form.lead || undefined,
    });
  };

  const loadPreset = () => {
    if (!presetValue) return;
    const [source, id] = presetValue.split(':');
    const preset =
      source === 'built-in'
        ? SONG_PRESETS.find((p) => p.id === id)
        : savedPresets.find((p) => p.id === id);
    if (preset) loadSong(preset);
  };

  const selectForEdit = (chord: SequenceChord) => {
    selectChord(chord.id);
    setForm({
      root: chord.displayRoot,
      chordType: chord.chordType,
      duration: chord.durationBeats,
      lead: chord.targetTopNote ?? '',
    });
    setInsertion({ barIndex: chord.barIndex, beat: chord.beat });
  };

  const playAll = async () => {
    if (!optimized) return;
    const player = getChordPlayer();
    for (const chord of optimized) {
      await player.playFingering(chord.fingering, chord.stringSet);
      await new Promise((r) => setTimeout(r, 700));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Sequence Builder</h1>
        <p>
          Build a lead-sheet chart, then let the optimiser choose drop 2 voicings with the smoothest
          voice leading. Lock a chord&rsquo;s inversion or set a lead note to shape the top line.
        </p>
      </div>

      <div className="chart-toolbar">
        <div className="control-group">
          <span className="label">Preset</span>
          <div className="row">
            <select value={presetValue} onChange={(e) => setPresetValue(e.target.value)} aria-label="Preset">
              <option value="">Choose a chart…</option>
              <optgroup label="Built-in">
                {SONG_PRESETS.map((p) => (
                  <option key={p.id} value={`built-in:${p.id}`}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
              {savedPresets.length > 0 && (
                <optgroup label="Saved">
                  {savedPresets.map((p) => (
                    <option key={p.id} value={`saved:${p.id}`}>
                      {p.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button className="btn btn-sm" onClick={loadPreset}>
              Load
            </button>
          </div>
        </div>

        <button
          className="btn btn-sm"
          onClick={() => {
            const name = window.prompt('Name this chart:');
            if (name) saveCurrentAs(name);
          }}
        >
          Save as…
        </button>
        <button className="btn btn-sm btn-danger" onClick={clearChart}>
          Clear All
        </button>
      </div>

      <div className="chart-meta">
        <strong>{chartTitle}</strong> · Key {chartKey} · {barCount} bar{barCount === 1 ? '' : 's'} ·{' '}
        {chart.length} chord{chart.length === 1 ? '' : 's'}
      </div>

      {/* Add / edit form */}
      <div className="control-bar">
        <FormField label="Bar">
          <select
            value={insertion.barIndex + 1}
            onChange={(e) => setInsertion({ barIndex: Number(e.target.value) - 1 })}
            aria-label="Bar"
          >
            {Array.from({ length: Math.max(barCount, 1) + 1 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Beat">
          <select
            value={insertion.beat}
            onChange={(e) => setInsertion({ beat: Number(e.target.value) })}
            aria-label="Beat"
          >
            {[1, 2, 3, 4].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Duration">
          <select
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            aria-label="Duration"
          >
            {[1, 2, 3, 4].map((d) => (
              <option key={d} value={d}>
                {d} beat{d === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Root">
          <NoteSelect value={form.root} onChange={(root) => setForm({ ...form, root })} aria-label="Root" />
        </FormField>
        <FormField label="Chord">
          <ChordTypeSelect
            value={form.chordType}
            onChange={(chordType) => setForm({ ...form, chordType })}
            aria-label="Chord type"
          />
        </FormField>
        <FormField label="Lead note">
          <NoteSelect
            value={form.lead}
            onChange={(lead) => setForm({ ...form, lead })}
            includeBlank
            blankLabel="none"
            aria-label="Lead note"
          />
        </FormField>
        <div className="row" style={{ alignSelf: 'flex-end' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleAdd}>
            Add Chord
          </button>
          <button type="button" className="btn btn-sm" onClick={handleUpdate} disabled={!selected}>
            Update Chord
          </button>
          {selected && (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeChord(selected.id)}>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Chart grid */}
      {chart.length === 0 ? (
        <p className="empty-hint">Your chord sequence will appear here. Add a chord or load a preset.</p>
      ) : (
        <ChartGrid
          chart={chart}
          barCount={barCount}
          selectedId={selectedChordId}
          onSelect={selectForEdit}
          onBarClick={(barIndex, beat) => setInsertion({ barIndex, beat })}
          onMove={moveChord}
        />
      )}

      {/* Voicing analysis for the selected chord */}
      {selected && (
        <VoicingAnalysis chord={selected} stringSet={stringSet} avoidB9={avoidB9} />
      )}

      {/* Optimized output */}
      {optimized && (
        <section className="analysis-panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Optimized Voicings</h2>
            <div className="row">
              <FormField label="Start inv.">
                <select
                  value={startingInversion}
                  onChange={(e) => setStartingInversion(Number(e.target.value))}
                  aria-label="Starting inversion"
                >
                  {[0, 1, 2, 3].map((inv) => (
                    <option key={inv} value={inv}>
                      {inversionName(inv).replace(' Inversion', '')}
                    </option>
                  ))}
                </select>
              </FormField>
              <button className="btn btn-sm" onClick={playAll} style={{ alignSelf: 'flex-end' }}>
                ♪ Play sequence
              </button>
            </div>
          </div>

          <div className="optimized-grid" style={{ marginTop: 14 }}>
            {optimized.map((chord) => (
              <OptimizedCard key={chord.id} chord={chord} />
            ))}
          </div>

          <MovementAnalysis optimized={optimized} transitions={transitions} guide={guide} />
        </section>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-group">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function ChartGrid({
  chart,
  barCount,
  selectedId,
  onSelect,
  onBarClick,
  onMove,
}: {
  chart: SequenceChord[];
  barCount: number;
  selectedId: string | null;
  onSelect: (chord: SequenceChord) => void;
  onBarClick: (barIndex: number, beat: number) => void;
  onMove: (id: string, barIndex: number, beat: number) => void;
}) {
  const beatFromEvent = (e: React.MouseEvent | React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return Math.min(4, Math.max(1, Math.floor(((e.clientX - rect.left) / rect.width) * 4) + 1));
  };
  const rows: number[][] = [];
  for (let i = 0; i < barCount; i += 4) {
    rows.push(Array.from({ length: Math.min(4, barCount - i) }, (_, k) => i + k));
  }

  return (
    <div>
      {rows.map((row, ri) => (
        <div className="chart-grid" key={ri}>
          {row.map((barIndex) => {
            const barChords = chart.filter((c) => c.barIndex === barIndex);
            const lanes = assignDisplayLanes(barChords);
            const laneCount = lanes.reduce((m, l) => Math.max(m, l.laneCount), 1);
            const style: CSSProperties =
              laneCount > 1 ? { gridTemplateRows: `repeat(${laneCount}, minmax(0, auto))` } : {};
            return (
              <div
                className="chord-bar"
                data-bar-number={barIndex + 1}
                key={barIndex}
                style={style}
                onClick={(e) => onBarClick(barIndex, beatFromEvent(e))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain');
                  if (id) onMove(id, barIndex, beatFromEvent(e));
                }}
              >
                <span className="bar-number">{barIndex + 1}</span>
                {lanes.map(({ chord, beat, span, lane }) => (
                  <div
                    key={chord.id}
                    className={`sequence-chord${selectedId === chord.id ? ' selected' : ''}`}
                    data-beat={beat}
                    data-beat-span={span}
                    data-lane={lane}
                    draggable
                    style={{ gridColumn: `${beat} / span ${span}`, gridRow: String(lane) }}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData('text/plain', chord.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(chord);
                    }}
                  >
                    <span className="sc-symbol">{chord.symbol}</span>
                    <span className="sc-meta">beat {beat}</span>
                    {chord.targetTopNote && <span className="sc-lead">lead {chord.targetTopNote}</span>}
                    {Number.isInteger(chord.preferredInversion) && (
                      <span className="sc-meta">{inversionName(chord.preferredInversion!).replace(' Inversion', '')} locked</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function OptimizedCard({ chord }: { chord: OptimizedSeqChord }) {
  const lead = topNoteOf(chord.fingering, chord.stringSet);
  return (
    <PlayableDiagram
      variant="bare"
      className="optimized-chord"
      chord={{
        fingering: chord.fingering,
        rootDisplay: chord.displayRoot,
        chordType: chord.chordType,
        symbol: chord.symbol,
        inversion: chord.inversion,
        stringSet: chord.stringSet,
        leadNote: lead,
        targetTopNote: chord.targetTopNote,
      }}
    />
  );
}

function MovementAnalysis({
  optimized,
  transitions,
  guide,
}: {
  optimized: OptimizedSeqChord[];
  transitions: { from: string; to: string; distance: number }[];
  guide: ReturnType<typeof guideLineAnalysis>;
}) {
  if (optimized.length === 1) {
    const c = optimized[0];
    const top = topNoteOf(c.fingering, c.stringSet);
    return (
      <div style={{ marginTop: 16 }}>
        <strong>Single chord voicing:</strong> {c.symbol} {inversionName(c.inversion)}
        {top && (
          <>
            <br />
            <strong>Top voice:</strong> {top} on {c.stringSet === 'upper' ? 'E string' : 'B string'}
          </>
        )}
        {c.targetTopNote && (
          <>
            <br />
            <strong>Lead target:</strong> {c.targetTopNote}
          </>
        )}
      </div>
    );
  }

  const total = transitions.reduce((sum, t) => sum + t.distance, 0);
  return (
    <div style={{ marginTop: 16 }}>
      <div>
        <strong>Total voice movement:</strong> {total} ·{' '}
        <strong>Average:</strong> {(total / Math.max(1, transitions.length)).toFixed(1)}
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        {transitions.map((t, i) => (
          <span key={i}>
            {i > 0 && ', '}
            {t.from} → {t.to}: {t.distance}
          </span>
        ))}
      </div>
      {guide && (
        <div style={{ marginTop: 12 }}>
          <strong>Guide line ({guide.stringLabel}):</strong> {guide.commonOrStepCount}/{guide.totalMoves} moves are
          common tones or steps
          <div className="guide-line-sequence">
            {guide.notes.map((n, i) => (
              <div className="guide-line-note" key={i}>
                <strong>
                  {n.note}
                  {n.fret}
                </strong>
                <span>{n.symbol}</span>
                <span>{n.motion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VoicingAnalysis({
  chord,
  stringSet,
  avoidB9,
}: {
  chord: SequenceChord;
  stringSet: 'middle' | 'upper';
  avoidB9: boolean;
}) {
  const setPreferredInversion = useStore((s) => s.setPreferredInversion);
  const { inspect } = useInspector();

  const analyses = ([0, 1, 2, 3] as Inversion[]).map((inv) => {
    const voicing = generateChordVoicing(chord.displayRoot, chord.chordType, inv, stringSet);
    return {
      inv,
      voicing,
      usable: voicing ? shouldUseVoicing(voicing, stringSet, chord.chordType, avoidB9) : false,
      avoid: voicing ? hasFlatNineAvoidInterval(voicing, stringSet) : false,
    };
  });
  const available = analyses.filter((a) => a.voicing && a.usable);
  const avoided = analyses.filter((a) => a.voicing && !a.usable);

  return (
    <section className="analysis-panel voicing-analysis">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{chord.symbol} Voicing Analysis</h3>
        {Number.isInteger(chord.preferredInversion) && (
          <button className="btn btn-sm" onClick={() => setPreferredInversion(chord.id, null)}>
            Clear lock
          </button>
        )}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        {available.length} available, {avoided.length} avoided
        {Number.isInteger(chord.preferredInversion)
          ? ` · ${inversionName(chord.preferredInversion!).replace(' Inversion', '')} locked`
          : ''}
      </p>

      <h4 style={{ marginBottom: 6 }}>Available</h4>
      <div className="voicing-options">
        {available.map((a) => (
          <button
            key={a.inv}
            className={`voicing-option${chord.preferredInversion === a.inv ? ' selected' : ''}`}
            onClick={() => setPreferredInversion(chord.id, a.inv)}
            onDoubleClick={() =>
              inspect({
                fingering: a.voicing!,
                rootDisplay: chord.displayRoot,
                chordType: chord.chordType,
                symbol: chord.symbol,
                inversion: a.inv,
                stringSet,
              })
            }
          >
            {inversionName(a.inv).replace(' Inversion', '')}
            <br />
            <span className="muted">top {topNoteOf(a.voicing!, stringSet)}</span>
          </button>
        ))}
      </div>

      {avoided.length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 6px' }}>Avoided (b9 avoid interval)</h4>
          <div className="voicing-options">
            {avoided.map((a) => (
              <div key={a.inv} className="voicing-option avoided">
                {inversionName(a.inv).replace(' Inversion', '')}
                <br />
                <span className="muted">b9 clash</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
