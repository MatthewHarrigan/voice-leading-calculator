import { useStore } from '@/state/store';
import type { BarlineClose, BarlineOpen } from '@/music/ireal/types';

interface MeasureEditorProps {
  measureId: string;
}

const OPEN_OPTIONS: { value: BarlineOpen | ''; label: string }[] = [
  { value: '', label: 'Single |' },
  { value: 'double', label: 'Double [' },
  { value: 'repeat', label: 'Repeat {' },
];
const CLOSE_OPTIONS: { value: BarlineClose; label: string }[] = [
  { value: 'single', label: 'Single |' },
  { value: 'double', label: 'Double ]' },
  { value: 'repeat', label: 'Repeat }' },
  { value: 'final', label: 'Final ‖' },
];
const TIME_OPTIONS = ['inherit', '4/4', '3/4', '2/4', '6/8', '5/4', '12/8', '2/2'];

/** Per-measure structural editing: barlines, section, ending, time sig, markers. */
export function MeasureEditor({ measureId }: MeasureEditorProps) {
  const measure = useStore((s) => s.chart.measures.find((m) => m.id === measureId)) ?? null;
  const index = useStore((s) => s.chart.measures.findIndex((m) => m.id === measureId));
  const patchMeasure = useStore((s) => s.patchMeasure);
  const insertMeasureAfter = useStore((s) => s.insertMeasureAfter);
  const deleteMeasure = useStore((s) => s.deleteMeasure);

  if (!measure) return null;

  return (
    <section className="analysis-panel measure-editor" data-testid="measure-editor">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Bar {index + 1}</h3>
        <div className="row">
          <button className="btn btn-sm" data-testid="insert-measure" onClick={() => insertMeasureAfter(measureId)}>
            Insert bar after
          </button>
          <button className="btn btn-sm btn-danger" data-testid="delete-measure" onClick={() => deleteMeasure(measureId)}>
            Delete bar
          </button>
        </div>
      </div>

      <div className="control-bar" style={{ marginTop: 12 }}>
        <Field label="Section">
          <input
            className="text-input narrow"
            value={measure.section ?? ''}
            maxLength={6}
            placeholder="—"
            aria-label="Section label"
            data-testid="measure-section"
            onChange={(e) => patchMeasure(measureId, { section: e.target.value || undefined })}
          />
        </Field>
        <Field label="Open">
          <select
            value={measure.open ?? ''}
            aria-label="Open barline"
            onChange={(e) => patchMeasure(measureId, { open: (e.target.value || undefined) as BarlineOpen | undefined })}
          >
            {OPEN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Close">
          <select
            value={measure.close ?? 'single'}
            aria-label="Close barline"
            data-testid="measure-close"
            onChange={(e) => patchMeasure(measureId, { close: e.target.value as BarlineClose })}
          >
            {CLOSE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ending">
          <select
            value={measure.ending ?? ''}
            aria-label="Ending"
            data-testid="measure-ending"
            onChange={(e) => patchMeasure(measureId, { ending: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">none</option>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}.
              </option>
            ))}
          </select>
        </Field>
        <Field label="Time">
          <select
            value={measure.timeSig ? `${measure.timeSig[0]}/${measure.timeSig[1]}` : 'inherit'}
            aria-label="Measure time signature"
            onChange={(e) => {
              if (e.target.value === 'inherit') patchMeasure(measureId, { timeSig: undefined });
              else {
                const [n, d] = e.target.value.split('/').map(Number);
                patchMeasure(measureId, { timeSig: [n, d] });
              }
            }}
          >
            {TIME_OPTIONS.map((ts) => (
              <option key={ts} value={ts}>
                {ts}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bar repeat">
          <select
            value={measure.barRepeat ?? ''}
            aria-label="Bar repeat"
            onChange={(e) =>
              patchMeasure(measureId, { barRepeat: e.target.value ? (Number(e.target.value) as 1 | 2) : undefined })
            }
          >
            <option value="">none</option>
            <option value={1}>1 bar (%)</option>
            <option value={2}>2 bars</option>
          </select>
        </Field>
      </div>

      <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
        <label className="switch">
          <input type="checkbox" checked={!!measure.segno} onChange={(e) => patchMeasure(measureId, { segno: e.target.checked })} />
          Segno
        </label>
        <label className="switch">
          <input type="checkbox" checked={!!measure.coda} onChange={(e) => patchMeasure(measureId, { coda: e.target.checked })} />
          Coda
        </label>
        <label className="switch">
          <input type="checkbox" checked={!!measure.fermata} onChange={(e) => patchMeasure(measureId, { fermata: e.target.checked })} />
          Fermata
        </label>
        <Field label="Text / directive">
          <input
            className="text-input"
            value={measure.staffText ?? ''}
            placeholder="e.g. D.C. al Coda"
            aria-label="Staff text"
            onChange={(e) => patchMeasure(measureId, { staffText: e.target.value || undefined })}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-group">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
