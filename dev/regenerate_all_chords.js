import fs from 'fs';
import { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG,
    CHORD_INTERVALS
} from './chord_generator_browser.js';

// All chord types in the library
const CHORD_TYPES = [
    'maj7', 'min7', 'dom7', 'min7b5', 'dim7',
    'maj6', 'min6', 'sus4', 'sus2'
];

function regenerateAllChords() {
    console.log('Regenerating all chord diagrams with interval annotations...\n');
    
    let totalGenerated = 0;
    
    // Generate all chord inversions
    for (const chordType of CHORD_TYPES) {
        console.log(`Generating ${chordType} chord diagrams...`);
        
        const chordNotes = getChordNotes('C', chordType);
        
        for (let inversionIndex = 0; inversionIndex < 4; inversionIndex++) {
            const voicing = createDrop2Voicing(chordNotes, inversionIndex);
            const fingering = findDrop2Fingering(voicing, 'C');
            
            if (fingering) {
                // Add voicing to fingering data for interval calculation
                fingering.voicing = voicing;
                
                const inversionNames = ['Root', '1st', '2nd', '3rd'];
                const inversionName = inversionNames[inversionIndex];
                
                const svg = create6StringChordSVG(
                    fingering, 
                    `C${getChordSymbol(chordType)}`,
                    `C${getChordSymbol(chordType)} ${inversionName} Inversion`,
                    'C',
                    chordType
                );
                
                // Use the original file naming convention but with corrected content
                const originalInversionMap = [3, 4, 1, 2]; // Maps new inversion index to old file numbers
                const fileInvNumber = originalInversionMap[inversionIndex];
                const filename = `C_${chordType}_inv${fileInvNumber}_tedGreen.svg`;
                
                fs.writeFileSync(filename, svg);
                console.log(`Generated: ${filename} (${inversionName} Inversion)`);
                totalGenerated++;
            } else {
                console.log(`Warning: Could not find fingering for C${chordType} inversion ${inversionIndex}`);
            }
        }
        console.log('');
    }
    
    console.log(`\nRegenerated ${totalGenerated} chord diagrams with interval annotations!`);
}

// Helper function to get chord symbol
function getChordSymbol(chordType) {
    const symbols = {
        'maj7': 'maj7',
        'min7': 'm7', 
        'dom7': '7',
        'min7b5': 'm7♭5',
        'dim7': '°7',
        'maj6': '6',
        'min6': 'm6',
        'sus4': 'sus4',
        'sus2': 'sus2'
    };
    return symbols[chordType] || chordType;
}

// Generate progression patterns
function regenerateProgressions() {
    console.log('\nRegenerating ii-V-I progression patterns...\n');
    
    // Major ii-V-I progressions
    const majorProgressions = [
        { pattern: 1, chords: [
            { chord: 'Dm7', type: 'min7', inv: 1, file: 'major_pattern1_chord1_iim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 3, file: 'major_pattern1_chord2_V7.svg' },
            { chord: 'Cmaj7', type: 'maj7', inv: 1, file: 'major_pattern1_chord3_Imaj7.svg' }
        ]},
        { pattern: 2, chords: [
            { chord: 'Dm7', type: 'min7', inv: 2, file: 'major_pattern2_chord1_iim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 0, file: 'major_pattern2_chord2_V7.svg' },
            { chord: 'Cmaj7', type: 'maj7', inv: 3, file: 'major_pattern2_chord3_Imaj7.svg' }
        ]},
        { pattern: 3, chords: [
            { chord: 'Dm7', type: 'min7', inv: 3, file: 'major_pattern3_chord1_iim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 0, file: 'major_pattern3_chord2_V7.svg' },
            { chord: 'Cmaj7', type: 'maj7', inv: 3, file: 'major_pattern3_chord3_Imaj7.svg' }
        ]},
        { pattern: 4, chords: [
            { chord: 'Dm7', type: 'min7', inv: 0, file: 'major_pattern4_chord1_iim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 2, file: 'major_pattern4_chord2_V7.svg' },
            { chord: 'Cmaj7', type: 'maj7', inv: 0, file: 'major_pattern4_chord3_Imaj7.svg' }
        ]}
    ];
    
    // Minor ii-V-i progressions  
    const minorProgressions = [
        { pattern: 1, chords: [
            { chord: 'Dm7♭5', type: 'min7b5', inv: 1, file: 'pattern1_chord1_iidim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 3, file: 'pattern1_chord2_V7.svg' },
            { chord: 'Cm7', type: 'min7', inv: 1, file: 'pattern1_chord3_im7.svg' }
        ]},
        { pattern: 2, chords: [
            { chord: 'Dm7♭5', type: 'min7b5', inv: 2, file: 'pattern2_chord1_iidim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 0, file: 'pattern2_chord2_V7.svg' },
            { chord: 'Cm7', type: 'min7', inv: 3, file: 'pattern2_chord3_im7.svg' }
        ]},
        { pattern: 3, chords: [
            { chord: 'Dm7♭5', type: 'min7b5', inv: 3, file: 'pattern3_chord1_iidim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 0, file: 'pattern3_chord2_V7.svg' },
            { chord: 'Cm7', type: 'min7', inv: 3, file: 'pattern3_chord3_im7.svg' }
        ]},
        { pattern: 4, chords: [
            { chord: 'Dm7♭5', type: 'min7b5', inv: 0, file: 'pattern4_chord1_iidim7.svg' },
            { chord: 'G7', type: 'dom7', inv: 2, file: 'pattern4_chord2_V7.svg' },
            { chord: 'Cm7', type: 'min7', inv: 0, file: 'pattern4_chord3_im7.svg' }
        ]}
    ];
    
    // Generate all progression chords
    const allProgressions = [...majorProgressions, ...minorProgressions];
    let progressionCount = 0;
    
    for (const progression of allProgressions) {
        console.log(`Generating pattern ${progression.pattern} chords...`);
        
        for (const chordInfo of progression.chords) {
            const root = chordInfo.chord.charAt(0);
            const accidental = chordInfo.chord.charAt(1) === '#' || chordInfo.chord.charAt(1) === '♭' ? chordInfo.chord.charAt(1) : '';
            const chordRoot = root + accidental;
            
            const chordNotes = getChordNotes(chordRoot, chordInfo.type);
            const voicing = createDrop2Voicing(chordNotes, chordInfo.inv);
            const fingering = findDrop2Fingering(voicing, chordRoot);
            
            if (fingering) {
                fingering.voicing = voicing;
                
                const svg = create6StringChordSVG(
                    fingering,
                    chordInfo.chord,
                    '',
                    chordRoot,
                    chordInfo.type
                );
                
                fs.writeFileSync(chordInfo.file, svg);
                console.log(`Generated: ${chordInfo.file}`);
                progressionCount++;
            }
        }
    }
    
    console.log(`\nRegenerated ${progressionCount} progression chord diagrams!`);
}

// Main execution
console.log('Starting chord regeneration with interval annotations...\n');
regenerateAllChords();
regenerateProgressions();
console.log('\n✅ All chord diagrams regenerated with interval annotations!');