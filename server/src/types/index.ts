export interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface TestRunResult {
  commit: CommitInfo;
  passed: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface CodeChange {
  file: string;
  functionName: string | null;
  before: string;
  after: string;
  diffText: string;
  /** True when the changed function is directly imported by the failing test. */
  directlyImported?: boolean;
}

export type Confidence = 'High' | 'Medium' | 'Low';

export interface RootCause {
  commit: CommitInfo;
  changes: CodeChange[];
  explanation: string;
  confidence: Confidence;
  suggestedFix: string;
}

export interface TimelineStep {
  step: string;
  status: 'done' | 'error';
  detail: string;
}

export interface RegressionReport {
  testFile: string;
  sourceFiles: string[];
  initialStatus: 'passed' | 'failed';
  finalStatus: 'passed' | 'failed';
  commitsAnalyzed: number;
  testRunsExecuted: number;
  lastGoodCommit: CommitInfo;
  firstBadCommit: CommitInfo;
  evidence: CodeChange[];
  rootCause: RootCause;
  timeline: TimelineStep[];
}

export interface RepositoryStatus {
  repoPath: string;
  isGitRepository: boolean;
  commitCount: number;
  headCommit: CommitInfo | null;
  testFile: string;
  sourceFiles: string[];
}
