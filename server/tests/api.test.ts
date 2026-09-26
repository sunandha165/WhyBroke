import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

describe('API', () => {
  const app = createApp();

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/repository/status reports the demo repo as a valid git repository', async () => {
    const res = await request(app).get('/api/repository/status');
    expect(res.status).toBe(200);
    expect(res.body.isGitRepository).toBe(true);
    expect(res.body.commitCount).toBeGreaterThanOrEqual(6);
  });

  it('POST /api/run-test at HEAD reports a failing test', async () => {
    const res = await request(app).post('/api/run-test').send({});
    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
  });

  it('POST /api/investigate returns a complete, evidenced regression report', async () => {
    const res = await request(app).post('/api/investigate').send({});
    expect(res.status).toBe(200);
    expect(res.body.firstBadCommit).toBeDefined();
    expect(res.body.firstBadCommit.message).toMatch(/structured order summary/);
    expect(res.body.lastGoodCommit).toBeDefined();
    expect(res.body.evidence.length).toBeGreaterThan(0);
    expect(res.body.rootCause.confidence).toBeDefined();
    expect(res.body.rootCause.explanation).toContain('formatOrder');
    expect(Array.isArray(res.body.timeline)).toBe(true);
    expect(res.body.timeline.length).toBeGreaterThan(0);
  }, 30000);

  it('returns 400 for a repository path that does not exist / is not a git repo', async () => {
    const res = await request(app).post('/api/investigate').send({ repoPath: '/tmp' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a Git repository/);
  });

  it('returns 404 for an unknown route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
