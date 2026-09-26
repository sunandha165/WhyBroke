import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import router from './routes';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', router);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
  });

  // Centralized error handler - keeps controllers free of repetitive
  // try/catch-then-500 boilerplate for anything unexpected.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
