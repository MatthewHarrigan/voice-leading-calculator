#!/usr/bin/env python3

import re

# Read the HTML file
with open('minimal_chord_library.html', 'r') as f:
    content = f.read()

# Update cache-busting parameter from v=7 to v=8
content = content.replace('?v=7', '?v=8')

# Write back to file
with open('minimal_chord_library.html', 'w') as f:
    f.write(content)

print("Updated cache-busting version to v=8")