import 'express-async-errors';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './lib/env';
import { logger } from './lib/logger';
import { errorHandler } from './middlewares/error-handler';
import { routes } from './routes';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health'
    },
    customLogLevel: (_, res, error) => {
      if (error || res.statusCode >= 500) {
        return 'error';
      }

      if (res.statusCode >= 400) {
        return 'warn';
      }

      return env.NODE_ENV === 'production' ? 'silent' : env.LOG_LEVEL;
    }
  })
);

app.use(routes);
app.use(errorHandler);
