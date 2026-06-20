import { useEffect, useMemo, useState } from 'react';
import { type ChordTypeId } from '@/music/chords';
import { type SequenceChord } from '@/music/song';
import { chartToSequence } from '@/music/chart';
import { flattenChart, toIRealHTML, toIRealURL } from '@/music/ireal';
import type { IRealChord } from '@/music/ireal/types';
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
import { pitchClassOf } from '@/music/notes';
import { SONG_PRESETS } from '@/data/presets';
import { useStore } from '@/state/store';
import { ChordTypeSelect, NoteSelect } from '@/components/pickers';
import { PlayableDiagram } from '@/components/PlayableDiagram';
import { ChartView } from '@/components/ChartView';
import { ImportPanel } from '@/components/ImportPanel';
import { MeasureEditor } from '@/components/MeasureEditor';
import { useInspector } from '@/components/inspectorContext';
import { getChordPlayer } from '@/audio/player';
import { useSequencePlaying } from '@/audio/useSequencePlaying';

const TRANSPOSE_STEPS = [-1, 1];

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slug(title: string) {
  return title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'chart';
}

export function SequenceBuilderPage() {
  const chart = useStore((s) => s.chart);
  const stringSet = useStore((s) => s.stringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const audioEnabled = useStore((s) => s.audioEnabled);
  const sequencePlaying = useSequencePlaying();
  const startingInversion = useStore((s) => s.startingInversion);
  const setStartingInversion = useStore((s) => s.setStartingInversion);
  const tempo = useStore((s) => s.tempo);
  const setTempo = useStore((s) => s.setTempo);
  const metronome = useStore((s) => s.metronome);
  const setMetronome = useStore((s) => s.setMetronome);
  const bassline = useStore((s) => s.bassline);
  const setBassline = useStore((s) => s.setBassline);
  const bassSolo = useStore((s) => s.bassSolo);
  const setBassSolo = useStore((s) => s.setBassSolo);
  const repeatForm = useStore((s) => s.repeatForm);
  const setRepeatForm = useStore((s) => s.setRepeatForm);

  const selectedChordId = useStore((s) => s.selectedChordId);
  const selectedMeasureId = useStore((s) => s.selectedMeasureId);
  const insertionMeasureId = useStore((s) => s.insertionMeasureId);
  const selectChord = useStore((s) => s.selectChord);
  const selectMeasure = useStore((s) => s.selectMeasure);
  const addChord = useStore((s) => s.addChord);
  const updateChord = useStore((s) => s.updateChord);
  const removeChord = useStore((s) => s.removeChord);

  const setChartTitle = useStore((s) => s.setChartTitle);
  const setChartKey = useStore((s) => s.setChartKey);
  const setChartStyle = useStore((s) => s.setChartStyle);
  const setTimeSignature = useStore((s) => s.setTimeSignature);
  const transpose = useStore((s) => s.transpose);

  const clearChart = useStore((s) => s.clearChart);
  const loadSong = useStore((s) => s.loadSong);
  const loadChart = useStore((s) => s.loadChart);
  const saveCurrentAs = useStore((s) => s.saveCurrentAs);
  const savedCharts = useStore((s) => s.savedCharts);

  const [presetValue, setPresetValue] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState<{ root: string; chordType: ChordTypeId; duration: number; lead: string }>({
    root: 'C',
    chordType: 'maj7',
    duration: 4,
    lead: '',
  });

  const selectedChord = useMemo(() => {
    for (const m of chart.measures) {
      const c = m.chords.find((x) => x.id === selectedChordId);
      if (c) return c;
    }
    return null;
  }, [chart, selectedChordId]);

  // Performance order (repeats/endings expanded) → optimiser + diagrams.
  const flat = useMemo(() => flattenChart(chart), [chart]);
  const barStartBeats = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    flat.forEach((m) => {
      arr.push(acc);
      acc += (m.timeSig ?? chart.timeSignature)[0];
    });
    return arr;
  }, [flat, chart.timeSignature]);

  const sequence = useMemo(() => chartToSequence(chart, { stringSet }), [chart, stringSet]);

  const optimized = useMemo(() => {
    if (sequence.length === 0) return null;
    try {
      return optimizeVoiceLeading(sequence, { startingInversion, avoidB9 });
    } catch {
      return null;
    }
  }, [sequence, startingInversion, avoidB9]);

  const transitions = optimized ? movementTransitions(optimized) : [];
  const guide = optimized ? guideLineAnalysis(optimized) : null;

  const chordCount = chart.measures.reduce((n, m) => n + m.chords.length, 0);

  const handleAdd = () =>
    addChord({
      root: form.root,
      chordType: form.chordType,
      beats: form.duration,
      targetTopNote: form.lead || undefined,
    });

  const handleUpdate = () => {
    if (!selectedChord) return;
    updateChord(selectedChord.id, {
      root: form.root,
      chordType: form.chordType,
      beats: form.duration,
      targetTopNote: form.lead || undefined,
    });
  };

  const loadPreset = () => {
    if (!presetValue) return;
    const [source, id] = presetValue.split(':');
    if (source === 'built-in') {
      const preset = SONG_PRESETS.find((p) => p.id === id);
      if (preset) loadSong(preset);
    } else {
      const saved = savedCharts.find((c) => c.id === id);
      if (saved) loadChart(saved);
    }
  };

  const selectForEdit = (chord: IRealChord) => {
    selectChord(chord.id);
    setForm({
      root: chord.root,
      chordType: chord.chordType ?? 'maj7',
      duration: chord.beats,
      lead: chord.targetTopNote ?? '',
    });
  };

  const beatsPerBar = chart.timeSignature[0];

  // Push control changes to the running arrangement so tempo, metronome, bass,
  // solo and loop all update live mid-playback (not just on the next Play).
  useEffect(() => {
    if (!sequencePlaying) return;
    getChordPlayer().setArrangementOptions({
      bpm: tempo,
      beatsPerBar,
      metronome,
      bassline,
      soloBass: bassSolo,
      loop: repeatForm,
    });
  }, [sequencePlaying, tempo, beatsPerBar, metronome, bassline, bassSolo, repeatForm]);

  const playAll = () => {
    if (!optimized || !audioEnabled) return;
    const events = optimized.map((chord) => ({
      fingering: chord.fingering,
      stringSet: chord.stringSet,
      startBeat: (barStartBeats[chord.barIndex] ?? chord.barIndex * beatsPerBar) + (chord.beat - 1),
      durationBeats: chord.durationBeats,
      bassMidi: 40 + ((pitchClassOf(chord.displayRoot) - 4 + 12) % 12),
    }));
    getChordPlayer().playArrangement(events, {
      bpm: tempo,
      beatsPerBar,
      metronome,
      bassline,
      soloBass: bassSolo,
      loop: repeatForm,
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Sequence Builder</h1>
        <p>
          Build or import a lead-sheet chart — sections, repeats, endings and time signatures — then let
          the optimiser choose drop 2 voicings with the smoothest voice leading and play it back in time.
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
              {savedCharts.length > 0 && (
                <optgroup label="Saved">
                  {savedCharts.map((p) => (
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

        <button className="btn btn-sm btn-primary" onClick={() => setShowImport((v) => !v)} data-testid="import-toggle">
          Import iReal Pro
        </button>
        <div className="control-group">
          <span className="label">Export</span>
          <div className="row">
            <button
              className="btn btn-sm"
              data-testid="export-link"
              onClick={() => {
                const url = toIRealURL(chart);
                navigator.clipboard?.writeText(url).catch(() => {});
                window.prompt('iReal Pro link (copy):', url);
              }}
            >
              Link
            </button>
            <button className="btn btn-sm" onClick={() => download(`${slug(chart.title)}.html`, toIRealHTML(chart), 'text/html')}>
              .html
            </button>
            <button
              className="btn btn-sm"
              onClick={() => download(`${slug(chart.title)}.json`, JSON.stringify(chart, null, 2), 'application/json')}
            >
              .json
            </button>
          </div>
        </div>

        <button
          className="btn btn-sm"
          onClick={() => {
            const name = window.prompt('Name this chart:', chart.title);
            if (name) saveCurrentAs(name);
          }}
        >
          Save as…
        </button>
        <button className="btn btn-sm btn-danger" onClick={clearChart}>
          Clear All
        </button>
      </div>

      {showImport && (
        <ImportPanel
          onClose={() => setShowImport(false)}
          onImported={(title) => {
            setShowImport(false);
            void title;
          }}
        />
      )}

      {/* Chart metadata */}
      <div className="control-bar chart-meta-bar">
        <FormField label="Title">
          <input
            className="text-input"
            value={chart.title}
            onChange={(e) => setChartTitle(e.target.value)}
            aria-label="Chart title"
          />
        </FormField>
        <FormField label="Key">
          <NoteSelect value={keyTonic(chart.key)} onChange={(t) => setChartKey(applyKeyMode(t, chart.key))} aria-label="Chart key" />
        </FormField>
        <FormField label="Style">
          <input
            className="text-input"
            value={chart.style ?? ''}
            onChange={(e) => setChartStyle(e.target.value)}
            aria-label="Style"
            placeholder="e.g. Medium Swing"
          />
        </FormField>
        <FormField label="Time">
          <select
            value={`${chart.timeSignature[0]}/${chart.timeSignature[1]}`}
            onChange={(e) => {
              const [n, d] = e.target.value.split('/').map(Number);
              setTimeSignature([n, d]);
            }}
            aria-label="Time signature"
          >
            {['4/4', '3/4', '2/4', '6/8', '5/4', '12/8', '2/2'].map((ts) => (
              <option key={ts} value={ts}>
                {ts}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Transpose">
          <div className="row">
            {TRANSPOSE_STEPS.map((step) => (
              <button key={step} className="btn btn-sm" onClick={() => transpose(step)} title={`Transpose ${step > 0 ? 'up' : 'down'} a semitone`}>
                {step > 0 ? '+½' : '−½'}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <div className="chart-meta">
        <strong>{chart.title}</strong> · Key {chart.key ?? 'C'} · {chart.measures.length} bar
        {chart.measures.length === 1 ? '' : 's'} · {chordCount} chord{chordCount === 1 ? '' : 's'}
        {chart.composer ? ` · ${chart.composer}` : ''}
      </div>

      {/* Add / edit chord */}
      <div className="control-bar">
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
          <button type="button" className="btn btn-sm" onClick={handleUpdate} disabled={!selectedChord}>
            Update Chord
          </button>
          {selectedChord && (
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeChord(selectedChord.id)}>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* The chart */}
      {chordCount === 0 && chart.measures.length <= 1 ? (
        <p className="empty-hint">
          Your chart will appear here. Add a chord, load a preset, or import an iReal Pro link.
        </p>
      ) : (
        <ChartView
          chart={chart}
          selectedChordId={selectedChordId}
          selectedMeasureId={selectedMeasureId}
          insertionMeasureId={insertionMeasureId}
          onSelectChord={(id) => {
            const found = chart.measures.flatMap((m) => m.chords).find((c) => c.id === id);
            if (found) selectForEdit(found);
          }}
          onSelectMeasure={selectMeasure}
        />
      )}

      {selectedMeasureId && <MeasureEditor measureId={selectedMeasureId} />}

      {/* Voicing analysis for the selected chord */}
      {selectedChord && selectedChord.chordType && (
        <VoicingAnalysis chord={selectedChord} stringSet={stringSet} avoidB9={avoidB9} />
      )}

      {/* Optimised output */}
      {optimized && (
        <section className="analysis-panel">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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
              {audioEnabled && (
                <button
                  type="button"
                  className={`btn btn-sm${sequencePlaying ? ' btn-stop' : ' btn-primary'}`}
                  onClick={() => (sequencePlaying ? getChordPlayer().stop() : playAll())}
                  style={{ alignSelf: 'flex-end', minWidth: 120 }}
                >
                  {sequencePlaying ? '■ Stop' : '♪ Play sequence'}
                </button>
              )}
            </div>
          </div>

          {/* Tempo & playback */}
          <div className="control-bar" style={{ marginTop: 14, marginBottom: 0 }}>
            <div className="control-group">
              <span className="label">Tempo</span>
              <div className="row" style={{ gap: 10 }}>
                <input
                  type="range"
                  min={40}
                  max={300}
                  step={1}
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  aria-label="Tempo (BPM)"
                  style={{ width: 140 }}
                />
                <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 58 }}>♩ = {tempo}</span>
              </div>
            </div>
            <label className="switch" title="Click track on every beat during playback">
              <input type="checkbox" checked={metronome} onChange={(e) => setMetronome(e.target.checked)} data-testid="metronome" />
              Metronome
            </label>
            <label className="switch" title="Play each chord's root as a bass note">
              <input type="checkbox" checked={bassline} onChange={(e) => setBassline(e.target.checked)} data-testid="bassline" />
              Bass line
            </label>
            {bassline && (
              <label className="switch" title="Mute the chords — hear only the bass line">
                <input type="checkbox" checked={bassSolo} onChange={(e) => setBassSolo(e.target.checked)} data-testid="bass-solo" />
                Solo
              </label>
            )}
            <label className="switch" title="Loop the whole chart until you press Stop">
              <input type="checkbox" checked={repeatForm} onChange={(e) => setRepeatForm(e.target.checked)} data-testid="repeat-form" />
              Repeat form
            </label>
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

function keyTonic(key: string | undefined): string {
  if (!key) return 'C';
  const m = /^([A-G][#b]?)/.exec(key.trim());
  return m ? m[1] : 'C';
}
function applyKeyMode(tonic: string, prevKey: string | undefined): string {
  return prevKey && /minor|min|m$/i.test(prevKey) ? `${tonic} minor` : tonic;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-group">
      <span className="label">{label}</span>
      {children}
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
      </div>
    );
  }

  const total = transitions.reduce((sum, t) => sum + t.distance, 0);
  return (
    <div style={{ marginTop: 16 }}>
      <div>
        <strong>Total voice movement:</strong> {total} · <strong>Average:</strong>{' '}
        {(total / Math.max(1, transitions.length)).toFixed(1)}
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
  chord: IRealChord;
  stringSet: 'middle' | 'upper';
  avoidB9: boolean;
}) {
  const setPreferredInversion = useStore((s) => s.setPreferredInversion);
  const { inspect } = useInspector();
  const chordType = chord.chordType!;

  const analyses = ([0, 1, 2, 3] as Inversion[]).map((inv) => {
    const voicing = generateChordVoicing(chord.root, chordType, inv, stringSet);
    return {
      inv,
      voicing,
      usable: voicing ? shouldUseVoicing(voicing, stringSet, chordType, avoidB9) : false,
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
                rootDisplay: chord.root,
                chordType,
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
