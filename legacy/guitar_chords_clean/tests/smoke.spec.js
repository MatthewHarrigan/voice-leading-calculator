import { expect, test } from '@playwright/test';

async function loadBuiltInPreset(page, presetId) {
  const value = `built-in:${presetId}`;
  await expect(page.locator('#chordTypeSelect')).toContainText('Major 7');
  await page.locator('#presetSelect').selectOption(value);
  await expect(page.locator('#presetSelect')).toHaveValue(value);
  await page.evaluate(() => window.loadSelectedPreset());
}

test('loads the chord library and core interactions', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle(/Drop 2 Guitar Chord Library/);
  await expect(page.getByRole('heading', { name: 'DROP 2 CHORD INVERSIONS' })).toBeVisible();
  await expect(page.locator('#string-set-middle')).toHaveClass(/active/);
  await expect(page.locator('#sort-default')).toHaveClass(/active/);

  const firstChord = page.locator('#all-chords .chord-card:visible').first();
  await expect(firstChord.locator('object.chord-diagram')).toHaveAttribute('data', /chords\/C_maj7_inv1_tedGreen\.svg/);

  await firstChord.click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText('Cmaj7 Inv 1');
  const firstModalSvgText = await page.locator('#modalChord').evaluate(element =>
    [...element.contentDocument.querySelectorAll('text')].map(text => text.textContent).join('|')
  );
  await expect(page.locator('#voicingInspector')).toContainText('Voicing Inspector');
  await expect(page.locator('#voicingInspector')).toContainText('Chord: Cmaj7');
  await expect(page.locator('#voicingInspector')).toContainText('Inversion: Root');
  await expect(page.locator('#voicingInspector')).toContainText('Top voice:');
  await expect(page.locator('#voicingInspector')).toContainText('Fret span:');
  await expect(page.locator('#voicingInspector .voice-row')).toHaveCount(4);
  await page.locator('#modal .close').click();
  await expect(page.locator('#modal')).toBeHidden();

  const secondVisibleChord = page.locator('#all-chords .chord-card:visible').nth(1);
  await secondVisibleChord.click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalTitle')).not.toHaveText('Cmaj7 Inv 1');
  await expect.poll(async () => page.locator('#modalChord').evaluate(element =>
    [...element.contentDocument.querySelectorAll('text')].map(text => text.textContent).join('|')
  )).not.toBe(firstModalSvgText);
  await page.locator('#modal .close').click();
  await expect(page.locator('#modal')).toBeHidden();

  await page.getByRole('button', { name: 'Major ii-V-I' }).click();
  await expect(page.locator('#major-progressions.section.active')).toBeVisible();
  await expect(page.locator('#string-set-middle')).toHaveClass(/active/);
  await expect(page.locator('#major-progressions .progression')).toHaveCount(4);
  await expect(page.locator('#major-progressions .progression-chord')).not.toHaveCount(0);
  await expect(page.locator('#major-progressions')).toContainText('Major ii-V-I - Pattern 1');
  await expect(page.locator('#major-progressions')).not.toContainText('Distance:');
  await expect(page.locator('#major-progressions')).not.toContainText('middle-middle-middle');

  await page.locator('#major-progressions .progression-chord').first().click();
  await expect(page.locator('#modal')).toBeVisible();
  const firstProgressionModalTitle = await page.locator('#modalTitle').innerText();
  const firstProgressionModalSvg = await page.locator('#modalSVG').innerHTML();
  await expect(page.locator('#modalSVG')).toHaveCount(1);
  await expect(page.locator('#modalChord')).toBeHidden();
  await expect(page.locator('#voicingInspector')).toContainText('Voicing Inspector');
  await page.locator('#modal .close').click();
  await expect(page.locator('#modal')).toBeHidden();
  await expect(page.locator('#modalSVG')).toHaveCount(0);

  await page.locator('#major-progressions .progression-chord').nth(1).click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalSVG')).toHaveCount(1);
  await expect(page.locator('#modalTitle')).not.toHaveText(firstProgressionModalTitle);
  await expect.poll(async () => page.locator('#modalSVG').innerHTML()).not.toBe(firstProgressionModalSvg);
  await page.locator('#modal .close').click();
  await expect(page.locator('#modal')).toBeHidden();

  await page.getByRole('button', { name: 'Build Sequence' }).click();
  await page.locator('#rootSelect').selectOption('D');
  await page.locator('#chordTypeSelect').selectOption('min7');
  await page.getByRole('button', { name: 'Add Chord' }).click();
  await page.locator('#rootSelect').selectOption('G');
  await page.locator('#chordTypeSelect').selectOption('dom7');
  await page.getByRole('button', { name: 'Add Chord' }).click();
  await expect(page.locator('#optimizationDisplay')).toBeVisible();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(2);

  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await expect(page.locator('#sequenceDisplay .chord-in-bar')).toHaveCount(3);
  await expect(page.locator('#optimizationDisplay')).toBeVisible();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(3);
  await expect(page.locator('#optimizedSequence .optimized-voicing-meta')).toHaveCount(0);
  await expect(page.locator('#movementAnalysis')).toContainText('Dm7 → G7:');
  await expect(page.locator('#movementAnalysis')).toContainText('G7 → Cmaj7:');
  await expect(page.locator('#movementAnalysis')).toContainText('Guide line (B string):');

  await page.locator('#optimizedSequence .optimized-chord-in-bar').first().click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#voicingInspector')).toContainText('Chord: Dm7');
  await expect(page.locator('#voicingInspector')).toContainText('String set: middle');
  await expect(page.locator('#voicingInspector')).toContainText('Top voice:');
  await expect(page.locator('#voicingInspector .voice-row')).toHaveCount(4);
  await page.locator('#modal .close').click();
  await expect(page.locator('#modal')).toBeHidden();

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

test('renders ii-V-I pages when opened directly', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Major ii-V-I' }).click();
  await expect(page.locator('#major-progressions.section.active')).toBeVisible();
  await expect(page.locator('#major-progressions .progression')).toHaveCount(4);
  await expect(page.locator('#major-progressions .progression-chord')).not.toHaveCount(0);

  await page.getByRole('button', { name: 'Minor ii-V-i' }).click();
  await expect(page.locator('#minor-progressions.section.active')).toBeVisible();
  await expect(page.locator('#minor-progressions .progression')).toHaveCount(4);
  await expect(page.locator('#minor-progressions .progression-chord')).not.toHaveCount(0);
});

