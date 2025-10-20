const express = require('express');
const router = express.Router();

// Mock stores (preparado para motor real: Meilisearch/OpenSearch)
const users = [
  { id: 'u1', username: 'thefreed', displayName: 'TheFreed', bio: 'La red social simple y libre.' },
  { id: 'u2', username: 'developer', displayName: 'Dev Team', bio: 'Construyendo TheFreed.v1' },
  { id: 'u3', username: 'maria', displayName: 'María López', bio: 'Fotografía y viajes' },
  { id: 'u4', username: 'juan', displayName: 'Juan Pérez', bio: 'Tecnología y startups' }
];

const posts = [
  { id: 'p1', author: 'u1', content: 'Bienvenido a TheFreed.v1, feed cronológico y sin complicaciones.', lang: 'es', created_at: new Date().toISOString(), hashtags: ['thefreed','welcome'] },
  { id: 'p2', author: 'u2', content: 'Implementando DMs 1:1 con paginación por cursor y caché.', lang: 'es', created_at: new Date(Date.now()-3600e3).toISOString(), hashtags: ['dev','dm','cursor'] },
  { id: 'p3', author: 'u3', content: 'New photo series from the mountains.', lang: 'en', created_at: new Date(Date.now()-2*3600e3).toISOString(), hashtags: ['photo','travel'] },
  { id: 'p4', author: 'u4', content: 'Buscando gente para charlar sobre producto y growth.', lang: 'es', created_at: new Date(Date.now()-3*3600e3).toISOString(), hashtags: ['growth','product'] }
];

const hashtags = [
  { tag: 'thefreed', usage: 120 },
  { tag: 'dev', usage: 85 },
  { tag: 'dm', usage: 60 },
  { tag: 'photo', usage: 140 },
  { tag: 'travel', usage: 110 },
  { tag: 'growth', usage: 30 }
];

function normalize(s){ return String(s||'').toLowerCase(); }
function match(text, q){ text = normalize(text); q = normalize(q); return text.includes(q); }

// Search combinado (users, posts, hashtags)
router.get('/search', (req,res)=>{
  const q = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit || '20',10), 100);

  const u = users.filter(u => match(u.username,q) || match(u.displayName,q) || match(u.bio,q)).slice(0, limit);
  const p = posts.filter(p => match(p.content,q) || p.hashtags.some(h => match(h,q))).slice(0, limit);
  const h = hashtags.filter(h => match(h.tag,q)).sort((a,b)=>b.usage-a.usage).slice(0, limit);

  res.json({ users: u, posts: p, hashtags: h, q, limit });
});

// Search usuarios con ranking
router.get('/search/users', (req,res)=>{
  const q = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit || '20',10), 100);

  const result = users
    .map(u => ({
      ...u,
      score: (match(u.username,q)?3:0) + (match(u.displayName,q)?2:0) + (match(u.bio,q)?1:0)
    }))
    .filter(x => x.score>0)
    .sort((a,b)=> b.score-a.score)
    .slice(0, limit);

  res.json({ users: result, q, limit });
});

// Search posts con filtros (idioma) y ranking
router.get('/search/posts', (req,res)=>{
  const q = req.query.q || '';
  const lang = req.query.lang || '';
  const limit = Math.min(parseInt(req.query.limit || '20',10), 100);

  let result = posts
    .map(p => ({
      ...p,
      score: (match(p.content,q)?3:0) + (p.hashtags.some(h => match(h,q))?1:0)
    }))
    .filter(x => x.score>0);

  if(lang) result = result.filter(x => x.lang === lang);

  result = result.sort((a,b)=> b.score - a.score || new Date(b.created_at) - new Date(a.created_at))
                 .slice(0, limit);

  res.json({ posts: result, q, lang, limit });
});

// Search hashtags (por uso)
router.get('/search/hashtags', (req,res)=>{
  const q = req.query.q || '';
  const limit = Math.min(parseInt(req.query.limit || '20',10), 100);

  const result = hashtags
    .filter(h => match(h.tag, q))
    .sort((a,b)=> b.usage - a.usage)
    .slice(0, limit);

  res.json({ hashtags: result, q, limit });
});

module.exports = router;
