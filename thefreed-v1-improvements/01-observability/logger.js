/**
 * Sistema de logging estructurado para thefreed.v1
 * Proporciona observabilidad completa con correlación de requests
 */

const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

// Context storage para tracking de requests
const contextStorage = new AsyncLocalStorage();

class Logger {
  constructor(config = {}) {
    this.level = config.level || process.env.LOG_LEVEL || 'info';
    this.service = config.service || 'thefreed-api';
    this.version = config.version || process.env.npm_package_version || '1.0.0';
    
    // Niveles de logging en orden de prioridad
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
  }

  /**
   * Genera contexto para el request actual
   */
  getContext() {
    const context = contextStorage.getStore() || {};
    return {
      requestId: context.requestId || 'no-request',
      userId: context.userId ? this.hashUserId(context.userId) : null,
      userAgent: context.userAgent || null,
      ip: context.ip ? this.hashIp(context.ip) : null,
      route: context.route || null,
      timestamp: new Date().toISOString(),
      service: this.service,
      version: this.version
    };
  }

  /**
   * Hash del userId para proteger privacidad
   */
  hashUserId(userId) {
    return crypto.createHash('sha256')
      .update(userId.toString())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Hash de IP para proteger privacidad
   */
  hashIp(ip) {
    return crypto.createHash('sha256')
      .update(ip)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Verifica si el nivel debe ser loggeado
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Método principal de logging
   */
  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      ...this.getContext(),
      level,
      message,
      ...meta
    };

    // En producción usar JSON, en desarrollo más legible
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`, 
        Object.keys(meta).length > 0 ? meta : '');
    }
  }

  /**
   * Métodos de conveniencia
   */
  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  trace(message, meta = {}) {
    this.log('trace', message, meta);
  }

  /**
   * Log específico para requests HTTP
   */
  httpRequest(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      contentLength: res.get('content-length') || 0,
      referer: req.get('referer') || null,
      userAgent: req.get('user-agent') || null
    };

    const level = res.statusCode >= 500 ? 'error' : 
                 res.statusCode >= 400 ? 'warn' : 'info';
    
    this.log(level, `HTTP ${req.method} ${req.url}`, meta);
  }

  /**
   * Log para eventos de dominio (feed, posts, follows, etc.)
   */
  domainEvent(eventType, data = {}) {
    this.info(`Domain event: ${eventType}`, {
      eventType,
      eventData: data,
      eventTime: Date.now()
    });
  }

  /**
   * Log para errores de base de datos
   */
  dbError(operation, error, query = null) {
    this.error(`Database error: ${operation}`, {
      operation,
      error: error.message,
      stack: error.stack,
      query: query ? query.substring(0, 200) : null,
      errorCode: error.code || null
    });
  }

  /**
   * Log para métricas de performance
   */
  performance(operation, duration, metadata = {}) {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * Middleware para Express que añade contexto de request
   */
  middleware() {
    return (req, res, next) => {
      const requestId = req.headers['x-request-id'] || 
                       crypto.randomBytes(16).toString('hex');
      
      const context = {
        requestId,
        userId: req.user?.id || null,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection.remoteAddress,
        route: req.route?.path || req.path
      };

      // Añadir requestId a response headers
      res.set('X-Request-ID', requestId);

      // Ejecutar el resto del request dentro del contexto
      contextStorage.run(context, () => {
        const startTime = Date.now();
        
        // Log al finalizar la request
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          this.httpRequest(req, res, duration);
        });

        next();
      });
    };
  }
}

// Instancia singleton
const logger = new Logger();

module.exports = { Logger, logger, contextStorage };