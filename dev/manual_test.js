// Manual test to generate Cmaj7 and save SVG
// Note: This needs to be run in a browser environment or with proper ES6 module support

// Copy the functions directly here for testing
const CHORD_INTERVALS = {
    'maj7': [0, 4, 7, 11],    // Root, M3, P5, M7
    'min7': [0, 3, 7, 10],    // Root, m3, P5, m7
    'dom7': [0, 4, 7, 10],    // Root, M3, P5, m7
    'min7b5': [0, 3, 6, 10],  // Root, m3, b5, m7
    'dim7': [0, 3, 6, 9],     // Root, m3, b5, bb7
    'maj6': [0, 4, 7, 9],     // Root, M3, P5, 6
    'min6': [0, 3, 7, 9],     // Root, m3, P5, 6
    'maj9': [0, 4, 11, 14],   // Root, M3, M7, 9 (no 5th)
    'min9': [0, 3, 10, 14],   // Root, m3, m7, 9 (no 5th)
    'dom9': [0, 4, 10, 14],   // Root, M3, m7, 9 (no 5th)
    'sus4': [0, 5, 7, 10],    // Root, 4th, P5, m7
    'sus2': [0, 2, 7, 10],    // Root, 2nd, P5, m7
    '6add9': [0, 7, 9, 14],   // Root, P5, 6, 9 (no 3rd)
    '7b9': [0, 4, 10, 13],    // Root, M3, m7, b9
    '7#9': [0, 4, 10, 15],    // Root, M3, m7, #9
    '7b13': [0, 4, 10, 20],   // Root, M3, m7, b13 (b6)
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Since I can't run this directly, let me just show what the expected output should be
console.log('Test plan for Cmaj7 root inversion:');
console.log('1. Chord notes: C, E, G, B (maj7 intervals: [0, 4, 7, 11])');
console.log('2. Drop 2 voicing for root inversion: should rearrange to drop 2 format');
console.log('3. SVG should contain interval labels (R, 3, 5, 7) NOT string letters (E, A, D, G, B)');
console.log('4. Pattern to check: class="string-label">R</text>, class="string-label">3</text>, etc.');
console.log('5. Pattern that should NOT exist: class="string-label">E</text>, class="string-label">A</text>, etc.');