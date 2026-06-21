import { beforeEach, describe, expect, test } from 'vitest';
import { useStore, type SavedTune } from './store';

const tune = (title: string): SavedTune => ({
  title,
  composer: 'X',
  scheme: 'irealb',
  chunk: `${title}=X==Medium Swing=C==1r34LbKcu7C^7 Z`,
});

const find = (id: string) => useStore.getState().userPlaylists.find((p) => p.id === id);

describe('custom playlists', () => {
  beforeEach(() => useStore.setState({ userPlaylists: [] }));

  test('create, add (dedupe by title), and remove', () => {
    const id = useStore.getState().createPlaylist('Gig set');
    useStore.getState().addToPlaylist(id, tune('Stella'));
    useStore.getState().addToPlaylist(id, tune('Stella')); // duplicate ignored
    useStore.getState().addToPlaylist(id, tune('Blue Bossa'));
    expect(find(id)!.name).toBe('Gig set');
    expect(find(id)!.entries.map((e) => e.title)).toEqual(['Stella', 'Blue Bossa']);

    useStore.getState().removeFromPlaylist(id, 'Stella');
    expect(find(id)!.entries.map((e) => e.title)).toEqual(['Blue Bossa']);
  });

  test('rename and delete', () => {
    const id = useStore.getState().createPlaylist('Temp');
    useStore.getState().renamePlaylist(id, 'Ballads');
    expect(find(id)!.name).toBe('Ballads');
    useStore.getState().deletePlaylist(id);
    expect(find(id)).toBeUndefined();
  });

  test('persists userPlaylists but not the in-memory playlist index', () => {
    useStore.getState().createPlaylist('Persisted');
    const raw = localStorage.getItem('vlc:v2');
    expect(raw).toBeTruthy();
    const state = JSON.parse(raw!).state;
    expect(state.userPlaylists.some((p: { name: string }) => p.name === 'Persisted')).toBe(true);
    expect(state.playlist).toBeUndefined(); // the ~1MB index never enters the persisted blob
  });
});
