import { Ticket, TicketChannel, TicketPriority, TicketStatus, User } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

import { AppError } from '../../src/lib/app-error';
import { ITicketClassifier } from '../../src/services/ticket-classifier';
import { TicketService } from '../../src/services/ticket.service';

describe('TicketService', () => {
  const prismaMock = mockDeep<PrismaClient>();
  const classifierMock: jest.Mocked<ITicketClassifier> = {
    classify: jest.fn()
  };
  const service = new TicketService(prismaMock, classifierMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a ticket with classification', async () => {
    const ticket = createTicket();

    prismaMock.user.findUnique.mockResolvedValue(createUser());
    classifierMock.classify.mockResolvedValue({
      channel: 'SAC',
      priority: 'MEDIA',
      manualReview: false
    });
    prismaMock.ticket.create.mockResolvedValue(ticket);

    const result = await service.create({
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.'
    });

    expect(classifierMock.classify).toHaveBeenCalledWith(
      'Meu produto nao chegou e quero cancelar a assinatura.'
    );
    expect(prismaMock.ticket.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
        channel: 'SAC',
        priority: 'MEDIA',
        manualReview: false
      }
    });
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

  it('returns all tickets', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([createTicket()]);

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
    prismaMock.ticket.findMany.mockResolvedValue([createTicket()]);

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
    prismaMock.ticket.findUnique.mockResolvedValue(createTicket());

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
    prismaMock.ticket.findUnique.mockResolvedValue(createTicket());
    prismaMock.ticket.update.mockResolvedValue({
      ...createTicket(),
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
  return {
    id: 1,
    userId: 1,
    requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
    channel: 'SAC' satisfies TicketChannel,
    status: 'ABERTO' satisfies TicketStatus,
    priority: 'MEDIA' satisfies TicketPriority,
    manualReview: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
