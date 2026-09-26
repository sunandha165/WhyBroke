import { Router } from 'express';
import { investigate } from '../controllers/investigationController';
import { getRepositoryStatus, runTestAtCommitHandler } from '../controllers/repositoryController';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'whybroke-server' });
});

router.get('/repository/status', getRepositoryStatus);
router.post('/run-test', runTestAtCommitHandler);
router.post('/investigate', investigate);

export default router;
