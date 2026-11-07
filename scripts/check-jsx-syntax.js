#!/usr/bin/env node

/**
 * JSX / TSX Syntax & Orphan Tag Validator
 * Parses all .tsx and .jsx files under src/ using TypeScript's AST parser.
 * Intercepts unclosed tags, mismatched tags, and syntax errors before compilation.
 */

const fs = require('fs');
const path = require('path');

let ts;
try {
  ts = require('typescript');
} catch (e) {
  console.warn('[jsx-validator] TypeScript package not found, skipping syntax check.');
  process.exit(0);
}

function getFiles(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.next' || file === '.git') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(fullPath));
      } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`[jsx-validator] Error reading directory ${dir}:`, err.message);
  }
  return results;
}

const targetDir = path.join(__dirname, '..', 'src');
if (!fs.existsSync(targetDir)) {
  process.exit(0);
}

const files = getFiles(targetDir);
let totalErrors = 0;

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
    );
    const diags = sourceFile.parseDiagnostics || [];
    if (diags.length > 0) {
      totalErrors += diags.length;
      console.error(`\n[jsx-validator] Syntax error in ${path.relative(process.cwd(), file)}:`);
      for (const diag of diags) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start || 0);
        const msg = typeof diag.messageText === 'string' ? diag.messageText : diag.messageText.messageText;
        console.error(`  -> Line ${line + 1}:${character + 1} - ${msg}`);
      }
    }
  } catch (err) {
    console.error(`[jsx-validator] Failed to read ${file}:`, err.message);
    totalErrors++;
  }
}

if (totalErrors > 0) {
  console.error(`\n[jsx-validator] FAILED: ${totalErrors} JSX/TSX syntax error(s) detected. Fix orphan or unclosed tags before building.`);
  process.exit(1);
} else {
  console.log(`[jsx-validator] OK: Verified ${files.length} JSX/TSX files without syntax errors.`);
}