test('renders Chapter 1 assignment approaches', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Chapter 1' }).click();

  await expect(page.locator('#chapter-1-assignment.section.active')).toBeVisible();
  await expect(page.locator('#chapter-1-assignment .assignment-section h2')).toHaveText([
    'Approach 1',
    'Approach 2',
    'Approach 3'
  ]);
  await expect(page.locator('#chapter-1-assignment .assignment-group')).toHaveCount(34);
  await expect(page.locator('#chapter-1-assignment .assignment-card')).toHaveCount(180);
  await expect(page.locator('#chapter-1-assignment .assignment-card svg')).toHaveCount(180);
  await expect(page.locator('#chapter-1-assignment')).toContainText('D - Root inversion');
  await expect(page.locator('#chapter-1-assignment')).toContainText('Fmaj7 - 1 3 5 7');
  await expect(page.locator('#chapter-1-assignment')).toContainText('Cmaj7 symmetrical pattern');

  await page.locator('#chapter-1-assignment .assignment-card').first().click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modalTitle')).toHaveText('Dmaj7 Root');
  await expect(page.locator('#voicingInspector')).toContainText('Voicing Inspector');
  await page.locator('#modal .close').click();

  await page.locator('#string-set-upper').click();
  await expect(page.locator('#chapter-1-assignment.section.active')).toBeVisible();
  await expect(page.locator('#chapter-1-assignment .assignment-card svg')).toHaveCount(180);

  expect(pageErrors).toEqual([]);
});

test('loads built-in song presets into the sequence builder', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await expect(page.locator('#presetSelect')).toContainText('All The Things Study');
  await loadBuiltInPreset(page, 'all-the-things-study');

  await expect(page.locator('#chartMeta')).toContainText('All The Things Study');
  await expect(page.locator('#chartMeta')).toContainText('Ab');
  await expect(page.locator('#sequenceDisplay .chord-in-bar')).toHaveCount(32);

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(32);
  await expect(page.locator('#optimizedSequence .chord-symbol')).toHaveCount(0);
  await expect(page.locator('#movementAnalysis .guide-line-note')).toHaveCount(32);

  expect(pageErrors).toEqual([]);
});

