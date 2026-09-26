import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { GitService } from '../git/GitService';
import { CommitInfo, TestRunResult } from '../../types';

const execFileAsync = promisify(execFile);

export interface BisectResult {
  lastGood: CommitInfo;
  firstBad: CommitInfo;
  testRuns: TestRunResult[];
  oldestResult: TestRunResult;
  headResult: TestRunResult;
}

/**
 * Runs a repo's test suite against arbitrary historical commits, and
 * binary-searches commit history to find exactly where a regression was
 * introduced - without ever checking out or mutating the target repo's
 * working tree.
 *
 * For each commit under test, the relevant test file and source files are
 * read via `git show <hash>:<path>` and materialized into a throwaway temp
 * directory, then executed with a plain `node <test file>` invocation. This
 * works because the demo test suite depends only on Node's built-in
 * `assert` module - there is nothing to npm install, so this is fast and
 * works identically at every point in history, even commits from years ago.
 */
export class RegressionEngine {
  constructor(
    private git: GitService,
    private testFilePath: string,
    private sourceFilePaths: string[],
  ) {}

  async runTestAtCommit(commit: CommitInfo): Promise<TestRunResult> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'whybroke-'));
    const start = Date.now();
    try {
      const filesToWrite = [this.testFilePath, ...this.sourceFilePaths];
      for (const relPath of filesToWrite) {
        const content = await this.git.getFileAtCommit(commit.hash, relPath);
        const destPath = path.join(tmpDir, relPath);
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.writeFile(destPath, content, 'utf-8');
      }

      let passed = true;
      let stdout = '';
      let stderr = '';
      try {
        const result = await execFileAsync('node', [this.testFilePath], { cwd: tmpDir });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (err: unknown) {
        passed = false;
        const execErr = err as { stdout?: string; stderr?: string; message?: string };
        stdout = execErr.stdout ?? '';
        stderr = execErr.stderr ?? String(execErr.message ?? err);
      }

      return { commit, passed, stdout, stderr, durationMs: Date.now() - start };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Scans the commit list (oldest first) and returns the index of the first
   * commit where all required files — the test file and every source file —
   * are present in the repository tree. Commits that pre-date the introduction
   * of these files are skipped so that `bisect` never attempts a `git show`
   * that would fail with "path exists on disk, but not in '<hash>'".
   *
   * Returns -1 if no such commit exists (all files are absent throughout).
   */
  async findFirstCommitWithFiles(commits: CommitInfo[]): Promise<number> {
    const requiredFiles = [this.testFilePath, ...this.sourceFilePaths];
    for (let i = 0; i < commits.length; i++) {
      const allPresent = await Promise.all(
        requiredFiles.map((f) => this.git.fileExistsAtCommit(commits[i].hash, f)),
      );
      if (allPresent.every(Boolean)) return i;
    }
    return -1;
  }

  /**
   * Deterministic equivalent of `git bisect`: binary search over the
   * ordered commit list to find the exact boundary between the last commit
   * where the test passed and the first commit where it failed. O(log n)
   * test runs instead of a full linear scan through history.
   *
   * When the supplied test file was introduced later in history (e.g. the
   * repository has many older commits that pre-date the test), bisect first
   * trims the window to start from the earliest commit where both the test
   * file and all source files exist, so that `git show` never fails with a
   * "path not in <hash>" error on commits that simply pre-date the test.
   */
  async bisect(commits: CommitInfo[]): Promise<BisectResult> {
    if (commits.length < 2) {
      throw new Error('Not enough commit history to investigate a regression (need at least 2 commits).');
    }

    const firstIdx = await this.findFirstCommitWithFiles(commits);
    if (firstIdx === -1) {
      throw new Error(
        'The test file and source files could not be found in any commit in this repository\'s history.',
      );
    }
    // Trim the window: ignore all commits that pre-date the test/source files.
    const relevantCommits = commits.slice(firstIdx);

    if (relevantCommits.length < 2) {
      throw new Error(
        'Not enough commit history after the test file was introduced to investigate a regression (need at least 2 commits).',
      );
    }

    let low = 0;
    let high = relevantCommits.length - 1;
    const testRuns: TestRunResult[] = [];

    const oldestResult = await this.runTestAtCommit(relevantCommits[low]);
    testRuns.push(oldestResult);
    if (!oldestResult.passed) {
      throw new Error(
        `The oldest commit in history (${relevantCommits[low].shortHash}) already fails this test, so there is no known-good baseline to bisect from.`,
      );
    }

    const headResult = await this.runTestAtCommit(relevantCommits[high]);
    testRuns.push(headResult);
    if (headResult.passed) {
      throw new Error('The test currently passes at HEAD - no regression was detected in this history.');
    }

    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const result = await this.runTestAtCommit(relevantCommits[mid]);
      testRuns.push(result);
      if (result.passed) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return {
      lastGood: relevantCommits[low],
      firstBad: relevantCommits[high],
      testRuns,
      oldestResult,
      headResult,
    };
  }
}
