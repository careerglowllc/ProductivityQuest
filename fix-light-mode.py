#!/usr/bin/env python3
"""
Fix light mode: replace hardcoded dark gradient wrappers with isDark-conditional classes.
For each page that still has a hardcoded dark gradient as its outermost wrapper,
this script:
  1. Adds `import { useTheme } from "@/contexts/theme-context";` if missing
  2. Adds `const { isDark } = useTheme();` inside the component if missing
  3. Replaces the dark gradient class string with an isDark-conditional version
"""

import re
import os

PAGES_DIR = "client/src/pages"

# (old_bg_class, new_bg_class)
BG_REPLACEMENTS = [
    (
        "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950",
        '${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"}',
    ),
    (
        "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
        '${isDark ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gray-50"}',
    ),
    (
        "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        '${isDark ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" : "bg-gray-50"}',
    ),
    (
        "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900",
        '${isDark ? "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" : "bg-gray-50"}',
    ),
    (
        "bg-slate-950",
        '${isDark ? "bg-slate-950" : "bg-gray-50"}',
    ),
]

THEME_IMPORT = 'import { useTheme } from "@/contexts/theme-context";'
ISDARK_DECL = "  const { isDark } = useTheme();"

# Files to skip (landing page stays dark, backup files, auth pages that are fine)
SKIP_FILES = {
    "landing.tsx",
    "campaigns-old-backup.tsx",
    "login.tsx",
    "register.tsx",
    "forgot-password.tsx",
    "reset-password.tsx",
    "not-found.tsx",
    "notion-integration.tsx",
}


def needs_fix(content, old_bg):
    """Check if file has the old dark bg class not yet wrapped in isDark"""
    return old_bg in content and "isDark" not in content.split(old_bg)[0][-60:]


def add_import(content):
    if THEME_IMPORT in content:
        return content
    # Insert after the last import line
    lines = content.split("\n")
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import_idx = i
    lines.insert(last_import_idx + 1, THEME_IMPORT)
    return "\n".join(lines)


def add_isdark(content, filename):
    if "const { isDark } = useTheme();" in content or "isDark } = useTheme()" in content:
        return content

    # Find `export default function X(` or the component function
    # Try to insert after the first `const { ...isMobile... }` or similar hook,
    # or after `const [` declarations, or after `const { user }` etc.
    # Strategy: find the export default function line and insert after the opening brace
    
    # Pattern 1: export default function Foo(
    m = re.search(r'(export default function \w+\([^)]*\)\s*\{)', content)
    if m:
        pos = m.end()
        # Find next newline
        nl = content.find('\n', pos)
        if nl != -1:
            return content[:nl+1] + ISDARK_DECL + "\n" + content[nl+1:]

    # Pattern 2: function body after first const inside component
    # Find first const { ... } = useIsMobile or useAuth etc
    for hook in ['useIsMobile()', 'useAuth()', 'useQuery(', 'useState(']:
        idx = content.find(hook)
        if idx != -1:
            # Find the start of the line
            line_start = content.rfind('\n', 0, idx)
            line_end = content.find('\n', idx)
            if line_end != -1:
                return content[:line_end+1] + ISDARK_DECL + "\n" + content[line_end+1:]

    print(f"  WARNING: Could not find insertion point for isDark in {filename}")
    return content


def fix_file(filepath):
    filename = os.path.basename(filepath)
    if filename in SKIP_FILES:
        return False

    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    changed = False

    for old_bg, new_bg in BG_REPLACEMENTS:
        if old_bg not in content:
            continue
        # Skip if already wrapped with isDark
        occurrences = [m.start() for m in re.finditer(re.escape(old_bg), content)]
        for occ in occurrences:
            # Check if this occurrence is already inside an isDark ternary
            context_before = content[max(0, occ-80):occ]
            if 'isDark' in context_before:
                continue
            # This is a bare dark class that needs wrapping
            # Find the className string containing it
            # Replace just this occurrence
            content = content[:occ] + new_bg + content[occ+len(old_bg):]
            changed = True
            print(f"  Fixed bg: {old_bg[:40]}...")
            break  # re-scan after each replacement since offsets shift

    if changed:
        content = add_import(content)
        content = add_isdark(content, filename)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Fixed {filename}")
        return True
    return False


def main():
    pages_dir = PAGES_DIR
    fixed = []
    for fname in sorted(os.listdir(pages_dir)):
        if not fname.endswith('.tsx'):
            continue
        filepath = os.path.join(pages_dir, fname)
        print(f"Checking {fname}...")
        if fix_file(filepath):
            fixed.append(fname)

    print(f"\nFixed {len(fixed)} files: {', '.join(fixed)}")


if __name__ == "__main__":
    main()
