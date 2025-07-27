// Generate a test SVG with the larger fonts to verify the changes
const fs = require('fs');

// Read the updated chord generator to extract the STYLE object
const chordGeneratorContent = fs.readFileSync('./chord_generator_browser.js', 'utf8');

// Extract font sizes from the STYLE object
const titleSizeMatch = chordGeneratorContent.match(/titleSize:\s*(\d+)/);
const stringLabelSizeMatch = chordGeneratorContent.match(/stringLabelSize:\s*(\d+)/);
const fretLabelSizeMatch = chordGeneratorContent.match(/fretLabelSize:\s*(\d+)/);

const titleSize = titleSizeMatch ? titleSizeMatch[1] : '14';
const stringLabelSize = stringLabelSizeMatch ? stringLabelSizeMatch[1] : '11';
const fretLabelSize = fretLabelSizeMatch ? fretLabelSizeMatch[1] : '9';

console.log('Font sizes found in chord_generator_browser.js:');
console.log(`Title size: ${titleSize}px (should be 18)`);
console.log(`String label size: ${stringLabelSize}px (should be 14)`);
console.log(`Fret label size: ${fretLabelSize}px (should be 12)`);

// Generate a sample SVG with the new font sizes
const testSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="240" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240">
    <defs>
        <style>
            .chord-title { 
                font-family: Times, serif; 
                font-size: ${titleSize}px; 
                fill: #000000; 
                font-weight: normal; 
                text-anchor: middle; 
            }
            .string-label { 
                font-family: Times, serif; 
                font-size: ${stringLabelSize}px; 
                fill: #000000; 
                text-anchor: middle; 
            }
            .fret-label { 
                font-family: Times, serif; 
                font-size: ${fretLabelSize}px; 
                fill: #000000; 
                text-anchor: middle; 
            }
            .string-line { 
                stroke: #000000; 
                stroke-width: 1.5; 
            }
            .fret-line { 
                stroke: #000000; 
                stroke-width: 1; 
            }
            .nut-line { 
                stroke: #000000; 
                stroke-width: 3; 
            }
            .note-circle { 
                stroke: #000000; 
                stroke-width: 1.5; 
            }
            .root-note { 
                fill: #000000; 
            }
            .chord-note { 
                fill: #ffffff; 
            }
        </style>
    </defs>
    
    <!-- Title -->
    <text x="100" y="15" class="chord-title">Cmaj7 Root Inversion (Test)</text>
    <text x="25" y="30" class="string-label">E</text>
    <text x="55" y="30" class="string-label">A</text>
    <text x="85" y="30" class="string-label">D</text>
    <text x="115" y="30" class="string-label">G</text>
    <text x="145" y="30" class="string-label">B</text>
    <text x="175" y="30" class="string-label">E</text>
    <text x="55" y="235" class="string-label">R</text>
    <text x="85" y="235" class="string-label">5</text>
    <text x="115" y="235" class="string-label">7</text>
    <text x="145" y="235" class="string-label">3</text>
    <line x1="25" y1="35" x2="25" y2="220" class="string-line"/>
    <line x1="55" y1="35" x2="55" y2="220" class="string-line"/>
    <line x1="85" y1="35" x2="85" y2="220" class="string-line"/>
    <line x1="115" y1="35" x2="115" y2="220" class="string-line"/>
    <line x1="145" y1="35" x2="145" y2="220" class="string-line"/>
    <line x1="175" y1="35" x2="175" y2="220" class="string-line"/>
    <line x1="25" y1="35" x2="175" y2="35" class="nut-line"/>
    <line x1="25" y1="72" x2="175" y2="72" class="fret-line"/>
    <line x1="25" y1="109" x2="175" y2="109" class="fret-line"/>
    <line x1="25" y1="146" x2="175" y2="146" class="fret-line"/>
    <line x1="25" y1="183" x2="175" y2="183" class="fret-line"/>
    <line x1="25" y1="220" x2="175" y2="220" class="fret-line"/>
    <text x="10" y="53.5" class="fret-label">1</text>
    <circle cx="55" cy="53.5" r="10" class="note-circle root-note"/>
    <circle cx="85" cy="90.5" r="10" class="note-circle chord-note"/>
    <circle cx="115" cy="90.5" r="10" class="note-circle chord-note"/>
    <circle cx="145" cy="53.5" r="10" class="note-circle chord-note"/>
</svg>`;

// Save the test SVG
fs.writeFileSync('./test_larger_fonts_cmaj7.svg', testSVG);

// Verify the font sizes in the generated SVG
const hasTitleSize18 = testSVG.includes('font-size: 18px');
const hasStringSize14 = testSVG.includes('font-size: 14px');
const hasFretSize12 = testSVG.includes('font-size: 12px');

console.log('\nGenerated test SVG verification:');
console.log('Title font size 18px:', hasTitleSize18);
console.log('String label font size 14px:', hasStringSize14);
console.log('Fret label font size 12px:', hasFretSize12);

if (hasTitleSize18 && hasStringSize14 && hasFretSize12) {
    console.log('✅ SUCCESS: Test SVG contains all larger font sizes!');
} else {
    console.log('❌ ISSUE: Test SVG does not contain expected font sizes');
}

console.log('\nTest SVG saved as: test_larger_fonts_cmaj7.svg');
console.log('You can open this file to visually compare with existing chord files.');