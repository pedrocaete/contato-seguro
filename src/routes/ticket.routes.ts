import { Router } from 'express';

import {
  CreateTicketSchema,
  ListTicketsQuerySchema,
  TicketIdParamsSchema,
  UpdateTicketStatusSchema
} from '../data/ticket.data';
import { TicketController } from '../controllers/ticket.controller';
import { validate } from '../middlewares/validate';
import { createTicketClassificationDispatcher } from '../queues/ticket-classification-dispatcher';
import { TicketService } from '../services/ticket.service';

const ticketService = new TicketService(undefined, undefined, createTicketClassificationDispatcher());
const ticketController = new TicketController(ticketService);

export const ticketRoutes = Router();

ticketRoutes.post(
  '/tickets',
  validate({ body: CreateTicketSchema }),
  ticketController.create.bind(ticketController)
);
ticketRoutes.get(
  '/tickets',
  validate({ query: ListTicketsQuerySchema }),
  ticketController.index.bind(ticketController)
);
ticketRoutes.get(
  '/tickets/:id',
  validate({ params: TicketIdParamsSchema }),
  ticketController.show.bind(ticketController)
);
ticketRoutes.put(
  '/tickets/:id/status',
  validate({ params: TicketIdParamsSchema, body: UpdateTicketStatusSchema }),
  ticketController.updateStatus.bind(ticketController)
);
