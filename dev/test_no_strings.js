import { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG 
} from './chord_generator_browser.js';

console.log('Testing chord generation without string letters...');

// Test generating a single chord
const chordNotes = getChordNotes('C', 'maj7');
const voicing = createDrop2Voicing(chordNotes, 0); // Root inversion
const fingering = findDrop2Fingering(voicing, 'C');

if (fingering) {
    fingering.voicing = voicing;
    
    const svg = create6StringChordSVG(
        fingering, 
        'Cmaj7',
        'Cmaj7 Root Inversion (Test)',
        'C',
        'maj7'
    );
    
    // Check if string labels are present
    const hasStringLabels = svg.includes('class="string-label">E</text>') || 
                           svg.includes('class="string-label">A</text>') ||
                           svg.includes('class="string-label">D</text>');
    
    console.log('String labels present:', hasStringLabels);
    console.log('SVG length:', svg.length);
    
    if (!hasStringLabels) {
        console.log('✅ SUCCESS: String letters have been removed!');
    } else {
        console.log('❌ ISSUE: String letters are still present');
    }
} else {
    console.log('❌ Could not generate chord fingering');
}