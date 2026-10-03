import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Readable, pipeline } from 'stream';

// Handle uncaught exceptions gracefully to prevent stream aborts from crashing the process
process.on('uncaughtException', (err: any) => {
  if (
    err?.code === 'ECONNRESET' ||
    err?.code === 'EPIPE' ||
    err?.name === 'AbortError' ||
    err?.message?.includes('terminated') ||
    err?.message?.includes('premature')
  ) {
    return;
  }
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason: any) => {
  if (
    reason?.code === 'ECONNRESET' ||
    reason?.name === 'AbortError' ||
    reason?.message?.includes('terminated')
  ) {
    return;
  }
  console.error('[Unhandled Rejection]', reason);
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists in public/uploads for Vercel/Vite static serving
const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('video') ? '.mp4' : file.mimetype.includes('svga') ? '.svga' : '.bin');
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/\.[^/.]+$/, '');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${safeName}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// File Upload Endpoint: Uploads real video / SVGA / image media
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filename = req.file.filename;
  const fileUrl = `/uploads/${filename}`;
  const fileSize = req.file.size;
  const mimeType = req.file.mimetype;

  res.json({
    success: true,
    url: fileUrl,
    filename,
    size: fileSize,
    mimeType
  });
});

// Video / Audio / SVGA Streaming with HTTP 206 Partial Content (Range requests)
// Critical for iOS Safari & Android mobile video playback!
app.get('/uploads/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  let contentType = 'application/octet-stream';
  if (filename.endsWith('.mp4')) contentType = 'video/mp4';
  else if (filename.endsWith('.webm')) contentType = 'video/webm';
  else if (filename.endsWith('.mov')) contentType = 'video/quicktime';
  else if (filename.endsWith('.webp')) contentType = 'image/webp';
  else if (filename.endsWith('.png')) contentType = 'image/png';
  else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (filename.endsWith('.gif')) contentType = 'image/gif';
  else if (filename.endsWith('.svga') || filename.endsWith('.svga2')) contentType = 'application/octet-stream';

  const commonHeaders = {
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type',
    'Cache-Control': 'public, max-age=31536000, immutable'
  };

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).set(commonHeaders).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    fileStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    res.writeHead(206, {
      ...commonHeaders,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });

    pipeline(fileStream, res, () => {});
  } else {
    res.writeHead(200, {
      ...commonHeaders,
      'Content-Length': fileSize,
      'Content-Type': contentType,
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    pipeline(fileStream, res, () => {});
  }
});

// Direct redirect for legacy /api/proxy-media requests: Server never downloads or proxies media
app.get('/api/proxy-media', (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
    return res.redirect(301, targetUrl);
  }
  return res.status(404).json({ error: 'Direct CDN playback enabled. Media proxy discontinued.' });
});

async function startServer() {
  if (!isProd) {
    // Development mode with Vite Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT} (Production: ${isProd})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
