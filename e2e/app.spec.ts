import { expect, test, type Page } from '@playwright/test';

async function gotoFresh(page: Page) {
  // Start from a clean persisted state so chart tests are deterministic.
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
}

// Clears persisted state exactly once (unlike gotoFresh, which clears on every
// load) so we can test rehydration across a real reload.
async function gotoClean(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
}

async function addChord(page: Page, root: string, type: string) {
  await page.getByLabel('Root', { exact: true }).selectOption(root);
  await page.getByLabel('Chord type').selectOption(type);
  await page.getByRole('button', { name: 'Add Chord' }).click();
}

test('library renders diagrams and opens the voicing inspector', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoFresh(page);
  await expect(page).toHaveTitle(/Drop 2 Voicing Workbench/);
  await expect(page.getByRole('heading', { name: 'Drop 2 Chord Inversions' })).toBeVisible();

  const firstCard = page.locator('.content .chord-card').first();
  await expect(firstCard.locator('svg.chord-diagram')).toBeVisible();
  await firstCard.dblclick();

  await expect(page.locator('.modal')).toBeVisible();
  await expect(page.locator('.inspector')).toContainText('Voicing Inspector');
  await expect(page.locator('.inspector')).toContainText('Cmaj7');
  await expect(page.locator('.voice-row')).toHaveCount(4);
  await page.locator('.close-x').click();
  await expect(page.locator('.modal')).toHaveCount(0);

  // A single click plays the chord and must NOT open the inspector.
  await firstCard.click();
  await expect(page.locator('.modal')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('avoid-b9 toggle flags and unflags voicings', async ({ page }) => {
  await gotoFresh(page);
  await expect(page.locator('.chord-card.is-avoid').first()).toBeVisible();
  const flagged = await page.locator('.chord-card.is-avoid').count();
  expect(flagged).toBeGreaterThan(0);

  await page.getByTestId('avoid-b9').uncheck();
  await expect(page.locator('.chord-card.is-avoid')).toHaveCount(0);

  await page.getByTestId('avoid-b9').check();
  await expect(page.locator('.chord-card.is-avoid')).toHaveCount(flagged);
});

test('string set toggle persists across navigation', async ({ page }) => {
  await gotoFresh(page);
  await page.getByTestId('stringset-upper').click();
  await expect(page.getByTestId('stringset-upper')).toHaveClass(/active/);

  await page.getByRole('link', { name: 'Progressions' }).click();
  await expect(page.getByTestId('stringset-upper')).toHaveClass(/active/);
});

test('progressions show four ranked ii-V-I patterns', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Progressions' }).click();

  await expect(page.locator('.progression')).toHaveCount(4);
  const firstChords = page.locator('.progression').first().locator('.progression-chord');
  await expect(firstChords).toHaveCount(3);

  await page.getByRole('button', { name: 'Minor ii-V-i' }).click();
  await expect(page.locator('.progression')).toHaveCount(4);

  await firstChords.first().dblclick();
  await expect(page.locator('.modal')).toBeVisible();
  await page.locator('.close-x').click();
});

test('Chapter 1 generates 34 groups and 180 card diagrams', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoFresh(page);
  await page.getByRole('link', { name: 'Studies' }).click();

  await expect(page.locator('.assignment-section .assignment-group')).toHaveCount(34);
  await expect(page.locator('.assignment-section .chord-card')).toHaveCount(180);
  await expect(page.locator('.assignment-section svg.chord-diagram')).toHaveCount(180);
  await expect(page.locator('.content')).toContainText('Approach 1');
  await expect(page.locator('.content')).toContainText('Cmaj7: 1 3 5 7');

  expect(errors).toEqual([]);
});

test('later chapters expose study charts that load the sequence builder', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Studies' }).click();
  await page.getByRole('link', { name: /Tensions on Top/ }).click();

  await expect(page.locator('.content')).toContainText('Study charts');
  await page.getByRole('button', { name: /Open in Sequence Builder/ }).first().click();

  await expect(page).toHaveURL(/\/sequence$/);
  await expect(page.locator('.chart-meta')).toContainText('Willmott 9ths Lead Study');
});

