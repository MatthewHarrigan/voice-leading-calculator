// A Spotlight-style command palette (⌘K / Ctrl+K): one big centred search box
// that finds tunes across every source — built-in presets, saved charts, your
// playlists and the loaded iReal library — plus page navigation and library
// actions. Enter loads the tune and jumps to the Sequence Builder.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/state/store';
import { parseIRealSongChunk } from '@/music/ireal/parse';
import { BUNDLED_PLAYLISTS, fetchBundledPlaylist } from '@/data/bundledPlaylists';
import { SONG_PRESETS } from '@/data/presets';

interface PaletteRow {
  key: string;
  title: string;
  subtitle?: string;
  /** Small badge on the right: where this result comes from. */
  kind: string;
  run: () => void | Promise<void>;
}

const MAX_RESULTS = 40;

/** Rank: title starts with the query > a word starts with it > contains it. */
function score(row: PaletteRow, q: string): number {
  const title = row.title.toLowerCase();
  const sub = (row.subtitle ?? '').toLowerCase();
  if (title.startsWith(q)) return 0;
  if (title.split(/\s+/).some((w) => w.startsWith(q))) return 1;
  if (title.includes(q)) return 2;
  if (sub.includes(q)) return 3;
  return Infinity;
}

const NAV_PAGES = [
  { label: 'Library', to: '/' },
  { label: 'Progressions', to: '/progressions' },
  { label: 'Studies', to: '/chapters' },
  { label: 'Sequence Builder', to: '/sequence' },
  { label: 'Melody Finder', to: '/melody' },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const playlist = useStore((s) => s.playlist);
  const userPlaylists = useStore((s) => s.userPlaylists);
  const savedCharts = useStore((s) => s.savedCharts);
  const loadChart = useStore((s) => s.loadChart);
  const loadSong = useStore((s) => s.loadSong);
  const setPlaylist = useStore((s) => s.setPlaylist);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
    setError(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setSelected(0);
        setError(null);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const openTune = useCallback(
    (scheme: string, chunk: string) => {
      const chart = parseIRealSongChunk(scheme, chunk);
      if (!chart) {
        setError('Could not read that song.');
        return;
      }
      loadChart(chart);
      navigate('/sequence');
      close();
    },
    [loadChart, navigate, close],
  );

  const rows: PaletteRow[] = useMemo(() => {
    const out: PaletteRow[] = [];

    for (const page of NAV_PAGES) {
      out.push({
        key: `nav-${page.to}`,
        title: `Go to ${page.label}`,
        kind: 'page',
        run: () => {
          navigate(page.to);
          close();
        },
      });
    }

    for (const entry of BUNDLED_PLAYLISTS) {
      if (playlist?.name === entry.name) continue;
      out.push({
        key: `bundled-${entry.id}`,
        title: `Open ${entry.name} library`,
        subtitle: 'load the bundled playlist, then search it here',
        kind: 'library',
        run: async () => {
          setBusy(true);
          setError(null);
          try {
            const src = await fetchBundledPlaylist(entry);
            const res = setPlaylist(src);
            if (!res.ok) setError(res.error);
            setQuery('');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load that playlist.');
          } finally {
            setBusy(false);
          }
        },
      });
    }

    for (const preset of SONG_PRESETS) {
      out.push({
        key: `preset-${preset.id}`,
        title: preset.title,
        kind: 'preset',
        run: () => {
          loadSong(preset);
          navigate('/sequence');
          close();
        },
      });
    }

    for (const chart of savedCharts) {
      out.push({
        key: `saved-${chart.id}`,
        title: chart.title,
        subtitle: chart.composer,
        kind: 'saved',
        run: () => {
          loadChart(chart);
          navigate('/sequence');
          close();
        },
      });
    }

    for (const list of userPlaylists) {
      for (const tune of list.entries) {
        out.push({
          key: `pl-${list.id}-${tune.title}`,
          title: tune.title,
          subtitle: `${tune.composer ? `${tune.composer} · ` : ''}${list.name}`,
          kind: 'playlist',
          run: () => openTune(tune.scheme, tune.chunk),
        });
      }
    }

    if (playlist) {
      for (const song of playlist.songs) {
        out.push({
          key: `lib-${song.title}`,
          title: song.title,
          subtitle: `${song.composer ? `${song.composer} · ` : ''}${playlist.name ?? 'loaded playlist'}`,
          kind: 'tune',
          run: () => openTune(playlist.scheme, song.chunk),
        });
      }
    }

    return out;
  }, [playlist, userPlaylists, savedCharts, loadChart, loadSong, setPlaylist, navigate, close, openTune]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // A blank palette surfaces actions and presets, not 1460 tunes.
      return rows.filter((r) => r.kind !== 'tune' && r.kind !== 'playlist').slice(0, MAX_RESULTS);
    }
    return rows
      .map((row) => ({ row, rank: score(row, q) }))
      .filter((r) => r.rank !== Infinity)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_RESULTS)
      .map((r) => r.row);
  }, [rows, query]);

  useEffect(() => setSelected(0), [query, open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      e.preventDefault();
      void results[selected].run();
    }
  };

  return (
    <div className="palette-overlay" onPointerDown={close} data-testid="command-palette">
      <div className="palette" onPointerDown={(e) => e.stopPropagation()}>
        <input
          className="palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder={busy ? 'Loading library…' : 'Search tunes, presets, pages…'}
          aria-label="Command palette search"
          data-testid="palette-input"
          autoFocus
        />
        <div className="palette-list" ref={listRef}>
          {results.map((row, i) => (
            <button
              key={row.key}
              type="button"
              className={`palette-row${i === selected ? ' selected' : ''}`}
              data-selected={i === selected}
              data-testid="palette-row"
              onPointerEnter={() => setSelected(i)}
              onClick={() => void row.run()}
            >
              <span className="palette-title">
                {row.title}
                {row.subtitle && <span className="palette-subtitle"> · {row.subtitle}</span>}
              </span>
              <span className="palette-kind">{row.kind}</span>
            </button>
          ))}
          {results.length === 0 && <p className="palette-empty">No matches.</p>}
        </div>
        {error && (
          <p className="import-error" role="alert" style={{ margin: '6px 14px' }}>
            {error}
          </p>
        )}
        <div className="palette-hint">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
