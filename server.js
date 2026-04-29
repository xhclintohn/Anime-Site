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
    if (req.path !== '/api/embed-proxy') {
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

  const MOBINIME_BASE = 'https://air.vunime.my.id/mobinime';
  const MOBINIME_HEADERS = {
    'accept-encoding': 'gzip',
    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    'host': 'air.vunime.my.id',
    'user-agent': 'Dart/3.3 (dart:io)',
    'x-api-key': 'ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8',
  };

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
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
      if (!upstream.ok) return res.status(502).json({ error: 'Upstream error ' + upstream.status });
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
      const upstream = await fetch(url, { headers: { 'User-Agent': 'ToxiNime/1.0' } });
      if (!upstream.ok) return res.status(502).json({ error: 'Jikan error ' + upstream.status });
      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err.message || 'Jikan proxy error' });
    }
  });

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
      });
      if (!upstream.ok) {
        return res.status(upstream.status).send('Upstream returned ' + upstream.status);
      }
      const contentType = upstream.headers.get('content-type') || '';
      if (contentType.includes('video') || contentType.includes('octet-stream')) {
        const buf = await upstream.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.send(Buffer.from(buf));
        return;
      }
      let html = await upstream.text();
      if (origin) {
        const baseTag = '<base href="' + origin + '/" target="_blank">';
        if (html.includes('<head>')) {
          html = html.replace('<head>', '<head>' + baseTag);
        } else {
          html = baseTag + html;
        }
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(html);
    } catch (err) {
      res.status(502).send('<html><body style="background:#0f1117;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><p style="font-size:1.1rem;margin-bottom:16px">Video unavailable from this source</p><a href="' + targetUrl + '" target="_blank" rel="noopener" style="color:#a78bfa;text-decoration:none;border:1px solid #a78bfa;padding:10px 22px;border-radius:8px">Open Video in New Tab</a></div></body></html>');
    }
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log('ToxiNime running on port ' + PORT);
  });
  