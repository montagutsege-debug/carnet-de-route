import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
import express from 'express';
import http from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSuggestions } from './api/_lib/suggestions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uncommon default port so the app does not collide with other local apps (3000 is very busy).
const PORT = Number(process.env.PORT) || 5180;
const HOST = process.env.HOST || '127.0.0.1';
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/suggestions-etape', async (req, res) => {
    const result = await getSuggestions(req.body);
    res.status(result.status).json(result.body);
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, ws: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  // Use the next free port if this one is taken by another application.
  let currentPort = PORT;
  let attemptsLeft = 20;
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      attemptsLeft -= 1;
      console.warn(`Port ${currentPort} déjà utilisé par une autre application, essai du port ${currentPort + 1}...`);
      currentPort += 1;
      httpServer.listen(currentPort, HOST);
    } else {
      console.error('Impossible de démarrer le serveur :', err.message);
      process.exit(1);
    }
  });
  httpServer.once('listening', () => {
    const url = `http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${currentPort}`;
    console.log(`\nCarnet de Route est prêt : ${url}\n`);
    if (process.env.OPEN_BROWSER === '1') {
      const opener =
        process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
      exec(`${opener} ${url}`);
    }
  });
  httpServer.listen(currentPort, HOST);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
