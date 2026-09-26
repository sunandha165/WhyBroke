import path from 'path';

// This resolves correctly whether running from server/src (ts-node/tsx dev
// mode) or server/dist (compiled), since both are two directories below the
// project root where demo-repo lives.
export const DEMO_REPO_PATH = path.resolve(__dirname, '../../demo-repo');

export const DEFAULT_TEST_FILE = 'test/checkout.test.js';
export const DEFAULT_SOURCE_FILES = ['src/checkout.js'];

export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
