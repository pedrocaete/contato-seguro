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

export function createTicketClassificationFailedHandler(ticketService: TicketService) {
  return async (job: Job<TicketClassificationJobData> | undefined, error: Error): Promise<void> => {
    logger.warn(
      {
        action: 'queue_job_failed',
        queue: ticketClassificationQueueName,
        jobId: job?.id,
        ticketId: job?.data.ticketId,
        err: error
      },
      'Ticket classification job failed'
    );

    if (!job || !hasExhaustedAllAttempts(job)) {
      return;
    }

    await ticketService.markClassificationFailureForManualReview(job.data.ticketId);

    logger.warn(
      {
        action: 'queue_job_manual_review_fallback',
        queue: ticketClassificationQueueName,
        jobId: job.id,
        ticketId: job.data.ticketId
      },
      'Ticket moved to manual review after queue retries were exhausted'
    );
  };
}

function hasExhaustedAllAttempts(job: Job<TicketClassificationJobData>): boolean {
  const configuredAttempts = typeof job.opts.attempts === 'number' ? job.opts.attempts : 1;

  return job.attemptsMade >= configuredAttempts;
}
