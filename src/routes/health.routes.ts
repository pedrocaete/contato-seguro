import { Router } from 'express';

import { prisma } from '../lib/prisma';

export const healthRoutes = Router();

healthRoutes.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: 'ok',
      services: {
        api: 'ok',
        database: 'ok'
      }
    });
  } catch {
    return res.status(503).json({
      status: 'error',
      services: {
        api: 'ok',
        database: 'error'
      }
    });
  }
});
