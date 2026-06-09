import { PrismaClient } from '@prisma/client';

import { prisma } from '../lib/prisma';

type HealthStatus = {
  status: 'ok' | 'error';
  services: {
    api: 'ok';
    database: 'ok' | 'error';
  };
};

export class HealthService {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async getStatus(): Promise<HealthStatus> {
    try {
      await this.prismaClient.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        services: {
          api: 'ok',
          database: 'ok'
        }
      };
    } catch {
      return {
        status: 'error',
        services: {
          api: 'ok',
          database: 'error'
        }
      };
    }
  }
}