test('restores sequence visibly and avoids stacking new chords', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('voiceLeadingCurrentSong', JSON.stringify({
      id: 'saved-test',
      title: 'Saved Test',
      key: 'C',
      timeSignature: [4, 4],
      sections: [
        {
          id: 'main',
          name: 'Main',
          bars: [
            { id: 'b1', beats: 4, chords: [{ beat: 1, duration: 4, root: 'C', chordType: 'maj7' }] }
          ]
        }
      ]
    }));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();
  await expect(page.locator('#chartMeta')).toContainText('Saved Test');
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(1);
  await expect(page.locator('#sequenceDisplay')).not.toContainText('Your chord sequence will appear here');

  await page.getByRole('button', { name: 'Clear All' }).click();
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(0);

  await page.locator('#durationSelect').selectOption('1');
  await page.locator('#barSelect').selectOption('1');
  await page.locator('#beatSelect').selectOption('1');
  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await page.locator('#barSelect').selectOption('1');
  await page.locator('#beatSelect').selectOption('1');
  await page.locator('#rootSelect').selectOption('D');
  await page.locator('#chordTypeSelect').selectOption('min7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  const firstBarChords = page.locator('#sequenceDisplay .chord-bar[data-bar-number="1"] .sequence-chord');
  await expect(firstBarChords).toHaveCount(2);
  await expect(firstBarChords.nth(0)).toHaveAttribute('data-beat', '1');
  await expect(firstBarChords.nth(1)).toHaveAttribute('data-beat', '2');
  await expect(firstBarChords.nth(0)).toHaveAttribute('data-lane', '1');
  await expect(firstBarChords.nth(1)).toHaveAttribute('data-lane', '1');

  expect(pageErrors).toEqual([]);
});

test('optimizes a single chord to show its voicing', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();
  await page.getByRole('button', { name: 'Clear All' }).click();

  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.locator('#targetTopNoteSelect').selectOption('B');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizationDisplay')).toBeVisible();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(1);
  await expect(page.locator('#movementAnalysis')).toContainText('Single chord voicing:');
  await expect(page.locator('#movementAnalysis')).toContainText('Lead target: B');

  await page.locator('#optimizedSequence .optimized-chord-in-bar').first().click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#voicingInspector')).toContainText('Lead target: B');
  await expect(page.locator('#voicingInspector')).toContainText('Top voice: B');

  expect(pageErrors).toEqual([]);
});

test('loads Blues for Alice with beat-aware chord placement', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await expect(page.locator('#presetSelect')).toContainText('Blues for Alice');
  await loadBuiltInPreset(page, 'blues-for-alice');

  await expect(page.locator('#chartMeta')).toContainText('Blues for Alice');
  await expect(page.locator('#chartMeta')).toContainText('F');
  await expect(page.locator('#chartMeta')).toContainText('12 bars');
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(20);

  const barTwo = page.locator('#sequenceDisplay .chord-bar[data-bar-number="2"]');
  await expect(barTwo.locator('.sequence-chord')).toHaveCount(2);
  await expect(barTwo).toContainText('E');
  await expect(barTwo).toContainText('A');
  await expect(barTwo).toContainText('beat 1');
  await expect(barTwo).toContainText('beat 3');
  await expect(barTwo.locator('.sequence-chord').nth(0)).toHaveAttribute('data-beat', '1');
  await expect(barTwo.locator('.sequence-chord').nth(0)).toHaveAttribute('data-beat-span', '2');
  await expect(barTwo.locator('.sequence-chord').nth(1)).toHaveAttribute('data-beat', '3');
});

test('loads Days-style lead note study with guide-tone targets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await expect(page.locator('#presetSelect')).toContainText('Days-Style Lead Note Study');
  await loadBuiltInPreset(page, 'days-style-lead-note-study');

  await expect(page.locator('#chartMeta')).toContainText('Days-Style Lead Note Study');
  await expect(page.locator('#chartMeta')).toContainText('F');
  await expect(page.locator('#chartMeta')).toContainText('32 bars');
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(49);
  await expect(page.locator('#sequenceDisplay .target-top-note-label')).toHaveCount(49);
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('lead E');

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(49);
});

test('loads Willmott 9ths lead study and optimizes tension voicings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await expect(page.locator('#chordTypeSelect')).toContainText('Major 9');
  await expect(page.locator('#chordTypeSelect')).toContainText('Dominant 7♭9');
  await expect(page.locator('#chordTypeSelect')).toContainText('Minor 9');

  await expect(page.locator('#presetSelect')).toContainText('Willmott 9ths Lead Study');
  await loadBuiltInPreset(page, 'willmott-9ths-lead-study');

  await expect(page.locator('#chartMeta')).toContainText('Willmott 9ths Lead Study');
  await expect(page.locator('#chartMeta')).toContainText('C');
  await expect(page.locator('#chartMeta')).toContainText('7 bars');
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(7);
  await expect(page.locator('#sequenceDisplay .target-top-note-label')).toHaveCount(7);
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('G9');
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('lead A');

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(7);
  await expect(page.locator('#optimizedSequence .optimized-lead-note-label')).toHaveCount(0);
  const firstOptimizedSvg = await page.locator('#optimizedSequence img.chord-diagram').first().evaluate(async img => {
    const response = await fetch(img.src);
    return response.text();
  });
  expect(firstOptimizedSvg).toContain('class="lead-note-label">A</text>');
  expect(firstOptimizedSvg).not.toContain('lead A');
  await expect(page.locator('#movementAnalysis')).toContainText('Guide line');
});

