import { CommitInfo, CodeChange } from '../../types';

export interface ExplanationInput {
  firstBadCommit: CommitInfo;
  lastGoodCommit: CommitInfo;
  changes: CodeChange[];
  testFile: string;
}

/**
 * Turns structured regression evidence into a human-readable explanation.
 *
 * This interface is the extension point for plugging in a real LLM (IBM
 * Bob, Claude, or otherwise) later - the deterministic investigation engine
 * (GitService + RegressionEngine + EvidenceBuilder) never depends on this
 * interface, only the final explanation-text step does. That separation is
 * what lets the entire investigation run and produce a fully evidenced
 * report with zero API keys configured.
 */
export interface LLMProvider {
  name: string;
  generateExplanation(input: ExplanationInput): Promise<string>;
}