test('sequence builder adds chords and optimises voice leading', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();

  for (const [root, type] of [
    ['D', 'min7'],
    ['G', 'dom7'],
    ['C', 'maj7'],
  ]) {
    await page.getByLabel('Root', { exact: true }).selectOption(root);
    await page.getByLabel('Chord type').selectOption(type);
    await page.getByRole('button', { name: 'Add Chord' }).click();
  }

  await expect(page.locator('.sequence-chord')).toHaveCount(3);
  await expect(page.locator('.optimized-grid .optimized-chord')).toHaveCount(3);
  await expect(page.locator('.analysis-panel')).toContainText('Dm7 → G7');
  await expect(page.locator('.analysis-panel')).toContainText('Guide line');

  await page.locator('.optimized-grid .optimized-chord').first().dblclick();
  await expect(page.locator('.modal')).toBeVisible();
  await expect(page.locator('.inspector')).toContainText('Dm7');
  await page.locator('.close-x').click();

  expect(errors).toEqual([]);
});

test('sequence builder loads a built-in preset', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();

  await page.getByLabel('Preset').selectOption('built-in:all-the-things-study');
  await page.getByRole('button', { name: 'Load' }).click();

  await expect(page.locator('.chart-meta')).toContainText('All The Things Study');
  await expect(page.locator('.chart-meta')).toContainText('Ab');
  await expect(page.locator('.sequence-chord')).toHaveCount(32);
});

test('voicing analysis locks and clears a preferred inversion', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();

  await page.getByLabel('Root', { exact: true }).selectOption('C');
  await page.getByLabel('Chord type').selectOption('maj7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await page.locator('.sequence-chord').first().click();
  const panel = page.locator('.voicing-analysis');
  await expect(panel).toContainText('Voicing Analysis');
  await expect(panel.locator('.voicing-options .voicing-option').first()).toBeVisible();

  await panel.locator('.voicing-option', { hasText: '2nd' }).first().click();
  await expect(page.locator('.sequence-chord')).toContainText('2nd locked');

  await page.getByRole('button', { name: 'Clear lock' }).click();
  await expect(page.locator('.sequence-chord')).not.toContainText('locked');
});

test('melody finder places a note on top', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Melody Finder' }).click();

  await page.getByLabel('Melody note').selectOption('E');
  await page.getByLabel('Chord root').selectOption('C');
  await page.getByLabel('Chord type').selectOption('maj7');
  await page.getByRole('button', { name: 'Find Voicing' }).click();

  await expect(page.locator('.chord-card svg.chord-diagram').first()).toBeVisible();
  await page.getByRole('button', { name: 'Add to melody line' }).click();
  await expect(page.locator('.progression-chords .progression-chord')).toHaveCount(1);
});

test('chart persists across reload and new chords keep unique ids', async ({ page }) => {
  await gotoClean(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'C', 'maj7');
  await expect(page.locator('.sequence-chord')).toHaveCount(1);

  // Full document reload — the store must rehydrate from localStorage.
  await page.goto('/');
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await expect(page.locator('.sequence-chord')).toHaveCount(1);

  // The new chord must get a fresh id (no collision with the restored one):
  // removing the first leaves exactly one.
  await addChord(page, 'D', 'min7');
  await expect(page.locator('.sequence-chord')).toHaveCount(2);
  await page.locator('.sequence-chord').first().click();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.sequence-chord')).toHaveCount(1);
});

test('melody finder analyses a built line', async ({ page }) => {
  await gotoClean(page);
  await page.getByRole('link', { name: 'Melody Finder' }).click();

  for (const note of ['E', 'G']) {
    await page.getByLabel('Melody note').selectOption(note);
    await page.getByLabel('Chord root').selectOption('C');
    await page.getByLabel('Chord type').selectOption('maj7');
    await page.getByRole('button', { name: 'Find Voicing' }).click();
    await page.getByRole('button', { name: 'Add to melody line' }).click();
  }

  await expect(page.locator('.progression-chords .progression-chord')).toHaveCount(2);
  await expect(page.getByText('Melody line analysis')).toBeVisible();
  await expect(page.locator('.analysis-panel')).toContainText('steps or common tones');
});

test('play button fills while held and strums once on release', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoFresh(page);
  await page.locator('.content .chord-card').first().dblclick();
  await expect(page.locator('.modal')).toBeVisible();

  const play = page.getByRole('button', { name: /Play voicing/i });
  const box = await play.boundingBox();
  if (!box) throw new Error('play button not found');

  // Hold: enters the pressing state and the fill bar advances.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(play).toHaveAttribute('data-pressing', 'true');
  await page.waitForTimeout(350);
  const fillWidth = await play.locator('.strum-fill').evaluate((el) => el.getBoundingClientRect().width);
  expect(fillWidth).toBeGreaterThan(0);

  await page.mouse.up();
  await expect(play).toHaveAttribute('data-pressing', 'false');
  await expect(play).toContainText('Play');

  // A quick tap also resolves cleanly (no stuck pressing state).
  await play.click();
  await expect(play).toHaveAttribute('data-pressing', 'false');

  expect(errors).toEqual([]);
});

