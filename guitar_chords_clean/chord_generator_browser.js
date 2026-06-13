// Browser-compatible chord generator (adapted from chord-generator.js)
// Drop 2 chord theory - Complete 15 chord types as specified
const CHORD_INTERVALS = {
    // Major chords
    'maj7': [0, 4, 7, 11],     // Cmaj7: 1 3 5 7 - Major 7
    'maj6': [0, 4, 7, 9],      // C6: 1 3 5 6 - Major 6
    'maj7s5': [0, 4, 8, 11],   // Cmaj7♯5: 1 3 ♯5 7 - Major 7 with augmented 5th
    'maj7b5': [0, 4, 6, 11],   // Cmaj7♭5: 1 3 ♭5 7 - Major 7 with diminished 5th
    
    // Dominant chords
    'dom7': [0, 4, 7, 10],     // C7: 1 3 5 ♭7 - Dominant 7
    'dom7sus4': [0, 5, 7, 10], // C7sus4: 1 4 5 ♭7 - Dominant 7 with suspended 4th
    'dom7s5': [0, 4, 8, 10],   // C7♯5: 1 3 ♯5 ♭7 - Dominant 7 with augmented 5th
    'dom7b5': [0, 4, 6, 10],   // C7♭5: 1 3 ♭5 ♭7 - Dominant 7 with diminished 5th
    
    // Minor chords
    'min6': [0, 3, 7, 9],      // Cm6: 1 ♭3 5 6 - Minor 6
    'min7': [0, 3, 7, 10],     // Cm7: 1 ♭3 5 ♭7 - Minor 7
    'min7b5': [0, 3, 6, 10],   // Cm7♭5: 1 ♭3 ♭5 ♭7 - Half-diminished 7
    'min7s5': [0, 3, 8, 10],   // Cm7♯5: 1 ♭3 ♯5 ♭7 - Minor 7 with augmented 5th
    'minmaj7': [0, 3, 7, 11],  // Cm(maj7): 1 ♭3 5 7 - Minor major 7
    
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
        // Dominant chords  
        'dom7': '7',
        'dom7sus4': '7sus4',
        'dom7s5': '7♯5',
        'dom7b5': '7♭5',
        // Minor chords
        'min6': 'm6',
        'min7': 'm7',
        'min7b5': 'm7♭5',
        'min7s5': 'm7♯5',
        'minmaj7': 'm(maj7)',
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
                return { frets, rootString: rootString || 0, voicing, stringSet };
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

function hasAdjacentMinorSecond(chordData, stringSet = chordData?.stringSet || 'middle') {
    if (!chordData || !chordData.frets) return false;

    const activeStrings = stringSet === 'upper' ? [2, 3, 4, 5] : [1, 2, 3, 4];
    const pitches = activeStrings
        .map(stringIndex => {
            const fret = chordData.frets[stringIndex];
            return fret === null || fret === undefined ? null : getFrettedPitch(stringIndex, fret);
        })
        .filter(pitch => pitch !== null);

    for (let i = 1; i < pitches.length; i++) {
        if (Math.abs(pitches[i] - pitches[i - 1]) === 1) {
            return true;
        }
    }

    return false;
}

function create6StringChordSVG(chordData, chordSymbol, subtitle = '', root = 'C', chordType = '', stringSet = 'middle') {
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
    <text x="${width/2}" y="15" class="chord-title">${chordSymbol}${subtitle ? ' ' + subtitle : ''}</text>`;
    
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
    
    // Notes - only on active strings
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
    if (chordData.voicing && chordData.voicing.length > 0 && root && chordType) {
        for (let i = 0; i < 4; i++) {
            const stringIdx = activeStrings[i];
            const x = marginLeft + stringIdx * stringSpacing;
            const note = chordData.voicing[i];
            const interval = getIntervalName(note, root, chordType);
            svg += `\n    <text x="${x}" y="${marginTop + fretboardHeight + 15}" class="string-label">${interval}</text>`;
        }
    }
    
    svg += '\n</svg>';
    return svg;
}

// Function to generate chord data for a specific string set
function generateChordForStringSet(root, chordType, inversion, stringSet) {
    const chordNotes = getChordNotes(root, chordType);
    const voicing = createDrop2Voicing(chordNotes, inversion);
    const fingering = findDrop2Fingering(voicing, root, 3, 4, stringSet);
    
    if (fingering) {
        return {
            ...fingering,
            root: root,
            chordType: chordType,
            inversion: inversion,
            symbol: getChordDisplaySymbol(root, chordType)
        };
    }
    
    return null;
}

// Export functions and constants for browser use
export {
    CHORD_INTERVALS,
    NOTES,
    getChordNotes,
    createDrop2Voicing,
    findDrop2Fingering,
    create6StringChordSVG,
    generateChordForStringSet,
    getChordDisplaySymbol,
    getIntervalName,
    getInversionName,
    hasAdjacentMinorSecond
};
