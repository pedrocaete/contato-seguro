import { Queue } from 'bullmq';

import { env } from '../lib/env';
import { createRedisConnectionOptions } from '../lib/redis';

export const ticketClassificationQueueName = env.QUEUE_TICKET_CLASSIFICATION_NAME;

export type TicketClassificationJobData = {
  ticketId: number;
};

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
