import { TicketChannel, TicketPriority } from '@prisma/client';
import { z } from 'zod';

export const ClassificationResultSchema = z.object({
  channel: z.nativeEnum(TicketChannel),
  priority: z.nativeEnum(TicketPriority),
  manualReview: z.boolean(),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.nativeEnum(TicketChannel))
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const classificationResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['channel', 'priority', 'manualReview', 'confidence', 'alternatives'],
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
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    alternatives: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['OUVIDORIA', 'SAC', 'SUPORTE_TECNICO', 'FINANCEIRO', 'FORA_DO_ESCOPO']
      }
    }
  }
} as const;

export const classificationConfidenceThreshold = 0.75;

export interface ITicketClassifier {
  classify(text: string): Promise<ClassificationResult>;
}
