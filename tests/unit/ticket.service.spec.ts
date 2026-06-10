import { Ticket, TicketChannel, TicketPriority, TicketStatus, User } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

import { AppError } from '../../src/lib/app-error';
import { ITicketClassificationDispatcher } from '../../src/queues/ticket-classification-dispatcher';
import { ITicketClassifier } from '../../src/services/ticket-classifier';
import { TicketService } from '../../src/services/ticket.service';

describe('TicketService', () => {
  const prismaMock = mockDeep<PrismaClient>();
  const dispatcherMock: jest.Mocked<ITicketClassificationDispatcher> = {
    enqueue: jest.fn()
  };
  const classifierMock: jest.Mocked<ITicketClassifier> = {
    classify: jest.fn()
  };
  const service = new TicketService(prismaMock, classifierMock, dispatcherMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a ticket pending classification and enqueues a job', async () => {
    const ticket = createPendingTicket();

    prismaMock.user.findUnique.mockResolvedValue(createUser());
    prismaMock.ticket.create.mockResolvedValue(ticket);

    const result = await service.create({
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.'
    });

    expect(classifierMock.classify).not.toHaveBeenCalled();
    expect(prismaMock.ticket.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
        status: 'EM_ANALISE',
        channel: null,
        priority: null,
        manualReview: false,
        classificationConfidence: null,
        classificationAlternatives: []
      }
    });
    expect(dispatcherMock.enqueue).toHaveBeenCalledWith(1);
    expect(result).toEqual(ticket);
  });

  it('processes ticket classification and opens the ticket when no manual review is needed', async () => {
    const ticket = createClassifiedTicket();

    prismaMock.ticket.findUnique.mockResolvedValue(createPendingTicket());
    classifierMock.classify.mockResolvedValue({
      channel: 'SAC',
      priority: 'MEDIA',
      manualReview: false,
      confidence: 0.86,
      alternatives: []
    });
    prismaMock.ticket.update.mockResolvedValue(ticket);

    const result = await service.processClassification(1);

    expect(classifierMock.classify).toHaveBeenCalledWith(
      'Meu produto nao chegou e quero cancelar a assinatura.'
    );
    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        channel: 'SAC',
        priority: 'MEDIA',
        manualReview: false,
        classificationConfidence: 0.86,
        classificationAlternatives: [],
        status: 'ABERTO'
      }
    });
    expect(result).toEqual(ticket);
  });

  it('keeps the ticket in analysis when manual review is required after classification', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(createPendingTicket());
    classifierMock.classify.mockResolvedValue({
      channel: 'SAC',
      priority: 'MEDIA',
      manualReview: false,
      confidence: 0.9,
      alternatives: ['FINANCEIRO']
    });
    prismaMock.ticket.update.mockResolvedValue({
      ...createClassifiedTicket(),
      manualReview: true,
      classificationAlternatives: ['FINANCEIRO'],
      status: 'EM_ANALISE'
    });

    await service.processClassification(1);

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        manualReview: true,
        classificationAlternatives: ['FINANCEIRO'],
        status: 'EM_ANALISE'
      })
    });
  });

  it('does not classify an already processed ticket again', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(createClassifiedTicket());

    const result = await service.processClassification(1);

    expect(classifierMock.classify).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(result).toEqual(createClassifiedTicket());
  });

  it('marks a pending ticket for manual review when async classification fails permanently', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(createPendingTicket());
    prismaMock.ticket.update.mockResolvedValue({
      ...createPendingTicket(),
      manualReview: true,
      classificationConfidence: 0,
      status: 'EM_ANALISE'
    });

    const result = await service.markClassificationFailureForManualReview(1);

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        manualReview: true,
        classificationConfidence: 0,
        classificationAlternatives: [],
        status: 'EM_ANALISE'
      }
    });
    expect(result.manualReview).toBe(true);
  });

  it('does not update a ticket that is already classified when marking manual review after queue failure', async () => {
    const ticket = createClassifiedTicket();

    prismaMock.ticket.findUnique.mockResolvedValue(ticket);

    const result = await service.markClassificationFailureForManualReview(1);

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(result).toEqual(ticket);
  });

  it('fails when creating a ticket for a non-existing user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        userId: 1,
        requestText: 'Meu produto nao chegou e quero cancelar a assinatura.'
      })
    ).rejects.toThrow(new AppError('User not found', 404));
  });

  it('rolls back ticket creation when queue enqueue fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue(createUser());
    prismaMock.ticket.create.mockResolvedValue(createPendingTicket());
    dispatcherMock.enqueue.mockRejectedValue(new Error('Redis unavailable'));
    prismaMock.ticket.delete.mockResolvedValue(createPendingTicket());

    await expect(
      service.create({
        userId: 1,
        requestText: 'Meu produto nao chegou e quero cancelar a assinatura.'
      })
    ).rejects.toThrow(new AppError('Ticket classification queue is unavailable', 503));

    expect(prismaMock.ticket.delete).toHaveBeenCalledWith({
      where: { id: 1 }
    });
  });

  it('returns all tickets', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([createClassifiedTicket()]);

    const result = await service.findAll({});

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: {
        id: 'asc'
      }
    });
    expect(result).toHaveLength(1);
  });

  it('returns filtered tickets', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([createClassifiedTicket()]);

    await service.findAll({
      userId: 1,
      status: 'ABERTO',
      channel: 'SAC'
    });

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
      where: {
        userId: 1,
        status: 'ABERTO',
        channel: 'SAC'
      },
      orderBy: {
        id: 'asc'
      }
    });
  });

  it('returns a ticket by id', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(createClassifiedTicket());

    const result = await service.findById(1);

    expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith({
      where: { id: 1 }
    });
    expect(result.id).toBe(1);
  });

  it('fails when ticket is not found by id', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    await expect(service.findById(1)).rejects.toThrow(new AppError('Ticket not found', 404));
  });

  it('updates ticket status', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(createClassifiedTicket());
    prismaMock.ticket.update.mockResolvedValue({
      ...createClassifiedTicket(),
      status: 'EM_ANALISE'
    });

    const result = await service.updateStatus(1, { status: 'EM_ANALISE' });

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: 'EM_ANALISE'
      }
    });
    expect(result.status).toBe('EM_ANALISE');
  });

  it('fails when updating status of a non-existing ticket', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    await expect(service.updateStatus(1, { status: 'EM_ANALISE' })).rejects.toThrow(
      new AppError('Ticket not found', 404)
    );
  });
});

function createUser(): User {
  return {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createTicket(): Ticket {
  return createClassifiedTicket();
}

function createPendingTicket(): Ticket {
  return {
    id: 1,
    userId: 1,
    requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
    channel: null,
    status: 'EM_ANALISE' satisfies TicketStatus,
    priority: null,
    manualReview: false,
    classificationConfidence: null,
    classificationAlternatives: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function createClassifiedTicket(): Ticket {
  return {
    id: 1,
    userId: 1,
    requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
    channel: 'SAC' satisfies TicketChannel,
    status: 'ABERTO' satisfies TicketStatus,
    priority: 'MEDIA' satisfies TicketPriority,
    manualReview: false,
    classificationConfidence: 0.86,
    classificationAlternatives: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
