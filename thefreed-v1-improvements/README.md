# thefreed.v1 – Guía de integración de mejoras

Este directorio contiene mejoras listas para integrar en thefreed.v1.

## Contenido

- 01-observability/
  - logger.js → Logging estructurado y middleware
  - metrics.js → Métricas Prometheus + middleware + endpoint helper
- 02-database/
  - schema.sql → Esquema Postgres optimizado para red social
- 03-feed/
  - feed.chrono.route.js → Endpoint de feed cronológico con caché

## Cómo integrar

1) Instalación de dependencias
```bash
npm install prom-client
```

2) Express bootstrap (app.js)
```javascript
const express = require('express');
const app = express();

const { logger } = require('./01-observability/logger');
const { metrics } = require('./01-observability/metrics');

app.use(logger.middleware());
app.use(metrics.middleware());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.end(await metrics.getMetrics());
});

app.use('/api', require('./03-feed/feed.chrono.route'));

module.exports = app;
```

3) Base de datos
- Ejecuta 02-database/schema.sql en tu Postgres
- Crea un usuario con mínimos privilegios para la app

4) Variables de entorno recomendadas
```bash
LOG_LEVEL=info
NODE_ENV=production
SENTRY_DSN= # opcional si integras Sentry
OTEL_EXPORTER_OTLP_ENDPOINT= # opcional si integras OpenTelemetry
```

5) Pruebas rápidas
- GET /api/feed → devuelve items, nextCursor y mode
- GET /metrics → expone métricas para Prometheus

## Próximos módulos (se agregarán cuando confirmes)
- Notificaciones en tiempo real (SSE/WebSocket)
- Búsqueda (Meilisearch/OpenSearch)
- Moderación (reports/flags)
