import { useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { parseIRealURL } from '@/music/ireal/parse';
import type { IRealChart } from '@/music/ireal/types';
import { STANDARD_FIXTURES } from '@/music/ireal/fixtures';

interface ImportPanelProps {
  onClose: () => void;
  onImported: (title: string) => void;
}

/**
 * Import a chart from an iReal Pro link (paste) or an exported `.html`/`.txt`
 * file. A single song loads immediately; a playlist of several songs shows a
 * picker so you can choose one (or add the whole set to your library).
 */
export function ImportPanel({ onClose, onImported }: ImportPanelProps) {
  const loadChart = useStore((s) => s.loadChart);
  const addSavedCharts = useStore((s) => s.addSavedCharts);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<IRealChart[] | null>(null);
  const [playlistName, setPlaylistName] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadOne = (chart: IRealChart) => {
    loadChart(chart);
    onImported(chart.title);
  };

  const doImport = (raw: string) => {
    let playlist;
    try {
      playlist = parseIRealURL(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that link.');
      return;
    }
    setError(null);
    if (playlist.songs.length <= 1) {
      loadOne(playlist.songs[0]);
    } else {
      setSongs(playlist.songs);
      setPlaylistName(playlist.name);
    }
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result ?? ''));
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  if (songs) {
    return (
      <section className="import-panel" data-testid="import-panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>
            Playlist{playlistName ? `: ${playlistName}` : ''} — {songs.length} songs
          </h3>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close import">
            ✕
          </button>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Choose a song to open, or add them all to your library.</p>
        <div className="playlist-picker" data-testid="playlist-picker">
          {songs.map((song, i) => (
            <button key={`${song.title}-${i}`} className="btn btn-sm playlist-song" onClick={() => loadOne(song)}>
              {song.title}
              {song.composer ? <span className="muted"> · {song.composer}</span> : null}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <button
            className="btn btn-sm btn-primary"
            data-testid="playlist-save-all"
            onClick={() => {
              addSavedCharts(songs);
              onClose();
            }}
          >
            Add all {songs.length} to library
          </button>
          <button className="btn btn-sm" onClick={() => setSongs(null)}>
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="import-panel" data-testid="import-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Import from iReal Pro</h3>
        <button className="btn btn-sm" onClick={onClose} aria-label="Close import">
          ✕
        </button>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Paste an <code>irealb://</code> or <code>irealbook://</code> link (single song or playlist), or upload an
        exported <code>.html</code> file.
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
      {error && (
        <p className="import-error" role="alert">
          {error}
        </p>
      )}
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
        <span className="muted" style={{ fontSize: 13 }}>
          or try a standard:
        </span>
        {STANDARD_FIXTURES.map((f) => (
          <button key={f.name} className="btn btn-sm btn-ghost" onClick={() => doImport(f.url)}>
            {f.name}
          </button>
        ))}
      </div>
    </section>
  );
}