test('play sequence with tempo/metronome/bass can be stopped', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoClean(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'D', 'min7');
  await addChord(page, 'G', 'dom7');
  await addChord(page, 'C', 'maj7');

  await page.getByTestId('metronome').check();
  await page.getByTestId('bassline').check();
  // Solo only appears once the bass line is enabled.
  await page.getByTestId('bass-solo').check();

  await page.getByRole('button', { name: 'Play sequence' }).click();
  const stop = page.getByRole('button', { name: 'Stop' });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(page.getByRole('button', { name: 'Play sequence' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('theme toggle switches to dark mode', async ({ page }) => {
  await gotoFresh(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle colour theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

const VECTOR_920 =
  'irealb://9%2E20%20Special=Warren%20Earl==Medium%20Swing=C==1r34LbKcu7bB%2C7B4D9%2CXQyX%2CC%7CQyX6%2DF%7CQXy%2C9D%7CQyX%2C6%2DF%7CQy%7CsC7%2C4TA%2A%7B%20%2C7G%7CN1lD9Dl2NZL%20QyXQyX%7DG7%2C7bAs%20%2C7G%7CQyX%2C9%2CXyQ%7C7A%2C7KQyX%2C%2ABC7%2ClcKQyX%2C7DZL%20lcQKyX%2C6FZL%20lcKQyX%20LZG7%5B%5D%206C7B%2C7C%5B%2AAD9%2CC%7CQyX%2C6%2DF%7CQyX9%2CD%7CQyX%2C6%2DF%7CQyX%2CXyQ%7Cs%5D%20%20lc%2CBb7%2CA7%7ClD9%2CXyQ%7CG7%2C%20C6%20Z%20==0=0===';

test('imports a pasted iReal Pro link with sections, endings and repeats', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(VECTOR_920);
  await page.getByTestId('import-submit').click();

  await expect(page.locator('.chart-meta')).toContainText('9.20 Special');
  await expect(page.locator('.chart-meta')).toContainText('Key C');
  // First/second endings and a repeat barline are rendered (scope to the score;
  // the guitar-diagram view mirrors the same chrome, so endings appear in both).
  // Each ending shows one short volta (.ending-mark) over its first bar.
  await expect(page.locator('.chart-view .ending-mark')).toHaveCount(2);
  await expect(page.locator('.chart-measure.close-repeat')).not.toHaveCount(0);
  await expect(page.locator('.bar-repeat')).not.toHaveCount(0);
  // Section marks A and B.
  await expect(page.locator('.chart-view .section-mark')).not.toHaveCount(0);

  // It can be played and stopped (structure-aware).
  await page.getByRole('button', { name: 'Play sequence' }).click();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Play sequence' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('opens a tune from the bundled Jazz 1460 playlist', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('bundled-jazz-1460').click();
  await page.getByTestId('playlist-search').fill('autumn leaves');
  await page.getByTestId('playlist-picker').getByRole('button', { name: /Autumn Leaves/ }).first().click();

  // The canonical version renders correctly (the old hand-typed preset's 2nd
  // endings were broken) and produces voicings.
  await expect(page.locator('.chart-meta')).toContainText('Autumn Leaves');
  await expect(page.locator('.chart-meta')).toContainText('G minor');
  await expect(page.locator('.optimized-grid .optimized-chord')).not.toHaveCount(0);
});

test('measure editor sets a barline and inserts/deletes bars', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'C', 'maj7');
  await addChord(page, 'G', 'dom7');

  const realBars = page.locator('.chart-measure:not(.chart-measure-pad)');
  await expect(realBars).toHaveCount(2);

  // Select the first bar by clicking its top margin (away from the chord).
  await page.locator('.chart-measure').first().click({ position: { x: 6, y: 6 } });
  await expect(page.getByTestId('measure-editor')).toBeVisible();

  await page.getByTestId('measure-close').selectOption('repeat');
  await expect(page.locator('.chart-measure.close-repeat')).toHaveCount(1);

  await page.getByTestId('insert-measure').click();
  await expect(realBars).toHaveCount(3);

  await page.getByTestId('delete-measure').click();
  await expect(realBars).toHaveCount(2);
});

test('playback options update live while the sequence is playing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await gotoClean(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'D', 'min7');
  await addChord(page, 'G', 'dom7');
  await addChord(page, 'C', 'maj7');

  await page.getByRole('button', { name: 'Play sequence' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

  // Toggle each option WHILE playing — these must not throw or stop playback.
  await page.getByTestId('metronome').check();
  await page.getByTestId('bassline').check();
  await page.getByTestId('bass-solo').check();
  await page.getByTestId('repeat-form').check();
  await page.getByLabel('Tempo (BPM)').fill('180');
  await page.getByTestId('bass-solo').uncheck();
  await page.getByTestId('metronome').uncheck();

  // Still playing (repeat-form loops it), and Stop returns to idle.
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Play sequence' })).toBeVisible();

  expect(errors).toEqual([]);
});

test('a playhead highlights the current bar during playback', async ({ page }) => {
  await gotoClean(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'D', 'min7');
  await addChord(page, 'G', 'dom7');
  await addChord(page, 'C', 'maj7');

  await expect(page.locator('.chart-measure.measure-playing')).toHaveCount(0);

  await page.getByLabel('Tempo (BPM)').fill('120');
  await page.getByRole('button', { name: 'Play sequence' }).click();
  // A bar lights up in the chart and a diagram lights up in the optimised grid.
  await expect(page.locator('.chart-measure.measure-playing')).toHaveCount(1);
  await expect(page.locator('.optimized-chord.playing')).not.toHaveCount(0);

  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.chart-measure.measure-playing')).toHaveCount(0);
  await expect(page.locator('.optimized-chord.playing')).toHaveCount(0);
});

test('optimised diagrams mirror the chart bar layout', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(VECTOR_920);
  await page.getByTestId('import-submit').click();

  // Diagrams are grouped into per-bar measures on the same 16-column grid.
  await expect(page.locator('.optimized-chart-grid')).toBeVisible();
  await expect(page.locator('.optimized-measure')).not.toHaveCount(0);
  await expect(page.locator('.optimized-grid .optimized-chord')).not.toHaveCount(0);
  // The guitar sheet mirrors the score's structural chrome (sections, endings).
  await expect(page.locator('.optimized-chart-grid .section-mark')).not.toHaveCount(0);
  await expect(page.locator('.optimized-chart-grid .ending-mark')).not.toHaveCount(0);
});

const PLAYLIST =
  'irealbook://Tune One=Me=Medium Swing=C=n={C^7 |G7 |C^7 |G7 }===Tune Two=You=Bossa Nova=F=n={F^7 |C7 |F^7 |C7 }===My Set';

test('imports a multi-song playlist via the picker', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(PLAYLIST);
  await page.getByTestId('import-submit').click();

  const picker = page.getByTestId('playlist-picker');
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: /Tune Two/ }).click();
  await expect(page.locator('.chart-meta')).toContainText('Tune Two');
  await expect(page.locator('.chart-meta')).toContainText('Key F');
});

test('playlist browser searches, keeps open on open, and stays out of persisted state', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(PLAYLIST);
  await page.getByTestId('import-submit').click();

  const picker = page.getByTestId('playlist-picker');
  await expect(picker.locator('.playlist-song')).toHaveCount(2);

  // Search filters by title/composer.
  await page.getByTestId('playlist-search').fill('Two');
  await expect(picker.locator('.playlist-song')).toHaveCount(1);
  await expect(picker.locator('.playlist-song')).toContainText('Tune Two');

  // Opening a tune loads it but keeps the browser open for the next pick.
  await picker.locator('.playlist-song').first().click();
  await expect(page.locator('.chart-meta')).toContainText('Tune Two');
  await expect(picker).toBeVisible();

  // Clearing the search restores the full list.
  await page.getByTestId('playlist-search').fill('');
  await expect(picker.locator('.playlist-song')).toHaveCount(2);

  // The ~1MB-capable playlist must NOT live in the persisted vlc:v2 blob.
  const v2 = await page.evaluate(() => localStorage.getItem('vlc:v2'));
  expect(JSON.parse(v2 ?? '{}').state?.playlist).toBeUndefined();
  const src = await page.evaluate(() => localStorage.getItem('vlc:playlist'));
  expect(src).toContain('Tune Two');
});

