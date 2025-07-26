// Test larger font generation
import { 
    getChordNotes, 
    createDrop2Voicing, 
    findDrop2Fingering, 
    create6StringChordSVG 
} from './chord_generator_browser.js';

console.log('Testing chord generation with larger fonts...');

// Generate a test chord
const chordNotes = getChordNotes('C', 'maj7');
const voicing = createDrop2Voicing(chordNotes, 0); // Root inversion
const fingering = findDrop2Fingering(voicing, 'C');

if (fingering) {
    fingering.voicing = voicing;
    
    const svg = create6StringChordSVG(
        fingering, 
        'Cmaj7',
        'Cmaj7 Root Inversion',
        'C',
        'maj7'
    );
    
    // Check font sizes in SVG
    const hasTitleSize18 = svg.includes('font-size: 18px');
    const hasStringSize14 = svg.includes('font-size: 14px');
    const hasFretSize12 = svg.includes('font-size: 12px');
    
    console.log('Title font size 18px:', hasTitleSize18);
    console.log('String label font size 14px:', hasStringSize14);
    console.log('Fret label font size 12px:', hasFretSize12);
    
    if (hasTitleSize18 && hasStringSize14 && hasFretSize12) {
        console.log('✅ SUCCESS: All font sizes have been increased!');
    } else {
        console.log('❌ ISSUE: Font sizes not all updated');
    }
} else {
    console.log('❌ Could not generate chord fingering');
}