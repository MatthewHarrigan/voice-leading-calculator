import { useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { STANDARD_FIXTURES } from '@/music/ireal/fixtures';

interface ImportPanelProps {
  onClose: () => void;
  onImported: (title: string) => void;
}

/**
 * Import a chart from an iReal Pro link (paste) or an exported `.html`/`.txt`
 * file. iReal Pro shares songs as an HTML file whose link is an `irealb://` URL,
 * so we accept either the raw link or the whole file's text.
 */
export function ImportPanel({ onClose, onImported }: ImportPanelProps) {
  const importIRealText = useStore((s) => s.importIRealText);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doImport = (raw: string) => {
    const result = importIRealText(raw);
    if (result.ok) {
      setError(null);
      onImported(result.title);
    } else {
      setError(result.error);
    }
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result ?? ''));
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  return (
    <section className="import-panel" data-testid="import-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Import from iReal Pro</h3>
        <button className="btn btn-sm" onClick={onClose} aria-label="Close import">
          ✕
        </button>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Paste an <code>irealb://</code> or <code>irealbook://</code> link, or upload an exported
        <code> .html</code> file.
      </p>
      <textarea
        className="import-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="irealb://..."
        rows={3}
        aria-label="iReal Pro link"
        data-testid="import-text"
      />
      {error && <p className="import-error" role="alert">{error}</p>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn btn-sm btn-primary" data-testid="import-submit" onClick={() => doImport(text)} disabled={!text.trim()}>
          Import
        </button>
        <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
          Upload file…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".html,.htm,.txt,text/html,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <span className="muted" style={{ fontSize: 13 }}>or try a standard:</span>
        {STANDARD_FIXTURES.map((f) => (
          <button key={f.name} className="btn btn-sm btn-ghost" onClick={() => doImport(f.url)}>
            {f.name}
          </button>
        ))}
      </div>
    </section>
  );
}
