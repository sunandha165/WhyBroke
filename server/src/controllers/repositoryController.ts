import { Request, Response } from 'express';
import { GitService } from '../services/git/GitService';
import { RegressionEngine } from '../services/regression/RegressionEngine';
import { DEMO_REPO_PATH, DEFAULT_TEST_FILE, DEFAULT_SOURCE_FILES } from '../config';
import { RepositoryStatus } from '../types';

export async function getRepositoryStatus(req: Request, res: Response) {
  const repoPath = (req.query.repoPath as string) || DEMO_REPO_PATH;

  try {
    const git = new GitService(repoPath);
    const isGitRepository = await git.isGitRepository();

    if (!isGitRepository) {
      const status: RepositoryStatus = {
        repoPath,
        isGitRepository: false,
        commitCount: 0,
        headCommit: null,
        testFile: DEFAULT_TEST_FILE,
        sourceFiles: DEFAULT_SOURCE_FILES,
      };
      return res.json(status);
    }

    const commits = await git.getCommitLogOldestFirst();
    const status: RepositoryStatus = {
      repoPath,
      isGitRepository: true,
      commitCount: commits.length,
      headCommit: commits[commits.length - 1] ?? null,
      testFile: DEFAULT_TEST_FILE,
      sourceFiles: DEFAULT_SOURCE_FILES,
    };
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read repository status.' });
  }
}

export async function runTestAtCommitHandler(req: Request, res: Response) {
  const repoPath: string = req.body?.repoPath || DEMO_REPO_PATH;
  const testFile: string = req.body?.testFile || DEFAULT_TEST_FILE;
  const sourceFiles: string[] = req.body?.sourceFiles || DEFAULT_SOURCE_FILES;
  const commitHash: string | undefined = req.body?.commitHash;

  try {
    const git = new GitService(repoPath);
    const isGitRepository = await git.isGitRepository();
    if (!isGitRepository) {
      return res.status(400).json({ error: `"${repoPath}" is not a Git repository.` });
    }

    const commits = await git.getCommitLogOldestFirst();
    if (!commits.length) {
      return res.status(400).json({ error: 'No commit history found in this repository.' });
    }

    const target = commitHash
      ? commits.find((c) => c.hash.startsWith(commitHash) || c.shortHash === commitHash)
      : commits[commits.length - 1];

    if (!target) {
      return res.status(404).json({ error: `Commit "${commitHash}" was not found in this repository.` });
    }

    const engine = new RegressionEngine(git, testFile, sourceFiles);
    const result = await engine.runTestAtCommit(target);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to run test at commit.' });
  }
}