test('a loaded playlist survives reload and can be cleared', async ({ page }) => {
  await gotoClean(page); // clears once; the reload below keeps localStorage
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(PLAYLIST);
  await page.getByTestId('import-submit').click();
  await expect(page.getByTestId('playlist-picker')).toBeVisible();

  // Reload: the chip rehydrates from the dedicated key (no re-paste).
  await page.goto('/');
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  const chip = page.getByTestId('playlist-chip');
  await expect(chip).toContainText('2 tunes');
  await chip.getByTestId('playlist-browse').click();
  await expect(page.getByTestId('playlist-picker')).toBeVisible();

  // Clear removes the chip and the dedicated key.
  await chip.getByTestId('playlist-clear-chip').click();
  await expect(page.getByTestId('playlist-chip')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vlc:playlist'))).toBeNull();
});

test('a single-song link loads immediately with no playlist chip', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(VECTOR_920);
  await page.getByTestId('import-submit').click();
  await expect(page.getByTestId('import-panel')).toHaveCount(0); // auto-closed
  await expect(page.locator('.chart-meta')).toContainText('9.20 Special');
  await expect(page.getByTestId('playlist-chip')).toHaveCount(0);
});

test('renders stacked time signature, repeat dots, and alternate chords', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();

  // 9.20 Special has a repeat and a time signature.
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('import-text').fill(VECTOR_920);
  await page.getByTestId('import-submit').click();
  await expect(page.locator('.time-sig')).not.toHaveCount(0);
  await expect(page.locator('.repeat-dots')).not.toHaveCount(0);

  // Stella By Starlight carries alternate chords (Gm7 / Aø7) shown small above the bar.
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('bundled-jazz-1460').click();
  await page.getByTestId('playlist-search').fill('stella by starlight');
  await page.getByTestId('playlist-picker').getByRole('button', { name: /Stella By Starlight/ }).first().click();
  await expect(page.locator('.sc-alt')).not.toHaveCount(0);
});

