import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../04-demo-server/server.mock.js';

// Nota: este test usa el server mock (sin BD)

describe('Feed Chrono v1', () => {
  it('GET /api/feed responde 200 y estructura básica', async () => {
    const res = await request(app).get('/api/feed').expect(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('mode', 'chronological');
  });

  it('Paginación con cursor devuelve nextCursor (o null)', async () => {
    const res = await request(app).get('/api/feed?limit=2').expect(200);
    expect(res.body).toHaveProperty('nextCursor');
  });
});
