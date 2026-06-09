import request from 'supertest';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

jest.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock
}));

import { app } from '../../src/app';

describe('User routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).post('/users').send({
      name: 'Alice',
      email: 'alice@example.com'
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com'
      })
    );
  });

  it('returns 400 for invalid create payload', async () => {
    const response = await request(app).post('/users').send({
      name: '',
      email: 'invalid-email'
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  it('lists users', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    const response = await request(app).get('/users');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('returns a user by id', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).get('/users/1');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(1);
  });

  it('returns 404 when user is not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app).get('/users/1');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('updates a user', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .mockResolvedValueOnce(null);
    prismaMock.user.update.mockResolvedValue({
      id: 1,
      name: 'Alice Updated',
      email: 'alice.updated@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).put('/users/1').send({
      name: 'Alice Updated',
      email: 'alice.updated@example.com'
    });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Alice Updated');
  });

  it('deletes a user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prismaMock.user.delete.mockResolvedValue({
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const response = await request(app).delete('/users/1');

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
  });
});
