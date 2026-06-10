import { Queue } from 'bullmq';

import { createTicketClassificationQueue } from './ticket-classification.queue';

export type TicketClassificationJobData = {
  ticketId: number;
};

export interface ITicketClassificationDispatcher {
  enqueue(ticketId: number): Promise<void>;
}

export class BullMQTicketClassificationDispatcher implements ITicketClassificationDispatcher {
  private queue?: Queue<TicketClassificationJobData>;

  constructor(private readonly queueFactory: () => Queue<TicketClassificationJobData> = createTicketClassificationQueue) {}

  async enqueue(ticketId: number): Promise<void> {
    await this.getQueue().add('classify-ticket', { ticketId });
  }

  private getQueue(): Queue<TicketClassificationJobData> {
    if (!this.queue) {
      this.queue = this.queueFactory();
    }

    return this.queue;
  }
}

export class NoopTicketClassificationDispatcher implements ITicketClassificationDispatcher {
  async enqueue(): Promise<void> {
    return Promise.resolve();
  }
}

export function createTicketClassificationDispatcher(): ITicketClassificationDispatcher {
  return new BullMQTicketClassificationDispatcher();
}