test('builds a custom playlist that persists across reload', async ({ page }) => {
  await gotoClean(page); // clears once; the reload below keeps localStorage
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('bundled-jazz-1460').click();
  await page.getByTestId('playlist-search').fill('blue bossa');

  // Add the tune to a brand-new playlist via the row's "+ Add to" menu.
  page.on('dialog', (d) => d.accept('Gig set'));
  await page.getByTestId('playlist-add').first().click();
  await page.getByRole('button', { name: /New playlist/ }).click();

  // It now lives under My playlists.
  await page.getByTestId('playlist-back').click();
  await expect(page.locator('.my-playlists')).toContainText('Gig set');

  // Survives a real reload, and its tune still loads. (Jazz 1460 stays loaded,
  // so the panel reopens in the browser — step back to the Tunes home first.)
  await page.goto('/');
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await page.getByTestId('import-toggle').click();
  await page.getByTestId('playlist-back').click();
  await page.locator('.my-playlists .playlist-song').filter({ hasText: 'Gig set' }).click();
  await page.getByTestId('playlist-picker').getByRole('button', { name: /Blue Bossa/ }).first().click();
  await expect(page.locator('.chart-meta')).toContainText('Blue Bossa');
});

test('view toggle switches between chart, guitar and both', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'D', 'min7');
  await addChord(page, 'G', 'dom7');

  // Default is "Both": the chord score and the guitar sheet are both present.
  await expect(page.locator('.chart-view')).toHaveCount(1);
  await expect(page.locator('.optimized-chart-grid')).toHaveCount(1);

  // Guitar only hides the chord score.
  await page.getByTestId('view-guitar').click();
  await expect(page.locator('.chart-view')).toHaveCount(0);
  await expect(page.locator('.optimized-chart-grid')).toHaveCount(1);

  // Chart only hides the guitar sheet.
  await page.getByTestId('view-chart').click();
  await expect(page.locator('.chart-view')).toHaveCount(1);
  await expect(page.locator('.optimized-chart-grid')).toHaveCount(0);

  await page.getByTestId('view-both').click();
  await expect(page.locator('.chart-view')).toHaveCount(1);
  await expect(page.locator('.optimized-chart-grid')).toHaveCount(1);
});

test('changing the key transposes all chords in both views', async ({ page }) => {
  await gotoFresh(page);
  await page.getByRole('link', { name: 'Sequence Builder' }).click();
  await addChord(page, 'D', 'min7');
  await addChord(page, 'G', 'dom7');
  await addChord(page, 'C', 'maj7');

  await expect(page.locator('.chart-view')).toContainText('Dm7');
  await expect(page.locator('.optimized-grid')).toContainText('Dm7');

  // Move the key up to D (a whole step): Dm7 G7 Cmaj7 -> Em7 A7 Dmaj7.
  await page.getByLabel('Chart key').selectOption('D');

  await expect(page.locator('.chart-meta')).toContainText('Key D');
  await expect(page.locator('.chart-view')).toContainText('Em7');
  await expect(page.locator('.chart-view')).not.toContainText('Dm7');
  await expect(page.locator('.optimized-grid')).toContainText('Em7');
});
