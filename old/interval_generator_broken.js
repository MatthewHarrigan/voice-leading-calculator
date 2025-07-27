import fs from 'fs';

// Guitar tuning: E A D G B E (low to high)
const TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Musical intervals with simple and compound versions (removed unison/octave)
const INTERVALS = {
    'minor_2nd': { semitones: 1, shortName: 'm2/♭9', simpleSymbol: '♭2', compoundSymbol: '♭9' },
    'major_2nd': { semitones: 2, shortName: 'M2/9', simpleSymbol: '2', compoundSymbol: '9' },
    'minor_3rd': { semitones: 3, shortName: 'm3/♭10', simpleSymbol: '♭3', compoundSymbol: '♭10' },
    'major_3rd': { semitones: 4, shortName: 'M3/10', simpleSymbol: '3', compoundSymbol: '10' },
    'perfect_4th': { semitones: 5, shortName: 'P4/11', simpleSymbol: '4', compoundSymbol: '11' },
    'tritone': { semitones: 6, shortName: 'TT/♭11', simpleSymbol: '♭5', compoundSymbol: '♭11' },
    'perfect_5th': { semitones: 7, shortName: 'P5/12', simpleSymbol: '5', compoundSymbol: '12' },
    'minor_6th': { semitones: 8, shortName: 'm6/♭13', simpleSymbol: '♭6', compoundSymbol: '♭13' },
    'major_6th': { semitones: 9, shortName: 'M6/13', simpleSymbol: '6', compoundSymbol: '13' },
    'minor_7th': { semitones: 10, shortName: 'm7/♭14', simpleSymbol: '♭7', compoundSymbol: '♭14' },
    'major_7th': { semitones: 11, shortName: 'M7/14', simpleSymbol: '7', compoundSymbol: '14' }
};

// String pairs (all combinations of 2 strings, including same string)
const STRING_PAIRS = [
    // Same string patterns
    [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
    // Different string patterns
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], // E string with others
    [1, 2], [1, 3], [1, 4], [1, 5],         // A string with others
    [2, 3], [2, 4], [2, 5],                 // D string with others  
    [3, 4], [3, 5],                         // G string with others
    [4, 5]                                  // B and high E
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
        // From note1 up to note2
        let interval = semitone2 - semitone1;
        if (interval <= 0) interval += 12; // Ensure positive, cross octave if needed
        return interval;
    } else {
        // From note1 down to note2 (descending)
        let interval = semitone1 - semitone2;
        if (interval <= 0) interval += 12; // Ensure positive, cross octave if needed
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

// Generate unique fret patterns for a specific interval (no open strings, no duplicates)
// Creates both ascending and descending versions
function generateIntervalFingerings(intervalName, maxFrets = 5) {
    const interval = INTERVALS[intervalName];
    const fingerings = [];
    const uniquePatterns = new Set();
    
    // Try all string pairs
    for (const [string1, string2] of STRING_PAIRS) {
        // Try all fret combinations within range (skip open strings)
        for (let fret1 = 1; fret1 <= maxFrets; fret1++) {
            for (let fret2 = 1; fret2 <= maxFrets; fret2++) {
                // Skip same fret on same string (that would be unison)
                if (string1 === string2 && fret1 === fret2) {
                    continue;
                }

                // For ALL patterns, only keep the lowest fret position to avoid duplicates
                // This eliminates positional duplicates like str0-2_fret1-4, str0-2_fret2-5, etc.
                if (fret1 > 1) {
                    continue;
                }                
                const note1 = getNoteAtFret(string1, fret1);
                const note2 = getNoteAtFret(string2, fret2);
                
                // Check ascending interval (note1 -> note2)
                const ascendingInterval = calculateInterval(note1, note2, 'ascending');
                if (ascendingInterval === interval.semitones) {
                    // Create geometric shape-based pattern key instead of position-based
                    const stringSpan = Math.abs(string2 - string1);
                    const fretSpan = Math.abs(fret2 - fret1);
                    const patternKey = `span${stringSpan}fret${fretSpan}_asc`;
                    
                    if (!uniquePatterns.has(patternKey)) {
                        uniquePatterns.add(patternKey);
                        
                        // Determine if compound based on physical guitar layout
                        // Compound when: spans 3+ strings OR fret span 4+ OR total fret position high
                        const maxFretPos = Math.max(fret1, fret2);
                        
                        // More sophisticated compound logic: 
                        // - Same string with 3+ fret gap = compound
                        // - 3+ string span = compound  
                        // - High fret positions (4+) = compound
                        const isCompound = (string1 === string2 && fretSpan >= 3) || 
                                         (stringSpan >= 3) || 
                                         (maxFretPos >= 4 && stringSpan >= 2);
                        
                        // Only use ascending symbols (no more descending confusion)
                        const intervalSymbol = isCompound ? interval.compoundSymbol : interval.simpleSymbol;
                        
                        fingerings.push({
                            interval: intervalName,
                            direction: 'ascending',
                            isCompound: isCompound,
                            intervalSymbol: intervalSymbol,
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
                            // Keep old names for compatibility with visualizer
                            lowString: Math.min(string1, string2),
                            highString: Math.max(string1, string2),
                            lowFret: string1 <= string2 ? fret1 : fret2,
                            highFret: string1 <= string2 ? fret2 : fret1,
                            lowNote: string1 <= string2 ? note1 : note2,
                            highNote: string1 <= string2 ? note2 : note1
                        });
                    }
                }
                
                // Check descending interval (note1 -> note2 going down)
                const descendingInterval = calculateInterval(note1, note2, 'descending');
                if (descendingInterval === interval.semitones) {
                    // Create geometric shape-based pattern key for descending
                    const stringSpan = Math.abs(string2 - string1);
                    const fretSpan = Math.abs(fret2 - fret1);
                    const patternKey = `span${stringSpan}fret${fretSpan}_desc`;
                    
                    if (!uniquePatterns.has(patternKey)) {
                        uniquePatterns.add(patternKey);
                        
                        // Same compound logic as ascending
                        const maxFretPos = Math.max(fret1, fret2);
                        const isCompound = (string1 === string2 && fretSpan >= 3) || 
                                         (stringSpan >= 3) || 
                                         (maxFretPos >= 4 && stringSpan >= 2);
                        
                        // Use ascending symbols for descending patterns too (they show the interval being displayed)
                        const intervalSymbol = isCompound ? interval.compoundSymbol : interval.simpleSymbol;
                        
                        fingerings.push({
                            interval: intervalName,
                            direction: 'descending',
                            isCompound: isCompound,
                            intervalSymbol: intervalSymbol,
                            rootString: string1,
                            intervalString: string2,
                            rootFret: fret1,
                            intervalFret: fret2,
                            rootNote: note1,
                            intervalNote: note2,
                            calculatedInterval: descendingInterval,
                            span: fretSpan,
                            stringSpan: stringSpan,
                            maxFretPos: maxFretPos,
                            pattern: patternKey,
                            // Keep old names for compatibility with visualizer
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
    
    // Sort results by root string, then by root fret
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