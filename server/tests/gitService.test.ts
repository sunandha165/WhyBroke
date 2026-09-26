import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { GitService } from '../src/services/git/GitService';

const DEMO_REPO = path.resolve(__dirname, '../../demo-repo');

describe('GitService', () => {
  it('detects the demo repository as a valid git repository', async () => {
    const git = new GitService(DEMO_REPO);
    expect(await git.isGitRepository()).toBe(true);
  });

  it('reports false for a directory that is not a git repository', async () => {
    const git = new GitService(os.tmpdir());
    expect(await git.isGitRepository()).toBe(false);
  });

  it('returns full commit history oldest-first', async () => {
    const git = new GitService(DEMO_REPO);
    const commits = await git.getCommitLogOldestFirst();
    expect(commits.length).toBeGreaterThanOrEqual(6);
    expect(commits[0].message).toMatch(/Initial checkout module/);
    expect(commits[commits.length - 1].message).toMatch(/validateOrder/);
  });

  it('reads a file exactly as it existed at a given commit', async () => {
    const git = new GitService(DEMO_REPO);
    const commits = await git.getCommitLogOldestFirst();
    const firstCommitContent = await git.getFileAtCommit(commits[0].hash, 'src/checkout.js');
    expect(firstCommitContent).toContain('function formatOrder');
    expect(firstCommitContent).not.toContain('validateOrder');
  });

  it('produces a diff between two commits for a given file', async () => {
    const git = new GitService(DEMO_REPO);
    const commits = await git.getCommitLogOldestFirst();
    const diff = await git.getDiff(commits[0].hash, commits[commits.length - 1].hash, 'src/checkout.js');
    expect(diff.length).toBeGreaterThan(0);
    expect(diff).toContain('formatOrder');
  });

  it('fileExistsAtCommit returns true for a file that exists at a commit', async () => {
    const git = new GitService(DEMO_REPO);
    const commits = await git.getCommitLogOldestFirst();
    // src/checkout.js exists from the very first commit
    expect(await git.fileExistsAtCommit(commits[0].hash, 'src/checkout.js')).toBe(true);
  });

  it('fileExistsAtCommit returns false for a file that does not exist at a commit', async () => {
    const git = new GitService(DEMO_REPO);
    const commits = await git.getCommitLogOldestFirst();
    // nonexistent.js never existed in any commit
    expect(await git.fileExistsAtCommit(commits[0].hash, 'nonexistent.js')).toBe(false);
  });
});
