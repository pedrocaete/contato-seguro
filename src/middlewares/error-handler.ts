import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../lib/app-error';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message
    });
  }

  logger.error({ err: error }, 'Unhandled application error');

  return res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV !== 'production' && error instanceof Error ? { details: error.message } : {})
  });
};
