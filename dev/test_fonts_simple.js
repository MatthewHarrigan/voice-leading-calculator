// Simple test for larger fonts - no imports, just check the file
const fs = require('fs');

// Read the chord generator file
const chordGeneratorCode = fs.readFileSync('./chord_generator_browser.js', 'utf8');

// Check for the new font sizes in the STYLE object
const hasTitleSize18 = chordGeneratorCode.includes('titleSize: 18');
const hasStringSize14 = chordGeneratorCode.includes('stringLabelSize: 14');
const hasFretSize12 = chordGeneratorCode.includes('fretLabelSize: 12');

console.log('Font size verification in chord_generator_browser.js:');
console.log('Title font size 18:', hasTitleSize18);
console.log('String label font size 14:', hasStringSize14);
console.log('Fret label font size 12:', hasFretSize12);

if (hasTitleSize18 && hasStringSize14 && hasFretSize12) {
    console.log('✅ SUCCESS: All font sizes have been updated in the STYLE object!');
} else {
    console.log('❌ ISSUE: Font sizes not all updated in the STYLE object');
}

// Also check what the old sizes were by looking for them
const hasOldTitleSize14 = chordGeneratorCode.includes('titleSize: 14');
const hasOldStringSize11 = chordGeneratorCode.includes('stringLabelSize: 11');
const hasOldFretSize9 = chordGeneratorCode.includes('fretLabelSize: 9');

console.log('\nOld font sizes check (should be false):');
console.log('Old title font size 14:', hasOldTitleSize14);
console.log('Old string label font size 11:', hasOldStringSize11);
console.log('Old fret label font size 9:', hasOldFretSize9);

if (!hasOldTitleSize14 && !hasOldStringSize11 && !hasOldFretSize9) {
    console.log('✅ Confirmed: Old font sizes have been replaced');
} else {
    console.log('⚠️  Warning: Some old font sizes still present');
}