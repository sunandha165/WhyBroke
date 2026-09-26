import { LLMProvider, ExplanationInput } from './LLMProvider';

/**
 * Template-based explanation generator. Deliberately has zero external
 * dependencies and zero network calls, so `npm run dev` produces a complete,
 * evidenced regression report immediately after `npm install` - no API key
 * setup required for the investigation to work end to end.
 */
export class MockLLMProvider implements LLMProvider {
  name = 'mock-deterministic';

  async generateExplanation(input: ExplanationInput): Promise<string> {
    const primary = input.changes[0];

    if (!primary) {
      return (
        `The test began failing at commit ${input.firstBadCommit.shortHash} ` +
        `("${input.firstBadCommit.message}"), but no single function-level ` +
        `change could be automatically isolated from the diff. Review the ` +
        `full commit diff for more detail.`
      );
    }

    const sentences = [
      `The regression was introduced in commit ${input.firstBadCommit.shortHash} ` +
        `("${input.firstBadCommit.message}") by ${input.firstBadCommit.author}.`,
      `The function \`${primary.functionName}()\` in \`${primary.file}\` changed ` +
        `between that commit and the previous passing commit ` +
        `${input.lastGoodCommit.shortHash} ("${input.lastGoodCommit.message}").`,
      `The test suite in \`${input.testFile}\` still exercises the old behavior ` +
        `of \`${primary.functionName}()\`, which is why it fails at this commit ` +
        `and every commit after it.`,
    ];

    if (input.changes.length > 1) {
      sentences.push(
        `${input.changes.length - 1} additional changed function(s) were also ` +
          `detected in the same commit and are included in the evidence below.`,
      );
    }

    return sentences.join(' ');
  }
}
