import express from 'express';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.url);
    }
    next();
  });

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'dist'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
  }));

  const MOBINIME_BASE = 'https://air.vunime.my.id/mobinime';
  const MOBINIME_HEADERS = {
    'accept-encoding': 'gzip',
    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    'host': 'air.vunime.my.id',
    'user-agent': 'Dart/3.3 (dart:io)',
    'x-api-key': 'ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8',
  };

  app.get('/api/healthz', (_req, res) => res.json({ ok: true, service: 'ToxiNime', ts: Date.now() }));

  app.post('/api/proxy', async (req, res) => {
    const { endpoint, method = 'GET', body } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

    const url = MOBINIME_BASE + endpoint;
    const options = { method, headers: MOBINIME_HEADERS };

    if (method === 'POST' && body) {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) form.append(k, String(v));
      options.body = form.toString();
    }

    try {
      const upstream = await fetch(url, options);
      if (!upstream.ok) {
        return res.status(502).json({ error: 'Upstream error ' + upstream.status });
      }
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Proxy error' });
    }
  });

  app.get('/api/jikan/*', async (req, res) => {
    const jikanPath = req.path.replace('/api/jikan', '');
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const url = 'https://api.jikan.moe/v4' + jikanPath + query;
    try {
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'ToxiNime/1.0' }
      });
      if (!upstream.ok) return res.status(502).json({ error: 'Jikan error ' + upstream.status });
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Jikan proxy error' });
    }
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log('ToxiNime running on port ' + PORT);
  });
  