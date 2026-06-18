import fs from 'fs';
import path from 'path';

// Drop 2 chord theory - Complete 15 chord types as specified
const CHORD_INTERVALS = {
    // Major chords
    'maj7': [0, 4, 7, 11],     // Cmaj7: 1 3 5 7 - Major 7
    'maj6': [0, 4, 7, 9],      // C6: 1 3 5 6 - Major 6
    'maj7s5': [0, 4, 8, 11],   // Cmaj7♯5: 1 3 ♯5 7 - Major 7 with augmented 5th
    'maj7b5': [0, 4, 6, 11],   // Cmaj7♭5: 1 3 ♭5 7 - Major 7 with diminished 5th
    'maj9': [4, 7, 11, 14],    // Cmaj9: 3 5 7 9 - 9 substitutes the root
    'maj69': [4, 7, 9, 14],    // C6/9: 3 5 6 9
    
    // Dominant chords
    'dom7': [0, 4, 7, 10],     // C7: 1 3 5 ♭7 - Dominant 7
    'dom7sus4': [0, 5, 7, 10], // C7sus4: 1 4 5 ♭7 - Dominant 7 with suspended 4th
    'dom7s5': [0, 4, 8, 10],   // C7♯5: 1 3 ♯5 ♭7 - Dominant 7 with augmented 5th
    'dom7b5': [0, 4, 6, 10],   // C7♭5: 1 3 ♭5 ♭7 - Dominant 7 with diminished 5th
    'dom9': [4, 7, 10, 14],    // C9: 3 5 ♭7 9 - 9 substitutes the root
    'dom7b9': [4, 7, 10, 13],  // C7♭9: 3 5 ♭7 ♭9 - dominant b9 exception
    'dom7s9': [4, 7, 10, 15],  // C7♯9: 3 5 ♭7 ♯9
    
    // Minor chords
    'min6': [0, 3, 7, 9],      // Cm6: 1 ♭3 5 6 - Minor 6
    'min7': [0, 3, 7, 10],     // Cm7: 1 ♭3 5 ♭7 - Minor 7
    'min7b5': [0, 3, 6, 10],   // Cm7♭5: 1 ♭3 ♭5 ♭7 - Half-diminished 7
    'min7s5': [0, 3, 8, 10],   // Cm7♯5: 1 ♭3 ♯5 ♭7 - Minor 7 with augmented 5th
    'minmaj7': [0, 3, 7, 11],  // Cm(maj7): 1 ♭3 5 7 - Minor major 7
    'min9': [3, 7, 10, 14],    // Cm9: ♭3 5 ♭7 9 - 9 substitutes the root
    'min7b5b9': [3, 6, 10, 13], // Cm7♭5(♭9): ♭3 ♭5 ♭7 ♭9
    'min7b59': [3, 6, 10, 14], // Cm7♭5(9): ♭3 ♭5 ♭7 9
    'min69': [3, 7, 9, 14],    // Cm6/9: ♭3 5 6 9
    
    // Diminished chords
    'dim7': [0, 3, 6, 9],      // C°7: 1 ♭3 ♭5 ♭♭7 - Fully diminished 7
    'dimmaj7': [0, 3, 6, 11],  // C°maj7: 1 ♭3 ♭5 7 - Diminished triad with major 7
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Clean, minimal styling
const STYLE = {
    titleFont: 'Times, serif',
    titleSize: 14,
    titleColor: '#000000',
    stringLabelFont: 'Times, serif',
    stringLabelSize: 11,
    fretLabelSize: 12,
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
    width: 200,
    height: 240,
    marginTop: 35,  // Original uses 35
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25
};

function getChordNotes(root, chordType) {
    const rootIndex = NOTES.indexOf(root);
    const intervals = CHORD_INTERVALS[chordType];
    return intervals.map(interval => NOTES[(rootIndex + interval) % 12]);
}

function getIntervalName(note, root, chordType) {
    const rootIndex = NOTES.indexOf(root);
    const noteIndex = NOTES.indexOf(note);
    const interval = (noteIndex - rootIndex + 12) % 12;
    
    // Map intervals to chord tone names
    const intervalMap = {
        0: 'R',   // Root
        1: '♭9',  // b9
        2: '9',   // 9
        3: '♭3',  // m3
        4: '3',   // M3
        5: '4',   // 4
        6: '♭5',  // b5
        7: '5',   // 5
        8: '♯5',  // #5
        9: '6',   // 6
        10: '♭7', // m7
        11: '7'   // M7
    };
    
    return intervalMap[interval] || interval.toString();
}

function getInversionName(inversion) {
    const names = ['Root Inversion', '1st Inversion', '2nd Inversion', '3rd Inversion'];
    return names[inversion] || 'Root Inversion';
}

function getChordDisplaySymbol(root, chordType) {
    const symbols = {
        // Major chords
        'maj7': 'maj7',
        'maj6': '6',
        'maj7s5': 'maj7♯5',
        'maj7b5': 'maj7♭5',
        'maj9': 'maj9',
        'maj69': '6/9',
        // Dominant chords  
        'dom7': '7',
        'dom7sus4': '7sus4',
        'dom7s5': '7♯5',
        'dom7b5': '7♭5',
        'dom9': '9',
        'dom7b9': '7♭9',
        'dom7s9': '7♯9',
        // Minor chords
        'min6': 'm6',
        'min7': 'm7',
        'min7b5': 'm7♭5',
        'min7s5': 'm7♯5',
        'minmaj7': 'm(maj7)',
        'min9': 'm9',
        'min7b5b9': 'm7♭5(♭9)',
        'min7b59': 'm7♭5(9)',
        'min69': 'm6/9',
        // Diminished chords
        'dim7': '°7',
        'dimmaj7': '°maj7'
    };
    return `${root}${symbols[chordType] || chordType}`;
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

function findDrop2Fingering(voicing, root, startFret = 3, maxSpan = 4, stringSet = 'middle') {
    const tuning = ['E', 'A', 'D', 'G', 'B', 'E'];
    const strings = stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4]; // D, G, B, E (upper 4) or A, D, G, B (middle 4)
    
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

function getFrettedPitch(stringIndex, fret) {
    const openStringPitches = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4
    return openStringPitches[stringIndex] + fret;
}

function hasFlatNineAvoidInterval(chordData, stringSet = chordData?.stringSet || 'middle') {
    if (!chordData || !chordData.frets) return false;

    const activeStrings = stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4];
    const pitches = activeStrings
        .map(stringIndex => {
            const fret = chordData.frets[stringIndex];
            return fret === null || fret === undefined ? null : getFrettedPitch(stringIndex, fret);
        })
        .filter(pitch => pitch !== null);

    for (let lowerIndex = 0; lowerIndex < pitches.length; lowerIndex++) {
        for (let upperIndex = 0; upperIndex < pitches.length; upperIndex++) {
            if (lowerIndex === upperIndex) continue;

            const interval = pitches[upperIndex] - pitches[lowerIndex];
            if (interval > 0 && interval % 12 === 1) {
                return true;
            }
        }
    }

    return false;
}

function hasAdjacentMinorSecond(chordData, stringSet = chordData?.stringSet || 'middle') {
    return hasFlatNineAvoidInterval(chordData, stringSet);
}

function createChordSVG(chordData, chordSymbol, stringSet = 'middle', root = 'C', chordType = '', voicing = [], inversion = 0) {
    const strings = [0, 1, 2, 3, 4, 5];
    const activeStrings = stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4]; // D, G, B, E (upper 4) or A, D, G, B (middle 4)
    
    // Find fret range
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
    const stringSpacing = fretboardWidth / 5;
    const fretSpacing = fretboardHeight / numFrets;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
        <style>
            .chord-title { 
                font-family: ${STYLE.titleFont}; 
                font-size: ${STYLE.titleSize}px; 
                fill: ${STYLE.titleColor}; 
                font-weight: normal; 
                text-anchor: middle; 
            }
            .string-label { 
                font-family: ${STYLE.stringLabelFont}; 
                font-size: ${STYLE.stringLabelSize}px; 
                fill: ${STYLE.titleColor}; 
                text-anchor: middle; 
            }
            .fret-label { 
                font-family: ${STYLE.stringLabelFont}; 
                font-size: ${STYLE.fretLabelSize}px; 
                fill: ${STYLE.titleColor}; 
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
    
    <!-- Title -->
    <text x="${width/2}" y="15" class="chord-title">${chordSymbol} ${getInversionName(inversion)}</text>`;
    
    // Strings (vertical lines)
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
    }
    
    // Add interval labels under active strings if voicing is provided
    if (voicing.length > 0 && root && chordType) {
        for (let i = 0; i < 4; i++) {
            const stringIdx = activeStrings[i];
            const x = marginLeft + stringIdx * stringSpacing;
            const note = voicing[i];
            const interval = getIntervalName(note, root, chordType);
            svg += `\n    <text x="${x}" y="${marginTop + fretboardHeight + 15}" class="string-label">${interval}</text>`;
        }
    }
    
    svg += '\n</svg>';
    return svg;
}

function generateAllChords(root = 'C', outputDir = '.') {
    console.log(`Generating clean chord library for ${root}...`);
    
    const chords = [];
    let totalGenerated = 0;
    const stringSets = ['middle', 'upper'];
    
    for (const stringSet of stringSets) {
        console.log(`\nGenerating ${stringSet} string set chords...`);
        
        for (const [chordType, intervals] of Object.entries(CHORD_INTERVALS)) {
            console.log(`Generating ${root}${chordType} (${stringSet})...`);
            
            const chordNotes = getChordNotes(root, chordType);
            
            for (let inversion = 0; inversion < 4; inversion++) {
                const voicing = createDrop2Voicing(chordNotes, inversion);
                const fingering = findDrop2Fingering(voicing, root, 3, 4, stringSet);
                
                if (fingering) {
                    const displaySymbol = getChordDisplaySymbol(root, chordType);
                    const svg = createChordSVG(fingering, displaySymbol, stringSet, root, chordType, voicing, inversion);
                    const suffix = stringSet === 'upper' ? '_upper' : '';
                    const filename = `${root}_${chordType}_inv${inversion + 1}_tedGreen${suffix}.svg`;
                    const filepath = path.join(outputDir, filename);
                    
                    // Ensure directory exists
                    fs.mkdirSync(path.dirname(filepath), { recursive: true });
                    fs.writeFileSync(filepath, svg);
                    
                    chords.push({
                        symbol: displaySymbol,
                        type: chordType,
                        inversion: inversion + 1,
                        filename: filename,
                        voicing: voicing,
                        frets: fingering.frets,
                        stringSet: stringSet,
                        hasFlatNineAvoidInterval: hasFlatNineAvoidInterval(fingering, stringSet),
                        hasMinorSecond: hasAdjacentMinorSecond(fingering, stringSet)
                    });
                    
                    console.log(`✓ ${filename}`);
                    totalGenerated++;
                }
            }
        }
    }
    
    // Generate chord manifest
    const manifest = {
        generated: new Date().toISOString(),
        root: root,
        totalChords: totalGenerated,
        chordTypes: Object.keys(CHORD_INTERVALS),
        chords: chords
    };
    
    const manifestPath = path.join(outputDir, 'chord-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`\n✅ Generated ${totalGenerated} chord diagrams!`);
    console.log(`📋 Manifest saved to: ${manifestPath}`);
    
    return manifest;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateAllChords('C', 'chords');
}

export { generateAllChords, CHORD_INTERVALS, NOTES };
