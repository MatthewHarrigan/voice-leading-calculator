// Manual SVG creation to demonstrate upper string functionality
const fs = require('fs');

// Manually create sample chord data for demonstration
const sampleMiddleChord = {
    frets: [null, 5, 4, 5, 5, null], // Middle strings: A-D-G-B at frets 5-4-5-5
    rootString: 1, // Root on A string
    voicing: ['C', 'G', 'B', 'E'], // Cmaj7 voicing
    stringSet: 'middle'
};

const sampleUpperChord = {
    frets: [null, null, 9, 8, 9, 9], // Upper strings: D-G-B-E at frets 9-8-9-9  
    rootString: 2, // Root on D string
    voicing: ['C', 'G', 'B', 'E'], // Same Cmaj7 voicing, higher position
    stringSet: 'upper'
};

// Basic SVG generation (simplified version)
function createBasicSVG(chordData, title, stringSet) {
    const width = 200;
    const height = 240;
    const marginTop = 35;
    const marginLeft = 25;
    const marginRight = 25;
    const fretboardWidth = width - marginLeft - marginRight;
    const fretboardHeight = height - marginTop - 20;
    const stringSpacing = fretboardWidth / 5;
    const fretSpacing = fretboardHeight / 5; // 5 frets shown
    
    const activeStrings = stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4];
    const stringNames = ['E', 'A', 'D', 'G', 'B', 'E'];
    
    // Find fret range
    const usedFrets = activeStrings
        .map(s => chordData.frets[s])
        .filter(f => f !== null && f > 0);
    const minFret = Math.max(0, Math.min(...usedFrets) - 1);
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .chord-title { font-family: Times, serif; font-size: 18px; fill: #000; text-anchor: middle; }
        .string-label { font-family: Times, serif; font-size: 14px; fill: #000; text-anchor: middle; }
        .fret-label { font-family: Times, serif; font-size: 12px; fill: #000; text-anchor: middle; }
        .string-line { stroke: #000; stroke-width: 1.5; }
        .fret-line { stroke: #000; stroke-width: 1; }
        .nut-line { stroke: #000; stroke-width: 3; }
        .note-circle { stroke: #000; stroke-width: 1.5; }
        .root-note { fill: #000; }
        .chord-note { fill: #fff; }
    </style>
    
    <!-- Title -->
    <text x="${width/2}" y="20" class="chord-title">${title}</text>
    
    <!-- String labels -->`;

    // String labels
    for (let i = 0; i < 6; i++) {
        const x = marginLeft + i * stringSpacing;
        svg += `\n    <text x="${x}" y="${marginTop - 5}" class="string-label">${stringNames[i]}</text>`;
    }

    // Strings (vertical lines)
    for (let i = 0; i < 6; i++) {
        const x = marginLeft + i * stringSpacing;
        svg += `\n    <line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + fretboardHeight}" class="string-line"/>`;
    }

    // Frets (horizontal lines)
    for (let i = 0; i <= 5; i++) {
        const y = marginTop + i * fretSpacing;
        const isNut = (i === 0 && minFret === 0);
        const lineClass = isNut ? 'nut-line' : 'fret-line';
        svg += `\n    <line x1="${marginLeft}" y1="${y}" x2="${marginLeft + fretboardWidth}" y2="${y}" class="${lineClass}"/>`;
    }

    // Fret number
    if (minFret > 0) {
        const y = marginTop + fretSpacing * 0.5;
        svg += `\n    <text x="${marginLeft - 15}" y="${y}" class="fret-label">${minFret + 1}</text>`;
    }

    // Notes on active strings
    activeStrings.forEach(stringIdx => {
        const fret = chordData.frets[stringIdx];
        if (fret !== null) {
            const x = marginLeft + stringIdx * stringSpacing;
            let y;
            
            if (fret === 0) {
                y = marginTop - 12; // Open string
            } else {
                const fretOffset = fret - minFret;
                y = marginTop + (fretOffset - 0.5) * fretSpacing;
            }
            
            const isRoot = (stringIdx === chordData.rootString);
            const noteClass = isRoot ? 'root-note' : 'chord-note';
            
            svg += `\n    <circle cx="${x}" cy="${y}" r="10" class="note-circle ${noteClass}"/>`;
        }
    });

    // String set info
    const stringSetInfo = stringSet === 'upper' ? 'Upper Strings (D-G-B-E)' : 'Middle Strings (A-D-G-B)';
    svg += `\n    <text x="${width/2}" y="${height - 5}" class="string-label" style="font-size: 10px;">${stringSetInfo}</text>`;

    svg += '\n</svg>';
    return svg;
}

// Generate sample SVGs
console.log('Creating sample SVG files to demonstrate upper string functionality...');

const middleSVG = createBasicSVG(sampleMiddleChord, 'Cmaj7 - Middle Strings', 'middle');
const upperSVG = createBasicSVG(sampleUpperChord, 'Cmaj7 - Upper Strings', 'upper');

fs.writeFileSync('sample_middle_cmaj7.svg', middleSVG);
fs.writeFileSync('sample_upper_cmaj7.svg', upperSVG);

console.log('Generated sample files:');
console.log('- sample_middle_cmaj7.svg (Middle strings: A-D-G-B)');
console.log('- sample_upper_cmaj7.svg (Upper strings: D-G-B-E)');

console.log('\nChord data comparison:');
console.log('Middle chord frets:', sampleMiddleChord.frets);
console.log('Upper chord frets: ', sampleUpperChord.frets);

console.log('\nKey differences:');
console.log('1. Upper strings use higher fret positions (9th fret vs 5th fret)');
console.log('2. Notes appear on different physical strings');
console.log('3. Same voicing (C-G-B-E) but in different octave/position');
console.log('4. Provides more fingering options for the same harmony');