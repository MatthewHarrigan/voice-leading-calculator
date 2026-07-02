import { useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { useStore } from '@/state/store';
import { getChordPlayer } from '@/audio/player';
import { InspectorProvider } from '@/components/inspector';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalControls } from '@/components/GlobalControls';
import { LibraryPage } from '@/pages/LibraryPage';
import { ProgressionsPage } from '@/pages/ProgressionsPage';
import { ChaptersPage } from '@/pages/ChaptersPage';
import { SequenceBuilderPage } from '@/pages/SequenceBuilderPage';
import { MelodyPage } from '@/pages/MelodyPage';

const NAV = [
  { to: '/', label: 'Library', end: true },
  { to: '/progressions', label: 'Progressions' },
  { to: '/chapters', label: 'Studies' },
  { to: '/sequence', label: 'Sequence Builder' },
  { to: '/melody', label: 'Melody Finder' },
];

export function App() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // iOS grants audio activation most reliably on touchend/click, but strums
  // start on pointerdown — so unlock the audio session on every plain tap.
  // Once running this is a no-op, and it also recovers the context after an
  // iOS "interrupted" state (phone call, lock screen).
  useEffect(() => {
    const unlock = () => void getChordPlayer().resume();
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    return () => {
      window.removeEventListener('touchend', unlock);
      window.removeEventListener('click', unlock);
    };
  }, []);

  return (
    <InspectorProvider>
      <div className="app-shell">
        <header className="topbar">
          <NavLink to="/" className="brand">
            <span className="mark">Drop 2</span>
            <span className="sub">Voicing Workbench</span>
          </NavLink>
          <nav className="nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-spacer" />
          <button
            type="button"
            className="palette-trigger"
            data-testid="palette-trigger"
            title="Search tunes, presets and pages (⌘K)"
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
            }
          >
            <span className="palette-trigger-label">Search…</span>
            <kbd>⌘K</kbd>
          </button>
          <GlobalControls />
        </header>

        <CommandPalette />

        <main className="content">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/progressions" element={<ProgressionsPage />} />
            <Route path="/chapters" element={<ChaptersPage />} />
            <Route path="/chapters/:chapterId" element={<ChaptersPage />} />
            <Route path="/sequence" element={<SequenceBuilderPage />} />
            <Route path="/melody" element={<MelodyPage />} />
            <Route path="*" element={<LibraryPage />} />
          </Routes>
        </main>
      </div>
    </InspectorProvider>
  );
}
