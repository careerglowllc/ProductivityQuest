#!/usr/bin/env python3
"""Fix the broken className template literals caused by the bad regex in fix-template-literals.py"""

import os

PAGES_DIR = "client/src/pages"

# Each tuple: (filename, broken_string, correct_string)
FIXES = [
    (
        "skills.tsx",
        'className={`min-h-screen ${isDark ? `}bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} flex items-center justify-center">',
        'className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} flex items-center justify-center`}>',
    ),
    (
        "settings.tsx",
        'className={`flex items-center justify-center min-h-screen ${isDark ? `}bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"}">',
        'className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"}`}>',
    ),
    (
        "recycling-bin.tsx",
        'className={`min-h-screen ${isDark ? `}bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" : "bg-gray-50"} p-4">',
        'className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" : "bg-gray-50"} p-4`}>',
    ),
    (
        "settings-finances.tsx",
        'className={`min-h-screen ${isDark ? `}bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} pb-24">',
        'className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} pb-24`}>',
    ),
    (
        "getting-started.tsx",
        'className={`min-h-screen ${isDark ? `}bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} py-12 px-4">',
        'className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} py-12 px-4`}>',
    ),
    (
        "google-calendar.tsx",
        'className={`min-h-screen ${isDark ? `}bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} flex items-center justify-center pb-20">',
        'className={`min-h-screen ${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"} flex items-center justify-center pb-20`}>',
    ),
    (
        "google-calendar-integration.tsx",
        'className={`min-h-screen ${isDark ? `}bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gray-50"} flex items-center justify-center pb-20">',
        'className={`min-h-screen ${isDark ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gray-50"} flex items-center justify-center pb-20`}>',
    ),
]

def main():
    for fname, broken, correct in FIXES:
        fpath = os.path.join(PAGES_DIR, fname)
        with open(fpath, 'r') as f:
            content = f.read()
        if broken in content:
            content = content.replace(broken, correct)
            with open(fpath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed {fname}")
        else:
            print(f"  NOT FOUND in {fname} — checking...")
            # Print surrounding context to debug
            idx = content.find('isDark ? `}')
            if idx != -1:
                print(f"  Context: {repr(content[idx-50:idx+100])}")

if __name__ == "__main__":
    main()
