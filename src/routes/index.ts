import { Router } from 'express';

import { healthRoutes } from './health.routes';
import { ticketRoutes } from './ticket.routes';
import { userRoutes } from './user.routes';

export const routes = Router();

routes.use(healthRoutes);
routes.use(ticketRoutes);
routes.use(userRoutes);
