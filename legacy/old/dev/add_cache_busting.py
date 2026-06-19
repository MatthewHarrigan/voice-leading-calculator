#!/usr/bin/env python3

import re

# Read the HTML file
with open('minimal_chord_library.html', 'r') as f:
    content = f.read()

# Add cache-busting parameter to all SVG references
# Pattern: .svg" -> .svg?v=2"
content = re.sub(r'\.svg"', '.svg?v=2"', content)

# Also update onclick handlers
# Pattern: .svg', -> .svg?v=2',
content = re.sub(r"\.svg'", ".svg?v=2'", content)

# Write back to file
with open('minimal_chord_library.html', 'w') as f:
    f.write(content)

print("Added cache-busting parameters to all SVG references")