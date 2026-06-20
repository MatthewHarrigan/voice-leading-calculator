import { useMemo, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { parseIRealIndex, parseIRealSongChunk } from '@/music/ireal/parse';
import type { IRealChart } from '@/music/ireal/types';
import { STANDARD_FIXTURES } from '@/music/ireal/fixtures';

interface ImportPanelProps {
  onClose: () => void;
  onImported: (title: string) => void;
}

/** Above this size we don't fully parse every song into the saved-charts
 * library (it would bloat persisted state) and we cap the rendered rows. */
const BIG_PLAYLIST = 200;

/**
 * Import a chart from an iReal Pro link (paste) or an exported `.html`/`.txt`
 * file. A single song loads immediately. A playlist of several songs is loaded
 * at runtime (its raw source lives only in this browser) and shown in a
 * searchable browser so you can open any tune — including the full Jazz 1460.
 */
export function ImportPanel({ onClose, onImported }: ImportPanelProps) {
  const loadChart = useStore((s) => s.loadChart);
  const addSavedCharts = useStore((s) => s.addSavedCharts);
  const setPlaylist = useStore((s) => s.setPlaylist);
  const clearPlaylist = useStore((s) => s.clearPlaylist);
  const playlist = useStore((s) => s.playlist);

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);
  // Force the paste form even while a playlist is loaded (to load a different one).
  const [paste, setPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasPlaylist = !!playlist && playlist.songs.length > 1;
  const showBrowser = hasPlaylist && !paste;

  // Filtered song list for the browser (hook stays unconditional).
  const matches = useMemo(() => {
    if (!playlist) return [];
    const q = query.trim().toLowerCase();
    return q
      ? playlist.songs.filter(
          (s) => s.title.toLowerCase().includes(q) || s.composer.toLowerCase().includes(q),
        )
      : playlist.songs;
  }, [playlist, query]);

  const doImport = (raw: string) => {
    let index;
    try {
      index = parseIRealIndex(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that link.');
      return;
    }
    if (index.songs.length === 0) {
      setError('No songs found in the iReal Pro link.');
      return;
    }
    setError(null);
    if (index.songs.length === 1) {
      const chart = parseIRealSongChunk(index.scheme, index.songs[0].chunk);
      if (!chart) {
        setError('Could not read that song.');
        return;
      }
      loadChart(chart);
      onImported(chart.title);
      return;
    }
    // Playlist: store the raw source + in-memory index, then browse it.
    const res = setPlaylist(raw);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setWarning(res.persisted ? null : 'Loaded for this session only — too large to save across reloads.');
    setQuery('');
    setLoadedTitle(null);
    setPaste(false);
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result ?? ''));
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  const openSong = (chunk: string) => {
    if (!playlist) return;
    const chart = parseIRealSongChunk(playlist.scheme, chunk);
    if (!chart) {
      setError('Could not read that song.');
      return;
    }
    loadChart(chart);
    setLoadedTitle(chart.title);
    // Keep the browser open so the user can pick another tune.
  };

  // ---- Searchable playlist browser ----
  if (showBrowser && playlist) {
    const shown = matches.slice(0, BIG_PLAYLIST);
    const tooMany = playlist.songs.length > BIG_PLAYLIST;
    return (
      <section className="import-panel" data-testid="import-panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>
            {playlist.name ? `Playlist: ${playlist.name}` : 'Playlist'} — {matches.length}/
            {playlist.songs.length} songs
          </h3>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close import">
            ✕
          </button>
        </div>
        <input
          className="playlist-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or composer…"
          aria-label="Search playlist"
          data-testid="playlist-search"
          autoFocus
        />
        <div className="playlist-picker" data-testid="playlist-picker">
          {shown.map((song, i) => (
            <button
              key={`${song.title}-${i}`}
              className={`btn btn-sm playlist-song${song.title === loadedTitle ? ' is-active' : ''}`}
              onClick={() => openSong(song.chunk)}
            >
              {song.title}
              {song.composer ? <span className="muted"> · {song.composer}</span> : null}
            </button>
          ))}
          {matches.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No matches.</p>}
          {matches.length > shown.length && (
            <p className="playlist-more" data-testid="playlist-more">
              +{matches.length - shown.length} more — keep typing to narrow the list.
            </p>
          )}
        </div>
        {warning && (
          <p className="import-error" role="status">
            {warning}
          </p>
        )}
        {error && (
          <p className="import-error" role="alert">
            {error}
          </p>
        )}
        <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm btn-primary"
            data-testid="playlist-save-all"
            disabled={tooMany}
            title={tooMany ? 'Too many to add — use search to open tunes individually' : undefined}
            onClick={() => {
              const charts = playlist.songs
                .map((e) => parseIRealSongChunk(playlist.scheme, e.chunk))
                .filter((c): c is IRealChart => c !== null);
              addSavedCharts(charts);
              onClose();
            }}
          >
            {tooMany ? 'Too many to add to library' : `Add all ${playlist.songs.length} to library`}
          </button>
          <button className="btn btn-sm" data-testid="playlist-load-other" onClick={() => setPaste(true)}>
            Load a different playlist…
          </button>
          <button
            className="btn btn-sm btn-ghost"
            data-testid="playlist-clear"
            onClick={() => {
              clearPlaylist();
              setPaste(false);
              onClose();
            }}
          >
            Clear playlist
          </button>
        </div>
      </section>
    );
  }

  // ---- Paste / upload form ----
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
        exported <code>.html</code> file. A playlist stays loaded so you can browse and open its tunes.
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
        {hasPlaylist && (
          <button className="btn btn-sm" data-testid="playlist-back" onClick={() => setPaste(false)}>
            ← Back to playlist
          </button>
        )}
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
