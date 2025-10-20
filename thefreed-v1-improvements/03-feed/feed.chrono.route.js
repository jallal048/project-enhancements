/**
 * Endpoint de Feed Cronológico (v1)
 * - Paginación con cursor
 * - Caché por usuario
 * - Filtrado por visibilidad (public/followers)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { logger } = require('../01-observability/logger');
const { metrics } = require('../01-observability/metrics');

// Cache simple en memoria (opcional reemplazar por Redis)
const feedCache = new Map();
const FEED_TTL_MS = 15 * 1000; // 15s para datos frescos sin recalcular

function cacheKey(userId, limit, cursor) {
  return `${userId}:${limit}:${cursor || 'start'}`;
}

function setCache(key, value) {
  feedCache.set(key, { value, expiresAt: Date.now() + FEED_TTL_MS });
}

function getCache(key) {
  const entry = feedCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    feedCache.delete(key);
    return null;
  }
  return entry.value;
}

// Simulación de acceso a BD (reemplazar por queries reales)
async function fetchFollowingIds(userId) {
  // SELECT followee_id FROM relationships WHERE follower_id=$1 AND type='follow'
  return [];
}

async function fetchPostsForAuthors(authorIds, limit, cursorCreatedAt) {
  // SELECT * FROM posts WHERE author_id IN (...) AND visibility IN ('public','followers')
  //   AND (created_at < cursorCreatedAt OR cursorCreatedAt IS NULL)
  // ORDER BY created_at DESC LIMIT $limit
  return [];
}

router.get('/feed', async (req, res) => {
  const start = Date.now();
  const userId = req.user?.id; // asumir auth middleware previo
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const cursor = req.query.cursor || null; // timestamp ISO o null

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = cacheKey(userId, limit, cursor);
    const cached = getCache(key);
    if (cached) {
      metrics.recordCacheHit('feed');
      metrics.recordFeedBuilt('chronological', (Date.now() - start) / 1000, cached.items.length);
      return res.json(cached);
    } else {
      metrics.recordCacheMiss('feed');
    }

    // 1) Obtener seguidos
    const followingIds = await fetchFollowingIds(userId);

    // Incluir al propio usuario
    const authorIds = Array.from(new Set([userId, ...followingIds]));

    // 2) Obtener posts más recientes
    const posts = await fetchPostsForAuthors(authorIds, limit + 1, cursor);

    // 3) Construir respuesta con cursor (paginación estable)
    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].created_at : null;

    const payload = { items, nextCursor, mode: 'chronological' };

    // 4) Cachear resultado
    setCache(key, payload);

    // 5) Métricas y logging
    metrics.recordFeedBuilt('chronological', (Date.now() - start) / 1000, items.length);
    logger.domainEvent('feed_rendered', { userId: userId, count: items.length, mode: 'chronological' });

    return res.json(payload);
  } catch (err) {
    logger.error('feed_error', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
