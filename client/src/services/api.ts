import type { RegressionReport, RepositoryStatus } from '../types';

const BASE = '/api';

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.error || `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export async function fetchRepositoryStatus(): Promise<RepositoryStatus> {
  const res = await fetch(`${BASE}/repository/status`);
  if (!res.ok) throw new Error(await parseErrorBody(res));
  return res.json();
}

export interface InvestigateParams {
  repoPath: string;
  testFile: string;
  sourceFiles: string[];
}

export async function runInvestigation(params?: InvestigateParams): Promise<RegressionReport> {
  const res = await fetch(`${BASE}/investigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params ?? {}),
  });
  if (!res.ok) throw new Error(await parseErrorBody(res));
  return res.json();
}
