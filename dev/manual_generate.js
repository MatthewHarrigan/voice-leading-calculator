// Manual chord generation to verify string letter removal
import { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG 
} from './chord_generator_browser.js';

function generateSingleChord(root, chordType, inversionIndex, filename, displayName) {
    const chordNotes = getChordNotes(root, chordType);
    const voicing = createDrop2Voicing(chordNotes, inversionIndex);
    const fingering = findDrop2Fingering(voicing, root);
    
    if (fingering) {
        fingering.voicing = voicing;
        
        const svg = create6StringChordSVG(
            fingering, 
            displayName,
            displayName,
            root,
            chordType
        );
        
        return svg;
    }
    return null;
}

// Generate a few test chords
const testChords = [
    { root: 'C', type: 'maj7', inv: 0, file: 'C_maj7_inv3_tedGreen.svg', name: 'Cmaj7 Root Inversion' },
    { root: 'C', type: 'min7', inv: 0, file: 'C_min7_inv3_tedGreen.svg', name: 'Cm7 Root Inversion' },
    { root: 'C', type: 'dom7', inv: 0, file: 'C_dom7_inv3_tedGreen.svg', name: 'C7 Root Inversion' }
];

console.log('Generating test chords without string letters...');

for (const chord of testChords) {
    const svg = generateSingleChord(chord.root, chord.type, chord.inv, chord.file, chord.name);
    if (svg) {
        // Check if string labels are present
        const hasStringLabels = svg.includes('class="string-label">E</text>') || 
                               svg.includes('class="string-label">A</text>') ||
                               svg.includes('class="string-label">D</text>');
        
        console.log(`${chord.file}: String labels present = ${hasStringLabels}`);
        
        if (!hasStringLabels) {
            console.log(`✅ ${chord.file} generated successfully without string letters`);
            // Output the SVG content for manual saving
            console.log(`\n--- SVG for ${chord.file} ---`);
            console.log(svg);
            console.log(`--- End ${chord.file} ---\n`);
        } else {
            console.log(`❌ ${chord.file} still contains string letters`);
        }
    } else {
        console.log(`❌ Failed to generate ${chord.file}`);
    }
}