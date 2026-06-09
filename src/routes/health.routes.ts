import { Router } from 'express';

import { HealthService } from '../services/health.service';

export const healthRoutes = Router();
const healthService = new HealthService();

healthRoutes.get('/health', async (_req, res) => {
  const status = await healthService.getStatus();
  const httpStatus = status.status === 'ok' ? 200 : 503;

  return res.status(httpStatus).json(status);
});
