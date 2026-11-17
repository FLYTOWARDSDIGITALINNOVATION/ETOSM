const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'build' && file !== 'dist') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '..', 'frontend', 'src'));
console.log(`Found ${files.length} JSX files to audit.`);

let totalIssues = 0;

files.forEach(filePath => {
  const code = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);

  // Find all imported identifiers
  const importedIdentifiers = new Set();
  const declaredIdentifiers = new Set();

  // Match import statements
  // e.g. import { A, B as C } from '...';
  const importNamedRegex = /import\s*\{([^}]+)\}\s*from/g;
  let match;
  while ((match = importNamedRegex.exec(code)) !== null) {
    const parts = match[1].split(',');
    parts.forEach(p => {
      const trimmed = p.trim();
      if (!trimmed) return;
      if (trimmed.includes(' as ')) {
        importedIdentifiers.add(trimmed.split(' as ')[1].trim());
      } else {
        importedIdentifiers.add(trimmed);
      }
    });
  }

  // Match default imports: import X from '...';
  const importDefaultRegex = /import\s+([a-zA-Z0-9_$]+)\s+from/g;
  while ((match = importDefaultRegex.exec(code)) !== null) {
    importedIdentifiers.add(match[1]);
  }

  // Match local declarations: const X = ..., function X(..., class X
  const declRegex = /(?:const|let|var|function|class)\s+([a-zA-Z0-9_$]+)/g;
  while ((match = declRegex.exec(code)) !== null) {
    declaredIdentifiers.add(match[1]);
  }

  // Match JSX tags: <Tag or <Tag.Sub
  const jsxTagRegex = /<([A-Z][a-zA-Z0-9_$]*)(?:[\s/>])/g;
  const tagsUsed = new Set();
  while ((match = jsxTagRegex.exec(code)) !== null) {
    tagsUsed.add(match[1]);
  }

  // Common globals or React builtins
  const knownGlobals = new Set(['React', 'Fragment']);

  const missing = [];
  tagsUsed.forEach(tag => {
    if (!importedIdentifiers.has(tag) && !declaredIdentifiers.has(tag) && !knownGlobals.has(tag)) {
      missing.push(tag);
    }
  });

  if (missing.length > 0) {
    console.error(`[CRITICAL] Missing JSX identifier in ${relPath}:`, missing.join(', '));
    totalIssues += missing.length;
  }
});

console.log(`\nAudit completed: ${totalIssues} missing JSX tags found across all files.`);
