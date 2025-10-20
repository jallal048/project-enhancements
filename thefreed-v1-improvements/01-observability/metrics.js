/**
 * Sistema de métricas para thefreed.v1
 * Monitorea performance, errores y métricas de negocio
 */

const { register, Counter, Histogram, Gauge, collectDefaultMetrics } = require('prom-client');
const { logger } = require('./logger');

// Configurar métricas por defecto del sistema
collectDefaultMetrics({ register });

class MetricsCollector {
  constructor() {
    this.setupHttpMetrics();
    this.setupDatabaseMetrics();
    this.setupBusinessMetrics();
    this.setupCacheMetrics();
  }

  /**
   * Métricas HTTP y API
   */
  setupHttpMetrics() {
    // Contador de requests HTTP
    this.httpRequests = new Counter({
      name: 'thefreed_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register]
    });

    // Histograma de duración de requests
    this.httpDuration = new Histogram({
      name: 'thefreed_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register]
    });

    // Gauge de requests concurrentes
    this.activeRequests = new Gauge({
      name: 'thefreed_http_active_requests',
      help: 'Number of active HTTP requests',
      registers: [register]
    });

    // Contador de errores por tipo
    this.httpErrors = new Counter({
      name: 'thefreed_http_errors_total',
      help: 'Total HTTP errors',
      labelNames: ['type', 'route'],
      registers: [register]
    });
  }

  /**
   * Métricas de base de datos
   */
  setupDatabaseMetrics() {
    // Duración de queries
    this.dbQueryDuration = new Histogram({
      name: 'thefreed_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [register]
    });

    // Contador de queries
    this.dbQueries = new Counter({
      name: 'thefreed_db_queries_total',
      help: 'Total database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [register]
    });

    // Conexiones activas
    this.dbConnections = new Gauge({
      name: 'thefreed_db_connections_active',
      help: 'Active database connections',
      registers: [register]
    });

    // Pool de conexiones
    this.dbConnectionPool = new Gauge({
      name: 'thefreed_db_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state'], // 'used', 'free', 'total'
      registers: [register]
    });
  }

  /**
   * Métricas de negocio específicas de thefreed
   */
  setupBusinessMetrics() {
    // Posts creados
    this.postsCreated = new Counter({
      name: 'thefreed_posts_created_total',
      help: 'Total posts created',
      labelNames: ['type'], // 'text', 'image', 'video'
      registers: [register]
    });

    // Follows/unfollows
    this.followActions = new Counter({
      name: 'thefreed_follow_actions_total',
      help: 'Total follow/unfollow actions',
      labelNames: ['action'], // 'follow', 'unfollow'
      registers: [register]
    });

    // Likes/unlikes
    this.likeActions = new Counter({
      name: 'thefreed_like_actions_total',
      help: 'Total like/unlike actions',
      labelNames: ['action', 'target_type'], // action: 'like'/'unlike', target: 'post'/'comment'
      registers: [register]
    });

    // Usuarios activos
    this.activeUsers = new Gauge({
      name: 'thefreed_active_users',
      help: 'Currently active users',
      registers: [register]
    });

    // Tamaño del feed por usuario
    this.feedSize = new Histogram({
      name: 'thefreed_feed_size_items',
      help: 'Number of items in user feed',
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [register]
    });

    // Tiempo de construcción del feed
    this.feedBuildTime = new Histogram({
      name: 'thefreed_feed_build_duration_seconds',
      help: 'Time to build user feed',
      labelNames: ['algorithm'], // 'chronological', 'ranked'
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [register]
    });

    // Notificaciones enviadas
    this.notificationsSent = new Counter({
      name: 'thefreed_notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['type', 'channel'], // type: 'like', 'follow', 'comment'; channel: 'push', 'email'
      registers: [register]
    });

    // Mensajes directos
    this.directMessages = new Counter({
      name: 'thefreed_direct_messages_total',
      help: 'Total direct messages sent',
      labelNames: ['status'], // 'sent', 'delivered', 'failed'
      registers: [register]
    });
  }

  /**
   * Métricas de cache
   */
  setupCacheMetrics() {
    // Hit rate del cache
    this.cacheHits = new Counter({
      name: 'thefreed_cache_requests_total',
      help: 'Total cache requests',
      labelNames: ['result'], // 'hit', 'miss'
      registers: [register]
    });

    // Tamaño del cache
    this.cacheSize = new Gauge({
      name: 'thefreed_cache_size_bytes',
      help: 'Cache size in bytes',
      labelNames: ['cache_name'],
      registers: [register]
    });
  }

  /**
   * Métodos para incrementar métricas
   */

  // HTTP
  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequests.inc({ method, route, status_code: statusCode });
    this.httpDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  recordHttpError(type, route) {
    this.httpErrors.inc({ type, route });
  }

  incrementActiveRequests() {
    this.activeRequests.inc();
  }

  decrementActiveRequests() {
    this.activeRequests.dec();
  }

  // Database
  recordDbQuery(operation, table, duration, success = true) {
    this.dbQueries.inc({ 
      operation, 
      table, 
      status: success ? 'success' : 'error' 
    });
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  updateDbConnections(active) {
    this.dbConnections.set(active);
  }

  updateDbConnectionPool(used, free, total) {
    this.dbConnectionPool.set({ state: 'used' }, used);
    this.dbConnectionPool.set({ state: 'free' }, free);
    this.dbConnectionPool.set({ state: 'total' }, total);
  }

  // Business metrics
  recordPostCreated(type = 'text') {
    this.postsCreated.inc({ type });
    logger.domainEvent('post_created', { type });
  }

  recordFollowAction(action) {
    this.followActions.inc({ action });
    logger.domainEvent('follow_action', { action });
  }

  recordLikeAction(action, targetType) {
    this.likeActions.inc({ action, target_type: targetType });
    logger.domainEvent('like_action', { action, targetType });
  }

  updateActiveUsers(count) {
    this.activeUsers.set(count);
  }

  recordFeedBuilt(algorithm, duration, itemCount) {
    this.feedBuildTime.observe({ algorithm }, duration);
    this.feedSize.observe(itemCount);
    logger.performance('feed_build', duration * 1000, { algorithm, itemCount });
  }

  recordNotificationSent(type, channel) {
    this.notificationsSent.inc({ type, channel });
    logger.domainEvent('notification_sent', { type, channel });
  }

  recordDirectMessage(status) {
    this.directMessages.inc({ status });
    logger.domainEvent('direct_message', { status });
  }

  // Cache
  recordCacheHit(cacheName) {
    this.cacheHits.inc({ result: 'hit' });
  }

  recordCacheMiss(cacheName) {
    this.cacheHits.inc({ result: 'miss' });
  }

  updateCacheSize(cacheName, sizeBytes) {
    this.cacheSize.set({ cache_name: cacheName }, sizeBytes);
  }

  /**
   * Middleware para Express que registra métricas HTTP automáticamente
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.incrementActiveRequests();

      // Interceptar el final de la response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;
        
        // Registrar métricas
        metrics.recordHttpRequest(req.method, route, res.statusCode, duration);
        metrics.decrementActiveRequests();

        // Si es un error, registrarlo
        if (res.statusCode >= 400) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
          metrics.recordHttpError(errorType, route);
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Endpoint para exponer métricas (para Prometheus)
   */
  async getMetrics() {
    return register.metrics();
  }

  /**
   * Health check con métricas básicas
   */
  getHealthMetrics() {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }
}

// Instancia singleton
const metrics = new MetricsCollector();

module.exports = { MetricsCollector, metrics, register };