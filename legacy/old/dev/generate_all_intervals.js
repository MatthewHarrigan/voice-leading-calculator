import { generateAllIntervals, INTERVALS } from '../interval_generator.js';
import { generateIntervalSVGs } from '../interval_visualizer.js';

function analyzeIntervalPatterns(allFingerings) {
    console.log('\n=== INTERVAL ANALYSIS ===\n');
    
    for (const [intervalName, fingerings] of Object.entries(allFingerings)) {
        const interval = INTERVALS[intervalName];
        console.log(`${intervalName.toUpperCase()} (${interval.shortName}) - ${interval.semitones} semitones:`);
        console.log(`  Total fingerings: ${fingerings.length}`);
        
        // Group by string pairs
        const byStringPairs = {};
        for (const fingering of fingerings) {
            const pairKey = `${fingering.lowString}-${fingering.highString}`;
            if (!byStringPairs[pairKey]) {
                byStringPairs[pairKey] = [];
            }
            byStringPairs[pairKey].push(fingering);
        }
        
        console.log(`  String pair distribution:`);
        for (const [pair, pairFingerings] of Object.entries(byStringPairs)) {
            const [low, high] = pair.split('-').map(Number);
            const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];
            console.log(`    ${stringNames[low]}-${stringNames[high]}: ${pairFingerings.length} fingerings`);
        }
        
        // Analyze fret spans
        const spans = fingerings.map(f => f.span);
        const avgSpan = spans.reduce((a, b) => a + b, 0) / spans.length;
        console.log(`  Average fret span: ${avgSpan.toFixed(1)}`);
        
        // Show some examples
        console.log(`  Examples:`);
        const examples = fingerings.slice(0, 3);
        for (const ex of examples) {
            const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];
            console.log(`    ${stringNames[ex.lowString]}(${ex.lowFret}) to ${stringNames[ex.highString]}(${ex.highFret}) = ${ex.lowNote} to ${ex.highNote}`);
        }
        console.log('');
    }
}

function handleTuningDifferences(fingerings) {
    // The B-E strings have a major 3rd interval (4 semitones) instead of perfect 4th (5 semitones)
    // This is already handled in the interval calculation, but let's analyze it
    
    const bToEFingerings = fingerings.filter(f => 
        (f.lowString === 4 && f.highString === 5) || 
        (f.lowString === 5 && f.highString === 4)
    );
    
    if (bToEFingerings.length > 0) {
        console.log(`\n  Special B-E string pair patterns (${bToEFingerings.length} fingerings):`);
        for (const f of bToEFingerings.slice(0, 3)) {
            console.log(`    B(${f.lowString === 4 ? f.lowFret : f.highFret}) to E(${f.lowString === 4 ? f.highFret : f.lowFret})`);
        }
    }
}

function main() {
    console.log('🎸 GUITAR INTERVAL GENERATOR 🎸\n');
    console.log('Generating all possible interval fingerings within 5 frets...\n');
    
    // Generate all interval fingerings
    const allFingerings = generateAllIntervals(5);
    
    // Analyze patterns
    analyzeIntervalPatterns(allFingerings);
    
    // Generate SVGs for all intervals
    console.log('\n=== GENERATING SVG VISUALIZATIONS ===\n');
    
    let totalSVGs = 0;
    for (const [intervalName, fingerings] of Object.entries(allFingerings)) {
        const count = generateIntervalSVGs(fingerings, intervalName);
        totalSVGs += count;
        
        // Handle tuning differences analysis
        if (intervalName === 'major_3rd' || intervalName === 'perfect_4th') {
            handleTuningDifferences(fingerings);
        }
    }
    
    console.log(`\n✅ Complete! Generated ${totalSVGs} total interval diagrams.`);
    console.log('\nEach interval type is organized in its own directory:');
    for (const intervalName of Object.keys(INTERVALS)) {
        console.log(`  - intervals_${intervalName}/`);
    }
    
    // Summary statistics
    const totalFingerings = Object.values(allFingerings).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`\n📊 SUMMARY:`);
    console.log(`  - ${Object.keys(INTERVALS).length} interval types`);
    console.log(`  - ${totalFingerings} total fingerings`);
    console.log(`  - ${totalSVGs} SVG diagrams generated`);
    console.log(`  - Up to 5 frets maximum span`);
    console.log(`  - Includes duplicates on different string combinations`);
    console.log(`  - Handles B-E string tuning differences automatically`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main, analyzeIntervalPatterns, handleTuningDifferences };