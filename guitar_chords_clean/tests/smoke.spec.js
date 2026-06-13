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
