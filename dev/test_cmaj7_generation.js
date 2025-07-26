// Test script to generate Cmaj7 chord and check for string letters
import { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG 
} from './chord_generator_browser.js';

// Generate Cmaj7 root inversion chord (inversionIndex = 0)
const root = 'C';
const chordType = 'maj7';
const inversionIndex = 0;

console.log('Generating Cmaj7 root inversion chord...');

// Get chord notes
const chordNotes = getChordNotes(root, chordType);
console.log('Chord notes:', chordNotes);

// Create drop 2 voicing
const voicing = createDrop2Voicing(chordNotes, inversionIndex);
console.log('Drop 2 voicing:', voicing);

// Find fingering
const chordData = findDrop2Fingering(voicing, root);
console.log('Chord data:', chordData);

if (chordData) {
    // Generate SVG
    const chordSymbol = `${root}maj7`;
    const title = `${chordSymbol} (Root Inversion)`;
    
    const svg = create6StringChordSVG(chordData, chordSymbol, title, root, chordType);
    
    // Check for string letter labels
    const hasStringLabels = svg.includes('class="string-label">E</text>') || 
                           svg.includes('class="string-label">A</text>') ||
                           svg.includes('class="string-label">D</text>') ||
                           svg.includes('class="string-label">G</text>') ||
                           svg.includes('class="string-label">B</text>');
    
    console.log('\n=== ANALYSIS RESULTS ===');
    console.log('SVG contains string letter labels:', hasStringLabels);
    
    // Check for specific string letter patterns
    const stringLabelPatterns = [
        'class="string-label">E</text>',
        'class="string-label">A</text>',
        'class="string-label">D</text>',
        'class="string-label">G</text>',
        'class="string-label">B</text>'
    ];
    
    console.log('\nDetailed pattern analysis:');
    stringLabelPatterns.forEach(pattern => {
        const found = svg.includes(pattern);
        console.log(`  ${pattern}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    });
    
    // Check what string-label content is actually present
    const stringLabelMatches = svg.match(/class="string-label">([^<]*)</g);
    if (stringLabelMatches) {
        console.log('\nActual string-label content found:');
        stringLabelMatches.forEach(match => {
            console.log(`  ${match}`);
        });
    } else {
        console.log('\nNo string-label content found in SVG');
    }
    
    // Write SVG to file
    import('fs').then(fs => {
        fs.writeFileSync('/Users/matthewharrigan/Desktop/guitar_chords/test_cmaj7_no_strings.svg', svg);
        console.log('\nSVG written to: test_cmaj7_no_strings.svg');
        console.log('SVG length:', svg.length, 'characters');
    });
    
} else {
    console.log('Failed to find chord fingering');
}