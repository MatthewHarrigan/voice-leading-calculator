import { useStore } from '@/state/store';
import { getChordPlayer } from '@/audio/player';

export function GlobalControls() {
  const stringSet = useStore((s) => s.stringSet);
  const setStringSet = useStore((s) => s.setStringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const setAvoidB9 = useStore((s) => s.setAvoidB9);
  const audioEnabled = useStore((s) => s.audioEnabled);
  const setAudioEnabled = useStore((s) => s.setAudioEnabled);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  return (
    <div className="row" style={{ gap: 14 }}>
      <div className="segmented" role="group" aria-label="String set">
        <button
          type="button"
          className={stringSet === 'middle' ? 'active' : ''}
          onClick={() => setStringSet('middle')}
          aria-pressed={stringSet === 'middle'}
          data-testid="stringset-middle"
        >
          Middle
        </button>
        <button
          type="button"
          className={stringSet === 'upper' ? 'active' : ''}
          onClick={() => setStringSet('upper')}
          aria-pressed={stringSet === 'upper'}
          data-testid="stringset-upper"
        >
          Upper
        </button>
      </div>

      <label className="switch" title="Flag voicings with a minor-9th (b9) clash">
        <input
          type="checkbox"
          checked={avoidB9}
          onChange={(e) => setAvoidB9(e.target.checked)}
          data-testid="avoid-b9"
        />
        Avoid b9
      </label>

      <label className="switch" title="Play chords on click">
        <input
          type="checkbox"
          checked={audioEnabled}
          onChange={(e) => {
            setAudioEnabled(e.target.checked);
            if (e.target.checked) void getChordPlayer().resume();
          }}
          data-testid="audio-toggle"
        />
        Sound
      </label>

      <button
        type="button"
        className="btn-ghost btn btn-sm"
        onClick={toggleTheme}
        aria-label="Toggle colour theme"
        title="Toggle light / dark"
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>
    </div>
  );
}
