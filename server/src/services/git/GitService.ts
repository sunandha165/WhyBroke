import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import { CommitInfo } from '../../types';

/**
 * Thin wrapper around simple-git giving WhyBroke exactly the git operations
 * it needs: checking a repo exists, reading commit history oldest-first,
 * reading a file's content as it existed at a specific commit (without
 * touching the working tree), and diffing two commits.
 */
export class GitService {
  private git: SimpleGit | null = null;

  constructor(private repoPath: string) {}

  private getGit(): SimpleGit {
    if (!this.git) {
      this.git = simpleGit(this.repoPath);
    }
    return this.git;
  }

  async isGitRepository(): Promise<boolean> {
    try {
      return await this.getGit().checkIsRepo();
    } catch {
      return false;
    }
  }

  /**
   * Returns full commit history, oldest commit first. This ordering is what
   * makes binary-search bisection straightforward: index 0 is the earliest
   * known-good baseline, and the last index is HEAD.
   */
  async getCommitLogOldestFirst(): Promise<CommitInfo[]> {
    const log = await this.getGit().raw([
      'log',
      '--reverse',
      '--pretty=format:%H|%h|%an|%ad|%s',
      '--date=iso',
    ]);
    if (!log.trim()) return [];
    return log
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, shortHash, author, date, ...rest] = line.split('|');
        return { hash, shortHash, author, date, message: rest.join('|') };
      });
  }

  /**
   * Reads a file's exact content as it existed at the given commit, using
   * `git show <hash>:<path>`. This never checks out or mutates the working
   * tree, so it is safe to call repeatedly and concurrently.
   */
  async getFileAtCommit(commitHash: string, filePath: string): Promise<string> {
    const normalizedPath = filePath.split(path.sep).join('/');
    return this.getGit().show([`${commitHash}:${normalizedPath}`]);
  }

  /**
   * Returns true if the given file path existed in the repository tree at the
   * given commit. Uses `git show` and treats any error as "not present", so
   * it is safe to call against very old commits that pre-date the file.
   */
  async fileExistsAtCommit(commitHash: string, filePath: string): Promise<boolean> {
    try {
      await this.getFileAtCommit(commitHash, filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getDiff(fromHash: string, toHash: string, filePath?: string): Promise<string> {
    const args = [fromHash, toHash];
    if (filePath) {
      args.push('--', filePath);
    }
    return this.getGit().diff(args);
  }
}

