import { TicketStatus } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

const prismaMock = mockDeep<PrismaClient>();

jest.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock
}));

import { app } from '../../src/app';

describe('Ticket routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a ticket', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.ticket.create.mockResolvedValue({
      id: 1,
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
      channel: 'SAC',
      status: 'ABERTO',
      priority: 'MEDIA',
      manualReview: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).post('/tickets').send({
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.'
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 1,
        userId: 1,
        channel: 'SAC',
        status: 'ABERTO'
      })
    );
  });

  it('returns 404 when creating a ticket for an unknown user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app).post('/tickets').send({
      userId: 999,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.'
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('returns 400 for invalid ticket payload', async () => {
    const response = await request(app).post('/tickets').send({
      userId: 0,
      requestText: 'curto'
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('lists tickets', async () => {
    prismaMock.ticket.findMany.mockResolvedValue([
      {
        id: 1,
        userId: 1,
        requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
        channel: 'SAC',
        status: 'ABERTO',
        priority: 'MEDIA',
        manualReview: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const response = await request(app).get('/tickets');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('returns a ticket by id', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
      channel: 'SAC',
      status: 'ABERTO',
      priority: 'MEDIA',
      manualReview: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).get('/tickets/1');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(1);
  });

  it('updates ticket status', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: 1,
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
      channel: 'SAC',
      status: 'ABERTO',
      priority: 'MEDIA',
      manualReview: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.ticket.update.mockResolvedValue({
      id: 1,
      userId: 1,
      requestText: 'Meu produto nao chegou e quero cancelar a assinatura.',
      channel: 'SAC',
      status: 'EM_ANALISE' satisfies TicketStatus,
      priority: 'MEDIA',
      manualReview: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).put('/tickets/1/status').send({
      status: 'EM_ANALISE'
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('EM_ANALISE');
  });

  it('returns 404 when ticket is not found', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);

    const response = await request(app).get('/tickets/999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Ticket not found' });
  });
});
