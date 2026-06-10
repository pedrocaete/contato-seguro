import { AppError } from '../../src/lib/app-error';
import { createTicketClassificationWorkerHandler } from '../../src/workers/ticket-classification.worker-handler';

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
});
