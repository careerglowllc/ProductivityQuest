#!/usr/bin/env python3
"""
Fix files where the isDark interpolation ended up inside regular double-quoted strings
instead of template literals (backticks). Convert className="..${isDark...}" to
className={`..${isDark...}`}.
"""

import re
import os

PAGES_DIR = "client/src/pages"

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Pattern: className="...(content with ${isDark...})..."
    # We need to convert the surrounding quotes to backticks and wrap in {}
    # Match: className="...${isDark...}..."
    # The regex: className="([^"]*\$\{isDark[^"]*)"
    def replace_match(m):
        inner = m.group(1)
        return 'className={`' + inner + '`}'

    content = re.sub(r'className="([^"]*\$\{isDark[^"]*)"', replace_match, content)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Fixed template literals in {os.path.basename(filepath)}")
        return True
    return False

def main():
    fixed = []
    for fname in sorted(os.listdir(PAGES_DIR)):
        if not fname.endswith('.tsx'):
            continue
        filepath = os.path.join(PAGES_DIR, fname)
        if fix_file(filepath):
            fixed.append(fname)
    print(f"\nFixed {len(fixed)} files: {', '.join(fixed)}")

if __name__ == "__main__":
    main()
