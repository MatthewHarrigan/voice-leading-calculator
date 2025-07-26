# Drop 2 Chord Inversions

A minimal guitar chord reference for drop 2 voicings with optimal voice leading progressions.

## Usage

Open `minimal_chord_library.html` in a web browser or run the local server:

```bash
node server.js
```

Then visit `http://localhost:8002`

## Features

- Complete drop 2 chord library (16 chord types, all inversions)
- Major and minor ii-V-I progressions with optimal voice leading
- Ted Green minimalist aesthetic
- Interactive chord diagrams
- Middle 4 strings focus (A-D-G-B)

## Chord Types

**Basic 7th**: maj7, min7, dom7, min7♭5, dim7  
**6th**: maj6, min6  
**Suspended**: sus4, sus2  
**Extended**: 9th chords, altered dominants

## Voice Leading Patterns

**Major ii-V-I**: 4 patterns with optimal voice leading  
**Minor ii-V-i**: 4 patterns with optimal voice leading

All patterns designed for minimal finger movement between chord changes.

## Project Structure

- `minimal_chord_library.html` - Main chord library interface
- `interval_browser.html` - Interval visualization tool  
- `dynamic_chord_builder.html` - Interactive chord builder
- `chord_generator.js` - Core chord generation logic
- `chord_generator_browser.js` - Browser-compatible version
- `interval_generator.js` - Interval generation functions
- `server.js` - Local development server
- `generated/` - Generated SVG chord diagrams
- `dev/` - Development tools and test files
- `docs/` - Documentation and analysis reports