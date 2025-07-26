// Manual simulation of Cmaj7 chord generation
// Based on analysis of chord_generator_browser.js

// Step 1: Get chord notes for Cmaj7
// CHORD_INTERVALS['maj7'] = [0, 4, 7, 11]
// Root = 'C' (index 0 in NOTES)
// Notes: C (0), E (4), G (7), B (11)
const chordNotes = ['C', 'E', 'G', 'B'];

// Step 2: Create Drop 2 voicing for root inversion (inversionIndex = 0)
// inversionMap = [2, 3, 0, 1], so inversionIndex 0 maps to actualInversion 2
// This means rotating the close voicing 2 times: [C, E, G, B] -> [G, B, C, E]
// Then drop the second-to-last note: drop 'C', result: [C, G, B, E]
const drop2Voicing = ['C', 'G', 'B', 'E'];

// Step 3: Expected fingering (this would be calculated by findDrop2Fingering)
// The function tries to find frets on strings A(1), D(2), G(3), B(4)
// For voicing [C, G, B, E] on strings A, D, G, B respectively

// Step 4: What intervals would be shown for each note in the voicing
function getIntervalName(note, root) {
    const rootIndex = 0; // C
    const noteIndex = {'C': 0, 'E': 4, 'G': 7, 'B': 11}[note];
    const interval = (noteIndex - rootIndex + 12) % 12;
    
    const intervalMap = {
        0: 'R',   // Root
        4: '3',   // M3  
        7: '5',   // 5
        11: '7'   // M7
    };
    
    return intervalMap[interval] || interval.toString();
}

console.log('=== CMAJ7 ROOT INVERSION CHORD ANALYSIS ===');
console.log('Chord Notes:', chordNotes);
console.log('Drop 2 Voicing:', drop2Voicing);
console.log('');
console.log('Expected string labels (intervals, NOT string letters):');
drop2Voicing.forEach((note, i) => {
    const interval = getIntervalName(note, 'C');
    console.log(`String ${i + 1}: Note ${note} -> Interval "${interval}"`);
});
console.log('');
console.log('SVG should contain:');
console.log('- class="string-label">R</text> (for C - Root)');
console.log('- class="string-label">5</text> (for G - Perfect 5th)'); 
console.log('- class="string-label">7</text> (for B - Major 7th)');
console.log('- class="string-label">3</text> (for E - Major 3rd)');
console.log('');
console.log('SVG should NOT contain:');
console.log('- class="string-label">E</text> (guitar string letter)');
console.log('- class="string-label">A</text> (guitar string letter)');
console.log('- class="string-label">D</text> (guitar string letter)');
console.log('- class="string-label">G</text> (guitar string letter)');
console.log('- class="string-label">B</text> (guitar string letter)');

// Generate a sample SVG to verify the format
const sampleSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="240" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
    <defs>
        <style>
            .chord-title { font-family: Times, serif; font-size: 14px; fill: #000000; font-weight: normal; text-anchor: middle; }
            .string-label { font-family: Times, serif; font-size: 11px; fill: #000000; text-anchor: middle; }
            .fret-label { font-family: Times, serif; font-size: 9px; fill: #000000; text-anchor: middle; }
        </style>
    </defs>
    
    <!-- Title -->
    <text x="100" y="15" class="chord-title">Cmaj7 (Root Inversion)</text>
    
    <!-- Interval labels (what we expect to see) -->
    <text x="65" y="220" class="string-label">R</text>
    <text x="95" y="220" class="string-label">5</text>
    <text x="125" y="220" class="string-label">7</text>
    <text x="155" y="220" class="string-label">3</text>
    
    <!-- Fretboard and other elements would be here -->
</svg>`;

console.log('');
console.log('=== VERIFICATION TESTS ===');
console.log('Testing for interval labels (should be TRUE):');
console.log('Contains R:', sampleSVG.includes('class="string-label">R</text>'));
console.log('Contains 3:', sampleSVG.includes('class="string-label">3</text>'));
console.log('Contains 5:', sampleSVG.includes('class="string-label">5</text>'));
console.log('Contains 7:', sampleSVG.includes('class="string-label">7</text>'));

console.log('');
console.log('Testing for string letters (should be FALSE):');
console.log('Contains E:', sampleSVG.includes('class="string-label">E</text>'));
console.log('Contains A:', sampleSVG.includes('class="string-label">A</text>'));
console.log('Contains D:', sampleSVG.includes('class="string-label">D</text>'));
console.log('Contains G:', sampleSVG.includes('class="string-label">G</text>'));
console.log('Contains B (string):', sampleSVG.includes('class="string-label">B</text>'));

// Note: The 'B' test is ambiguous since B could be both a string letter and a note
// But in this context, it would be showing "7" for the B note (maj7 interval), not "B"