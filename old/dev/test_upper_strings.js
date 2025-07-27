// Test upper string set functionality
import { 
    generateChordForStringSet,
    create6StringChordSVG 
} from './chord_generator_browser.js';

console.log('Testing upper string set (D-G-B-E) chord generation...');

// Test middle strings (existing)
const middleChord = generateChordForStringSet('C', 'maj7', 0, 'middle');
console.log('Middle strings (A-D-G-B):', middleChord ? 'SUCCESS' : 'FAILED');

// Test upper strings (new)
const upperChord = generateChordForStringSet('C', 'maj7', 0, 'upper');
console.log('Upper strings (D-G-B-E):', upperChord ? 'SUCCESS' : 'FAILED');

if (middleChord && upperChord) {
    console.log('\nMiddle string frets:', middleChord.frets);
    console.log('Upper string frets:', upperChord.frets);
    
    // Generate SVGs for comparison
    const middleSVG = create6StringChordSVG(
        middleChord, 
        'Cmaj7',
        'Cmaj7 Root (Middle Strings)',
        'C',
        'maj7',
        'middle'
    );
    
    const upperSVG = create6StringChordSVG(
        upperChord, 
        'Cmaj7',
        'Cmaj7 Root (Upper Strings)',
        'C',
        'maj7',
        'upper'
    );
    
    console.log('SVG generation successful for both string sets!');
} else {
    console.log('Failed to generate one or both chord fingerings');
}