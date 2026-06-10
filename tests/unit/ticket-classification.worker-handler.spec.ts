import { AppError } from '../../src/lib/app-error';
import {
  createTicketClassificationFailedHandler,
  createTicketClassificationWorkerHandler
} from '../../src/workers/ticket-classification.worker-handler';

describe('ticket classification worker handler', () => {
  it('processes a queued ticket classification job', async () => {
    const ticketService = {
      processClassification: jest.fn().mockResolvedValue(undefined)
    };
    const handler = createTicketClassificationWorkerHandler(ticketService as never);

    await expect(
      handler({
        id: '1',
        data: {
          ticketId: 42
        }
      } as never)
    ).resolves.toBeUndefined();

    expect(ticketService.processClassification).toHaveBeenCalledWith(42);
  });

  it('ignores jobs for tickets that no longer exist', async () => {
    const ticketService = {
      processClassification: jest.fn().mockRejectedValue(new AppError('Ticket not found', 404))
    };
    const handler = createTicketClassificationWorkerHandler(ticketService as never);

    await expect(
      handler({
        id: '1',
        data: {
          ticketId: 42
        }
      } as never)
    ).resolves.toBeUndefined();
  });

  it('rethrows unexpected worker errors so BullMQ can retry', async () => {
    const ticketService = {
      processClassification: jest.fn().mockRejectedValue(new Error('Gemini unavailable'))
    };
    const handler = createTicketClassificationWorkerHandler(ticketService as never);

    await expect(
      handler({
        id: '1',
        data: {
          ticketId: 42
        }
      } as never)
    ).rejects.toThrow('Gemini unavailable');
  });

  it('marks the ticket for manual review when the queue exhausts all retry attempts', async () => {
    const ticketService = {
      markClassificationFailureForManualReview: jest.fn().mockResolvedValue(undefined)
    };
    const failedHandler = createTicketClassificationFailedHandler(ticketService as never);

    await expect(
      failedHandler(
        {
          id: '1',
          attemptsMade: 3,
          data: {
            ticketId: 42
          },
          opts: {
            attempts: 3
          }
        } as never,
        new Error('Gemini unavailable')
      )
    ).resolves.toBeUndefined();

    expect(ticketService.markClassificationFailureForManualReview).toHaveBeenCalledWith(42);
  });

  it('does not mark manual review while the queue still has retry attempts left', async () => {
    const ticketService = {
      markClassificationFailureForManualReview: jest.fn().mockResolvedValue(undefined)
    };
    const failedHandler = createTicketClassificationFailedHandler(ticketService as never);

    await expect(
      failedHandler(
        {
          id: '1',
          attemptsMade: 1,
          data: {
            ticketId: 42
          },
          opts: {
            attempts: 3
          }
        } as never,
        new Error('Gemini unavailable')
      )
    ).resolves.toBeUndefined();

    expect(ticketService.markClassificationFailureForManualReview).not.toHaveBeenCalled();
  });
});
