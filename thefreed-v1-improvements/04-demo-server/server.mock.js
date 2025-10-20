// Integración del módulo DM en el demo server
// Usa el servidor ya existente y monta las rutas de DM

const express = require('express');
const app = express();

const { logger } = require('../01-observability/logger');
const { metrics } = require('../01-observability/metrics');
const feedRouter = require('../03-feed/feed.chrono.route');
const dmRouter = require('../08-dm/dm.routes');

app.use(logger.middleware());
app.use(metrics.middleware());

app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 TheFreed.v1 Demo Server</h1>
    <ul>
      <li><a href="/api/feed">GET /api/feed</a></li>
      <li>POST /api/dm/:recipientId (JSON { content })</li>
      <li><a href="/api/dm/with/demo-user-2">GET /api/dm/with/:userId</a></li>
      <li><a href="/health">GET /health</a></li>
    </ul>
  `);
});

app.use('/api', feedRouter);
app.use('/api', dmRouter);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(await metrics.getMetrics());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Mock auth para demo
app.use((req, res, next) => { req.user = { id: 'demo-user-1' }; next(); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Demo server running on http://localhost:${PORT}`));

module.exports = app;
