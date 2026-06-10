import { Job } from 'bullmq';

import { AppError } from '../lib/app-error';
import { logger } from '../lib/logger';
import { TicketClassificationJobData, ticketClassificationQueueName } from '../queues/ticket-classification.queue';
import { TicketService } from '../services/ticket.service';

export function createTicketClassificationWorkerHandler(ticketService: TicketService) {
  return async (job: Job<TicketClassificationJobData>): Promise<void> => {
    try {
      await ticketService.processClassification(job.data.ticketId);

      logger.info(
        {
          action: 'process_ticket_classification_job',
          queue: ticketClassificationQueueName,
          jobId: job.id,
          ticketId: job.data.ticketId
        },
        'Ticket classification job processed'
      );
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        logger.warn(
          {
            action: 'process_ticket_classification_job',
            queue: ticketClassificationQueueName,
            jobId: job.id,
            ticketId: job.data.ticketId
          },
          'Ticket classification job skipped because ticket was not found'
        );

        return;
      }

      throw error;
    }
  };
}
