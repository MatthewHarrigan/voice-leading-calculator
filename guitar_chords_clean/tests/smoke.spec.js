import { expect, test } from '@playwright/test';

test('loads the chord library and core interactions', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle(/Drop 2 Guitar Chord Library/);
  await expect(page.getByRole('heading', { name: 'DROP 2 CHORD INVERSIONS' })).toBeVisible();
  await expect(page.locator('#string-set-middle')).toHaveClass(/active/);
  await expect(page.locator('#sort-default')).toHaveClass(/active/);

  const firstChord = page.locator('.chord-card').first();
  await expect(firstChord.locator('object.chord-diagram')).toHaveAttribute('data', /chords\/C_maj7_inv1_tedGreen\.svg/);

  await firstChord.click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText('Cmaj7 Inv 1');
  await page.locator('#modal .close').click();
  await expect(page.locator('#modal')).toBeHidden();

  await page.getByRole('button', { name: 'Major ii-V-I' }).click();
  await expect(page.locator('#major-progressions.section.active')).toBeVisible();
  await expect(page.locator('#string-set-middle')).toHaveClass(/active/);
  await expect(page.locator('#major-progressions .progression')).toHaveCount(4);
  await expect(page.locator('#major-progressions svg')).not.toHaveCount(0);
  await expect(page.locator('#major-progressions')).toContainText('Major ii-V-I - Pattern 1');
  await expect(page.locator('#major-progressions')).not.toContainText('Distance:');
  await expect(page.locator('#major-progressions')).not.toContainText('middle-middle-middle');

  await page.getByRole('button', { name: 'Build Sequence' }).click();
  await page.locator('#rootSelect').selectOption('D');
  await page.locator('#chordTypeSelect').selectOption('min7');
  await page.getByRole('button', { name: 'Add Chord' }).click();
  await page.locator('#rootSelect').selectOption('G');
  await page.locator('#chordTypeSelect').selectOption('dom7');
  await page.getByRole('button', { name: 'Add Chord' }).click();
  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await expect(page.locator('#sequenceDisplay .chord-in-bar')).toHaveCount(3);
  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizationDisplay')).toBeVisible();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(3);
  await expect(page.locator('#movementAnalysis')).toContainText('Dm7 → G7:');
  await expect(page.locator('#movementAnalysis')).toContainText('G7 → Cmaj7:');
  await expect(page.locator('#movementAnalysis')).toContainText('Guide line (B string):');

  expect(pageErrors).toEqual([]);
});

test('keeps string set highlight while changing sections', async ({ page }) => {
  await page.goto('/');

  await page.locator('#string-set-upper').click();
  await expect(page.locator('#string-set-upper')).toHaveClass(/active/);
  await expect(page.locator('#string-set-middle')).not.toHaveClass(/active/);

  await page.getByRole('button', { name: 'Major ii-V-I' }).click();
  await expect(page.locator('#string-set-upper')).toHaveClass(/active/);
  await expect(page.getByRole('button', { name: 'Major ii-V-I' })).toHaveClass(/active/);

  await page.getByRole('button', { name: 'Build Sequence' }).click();
  await expect(page.locator('#string-set-upper')).toHaveClass(/active/);
  await expect(page.getByRole('button', { name: 'Build Sequence' })).toHaveClass(/active/);
});

test('loads built-in song presets into the sequence builder', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await expect(page.locator('#presetSelect')).toContainText('All The Things Study');
  await page.locator('#presetSelect').selectOption('built-in:all-the-things-study');
  await page.getByRole('button', { name: 'Load Preset' }).click();

  await expect(page.locator('#chartMeta')).toContainText('All The Things Study');
  await expect(page.locator('#chartMeta')).toContainText('Ab');
  await expect(page.locator('#sequenceDisplay .chord-in-bar')).toHaveCount(32);

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(32);
  await expect(page.locator('#optimizedSequence .chord-symbol')).toHaveCount(0);
  await expect(page.locator('#movementAnalysis .guide-line-note')).toHaveCount(32);

  expect(pageErrors).toEqual([]);
});

test('filters b9 avoid-interval voicings globally', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#avoidMinorSecondsToggle')).toBeChecked();

  let filteredMiddleCount = 0;
  await expect.poll(async () => {
    filteredMiddleCount = await page.locator('#all-chords .chord-card.voicing-filtered').count();
    return filteredMiddleCount;
  }).toBeGreaterThan(0);

  await page.locator('#avoidMinorSecondsToggle').uncheck();
  await expect(page.locator('#all-chords .chord-card.voicing-filtered')).toHaveCount(0);

  await page.locator('#avoidMinorSecondsToggle').check();
  await expect(page.locator('#all-chords .chord-card.voicing-filtered')).toHaveCount(filteredMiddleCount);

  await page.getByRole('button', { name: 'Major ii-V-I' }).click();
  await expect(page.locator('#major-progressions .progression')).toHaveCount(4);
  await expect(page.locator('#major-progressions svg')).not.toHaveCount(0);
});

test('explains available and avoided voicings for a selected sequence chord', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.getByRole('button', { name: 'Add Chord' }).click();
  await page.locator('#sequenceDisplay .sequence-chord').click();

  await expect(page.locator('#voicingAnalysisPanel')).toBeVisible();
  await expect(page.locator('#voicingAnalysisTitle')).toHaveText('Cmaj7 Voicing Analysis');
  await expect(page.locator('#voicingAnalysisSummary')).toContainText('available');
  await expect(page.locator('#availableVoicings .voicing-option')).not.toHaveCount(0);
  await expect(page.locator('#avoidedVoicings')).toContainText('b9 avoid interval');

  await page.locator('#availableVoicings .voicing-option', { hasText: '2nd' }).click();
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toContainText('2nd locked');
  await expect(page.locator('#voicingAnalysisSummary')).toContainText('2nd locked');
  await expect(page.locator('#availableVoicings .voicing-option.selected')).toContainText('2nd');

  await page.getByRole('button', { name: 'Clear lock' }).click();
  await expect(page.locator('#sequenceDisplay .sequence-chord')).not.toContainText('locked');
  await expect(page.locator('#voicingAnalysisSummary')).not.toContainText('locked');
});
