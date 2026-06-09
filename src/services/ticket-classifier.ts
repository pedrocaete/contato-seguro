import { TicketChannel, TicketPriority } from '@prisma/client';

export type ClassificationResult = {
  channel: TicketChannel;
  priority: TicketPriority;
  manualReview: boolean;
};

export interface ITicketClassifier {
  classify(text: string): Promise<ClassificationResult>;
}
