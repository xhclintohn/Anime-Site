import express from 'express';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('trust proxy', 1);

  // ─── In-memory TTL cache ──────────────────────────────────────────────────────
  const cache = new Map();
  function cacheGet(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) { cache.delete(key); return null; }
    return entry.data;
  }
  function cacheSet(key, data, ttlMs) {
    cache.set(key, { data, expires: Date.now() + ttlMs });
  }

  // ─── Constants ────────────────────────────────────────────────────────────────
  const MOBINIME_BASE = 'https://air.vunime.my.id/mobinime';
  const MOBINIME_HEADERS = {
    'accept-encoding': 'gzip',
    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    'host': 'air.vunime.my.id',
    'user-agent': 'Dart/3.3 (dart:io)',
    'x-api-key': 'ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8',
  };
  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  // ─── Middleware ───────────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });

  app.use((req, res, next) => {
    const noFrame = ['/api/embed-proxy', '/api/stream'];
    if (!noFrame.some(p => req.path.startsWith(p))) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
  }));

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  async function mobinimePost(endpoint, body = {}) {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) form.append(k, String(v));
    const res = await fetch(MOBINIME_BASE + endpoint, {
      method: 'POST', headers: MOBINIME_HEADERS, body: form.toString(),
    });
    if (!res.ok) throw new Error('Upstream ' + res.status);
    return res.json();
  }

  async function mobinimeGet(endpoint) {
    const res = await fetch(MOBINIME_BASE + endpoint, { method: 'GET', headers: MOBINIME_HEADERS });
    if (!res.ok) throw new Error('Upstream ' + res.status);
    return res.json();
  }

  function decodeEntities(str) {
    return String(str)
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  // ─── Routes ───────────────────────────────────────────────────────────────────
  app.get('/api/healthz', (_req, res) => res.json({ ok: true, service: 'ToxiNime', ts: Date.now() }));

  // Generic proxy (for misc calls from client)
  app.post('/api/proxy', async (req, res) => {
    const { endpoint, method = 'GET', body } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    const cacheKey = 'proxy:' + endpoint + ':' + JSON.stringify(body || {});
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    try {
      let data;
      if (method === 'GET') data = await mobinimeGet(endpoint);
      else data = await mobinimePost(endpoint, body || {});
      // Cache homepage longer, other requests shorter
      const ttl = endpoint.includes('homepage') ? 5 * 60 * 1000 :
                   endpoint.includes('detail')   ? 30 * 60 * 1000 :
                   endpoint.includes('list')     ? 10 * 60 * 1000 : 60 * 1000;
      cacheSet(cacheKey, data, ttl);
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Proxy error' });
    }
  });

  // ─── COMBINED STREAM ENDPOINT ─────────────────────────────────────────────────
  // Single request → does server-list + get-url-video internally, returns ready URL
  app.get('/api/stream', async (req, res) => {
    const { animeId, episodeId, quality = 'HD' } = req.query;
    if (!animeId || !episodeId) return res.status(400).json({ error: 'animeId and episodeId required' });

    const cacheKey = 'stream:' + animeId + ':' + episodeId + ':' + quality;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const qualities = quality === 'HD' ? ['HD', 'SD', 'LD'] : [quality, 'HD', 'SD', 'LD'];

    try {
      // Step 1: Get server list
      const srv = await mobinimePost('/anime/get-server-list', {
        id: episodeId, animeId, jenisAnime: '1', userId: '',
      });

      if (!srv?.serverurl) {
        return res.status(404).json({ error: 'No server available for this episode.' });
      }

      const serverUrl = decodeEntities(srv.serverurl);

      // Step 2: Try qualities in order until one works
      let streamUrl = null;
      let usedQuality = null;
      for (const q of qualities) {
        try {
          const streamData = await mobinimePost('/anime/get-url-video', {
            url: serverUrl, quality: q, position: '0',
          });
          if (streamData?.url) {
            streamUrl = decodeEntities(streamData.url);
            usedQuality = q;
            break;
          }
        } catch { /* try next */ }
      }

      if (!streamUrl) {
        return res.status(404).json({ error: 'Stream URL not found for this episode.' });
      }

      const result = { url: streamUrl, quality: usedQuality, serverUrl };
      cacheSet(cacheKey, result, 15 * 60 * 1000); // 15 min
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Stream fetch failed' });
    }
  });

  // ─── ANIME DETAIL WITH ENGLISH DESCRIPTION ────────────────────────────────────
  app.get('/api/detail', async (req, res) => {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });

    const cacheKey = 'detail:' + id;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    try {
      // Fetch primary detail + search Jikan for English description in parallel
      const [primaryData, jikanSearch] = await Promise.allSettled([
        mobinimePost('/anime/detail', { id }),
        (async () => {
          // We'll search by title after we have primary data
          return null;
        })(),
      ]);

      if (primaryData.status === 'rejected') throw primaryData.reason;
      const anime = primaryData.value;
      if (!anime?.id && !anime?.title) throw new Error('Anime not found');

      // Now search Jikan with the title for English description
      let englishSynopsis = null;
      let malId = null;
      const title = anime.title || anime.name || '';
      if (title) {
        try {
          const jikanRes = await fetch(
            'https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(title) + '&limit=3&sfw=false',
            { headers: { 'User-Agent': 'ToxiNime/1.0' }, signal: AbortSignal.timeout(5000) }
          );
          if (jikanRes.ok) {
            const jData = await jikanRes.json();
            if (jData?.data?.length > 0) {
              const match = jData.data[0];
              englishSynopsis = match.synopsis || null;
              malId = match.mal_id || null;
            }
          }
        } catch { /* non-fatal */ }
      }

      const result = {
        ...anime,
        englishSynopsis,
        malId,
        // Use English synopsis if primary content looks Indonesian
        displayDescription: englishSynopsis || anime.content || anime.description || null,
      };

      cacheSet(cacheKey, result, 30 * 60 * 1000); // 30 min
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Detail fetch failed' });
    }
  });

  // ─── JIKAN PROXY (pass-through with caching) ──────────────────────────────────
  app.get('/api/jikan/*', async (req, res) => {
    const jikanPath = req.path.replace('/api/jikan', '');
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const url = 'https://api.jikan.moe/v4' + jikanPath + query;
    const cacheKey = 'jikan:' + url;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);
    try {
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'ToxiNime/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) return res.status(502).json({ error: 'Jikan error ' + upstream.status });
      const data = await upstream.json();
      cacheSet(cacheKey, data, 10 * 60 * 1000); // 10 min
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Jikan proxy error' });
    }
  });

  // ─── EMBED PROXY ──────────────────────────────────────────────────────────────
  app.get('/api/embed-proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl || !targetUrl.startsWith('http')) return res.status(400).send('Invalid url');
    try {
      let origin = '';
      try { origin = new URL(targetUrl).origin; } catch { origin = ''; }
      const upstream = await fetch(targetUrl, {
        headers: {
          ...BROWSER_HEADERS,
          'Referer': origin + '/',
          'Sec-Fetch-Dest': 'iframe',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) return res.status(upstream.status).send('Upstream returned ' + upstream.status);
      const contentType = upstream.headers.get('content-type') || '';
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        // Pipe for video content
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        const buf = await upstream.arrayBuffer();
        res.send(Buffer.from(buf));
        return;
      }
      let html = await upstream.text();
      if (origin) {
        const baseTag = '<base href="' + origin + '/" target="_blank">';
        html = html.includes('<head>') ? html.replace('<head>', '<head>' + baseTag) : baseTag + html;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(html);
    } catch (err) {
      res.status(502).send('<html><body style="background:#0f1117;color:#e2e8f0;font-family:Roboto,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px;"><p style="font-size:1.1rem;">Video unavailable from this source</p><a href="' + targetUrl + '" target="_blank" rel="noopener" style="color:#a78bfa;text-decoration:none;border:1px solid rgba(167,139,250,0.4);padding:10px 24px;border-radius:10px;font-weight:600;">Open in New Tab ↗</a></body></html>');
    }
  });

  // ─── SPA fallback ─────────────────────────────────────────────────────────────
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log('ToxiNime running on port ' + PORT);
  });
  