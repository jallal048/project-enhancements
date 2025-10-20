const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { logger } = require('../01-observability/logger');
const { metrics } = require('../01-observability/metrics');

// Demo stores en memoria (reemplazar por Postgres en integración real)
const conversationsStore = new Map(); // id -> { id, users:[u1,u2], createdAt }
const userPairIndex = new Map(); // key(userA,userB) -> conversationId
const messagesStore = new Map(); // conversationId -> [ messages ]

const MAX_MESSAGE_LEN = 2000;
const PAGE_SIZE_DEFAULT = 20;

function orderedPair(a, b){
  return [String(a), String(b)].sort().join('::');
}

function ensureConversation(userA, userB){
  const key = orderedPair(userA, userB);
  let convId = userPairIndex.get(key);
  if(!convId){
    convId = crypto.randomUUID();
    const conv = { id: convId, users:[String(userA), String(userB)], createdAt: new Date().toISOString() };
    userPairIndex.set(key, convId);
    conversationsStore.set(convId, conv);
    messagesStore.set(convId, []);
  }
  return conversationsStore.get(convId);
}

function getPage(items, limit, cursor){
  // items están en orden ascendente por createdAt en este demo
  const sorted = [...items].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)); // desc
  let startIdx = 0;
  if(cursor){
    const idx = sorted.findIndex(m=> m.createdAt === cursor);
    if(idx >= 0) startIdx = idx + 1;
  }
  const slice = sorted.slice(startIdx, startIdx + limit);
  const nextCursor = slice.length === limit ? slice[slice.length-1].createdAt : null;
  return { slice, nextCursor };
}

// Mock auth para demo: si no hay user, usar demo-user-1
function getUserId(req){
  return req.user?.id || 'demo-user-1';
}

// Enviar DM 1:1
router.post('/dm/:recipientId', express.json(), (req,res)=>{
  const senderId = getUserId(req);
  const recipientId = String(req.params.recipientId);
  const { content } = req.body || {};

  if(!content || typeof content !== 'string'){
    return res.status(400).json({ error: 'content_required' });
  }
  if(content.length > MAX_MESSAGE_LEN){
    return res.status(413).json({ error: 'content_too_long', max: MAX_MESSAGE_LEN });
  }
  if(senderId === recipientId){
    return res.status(400).json({ error: 'cannot_message_self' });
  }

  const conv = ensureConversation(senderId, recipientId);
  const msg = {
    id: crypto.randomUUID(),
    conversationId: conv.id,
    senderId,
    recipientId,
    content,
    status: 'sent',
    createdAt: new Date().toISOString(),
    readAt: null
  };
  messagesStore.get(conv.id).push(msg);

  metrics.recordDirectMessage('sent');
  logger.domainEvent('direct_message', { conversationId: conv.id, senderId, recipientId });

  return res.status(201).json({ conversation: conv, message: msg });
});

// Obtener/crear conversación con userId y listar mensajes
router.get('/dm/with/:userId', (req,res)=>{
  const me = getUserId(req);
  const other = String(req.params.userId);
  const limit = Math.min(parseInt(req.query.limit || PAGE_SIZE_DEFAULT,10), 100);
  const cursor = req.query.cursor || null;

  const conv = ensureConversation(me, other);
  const list = messagesStore.get(conv.id) || [];
  const { slice, nextCursor } = getPage(list, limit, cursor);
  return res.json({ conversation: conv, items: slice, nextCursor });
});

// Listar mensajes por conversationId
router.get('/dm/:conversationId', (req,res)=>{
  const conversationId = String(req.params.conversationId);
  const limit = Math.min(parseInt(req.query.limit || PAGE_SIZE_DEFAULT,10), 100);
  const cursor = req.query.cursor || null;

  if(!conversationsStore.has(conversationId)){
    return res.status(404).json({ error: 'conversation_not_found' });
  }
  const list = messagesStore.get(conversationId) || [];
  const { slice, nextCursor } = getPage(list, limit, cursor);
  return res.json({ items: slice, nextCursor });
});

// Marcar como leído todo lo anterior al último mensaje
router.post('/dm/:conversationId/read', (req,res)=>{
  const me = getUserId(req);
  const conversationId = String(req.params.conversationId);
  const list = messagesStore.get(conversationId) || [];

  const now = new Date().toISOString();
  let count = 0;
  for(const m of list){
    if(m.recipientId === me && !m.readAt){
      m.readAt = now;
      count++;
    }
  }
  metrics.recordDirectMessage('delivered');
  metrics.recordDirectMessage('read');
  logger.domainEvent('direct_message_read', { conversationId, count });
  return res.json({ updated: count, at: now });
});

module.exports = router;
