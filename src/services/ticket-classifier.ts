import { TicketChannel, TicketPriority } from '@prisma/client';
import { z } from 'zod';

export const ClassificationResultSchema = z.object({
  channel: z.nativeEnum(TicketChannel),
  priority: z.nativeEnum(TicketPriority),
  manualReview: z.boolean()
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const classificationResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['channel', 'priority', 'manualReview'],
  properties: {
    channel: {
      type: 'string',
      enum: ['OUVIDORIA', 'SAC', 'SUPORTE_TECNICO', 'FINANCEIRO', 'FORA_DO_ESCOPO']
    },
    priority: {
      type: 'string',
      enum: ['ALTA', 'MEDIA', 'BAIXA']
    },
    manualReview: {
      type: 'boolean'
    }
  }
} as const;

export interface ITicketClassifier {
  classify(text: string): Promise<ClassificationResult>;
}
