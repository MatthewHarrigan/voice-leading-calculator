import { generateAllIntervals, INTERVALS, TUNING } from './interval_generator.js';

function analyzeTuningDifferences() {
    console.log('🎸 GUITAR TUNING ANALYSIS 🎸\n');
    
    // Standard tuning intervals between adjacent strings
    console.log('Standard Guitar Tuning (Low to High):');
    for (let i = 0; i < TUNING.length; i++) {
        console.log(`  String ${i + 1}: ${TUNING[i]}`);
    }
    
    console.log('\nIntervals between adjacent strings:');
    for (let i = 0; i < TUNING.length - 1; i++) {
        const note1 = TUNING[i];
        const note2 = TUNING[i + 1];
        const note1Index = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note1);
        const note2Index = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(note2);
        let interval = note2Index - note1Index;
        if (interval < 0) interval += 12;
        
        const intervalName = interval === 4 ? 'Major 3rd' : 'Perfect 4th';
        const special = interval === 4 ? ' ⚠️  DIFFERENT!' : '';
        console.log(`  ${note1} to ${note2}: ${interval} semitones (${intervalName})${special}`);
    }
    
    console.log('\n=== KEY INSIGHT ===');
    console.log('The G to B strings have a Major 3rd interval (4 semitones)');  
    console.log('All other adjacent strings have Perfect 4th intervals (5 semitones)');
    console.log('This affects fingering patterns when crossing the G-B boundary!\n');
    
    // Generate fingerings to analyze
    const allFingerings = generateAllIntervals(5);
    
    // Analyze B-E string pair specifically
    console.log('=== B-E STRING PAIR ANALYSIS ===\n');
    
    for (const [intervalName, fingerings] of Object.entries(allFingerings)) {
        const beFingerings = fingerings.filter(f => 
            (f.lowString === 4 && f.highString === 5) || 
            (f.lowString === 5 && f.highString === 4)
        );
        
        if (beFingerings.length > 0) {
            const interval = INTERVALS[intervalName];
            console.log(`${intervalName.toUpperCase()} (${interval.shortName}):`);
            console.log(`  B-E fingerings: ${beFingerings.length}`);
            
            // Show the unique fret patterns
            const patterns = new Set();
            for (const f of beFingerings) {
                if (f.lowString === 4) { // B to E
                    patterns.add(`B(${f.lowFret}) → E(${f.highFret})`);
                } else { // E to B
                    patterns.add(`E(${f.lowFret}) → B(${f.highFret})`);
                }
            }
            
            console.log(`  Patterns: ${Array.from(patterns).join(', ')}`);
            console.log('');
        }
    }
    
    // Compare with other string pairs
    console.log('=== COMPARISON WITH OTHER STRING PAIRS ===\n');
    
    const stringNames = ['E', 'A', 'D', 'G', 'B', 'E'];
    const regularPairs = [[0,1], [1,2], [2,3], [3,4]]; // Perfect 4th pairs
    const specialPair = [4,5]; // Major 3rd pair
    
    console.log('Perfect 4th string pairs vs B-E Major 3rd pair:\n');
    
    for (const intervalName of ['major_3rd', 'perfect_4th']) {
        const fingerings = allFingerings[intervalName];
        const interval = INTERVALS[intervalName];
        
        console.log(`${intervalName.toUpperCase()} (${interval.shortName}):`);
        
        // Count fingerings on regular pairs
        const regularCount = fingerings.filter(f => 
            regularPairs.some(([low, high]) => 
                (f.lowString === low && f.highString === high) ||
                (f.lowString === high && f.highString === low)
            )
        ).length;
        
        // Count fingerings on B-E pair
        const beCount = fingerings.filter(f => 
            (f.lowString === 4 && f.highString === 5) ||
            (f.lowString === 5 && f.highString === 4)
        ).length;
        
        console.log(`  Regular pairs (P4): ${regularCount} fingerings`);
        console.log(`  B-E pair (M3): ${beCount} fingerings`);
        console.log(`  Ratio: ${(beCount / Math.max(regularCount, 1)).toFixed(2)}:1`);
        console.log('');
    }
    
    console.log('=== PRACTICAL IMPLICATIONS ===\n');
    console.log('1. Same fret positions on B-E strings produce different intervals');
    console.log('2. Chord and scale patterns change when crossing B-E boundary');
    console.log('3. This is why many guitar patterns have "exceptions" at the B string');
    console.log('4. Barre chords work because they maintain the same fret across all strings');
    console.log('5. Lead guitar licks often need adjustment when moving across B-E strings');
}

// Run analysis
if (import.meta.url === `file://${process.argv[1]}`) {
    analyzeTuningDifferences();
}

export { analyzeTuningDifferences };