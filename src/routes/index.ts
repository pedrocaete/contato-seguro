import { Router } from 'express';

import { healthRoutes } from './health.routes';
import { userRoutes } from './user.routes';

export const routes = Router();

routes.use(healthRoutes);
routes.use(userRoutes);
