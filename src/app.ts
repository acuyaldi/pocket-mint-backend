import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { router as apiRouter } from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// --------------- Middleware ---------------
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------- Routes ---------------
app.use('/api', apiRouter);

// --------------- Health Check ---------------
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Error Handler (must be last) ---------------
app.use(errorHandler);

export default app;
