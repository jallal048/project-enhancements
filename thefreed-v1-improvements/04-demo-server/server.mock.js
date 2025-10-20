/**
 * Demo server sin BD para probar feed y métricas
 */

const express = require('express');
const app = express();

const { logger } = require('../01-observability/logger');
const { metrics } = require('../01-observability/metrics');
const feedRouter = require('../03-feed/feed.chrono.route');

// Middlewares de observabilidad
app.use(logger.middleware());
app.use(metrics.middleware());

// Endpoints
app.use('/api', feedRouter);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(await metrics.getMetrics());
});

// Mock de autenticación mínima (solo para demo)
app.use((req, res, next) => {
  req.user = { id: 'demo-user-1' };
  next();
});

// Puerto configurable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Demo server running on http://localhost:${PORT}`);
});

module.exports = app;
