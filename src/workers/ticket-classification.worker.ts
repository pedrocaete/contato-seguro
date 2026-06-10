import { Worker } from 'bullmq';

import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { createRedisConnectionOptions } from '../lib/redis';
import { TicketClassificationJobData, ticketClassificationQueueName } from '../queues/ticket-classification.queue';

const worker = new Worker<TicketClassificationJobData>(
  ticketClassificationQueueName,
  async (job) => {
    logger.warn(
      {
        action: 'process_ticket_classification_job',
        queue: ticketClassificationQueueName,
        jobId: job.id,
        ticketId: job.data.ticketId
      },
      'Ticket classification worker scaffold is active, but processing is not implemented yet'
    );

    throw new Error('Ticket classification worker phase 1 scaffold only');
  },
  {
    connection: createRedisConnectionOptions()
  }
);

worker.on('ready', () => {
  logger.info(
    {
      action: 'queue_worker_ready',
      queue: ticketClassificationQueueName,
      provider: env.TICKET_CLASSIFIER_PROVIDER
    },
    'Ticket classification worker started'
  );
});

worker.on('failed', (job, error) => {
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
});

function shutdown(signal: string): void {
  logger.info(
    {
      action: 'queue_worker_shutdown',
      queue: ticketClassificationQueueName,
      signal
    },
    'Stopping ticket classification worker'
  );

  worker
    .close()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(
        {
          action: 'queue_worker_shutdown',
          queue: ticketClassificationQueueName,
          err: error
        },
        'Failed to stop ticket classification worker cleanly'
      );

      process.exit(1);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
