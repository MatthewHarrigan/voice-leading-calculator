import fs from 'fs';
import { TUNING, INTERVALS } from './interval_generator.js';

// Adapted styling from chord_generator.js for intervals
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
    
    // Different colors for low and high notes in interval
    lowNoteFill: '#000000',    // Black for root/low note
    highNoteFill: '#ffffff',   // White for interval/high note
    
    noteTextColor: '#ffffff',
    noteTextFont: 'Times, serif', 
    noteTextSize: 10,
    noteTextWeight: 'bold',
    
    width: 200,
    height: 240,
    marginTop: 25,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25
};

function createIntervalSVG(fingering, title = '') {
    const strings = [0, 1, 2, 3, 4, 5]; // All 6 strings
    const stringNames = ['E', 'A', 'D', 'G', 'B', 'E'];
    
    // Determine fret range based on the interval fingering
    const minUsedFret = Math.min(fingering.rootFret, fingering.intervalFret);
    const maxUsedFret = Math.max(fingering.rootFret, fingering.intervalFret);
    
    // Set the fret range for display
    const minFret = Math.max(0, minUsedFret - 1);
    const maxFret = Math.min(12, Math.max(maxUsedFret + 1, minFret + 4));
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
            .interval-title { 
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
            .low-note { 
                fill: ${STYLE.lowNoteFill}; 
            }
            .high-note { 
                fill: ${STYLE.highNoteFill}; 
            }
            .note-text {
                font-family: ${STYLE.noteTextFont};
                font-size: ${STYLE.noteTextSize}px;
                font-weight: ${STYLE.noteTextWeight};
                fill: ${STYLE.noteTextColor};
                text-anchor: middle;
                dominant-baseline: central;
            }
            .root-text {
                font-family: ${STYLE.noteTextFont};
                font-size: ${STYLE.noteTextSize}px;
                font-weight: ${STYLE.noteTextWeight};
                fill: ${STYLE.noteTextColor};
                text-anchor: middle;
                dominant-baseline: central;
            }
            .interval-text {
                font-family: ${STYLE.noteTextFont};
                font-size: ${STYLE.noteTextSize}px;
                font-weight: ${STYLE.noteTextWeight};
                fill: ${STYLE.lowNoteFill};
                text-anchor: middle;
                dominant-baseline: central;
            }
        </style>
    </defs>
    
    <!-- Title (removed for cleaner display) -->`;
    
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
    
    // Draw the interval notes (no open strings)
    const interval = INTERVALS[fingering.interval];
    const directionArrow = fingering.direction === 'ascending' ? '↑' : '↓';
    
    const notes = [
        { 
            stringIdx: fingering.rootString, 
            fret: fingering.rootFret, 
            note: fingering.rootNote, 
            isRoot: true, 
            label: 'R' 
        },
        { 
            stringIdx: fingering.intervalString, 
            fret: fingering.intervalFret, 
            note: fingering.intervalNote, 
            isRoot: false, 
            label: fingering.intervalSymbol 
        }
    ];
    
    for (const noteData of notes) {
        const x = marginLeft + noteData.stringIdx * stringSpacing;
        
        // All notes are fretted (no open strings)
        const fretOffset = noteData.fret - minFret;
        const y = marginTop + (fretOffset - 0.5) * fretSpacing;
        
        const noteClass = noteData.isRoot ? 'low-note' : 'high-note';
        const textClass = noteData.isRoot ? 'root-text' : 'interval-text';
        
        svg += `\n    <circle cx="${x}" cy="${y}" r="10" class="note-circle ${noteClass}"/>`;
        svg += `\n    <text x="${x}" y="${y}" class="${textClass}">${noteData.label}</text>`;
    }
    
    svg += '\n</svg>';
    return svg;
}

function generateIntervalSVGs(intervalFingerings, intervalName) {
    const interval = INTERVALS[intervalName];
    const outputDir = `intervals_${intervalName}`;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    
    let count = 0;
    for (const fingering of intervalFingerings) {
        const directionArrow = fingering.direction === 'ascending' ? '↑' : '↓';
        const directionLabel = fingering.direction === 'ascending' ? 'asc' : 'desc';
        
        const title = `${interval.shortName}${directionArrow} - ${fingering.rootNote} to ${fingering.intervalNote}`;
        const svg = createIntervalSVG(fingering, title);
        
        const filename = `${outputDir}/${intervalName}_${directionLabel}_str${fingering.rootString}-${fingering.intervalString}_fret${fingering.rootFret}-${fingering.intervalFret}.svg`;
        fs.writeFileSync(filename, svg);
        count++;
    }
    
    console.log(`Generated ${count} SVGs for ${intervalName} in ${outputDir}/`);
    return count;
}

export {
    createIntervalSVG,
    generateIntervalSVGs,
    STYLE
};