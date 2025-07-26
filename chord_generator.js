import fs from 'fs';

// Drop 2 chord theory - Extended Jazz Chord Types
const CHORD_INTERVALS = {
    // Basic 7th chords
    'maj7': [0, 4, 7, 11],    // Root, M3, P5, M7
    'min7': [0, 3, 7, 10],    // Root, m3, P5, m7
    'dom7': [0, 4, 7, 10],    // Root, M3, P5, m7
    'min7b5': [0, 3, 6, 10],  // Root, m3, b5, m7
    'dim7': [0, 3, 6, 9],     // Root, m3, b5, bb7
    
    // 6th chords
    'maj6': [0, 4, 7, 9],     // Root, M3, P5, 6
    'min6': [0, 3, 7, 9],     // Root, m3, P5, 6
    
    // 9th chords (drop the 5th for 4-note voicing)
    'maj9': [0, 4, 11, 14],   // Root, M3, M7, 9 (no 5th)
    'min9': [0, 3, 10, 14],   // Root, m3, m7, 9 (no 5th)
    'dom9': [0, 4, 10, 14],   // Root, M3, m7, 9 (no 5th)
    
    // Sus chords
    'sus4': [0, 5, 7, 10],    // Root, 4th, P5, m7
    'sus2': [0, 2, 7, 10],    // Root, 2nd, P5, m7
    
    // 6/9 chords (drop the 3rd for 4-note voicing)
    '6add9': [0, 7, 9, 14],   // Root, P5, 6, 9 (no 3rd)
    
    // Altered dominant
    '7b9': [0, 4, 10, 13],    // Root, M3, m7, b9
    '7#9': [0, 4, 10, 15],    // Root, M3, m7, #9
    '7b13': [0, 4, 10, 20],   // Root, M3, m7, b13 (b6)
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Styling for 6-string diagrams with optimized proportions
const STYLE = {
    titleFont: 'Times, serif',
    titleSize: 14,
    titleWeight: 'normal',
    titleColor: '#000000',
    
    stringLabelFont: 'Times, serif',
    stringLabelSize: 11,
    stringLabelColor: '#000000',
    
    fretLabelFont: 'Times, serif',
    fretLabelSize: 9,
    fretLabelColor: '#000000',
    
    stringColor: '#000000',
    stringWidth: 1.5,
    
    fretColor: '#000000',
    fretWidth: 1,
    
    nutColor: '#000000',
    nutWidth: 3,
    
    noteStroke: '#000000',
    noteStrokeWidth: 1.5,
    
    rootNoteFill: '#000000',
    chordNoteFill: '#ffffff',
    
    noteTextColor: '#ffffff',
    noteTextFont: 'Times, serif',
    noteTextSize: 9,
    
    // Dimensions for 6 strings - optimized proportions based on LilyPond standards
    width: 200,
    height: 240,
    marginTop: 25,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25
};

function getChordNotes(root, chordType) {
    const rootIndex = NOTES.indexOf(root);
    const intervals = CHORD_INTERVALS[chordType];
    return intervals.map(interval => NOTES[(rootIndex + interval) % 12]);
}

function createDrop2Voicing(notes, inversion) {
    const closeVoicing = [...notes];
    
    for (let i = 0; i < inversion; i++) {
        const bottom = closeVoicing.shift();
        closeVoicing.push(bottom);
    }
    
    if (closeVoicing.length >= 2) {
        const droppedNote = closeVoicing.splice(-2, 1)[0];
        closeVoicing.unshift(droppedNote);
    }
    
    return closeVoicing;
}

function findDrop2Fingering(voicing, root, startFret = 3, maxSpan = 4) {
    const tuning = ['E', 'A', 'D', 'G', 'B', 'E'];
    const strings = [1, 2, 3, 4]; // A, D, G, B (middle 4)
    
    for (let baseFret = startFret; baseFret <= 12; baseFret++) {
        const frets = [null, null, null, null, null, null];
        let rootString = null;
        let success = true;
        
        for (let i = 0; i < voicing.length; i++) {
            const note = voicing[i];
            const stringIdx = strings[i];
            let foundFret = null;
            
            for (let fret = Math.max(0, baseFret - 2); fret <= baseFret + maxSpan; fret++) {
                const noteAtFret = getNoteAtFret(stringIdx, fret, tuning);
                if (noteAtFret === note) {
                    foundFret = fret;
                    break;
                }
            }
            
            if (foundFret === null) {
                success = false;
                break;
            }
            
            frets[stringIdx] = foundFret;
            
            if (note === root && rootString === null) {
                rootString = stringIdx;
            }
        }
        
        if (success) {
            const usedFrets = frets.filter(f => f !== null && f > 0);
            if (usedFrets.length > 0 && (Math.max(...usedFrets) - Math.min(...usedFrets)) <= maxSpan) {
                return { frets, rootString: rootString || 0, voicing };
            }
        }
    }
    
    return null;
}

function getNoteAtFret(stringIndex, fret, tuning) {
    const openNote = tuning[stringIndex];
    const openNoteIndex = NOTES.indexOf(openNote);
    const noteIndex = (openNoteIndex + fret) % 12;
    return NOTES[noteIndex];
}

function create6StringChordSVG(chordData, chordSymbol, title = '') {
    const strings = [0, 1, 2, 3, 4, 5]; // All 6 strings
    const stringNames = ['E', 'A', 'D', 'G', 'B', 'E'];
    const activeStrings = [1, 2, 3, 4]; // Only middle 4 have chord tones
    
    // Find fret range based on used frets
    const usedFrets = activeStrings
        .map(s => chordData.frets[s])
        .filter(f => f !== null && f > 0);
    
    const minFret = usedFrets.length > 0 ? Math.max(0, Math.min(...usedFrets) - 1) : 0;
    const maxFret = minFret + 4;
    const numFrets = maxFret - minFret + 1;
    
    // SVG dimensions
    const { width, height, marginTop, marginBottom, marginLeft, marginRight } = STYLE;
    const fretboardWidth = width - marginLeft - marginRight;
    const fretboardHeight = height - marginTop - marginBottom;
    const stringSpacing = fretboardWidth / 5; // 5 gaps for 6 strings
    const fretSpacing = fretboardHeight / numFrets;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
        <style>
            .chord-title { 
                font-family: ${STYLE.titleFont}; 
                font-size: ${STYLE.titleSize}px; 
                fill: ${STYLE.titleColor}; 
                font-weight: ${STYLE.titleWeight}; 
                text-anchor: middle; 
            }
            .string-label { 
                font-family: ${STYLE.stringLabelFont}; 
                font-size: ${STYLE.stringLabelSize}px; 
                fill: ${STYLE.stringLabelColor}; 
                text-anchor: middle; 
            }
            .fret-label { 
                font-family: ${STYLE.fretLabelFont}; 
                font-size: ${STYLE.fretLabelSize}px; 
                fill: ${STYLE.fretLabelColor}; 
                text-anchor: middle; 
            }
            .string-line { 
                stroke: ${STYLE.stringColor}; 
                stroke-width: ${STYLE.stringWidth}; 
            }
            .fret-line { 
                stroke: ${STYLE.fretColor}; 
                stroke-width: ${STYLE.fretWidth}; 
            }
            .nut-line { 
                stroke: ${STYLE.nutColor}; 
                stroke-width: ${STYLE.nutWidth}; 
            }
            .note-circle { 
                stroke: ${STYLE.noteStroke}; 
                stroke-width: ${STYLE.noteStrokeWidth}; 
            }
            .root-note { 
                fill: ${STYLE.rootNoteFill}; 
            }
            .chord-note { 
                fill: ${STYLE.chordNoteFill}; 
            }
        </style>
    </defs>
    
    <!-- Title -->`;
    
    if (title) {
        svg += `\n    <text x="${width/2}" y="15" class="chord-title">${title}</text>`;
    }
    
    // String labels for all 6 strings
    for (let i = 0; i < 6; i++) {
        const x = marginLeft + i * stringSpacing;
        svg += `\n    <text x="${x}" y="${marginTop - 5}" class="string-label">${stringNames[i]}</text>`;
    }
    
    // Strings (vertical lines) - all 6 strings
    for (let i = 0; i < 6; i++) {
        const x = marginLeft + i * stringSpacing;
        svg += `\n    <line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + fretboardHeight}" class="string-line"/>`;
    }
    
    // Frets (horizontal lines)
    for (let i = 0; i <= numFrets; i++) {
        const y = marginTop + i * fretSpacing;
        const isNut = (i === 0 && minFret === 0);
        const lineClass = isNut ? 'nut-line' : 'fret-line';
        svg += `\n    <line x1="${marginLeft}" y1="${y}" x2="${marginLeft + fretboardWidth}" y2="${y}" class="${lineClass}"/>`;
    }
    
    // Fret numbers
    if (minFret > 0) {
        const y = marginTop + fretSpacing * 0.5;
        svg += `\n    <text x="${marginLeft - 15}" y="${y}" class="fret-label">${minFret + 1}</text>`;
    }
    
    // Notes - only on middle 4 strings
    for (let i = 0; i < 4; i++) {
        const stringIdx = activeStrings[i];
        const fret = chordData.frets[stringIdx];
        
        if (fret !== null) {
            const x = marginLeft + stringIdx * stringSpacing; // Use actual string position
            let y;
            
            if (fret === 0) {
                // Open string
                y = marginTop - 12;
            } else {
                // Fretted note
                const fretOffset = fret - minFret;
                y = marginTop + (fretOffset - 0.5) * fretSpacing;
            }
            
            const isRoot = (stringIdx === chordData.rootString);
            const noteClass = isRoot ? 'root-note' : 'chord-note';
            
            svg += `\n    <circle cx="${x}" cy="${y}" r="10" class="note-circle ${noteClass}"/>`;
        }
    }
    
    svg += '\n</svg>';
    
    return svg;
}

function generateAllChords(root = 'C') {
    console.log(`Generating drop 2 chord diagrams for ${root}...\n`);
    
    let totalGenerated = 0;
    
    for (const [chordType, intervals] of Object.entries(CHORD_INTERVALS)) {
        console.log(`Generating ${root}${chordType} diagrams...`);
        
        const chordNotes = getChordNotes(root, chordType);
        
        for (let inversion = 0; inversion < 4; inversion++) {
            const voicing = createDrop2Voicing(chordNotes, inversion);
            const fingering = findDrop2Fingering(voicing, root);
            
            if (fingering) {
                const svg = create6StringChordSVG(fingering, `${root}${chordType}`, `${root}${chordType}`);
                const filename = `${root}_${chordType}_inv${inversion + 1}_tedGreen.svg`;
                
                fs.writeFileSync(filename, svg);
                console.log(`Generated: ${filename}`);
                totalGenerated++;
            }
        }
    }
    
    console.log(`\nGenerated ${totalGenerated} chord diagrams!`);
}

// Export functions for use in other modules
export { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG, 
    generateAllChords,
    CHORD_INTERVALS,
    NOTES
};

// Generate all chords if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log("Generating complete set of 16 four-note jazz chord types...");
    generateAllChords('C');
}