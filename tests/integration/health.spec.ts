import request from 'supertest';

import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn()
  }
}));

import { app } from '../../src/app';

describe('GET /health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when api and database are available', async () => {
    jest.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      services: {
        api: 'ok',
        database: 'ok'
      }
    });
  });

  it('returns 503 when the database is unavailable', async () => {
    jest.mocked(prisma.$queryRaw).mockRejectedValue(new Error('database unavailable'));

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'error',
      services: {
        api: 'ok',
        database: 'error'
      }
    });
  });
});
