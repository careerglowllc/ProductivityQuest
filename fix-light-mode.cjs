const fs = require('fs');

const pages = [
  'client/src/pages/skills.tsx',
  'client/src/pages/shop.tsx',
  'client/src/pages/settings.tsx',
  'client/src/pages/profile.tsx',
  'client/src/pages/npcs.tsx',
  'client/src/pages/recycling-bin.tsx',
  'client/src/pages/settings-finances.tsx',
  'client/src/pages/settings-calendar.tsx',
  'client/src/pages/settings-guides.tsx',
  'client/src/pages/settings-guides-measure-what-matters.tsx',
  'client/src/pages/settings-guides-skill-classification.tsx',
  'client/src/pages/settings-timezone.tsx',
  'client/src/pages/google-calendar.tsx',
  'client/src/pages/google-calendar-integration.tsx',
  'client/src/pages/landing.tsx',
  'client/src/pages/getting-started.tsx',
];

const IMPORT_LINE = `import { useTheme } from "@/contexts/theme-context";`;

const BG_PATTERNS = [
  {
    from: /bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950/g,
    to: '${isDark ? "bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950" : "bg-gray-50"}',
  },
  {
    from: /bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950/g,
    to: '${isDark ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" : "bg-gray-50"}',
  },
  {
    from: /bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900/g,
    to: '${isDark ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" : "bg-gray-50"}',
  },
];

let count = 0;
for (const p of pages) {
  if (!fs.existsSync(p)) { console.log('SKIP (not found):', p); continue; }
  let src = fs.readFileSync(p, 'utf8');
  const orig = src;

  // 1. Add import if missing
  if (!src.includes('useTheme') && !src.includes('theme-context')) {
    // Try inserting after a hook import line
    const hookMatch = src.match(/import \{[^}]+\} from "@\/hooks\/(use-mobile|use-toast|useAuth)";/);
    if (hookMatch) {
      src = src.replace(hookMatch[0], hookMatch[0] + '\n' + IMPORT_LINE);
    } else {
      // Insert after last import
      const lastImportIdx = src.lastIndexOf('\nimport ');
      if (lastImportIdx >= 0) {
        const eol = src.indexOf('\n', lastImportIdx + 1);
        src = src.slice(0, eol + 1) + IMPORT_LINE + '\n' + src.slice(eol + 1);
      }
    }
  }

  // 2. Add isDark after useIsMobile() if not already present
  if (!src.includes('isDark')) {
    if (src.includes('const isMobile = useIsMobile();')) {
      src = src.replace(
        'const isMobile = useIsMobile();',
        'const isMobile = useIsMobile();\n  const { isDark } = useTheme();'
      );
    } else if (src.includes('const { toast } = useToast();')) {
      src = src.replace(
        'const { toast } = useToast();',
        'const { toast } = useToast();\n  const { isDark } = useTheme();'
      );
    } else {
      // Last resort: insert at start of function body
      src = src.replace(
        /export default function \w+\([^)]*\) \{\n(\s+)/,
        (m, indent) => m + `const { isDark } = useTheme();\n${indent}`
      );
    }
  }

  // 3. Replace dark bg gradient patterns
  for (const { from, to } of BG_PATTERNS) {
    src = src.replace(from, to);
  }

  if (src !== orig) {
    fs.writeFileSync(p, src);
    console.log('UPDATED:', p);
    count++;
  } else {
    console.log('NO CHANGE:', p);
  }
}
console.log(`\nDone. Updated ${count} files.`);
