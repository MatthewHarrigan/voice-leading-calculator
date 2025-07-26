import { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG
} from './chord_generator_browser.js';

console.log('Testing SVG generation with interval labels...');

const chordNotes = getChordNotes('C', 'maj7');
console.log('Chord notes:', chordNotes);

const voicing = createDrop2Voicing(chordNotes, 0); // Root inversion
console.log('Voicing:', voicing);

const fingering = findDrop2Fingering(voicing, 'C');
console.log('Fingering:', fingering);

if (fingering) {
    // Add voicing to fingering
    fingering.voicing = voicing;
    console.log('Fingering with voicing:', fingering);
    
    const svg = create6StringChordSVG(fingering, 'Cmaj7', 'Test Chord', 'C', 'maj7');
    
    // Check if the SVG contains interval labels
    const hasIntervals = svg.includes('text') && (svg.includes('>R<') || svg.includes('>3<') || svg.includes('>5<') || svg.includes('>7<'));
    console.log('SVG contains interval labels:', hasIntervals);
    
    if (hasIntervals) {
        console.log('✅ Interval labels found in SVG');
    } else {
        console.log('❌ No interval labels found in SVG');
        console.log('SVG length:', svg.length);
        console.log('Last 200 chars:', svg.slice(-200));
    }
}