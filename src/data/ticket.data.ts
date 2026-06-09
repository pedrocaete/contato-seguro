import { TicketChannel, TicketStatus } from '@prisma/client';
import { z } from 'zod';

export const TicketIdParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const CreateTicketSchema = z.object({
  userId: z.number().int().positive(),
  requestText: z.string().trim().min(10).max(5000)
});

export const UpdateTicketStatusSchema = z.object({
  status: z.nativeEnum(TicketStatus)
});

export const ListTicketsQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  channel: z.nativeEnum(TicketChannel).optional()
});

export type CreateTicketData = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketStatusData = z.infer<typeof UpdateTicketStatusSchema>;
export type ListTicketsQueryData = z.infer<typeof ListTicketsQuerySchema>;
