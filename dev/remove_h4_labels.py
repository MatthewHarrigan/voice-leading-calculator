#!/usr/bin/env python3

import re

# Read the HTML file
with open('minimal_chord_library.html', 'r') as f:
    content = f.read()

# Remove all <h4>...</h4> tags within chord-card divs
# Pattern: <h4>Root</h4>, <h4>1st</h4>, <h4>2nd</h4>, <h4>3rd</h4>
content = re.sub(r'\s*<h4>[^<]*</h4>\s*', '\n                            ', content)

# Write back to file
with open('minimal_chord_library.html', 'w') as f:
    f.write(content)

print("Removed all H4 inversion labels from chord cards")