import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, type SavedTune } from '@/state/store';
import { parseIRealIndex, parseIRealSongChunk } from '@/music/ireal/parse';
import { BUNDLED_PLAYLISTS, fetchBundledPlaylist } from '@/data/bundledPlaylists';

interface ImportPanelProps {
  onClose: () => void;
  onImported: (title: string) => void;
}

/**
 * Rows render in pages of this size so a 1460-song list paints fast; scrolling
 * near the bottom of the picker loads the next page, so the whole list is
 * reachable without searching.
 */
const PAGE_SIZE = 200;

/**
 * The Tunes library: open a built-in playlist (Jazz 1460), browse/search any
 * loaded playlist, curate custom playlists, or import an iReal Pro link/file.
 * A single pasted song loads immediately; a playlist opens the browser.
 */
export function ImportPanel({ onClose, onImported }: ImportPanelProps) {
  const loadChart = useStore((s) => s.loadChart);
  const setPlaylist = useStore((s) => s.setPlaylist);
  const clearPlaylist = useStore((s) => s.clearPlaylist);
  const playlist = useStore((s) => s.playlist);
  const userPlaylists = useStore((s) => s.userPlaylists);
  const createPlaylist = useStore((s) => s.createPlaylist);
  const renamePlaylist = useStore((s) => s.renamePlaylist);
  const deletePlaylist = useStore((s) => s.deletePlaylist);
  const addToPlaylist = useStore((s) => s.addToPlaylist);
  const removeFromPlaylist = useStore((s) => s.removeFromPlaylist);

  const hasPlaylist = !!playlist && playlist.songs.length > 1;
  const [mode, setMode] = useState<'home' | 'browse'>(hasPlaylist ? 'browse' : 'home');
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);
  const [addMenuFor, setAddMenuFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeCustom = activeCustomId
    ? userPlaylists.find((p) => p.id === activeCustomId) ?? null
    : null;
  const browsing = mode === 'browse' && (activeCustom != null || hasPlaylist);

  const rows: SavedTune[] = useMemo(() => {
    if (activeCustom) return activeCustom.entries;
    if (hasPlaylist)
      return playlist!.songs.map((s) => ({
        title: s.title,
        composer: s.composer,
        scheme: playlist!.scheme,
        chunk: s.chunk,
      }));
    return [];
  }, [activeCustom, hasPlaylist, playlist]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? rows.filter((r) => r.title.toLowerCase().includes(q) || r.composer.toLowerCase().includes(q))
      : rows;
  }, [rows, query]);

  // Lazy list growth: start with one page and add another whenever the picker
  // scrolls near its end. A new search / playlist starts back at one page.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeCustomId, playlist]);

  const growOnScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
      setVisibleCount((count) => (count < matches.length ? count + PAGE_SIZE : count));
    }
  };

  const goBrowse = () => {
    setQuery('');
    setLoadedTitle(null);
    setError(null);
    setMode('browse');
  };

  const openBundled = async (id: string) => {
    const entry = BUNDLED_PLAYLISTS.find((p) => p.id === id);
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      const src = await fetchBundledPlaylist(entry);
      const res = setPlaylist(src);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setWarning(res.persisted ? null : 'Loaded for this session only — too large to save across reloads.');
      setActiveCustomId(null);
      goBrowse();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that playlist.');
    } finally {
      setBusy(false);
    }
  };

  const loadTune = (scheme: string, chunk: string) => {
    const chart = parseIRealSongChunk(scheme, chunk);
    if (!chart) {
      setError('Could not read that song.');
      return;
    }
    loadChart(chart);
    setLoadedTitle(chart.title);
  };

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
      if (!chart) return setError('Could not read that song.');
      loadChart(chart);
      onImported(chart.title);
      return;
    }
    const res = setPlaylist(raw);
    if (!res.ok) return setError(res.error);
    setWarning(res.persisted ? null : 'Loaded for this session only — too large to save across reloads.');
    setActiveCustomId(null);
    goBrowse();
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result ?? ''));
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  };

  const addTuneTo = (playlistId: string, tune: SavedTune) => {
    addToPlaylist(playlistId, tune);
    setAddMenuFor(null);
  };

  const newPlaylistWith = (tune?: SavedTune) => {
    const name = window.prompt('Name the new playlist:')?.trim();
    if (!name) return null;
    const id = createPlaylist(name);
    if (tune) addToPlaylist(id, tune);
    setAddMenuFor(null);
    return id;
  };

  // ---------- Browser ----------
  if (browsing) {
    const shown = matches.slice(0, visibleCount);
    const title = activeCustom ? activeCustom.name : playlist?.name ?? 'Playlist';
    return (
      <section className="import-panel" data-testid="import-panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>
            {title} — {matches.length}/{rows.length} tunes
          </h3>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close tunes">
            ✕
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn btn-sm"
            data-testid="playlist-back"
            onClick={() => {
              setActiveCustomId(null);
              setQuery('');
              setMode('home');
            }}
          >
            ‹ Tunes
          </button>
          <input
            className="playlist-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or composer…"
            aria-label="Search tunes"
            data-testid="playlist-search"
            autoFocus
          />
        </div>
        <div className="playlist-picker" data-testid="playlist-picker" onScroll={growOnScroll}>
          {shown.map((tune, i) => (
            <div className="playlist-row" key={`${tune.title}-${i}`}>
              <button
                className={`btn btn-sm playlist-song${tune.title === loadedTitle ? ' is-active' : ''}`}
                onClick={() => loadTune(tune.scheme, tune.chunk)}
              >
                {tune.title}
                {tune.composer ? <span className="muted"> · {tune.composer}</span> : null}
              </button>
              {activeCustom ? (
                <button
                  className="btn btn-sm btn-ghost"
                  title="Remove from this playlist"
                  onClick={() => removeFromPlaylist(activeCustom.id, tune.title)}
                >
                  ✕
                </button>
              ) : (
                <div className="add-wrap">
                  <button
                    className="btn btn-sm btn-ghost"
                    data-testid="playlist-add"
                    aria-label="Add to playlist"
                    onClick={() => setAddMenuFor(addMenuFor === tune.title ? null : tune.title)}
                  >
                    + Add to ▾
                  </button>
                  {addMenuFor === tune.title && (
                    <div className="add-menu" role="menu">
                      {userPlaylists.map((p) => (
                        <button key={p.id} className="add-menu-item" onClick={() => addTuneTo(p.id, tune)}>
                          {p.name}
                        </button>
                      ))}
                      <button className="add-menu-item add-menu-new" onClick={() => newPlaylistWith(tune)}>
                        + New playlist…
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {matches.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No matches.</p>}
          {matches.length > shown.length && (
            <p className="playlist-more" data-testid="playlist-more">
              +{matches.length - shown.length} more — scroll to load them.
            </p>
          )}
        </div>
        {warning && <p className="import-error" role="status">{warning}</p>}
        {error && <p className="import-error" role="alert">{error}</p>}
        {!activeCustom && hasPlaylist && (
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn btn-sm btn-ghost"
              data-testid="playlist-clear"
              onClick={() => {
                clearPlaylist();
                setMode('home');
              }}
            >
              Clear loaded playlist
            </button>
          </div>
        )}
      </section>
    );
  }

  // ---------- Home ----------
  return (
    <section className="import-panel" data-testid="import-panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Tunes</h3>
        <button className="btn btn-sm" onClick={onClose} aria-label="Close tunes">
          ✕
        </button>
      </div>

      <div className="tunes-section">
        <span className="label">Built-in</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {BUNDLED_PLAYLISTS.map((p) => (
            <button
              key={p.id}
              className="btn btn-sm btn-primary"
              data-testid={`bundled-${p.id}`}
              disabled={busy}
              onClick={() => openBundled(p.id)}
            >
              {busy ? 'Loading…' : p.name}
            </button>
          ))}
          {hasPlaylist && (
            <button className="btn btn-sm" onClick={goBrowse}>
              Browse loaded ({playlist!.songs.length})
            </button>
          )}
        </div>
      </div>

      <div className="tunes-section">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="label">My playlists</span>
          <button
            className="btn btn-sm"
            data-testid="playlist-new"
            onClick={() => {
              const id = newPlaylistWith();
              if (id) {
                setActiveCustomId(id);
                goBrowse();
              }
            }}
          >
            + New
          </button>
        </div>
        {userPlaylists.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            No playlists yet — open a tune and use “+ Add to” to start one.
          </p>
        ) : (
          <div className="my-playlists">
            {userPlaylists.map((p) => (
              <div className="playlist-row" key={p.id}>
                <button
                  className="btn btn-sm playlist-song"
                  onClick={() => {
                    setActiveCustomId(p.id);
                    goBrowse();
                  }}
                >
                  {p.name} <span className="muted">· {p.entries.length}</span>
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  aria-label={`Rename ${p.name}`}
                  onClick={() => {
                    const name = window.prompt('Rename playlist:', p.name)?.trim();
                    if (name) renamePlaylist(p.id, name);
                  }}
                >
                  ✎
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete playlist “${p.name}”?`)) deletePlaylist(p.id);
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tunes-section">
        <span className="label">Import an iReal Pro link or file</span>
        <textarea
          className="import-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="irealb://…"
          rows={2}
          aria-label="iReal Pro link"
          data-testid="import-text"
        />
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button
            className="btn btn-sm btn-primary"
            data-testid="import-submit"
            onClick={() => doImport(text)}
            disabled={!text.trim()}
          >
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
        </div>
      </div>

      {error && <p className="import-error" role="alert">{error}</p>}
    </section>
  );
}
