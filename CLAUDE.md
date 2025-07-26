# Claude Context File - Guitar Chord App

## Project Overview
A minimal guitar chord reference app for drop 2 voicings with optimal voice leading progressions, featuring Ted Green's minimalist aesthetic.

## How to Run the App
The app requires a web server to properly serve assets and handle ES6 modules:

### Recommended: Python HTTP Server
```bash
python3 -m http.server 8080
# Then visit: http://localhost:8080/minimal_chord_library.html
```

### Alternative: Node.js Server
```bash
node server.js
# Then visit: http://localhost:8002/minimal_chord_library.html
```

## Project Structure
```
/
├── minimal_chord_library.html    # Main chord library interface (includes sequence builder)
├── interval_browser.html         # Interval visualization tool
├── chord_generator.js            # Core chord generation (Node.js)
├── chord_generator_browser.js    # Browser-compatible version
├── interval_generator.js         # Interval generation functions
├── interval_visualizer.js        # Interval visualization logic
├── server.js                     # Node.js development server (port 8002)
├── svg_manifest.js              # SVG file manifest
├── generate_svg_manifest.js     # Manifest generator
├── README.md                    # User documentation
├── CLAUDE.md                    # This file
├── generated/                   # Generated SVG chord diagrams
│   ├── C_maj7_inv1_tedGreen.svg # Individual chord diagrams
│   └── pattern*_chord*.svg      # ii-V-I progression patterns
├── dev/                         # Development tools and tests
│   ├── test_*.html             # Test pages
│   ├── test_*.js               # Test scripts
│   ├── manual_*.js             # Manual generation scripts
│   ├── debug_*.html            # Debug interfaces
│   ├── *.py                    # Python utilities
│   └── regenerate_all_chords.js # Batch chord generation
├── docs/                        # Documentation
│   ├── README.md               # Same as root README
│   ├── font_size_test_report.md
│   ├── upper_strings_analysis.md
│   └── test-results/           # Test output files
└── tests/                       # Test results directory
```

## Key Features
- **Drop 2 Chord Library**: 16 chord types, all inversions
- **Voice Leading Patterns**: Major/minor ii-V-I progressions 
- **Interactive Diagrams**: Click-to-play chord functionality
- **Middle 4 Strings Focus**: Optimized for A-D-G-B strings
- **Ted Green Aesthetic**: Minimalist black and white design

## Development Commands
```bash
# Generate all chords
node chord_generator.js

# Regenerate specific chord sets
node dev/regenerate_all_chords.js

# Update SVG manifest
node generate_svg_manifest.js

# Run development server
node server.js

# Start Python server (recommended)
python3 -m http.server 8080
```

## File Dependencies
- HTML files depend on JavaScript modules (ES6 imports)
- SVG files are referenced by JavaScript for chord display
- Server required for proper MIME types and CORS handling
- Generated SVGs use Ted Green styling conventions

## Recent Changes
- Organized files into logical directory structure
- Moved development tools to `dev/` folder
- Consolidated documentation in `docs/` folder
- Separated generated assets into `generated/` folder
- Updated README with current project structure

## Notes for Claude
- Always use a web server (Python or Node.js) to run the app
- Main functionality is in static HTML/JS files
- Development tools are separated in `dev/` directory
- Generated SVGs use specific naming conventions
- Project structure is now organized and clean
- **Commit messages should NOT include Claude credit or co-author lines**