test('loads applied 9th comparison presets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await expect(page.locator('#presetSelect')).toContainText('Major ii-V-I 9ths');
  await loadBuiltInPreset(page, 'major-ii-v-i-9ths');

  await expect(page.locator('#chartMeta')).toContainText('Major ii-V-I 9ths');
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(4);
  await expect(page.locator('#sequenceDisplay .target-top-note-label')).toHaveCount(4);
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('Dm9');
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('lead E');

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(4);
  await expect(page.locator('#optimizedSequence .optimized-lead-note-label')).toHaveCount(0);

  await loadBuiltInPreset(page, 'jazz-blues-f-9ths');

  await expect(page.locator('#chartMeta')).toContainText('Jazz Blues in F 9ths');
  await expect(page.locator('#chartMeta')).toContainText('12 bars');
  await expect(page.locator('#sequenceDisplay .sequence-chord')).toHaveCount(16);
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('F9');
  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('lead G');

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizedSequence img.chord-diagram')).toHaveCount(16);
});

test('sets insertion point by clicking a beat lane and moves selected chords', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  const barThree = page.locator('#sequenceDisplay .chord-bar[data-bar-number="3"]');
  const box = await barThree.boundingBox();
  await barThree.click({ position: { x: box.width * 0.65, y: box.height / 2 } });

  await expect(page.locator('#barSelect')).toHaveValue('3');
  await expect(page.locator('#beatSelect')).toHaveValue('3');

  await page.locator('#durationSelect').selectOption('2');
  await page.locator('#rootSelect').selectOption('G');
  await page.locator('#chordTypeSelect').selectOption('dom7');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  const chord = page.locator('#sequenceDisplay .chord-bar[data-bar-number="3"] .sequence-chord').first();
  await expect(chord).toContainText('G7');
  await expect(chord).toContainText('beat 3');
  await expect(chord).toHaveAttribute('data-beat', '3');
  await expect(chord).toHaveAttribute('data-beat-span', '2');

  await chord.click();
  await page.locator('#beatSelect').selectOption('1');
  await page.getByRole('button', { name: 'Update Chord' }).click();

  const movedChord = page.locator('#sequenceDisplay .chord-bar[data-bar-number="3"] .sequence-chord').first();
  await expect(movedChord).toContainText('beat 1');
  await expect(movedChord).toHaveAttribute('data-beat', '1');
});

test('prefers lead notes during sequence optimization', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build Sequence' }).click();

  await page.locator('#rootSelect').selectOption('C');
  await page.locator('#chordTypeSelect').selectOption('maj7');
  await page.locator('#targetTopNoteSelect').selectOption('B');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await page.locator('#rootSelect').selectOption('D');
  await page.locator('#chordTypeSelect').selectOption('min7');
  await page.locator('#targetTopNoteSelect').selectOption('');
  await page.getByRole('button', { name: 'Add Chord' }).click();

  await expect(page.locator('#sequenceDisplay .sequence-chord').first()).toContainText('lead B');

  await page.getByRole('button', { name: 'Optimize Voice Leading' }).click();
  await expect(page.locator('#optimizationDisplay')).toBeVisible();
  await page.locator('#optimizedSequence .optimized-chord-in-bar').first().click();

  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#voicingInspector')).toContainText('Lead target: B');
  await expect(page.locator('#voicingInspector')).toContainText('Top voice: B');
});

test('filters b9 avoid-interval voicings globally', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#avoidMinorSecondsToggle')).toBeChecked();
  const visibleCardCount = await page.locator('#all-chords .chord-card:visible').count();

  let filteredMiddleCount = 0;
  await expect.poll(async () => {
    filteredMiddleCount = await page.locator('#all-chords .chord-card.voicing-filtered').count();
    return filteredMiddleCount;
  }).toBeGreaterThan(0);
  await expect(page.locator('#all-chords .chord-card.voicing-filtered').first()).toBeVisible();
  await expect(page.locator('#all-chords .chord-card.voicing-filtered').first()).toHaveCSS('background-color', 'rgb(255, 250, 250)');
  await expect(page.locator('#all-chords .chord-card:visible')).toHaveCount(visibleCardCount);

  await page.locator('#avoidMinorSecondsToggle').uncheck();
  await expect(page.locator('#all-chords .chord-card.voicing-filtered')).toHaveCount(0);
  await expect(page.locator('#all-chords .chord-card:visible')).toHaveCount(visibleCardCount);

  await page.locator('#avoidMinorSecondsToggle').check();
  await expect(page.locator('#all-chords .chord-card.voicing-filtered')).toHaveCount(filteredMiddleCount);
  await expect(page.locator('#all-chords .chord-card:visible')).toHaveCount(visibleCardCount);

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
