import fs from 'fs';

// Guitar tuning: E A D G B E (low to high)
const TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Musical intervals with simple and compound versions
const INTERVALS = {
    'minor_2nd': { semitones: 1, shortName: 'm2/b9', simpleSymbol: 'b2', compoundSymbol: 'b9' },
    'major_2nd': { semitones: 2, shortName: 'M2/9', simpleSymbol: '2', compoundSymbol: '9' },
    'minor_3rd': { semitones: 3, shortName: 'm3/b10', simpleSymbol: 'b3', compoundSymbol: 'b10' },
    'major_3rd': { semitones: 4, shortName: 'M3/10', simpleSymbol: '3', compoundSymbol: '10' },
    'perfect_4th': { semitones: 5, shortName: 'P4/11', simpleSymbol: '4', compoundSymbol: '11' },
    'tritone': { semitones: 6, shortName: 'TT/b11', simpleSymbol: 'b5', compoundSymbol: 'b11' },
    'perfect_5th': { semitones: 7, shortName: 'P5/12', simpleSymbol: '5', compoundSymbol: '12' },
    'minor_6th': { semitones: 8, shortName: 'm6/b13', simpleSymbol: 'b6', compoundSymbol: 'b13' },
    'major_6th': { semitones: 9, shortName: 'M6/13', simpleSymbol: '6', compoundSymbol: '13' },
    'minor_7th': { semitones: 10, shortName: 'm7/b14', simpleSymbol: 'b7', compoundSymbol: 'b14' },
    'major_7th': { semitones: 11, shortName: 'M7/14', simpleSymbol: '7', compoundSymbol: '14' }
};

// String pairs (all combinations of 2 strings, including same string)
const STRING_PAIRS = [
    // Same string patterns
    [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
    // Different string patterns
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 3], [2, 4], [2, 5],
    [3, 4], [3, 5],
    [4, 5]
];

// Convert note to semitone value (C=0, C#=1, etc.)
function noteToSemitone(note) {
    return NOTES.indexOf(note);
}

// Calculate interval in semitones between two notes
function calculateInterval(note1, note2, direction = 'ascending') {
    const semitone1 = noteToSemitone(note1);
    const semitone2 = noteToSemitone(note2);
    
    if (direction === 'ascending') {
        let interval = semitone2 - semitone1;
        if (interval <= 0) interval += 12;
        return interval;
    } else {
        let interval = semitone1 - semitone2;
        if (interval <= 0) interval += 12;
        return interval;
    }
}

// Get note at specific fret on a string
function getNoteAtFret(stringIndex, fret) {
    const openNote = TUNING[stringIndex];
    const openNoteIndex = NOTES.indexOf(openNote);
    const noteIndex = (openNoteIndex + fret) % 12;
    return NOTES[noteIndex];
}

// Generate unique fret patterns for a specific interval
function generateIntervalFingerings(intervalName, maxFrets = 5) {
    const interval = INTERVALS[intervalName];
    const fingerings = [];
    const uniquePatterns = new Set();
    
    for (const [string1, string2] of STRING_PAIRS) {
        for (let fret1 = 1; fret1 <= maxFrets; fret1++) {
            for (let fret2 = 1; fret2 <= maxFrets; fret2++) {
                if (fret1 > 1) continue; // Only keep lowest fret position
                
                const note1 = getNoteAtFret(string1, fret1);
                const note2 = getNoteAtFret(string2, fret2);
                
                const ascendingInterval = calculateInterval(note1, note2, 'ascending');
                if (ascendingInterval === interval.semitones) {
                    const stringSpan = Math.abs(string2 - string1);
                    const fretSpan = Math.abs(fret2 - fret1);
                    const patternKey = `span${stringSpan}fret${fretSpan}_asc`;
                    
                    if (!uniquePatterns.has(patternKey)) {
                        uniquePatterns.add(patternKey);
                        
                        const maxFretPos = Math.max(fret1, fret2);
                        const isCompound = (string1 === string2 && fretSpan >= 3) || 
                                         stringSpan >= 3 || maxFretPos >= 4;
                        
                        fingerings.push({
                            rootString: string1,
                            intervalString: string2,
                            rootFret: fret1,
                            intervalFret: fret2,
                            rootNote: note1,
                            intervalNote: note2,
                            calculatedInterval: ascendingInterval,
                            span: fretSpan,
                            stringSpan: stringSpan,
                            maxFretPos: maxFretPos,
                            pattern: patternKey,
                            isCompound: isCompound,
                            lowString: Math.min(string1, string2),
                            highString: Math.max(string1, string2),
                            lowFret: string1 <= string2 ? fret1 : fret2,
                            highFret: string1 <= string2 ? fret2 : fret1,
                            lowNote: string1 <= string2 ? note1 : note2,
                            highNote: string1 <= string2 ? note2 : note1
                        });
                    }
                }
            }
        }
    }
    
    fingerings.sort((a, b) => {
        if (a.rootString !== b.rootString) return a.rootString - b.rootString;
        if (a.rootFret !== b.rootFret) return a.rootFret - b.rootFret;
        return 0;
    });
    
    return fingerings;
}

// Generate all intervals
function generateAllIntervals(maxFrets = 5) {
    const allFingerings = {};
    
    console.log('Generating all interval fingerings...');
    
    for (const intervalName of Object.keys(INTERVALS)) {
        console.log(`Generating fingerings for ${intervalName}...`);
        allFingerings[intervalName] = generateIntervalFingerings(intervalName, maxFrets);
        console.log(`Found ${allFingerings[intervalName].length} fingerings`);
    }
    
    return allFingerings;
}

export { 
    TUNING, 
    NOTES, 
    INTERVALS, 
    STRING_PAIRS, 
    generateIntervalFingerings, 
    generateAllIntervals, 
    getNoteAtFret 
};