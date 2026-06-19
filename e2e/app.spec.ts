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

test('theme toggle switches to dark mode', async ({ page }) => {
  await gotoFresh(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Toggle colour theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
