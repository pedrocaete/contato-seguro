import request from 'supertest';

import { app } from '../../src/app';

describe('GET /health', () => {
  it('returns 200 when api and database are available', async () => {
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
});
