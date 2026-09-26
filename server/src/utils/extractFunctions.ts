/**
 * Extracts named function-like declarations from a source file's text,
 * keyed by function name, including their full body. Supports:
 *
 *   - `function name(...) { ... }`
 *   - `const/let/var name = (...) => { ... }`  (arrow functions)
 *   - `export const/let/var name = (...) => { ... }`
 *   - `export function name(...) { ... }`
 *
 * This is a deliberately simple brace-counting scanner rather than a full
 * JS parser (no AST dependency needed for the hackathon demo scope), and it
 * is sufficient for comparing "before" vs "after" versions of named
 * functions between two commits.
 */
export function extractFunctions(source: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Pattern 1: (export) function name(
  const fnRegex = /(?:export\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
  // Pattern 2: (export) const/let/var name = (...)=> or name = function(
  const arrowRegex =
    /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>|function\s*\()/g;

  for (const regex of [fnRegex, arrowRegex]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const name = match[1];
      if (result[name]) continue; // already captured by an earlier pattern

      const braceStart = source.indexOf('{', match.index);
      if (braceStart === -1) continue;

      let depth = 0;
      let i = braceStart;
      for (; i < source.length; i++) {
        if (source[i] === '{') depth++;
        else if (source[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }

      result[name] = source.slice(match.index, i).trim();
    }
  }

  return result;
}

/**
 * Parses a test/source file for ES module import statements and returns the
 * set of all locally bound names that were imported. Covers:
 *
 *   import { foo, bar as baz } from '...'   → { foo, baz }
 *   import defaultExport from '...'         → { defaultExport }
 *   import defaultExport, { foo } from '...'
 *
 * This is used to determine whether a changed source function is directly
 * exercised by the failing test, which drives HIGH-confidence root-cause
 * classification.
 */
export function extractImportedNames(source: string): Set<string> {
  const names = new Set<string>();

  // Match each import statement: import <specifiers> from '...'
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(source)) !== null) {
    const specifiers = match[1].trim();

    // Default import (possibly followed by named imports):  foo  or  foo, { bar }
    const defaultMatch = specifiers.match(/^([a-zA-Z0-9_$]+)(?:\s*,|$)/);
    if (defaultMatch && !defaultMatch[1].startsWith('{')) {
      names.add(defaultMatch[1]);
    }

    // Named imports: { foo, bar as baz }
    const namedBlock = specifiers.match(/\{([^}]+)\}/);
    if (namedBlock) {
      for (const part of namedBlock[1].split(',')) {
        const trimmed = part.trim();
        // Handle `originalName as localName`
        const asMatch = trimmed.match(/\S+\s+as\s+([a-zA-Z0-9_$]+)/);
        if (asMatch) {
          names.add(asMatch[1]);
        } else if (trimmed) {
          names.add(trimmed);
        }
      }
    }
  }

  return names;
}
