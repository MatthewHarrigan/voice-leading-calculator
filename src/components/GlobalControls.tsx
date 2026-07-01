import { useStore } from '@/state/store';
import { getChordPlayer } from '@/audio/player';
import { Popover } from '@/components/Popover';

// The set-and-forget options live in a compact popover so the header stays a
// single uncluttered row at every width; only the theme toggle sits beside it.
export function GlobalControls() {
  const stringSet = useStore((s) => s.stringSet);
  const setStringSet = useStore((s) => s.setStringSet);
  const freeStringSet = useStore((s) => s.freeStringSet);
  const setFreeStringSet = useStore((s) => s.setFreeStringSet);
  const avoidB9 = useStore((s) => s.avoidB9);
  const setAvoidB9 = useStore((s) => s.setAvoidB9);
  const audioEnabled = useStore((s) => s.audioEnabled);
  const setAudioEnabled = useStore((s) => s.setAudioEnabled);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  const summary = `${stringSet === 'upper' ? 'Upper' : 'Middle'}${freeStringSet ? ' +' : ''}`;

  return (
    <div className="row" style={{ gap: 8 }}>
      <Popover label={`⚙ ${summary}`} title="String set, voice-leading and sound settings" testid="settings-toggle" align="right">
        <div className="settings-panel">
          <div className="settings-row">
            <span className="settings-label">String set</span>
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
          </div>

          <label
            className="switch"
            title="Voice-lead across both string sets — the selected set starts the line, and later chords may hop sets when it means less movement"
          >
            <input
              type="checkbox"
              checked={freeStringSet}
              onChange={(e) => setFreeStringSet(e.target.checked)}
              data-testid="free-stringset"
            />
            Cross sets
          </label>

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
        </div>
      </Popover>

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
