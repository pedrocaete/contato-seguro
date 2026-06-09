import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

import { HealthService } from '../../src/services/health.service';

describe('HealthService', () => {
  const prismaMock = mockDeep<PrismaClient>();
  const service = new HealthService(prismaMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when database responds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.getStatus();

    expect(result).toEqual({
      status: 'ok',
      services: {
        api: 'ok',
        database: 'ok'
      }
    });
  });

  it('returns error when database is unavailable', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    const result = await service.getStatus();

    expect(result).toEqual({
      status: 'error',
      services: {
        api: 'ok',
        database: 'error'
      }
    });
  });
});
