// Built-in playlists shipped as static assets under `public/` and fetched on
// demand (so the ~1MB chord data never bloats the initial JS bundle). The raw
// files are `irealb://` links parsed by the existing iReal Pro engine.

export interface BundledPlaylist {
  id: string;
  name: string;
  /** Path under the deploy base (no leading slash); see `fetchBundledPlaylist`. */
  file: string;
}

export const BUNDLED_PLAYLISTS: BundledPlaylist[] = [
  { id: 'jazz-1460', name: 'Jazz 1460', file: 'playlists/jazz-1460.txt' },
];

/** Fetch a bundled playlist's raw `irealb://` source, honouring the deploy base
 * (`/voice-leading-calculator/` in production, `/` under VITE_BASE). */
export async function fetchBundledPlaylist(entry: BundledPlaylist): Promise<string> {
  const res = await fetch(import.meta.env.BASE_URL + entry.file);
  if (!res.ok) throw new Error(`Could not load ${entry.name} (HTTP ${res.status}).`);
  return (await res.text()).trim();
}
