import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import router from './routes';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', router);

  // Serve the React/Vite production build
  const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');
  app.use(express.static(clientDistPath));

  // React SPA fallback
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // 404 for unknown API routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: `No route for ${req.method} ${req.path}`,
    });
  });

  // Centralized error handler
  app.use(
    (
      err: Error,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      console.error(err);

      res.status(500).json({
        error: err.message || 'Internal server error',
      });
    },
  );

  return app;
}