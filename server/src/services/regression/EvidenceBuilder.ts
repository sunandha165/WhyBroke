import { CodeChange } from '../../types';
import { extractFunctions, extractImportedNames } from '../../utils/extractFunctions';

export interface BuildEvidenceInput {
  sourceFiles: string[];
  goodFileContents: Record<string, string>;
  badFileContents: Record<string, string>;
  testFileContent: string;
}

/**
 * Compares each source file's function bodies at the last-good commit vs
 * the first-bad commit, and returns evidence for every function whose body
 * actually changed.
 *
 * Each `CodeChange` carries a `directlyImported` flag that is `true` when
 * the changed function is explicitly imported by the failing test (via an
 * ES module import statement). Evidence with `directlyImported: true` is
 * sorted first and drives HIGH-confidence root-cause classification.
 */
export function buildEvidence(input: BuildEvidenceInput): CodeChange[] {
  const changes: CodeChange[] = [];

  // Names that the test file explicitly imports — used for confidence scoring
  // and for ranking evidence most-likely-culprit first.
  const importedNames = extractImportedNames(input.testFileContent);

  for (const file of input.sourceFiles) {
    const before = extractFunctions(input.goodFileContents[file] ?? '');
    const after = extractFunctions(input.badFileContents[file] ?? '');
    const allNames = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const name of allNames) {
      const beforeSrc = before[name];
      const afterSrc = after[name];
      if (beforeSrc === afterSrc) continue;

      // A function is "directly imported" if the test imports it by name OR
      // if the test references it by name (covers require/call patterns too).
      const directlyImported =
        importedNames.has(name) || input.testFileContent.includes(name);

      changes.push({
        file,
        functionName: name,
        before: beforeSrc ?? '(function did not exist at the last good commit)',
        after: afterSrc ?? '(function was removed in the first bad commit)',
        diffText: [
          `--- ${file} @ last good commit`,
          beforeSrc ?? '(not present)',
          '',
          `+++ ${file} @ first bad commit`,
          afterSrc ?? '(removed)',
        ].join('\n'),
        directlyImported,
      });
    }
  }

  // Sort: import-related changes first, then any others.
  changes.sort((a, b) => {
    const aScore = a.directlyImported ? 0 : 1;
    const bScore = b.directlyImported ? 0 : 1;
    return aScore - bScore;
  });

  return changes;
}
