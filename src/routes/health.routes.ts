import { Router } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'ok' });
});
