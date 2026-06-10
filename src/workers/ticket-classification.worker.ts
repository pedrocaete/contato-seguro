import { Worker } from 'bullmq';

import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { createRedisConnectionOptions } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { TicketClassificationJobData, ticketClassificationQueueName } from '../queues/ticket-classification.queue';
import { createTicketClassifier } from '../services/create-ticket-classifier';
import { TicketService } from '../services/ticket.service';
import { createTicketClassificationWorkerHandler } from './ticket-classification.worker-handler';

const ticketService = new TicketService(prisma, createTicketClassifier());

const worker = new Worker<TicketClassificationJobData>(
  ticketClassificationQueueName,
  createTicketClassificationWorkerHandler(ticketService),
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
