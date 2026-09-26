import { Request, Response } from 'express';
import { GitService } from '../services/git/GitService';
import { RegressionEngine } from '../services/regression/RegressionEngine';
import { buildEvidence } from '../services/regression/EvidenceBuilder';
import { getLLMProvider } from '../services/llm';
import { DEMO_REPO_PATH, DEFAULT_TEST_FILE, DEFAULT_SOURCE_FILES } from '../config';
import { RegressionReport, TimelineStep, Confidence } from '../types';

export async function investigate(req: Request, res: Response) {
  const repoPath: string = req.body?.repoPath || DEMO_REPO_PATH;
  const testFile: string = req.body?.testFile || DEFAULT_TEST_FILE;
  const sourceFiles: string[] = req.body?.sourceFiles || DEFAULT_SOURCE_FILES;

  const timeline: TimelineStep[] = [];

  try {
    const git = new GitService(repoPath);

    const isRepo = await git.isGitRepository();
    if (!isRepo) {
      return res.status(400).json({ error: `"${repoPath}" is not a Git repository.`, timeline });
    }

    const commits = await git.getCommitLogOldestFirst();
    if (commits.length === 0) {
      return res.status(400).json({ error: 'No commit history found in this repository.', timeline });
    }
    timeline.push({
      step: 'Git history analyzed',
      status: 'done',
      detail: `${commits.length} commits found in ${repoPath}`,
    });
    timeline.push({
      step: 'Candidate commits inspected',
      status: 'done',
      detail: `Bisecting between ${commits[0].shortHash} (oldest) and ${commits[commits.length - 1].shortHash} (HEAD)`,
    });

    const engine = new RegressionEngine(git, testFile, sourceFiles);

    let bisectResult;
    try {
      bisectResult = await engine.bisect(commits);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      timeline.push({ step: 'First bad commit identified', status: 'error', detail: message });
      return res.status(422).json({ error: message, timeline });
    }

    timeline.push({ step: 'Test executed', status: 'done', detail: `Ran ${testFile} across ${bisectResult.testRuns.length} candidate commits` });
    timeline.push({ step: 'Failure detected', status: 'done', detail: `HEAD (${bisectResult.headResult.commit.shortHash}) fails; oldest (${bisectResult.oldestResult.commit.shortHash}) passes` });
    timeline.push({
      step: 'First bad commit identified',
      status: 'done',
      detail: `${bisectResult.firstBad.shortHash} - ${bisectResult.firstBad.message}`,
    });

    const [goodFileContents, badFileContents] = await Promise.all([
      readFiles(git, bisectResult.lastGood.hash, sourceFiles),
      readFiles(git, bisectResult.firstBad.hash, sourceFiles),
    ]);
    const failingTestContent = await git.getFileAtCommit(bisectResult.firstBad.hash, testFile);

    timeline.push({
      step: 'Code diff analyzed',
      status: 'done',
      detail: `Compared ${bisectResult.lastGood.shortHash} -> ${bisectResult.firstBad.shortHash}`,
    });

    const evidence = buildEvidence({
      sourceFiles,
      goodFileContents,
      badFileContents,
      testFileContent: failingTestContent,
    });

    const directMatch = evidence.find((e) => e.directlyImported);
    const relationshipDetail = directMatch
      ? `\`${directMatch.functionName}()\` in \`${directMatch.file}\` is imported by the failing test and changed in commit ${bisectResult.firstBad.shortHash}`
      : evidence.length
        ? `${evidence.length} changed function(s) detected; no direct import relationship confirmed — inspect the full diff`
        : 'No function-level changes detected; inspect the full diff';

    timeline.push({
      step: 'Test relationship analyzed',
      status: 'done',
      detail: relationshipDetail,
    });

    const llm = getLLMProvider();
    const explanation = await llm.generateExplanation({
      firstBadCommit: bisectResult.firstBad,
      lastGoodCommit: bisectResult.lastGood,
      changes: evidence,
      testFile,
    });

    // HIGH:   the primary changed function is directly imported/called by the test
    // MEDIUM: there is evidence but no confirmed import relationship
    // LOW:    no changed functions were found at all
    const confidence: Confidence = directMatch ? 'High' : evidence.length > 0 ? 'Medium' : 'Low';

    const suggestedFix = evidence.length
      ? `Either revert \`${evidence[0].functionName}()\` in \`${evidence[0].file}\` to its previous behavior, or update \`${testFile}\` to expect the new behavior if this change was intentional.`
      : `Review the full diff at commit ${bisectResult.firstBad.shortHash} to determine the appropriate fix.`;

    timeline.push({
      step: 'Root cause generated',
      status: 'done',
      detail: explanation.length > 140 ? explanation.slice(0, 140) + '...' : explanation,
    });

    const report: RegressionReport = {
      testFile,
      sourceFiles,
      initialStatus: bisectResult.oldestResult.passed ? 'passed' : 'failed',
      finalStatus: bisectResult.headResult.passed ? 'passed' : 'failed',
      commitsAnalyzed: commits.length,
      testRunsExecuted: bisectResult.testRuns.length,
      lastGoodCommit: bisectResult.lastGood,
      firstBadCommit: bisectResult.firstBad,
      evidence,
      rootCause: {
        commit: bisectResult.firstBad,
        changes: evidence,
        explanation,
        confidence,
        suggestedFix,
      },
      timeline,
    };

    res.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error during investigation.';
    res.status(500).json({ error: message, timeline });
  }
}

async function readFiles(git: GitService, commitHash: string, files: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    files.map(async (file) => [file, await git.getFileAtCommit(commitHash, file)] as const),
  );
  return Object.fromEntries(entries);
}
