// Test runner for upper string set functionality
const fs = require('fs');

// Read and evaluate the chord generator file
const chordGeneratorCode = fs.readFileSync('./chord_generator.js', 'utf8');
eval(chordGeneratorCode);

console.log('Testing upper string set (D-G-B-E) chord generation...');

try {
    // Test middle strings (existing)
    const middleChord = generateChordForStringSet('C', 'maj7', 0, 'middle');
    console.log('Middle strings (A-D-G-B):', middleChord ? 'SUCCESS' : 'FAILED');
    
    // Test upper strings (new)
    const upperChord = generateChordForStringSet('C', 'maj7', 0, 'upper');
    console.log('Upper strings (D-G-B-E):', upperChord ? 'SUCCESS' : 'FAILED');
    
    if (middleChord && upperChord) {
        console.log('\nMiddle string frets:', middleChord.frets);
        console.log('Upper string frets:', upperChord.frets);
        
        console.log('\nMiddle string notes:', middleChord.notes);
        console.log('Upper string notes:', upperChord.notes);
        
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
        
        // Write SVG files
        fs.writeFileSync('./test_middle_strings_cmaj7.svg', middleSVG);
        fs.writeFileSync('./test_upper_strings_cmaj7.svg', upperSVG);
        
        console.log('\nSVG generation successful for both string sets!');
        console.log('Generated files:');
        console.log('- test_middle_strings_cmaj7.svg');
        console.log('- test_upper_strings_cmaj7.svg');
        
        // Test different chord types
        console.log('\n=== Testing different chord types ===');
        
        const testChords = [
            { root: 'G', type: 'dom7' },
            { root: 'F', type: 'maj7' },
            { root: 'D', type: 'min7' }
        ];
        
        testChords.forEach(({ root, type }) => {
            const middle = generateChordForStringSet(root, type, 0, 'middle');
            const upper = generateChordForStringSet(root, type, 0, 'upper');
            
            console.log(`\n${root}${type}:`);
            console.log(`  Middle strings: ${middle ? middle.frets.join('-') : 'FAILED'}`);
            console.log(`  Upper strings:  ${upper ? upper.frets.join('-') : 'FAILED'}`);
        });
        
    } else {
        console.log('Failed to generate one or both chord fingerings');
        if (!middleChord) console.log('Middle chord generation failed');
        if (!upperChord) console.log('Upper chord generation failed');
    }
} catch (error) {
    console.error('Error during testing:', error.message);
    console.error(error.stack);
}