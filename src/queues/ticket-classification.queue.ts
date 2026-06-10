import { Queue } from 'bullmq';

import { env } from '../lib/env';
import { createRedisConnectionOptions } from '../lib/redis';
import { TicketClassificationJobData } from './ticket-classification-dispatcher';

export type { TicketClassificationJobData } from './ticket-classification-dispatcher';

export const ticketClassificationQueueName = env.QUEUE_TICKET_CLASSIFICATION_NAME;

export function createTicketClassificationQueue(): Queue<TicketClassificationJobData> {
  return new Queue<TicketClassificationJobData>(ticketClassificationQueueName, {
    connection: createRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  });
}
