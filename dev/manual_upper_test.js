// Manual test for upper string set functionality
// Using require instead of import for Node.js compatibility

const fs = require('fs');

// Read the browser chord generator and evaluate it
const browserCode = fs.readFileSync('./chord_generator_browser.js', 'utf8');

// Remove ES6 module syntax and replace with regular function declarations
const nodeCode = browserCode
    .replace(/export\s*{\s*[^}]*\s*};?\s*$/, '') // Remove export statement
    .replace(/export\s+{[^}]*}/g, '') // Remove any other export statements
    .replace(/import[^;]*;/g, ''); // Remove import statements

eval(nodeCode);

console.log('=== Testing Upper String Set Functionality ===\n');

// Test data
const testCases = [
    { root: 'C', type: 'maj7', inversion: 0 },
    { root: 'C', type: 'dom7', inversion: 0 },
    { root: 'G', type: 'maj7', inversion: 0 },
    { root: 'F', type: 'min7', inversion: 0 }
];

testCases.forEach(({ root, type, inversion }) => {
    console.log(`\n--- Testing ${root}${type} (inversion ${inversion}) ---`);
    
    // Test middle strings (existing functionality)
    const middleChord = generateChordForStringSet(root, type, inversion, 'middle');
    console.log('Middle strings (A-D-G-B):', middleChord ? 'SUCCESS' : 'FAILED');
    
    // Test upper strings (new functionality)
    const upperChord = generateChordForStringSet(root, type, inversion, 'upper');
    console.log('Upper strings (D-G-B-E):', upperChord ? 'SUCCESS' : 'FAILED');
    
    if (middleChord && upperChord) {
        console.log(`Middle string frets: [${middleChord.frets.join(', ')}]`);
        console.log(`Upper string frets:  [${upperChord.frets.join(', ')}]`);
        
        console.log(`Middle string voicing: [${middleChord.voicing.join(', ')}]`);
        console.log(`Upper string voicing:  [${upperChord.voicing.join(', ')}]`);
        
        // Generate and save SVG files for visual comparison
        const middleSVG = create6StringChordSVG(
            middleChord, 
            `${root}${type}`,
            `${root}${type} - Middle Strings`,
            root,
            type,
            'middle'
        );
        
        const upperSVG = create6StringChordSVG(
            upperChord, 
            `${root}${type}`,
            `${root}${type} - Upper Strings`,
            root,
            type,
            'upper'
        );
        
        // Save SVG files
        const middleFilename = `test_middle_${root}_${type}_inv${inversion}.svg`;
        const upperFilename = `test_upper_${root}_${type}_inv${inversion}.svg`;
        
        fs.writeFileSync(middleFilename, middleSVG);
        fs.writeFileSync(upperFilename, upperSVG);
        
        console.log(`Generated SVG files:`);
        console.log(`  - ${middleFilename}`);
        console.log(`  - ${upperFilename}`);
    } else {
        if (!middleChord) console.log('  ERROR: Middle chord generation failed');
        if (!upperChord) console.log('  ERROR: Upper chord generation failed');
    }
});

console.log('\n=== String Set Configuration Analysis ===');
console.log('Middle strings (A-D-G-B): String indices [1, 2, 3, 4]');
console.log('Upper strings (D-G-B-E):  String indices [2, 3, 4, 5]');
console.log('Standard tuning: E(0), A(1), D(2), G(3), B(4), E(5)');
console.log('\nThis allows for higher voicings and different fingering patterns!');

console.log('\n=== Testing Complete ===');