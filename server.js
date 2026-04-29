import express from 'express';
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const app = express();
  const PORT = process.env.PORT || 3000;

  const MOBINIME_BASE_URL = 'https://air.vunime.my.id/mobinime';
  const MOBINIME_HEADERS = {
    'accept-encoding': 'gzip',
    'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    'host': 'air.vunime.my.id',
    'user-agent': 'Dart/3.3 (dart:io)',
    'x-api-key': 'ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8',
  };

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'dist')));

  app.post('/api/proxy', async (req, res) => {
    try {
      const { endpoint, method = 'GET', body } = req.body;
      const url = `${MOBINIME_BASE_URL}${endpoint}`;
      const options = { method, headers: MOBINIME_HEADERS };
      if (method === 'POST' && body) {
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(body)) {
          formData.append(key, String(value));
        }
        options.body = formData.toString();
      }
      const response = await fetch(url, options);
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Proxy error' });
    }
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  app.listen(PORT);
  