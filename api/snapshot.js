import { Readable } from 'stream';

/**
 * Serverless / Edge snapshot proxy endpoint:
 * Allows extracting a video frame in the browser with CORS headers.
 * Uses HTTP 206 Partial Content (Range requests) so only the needed frame bytes are transferred.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url query parameter' });
  }

  // Basic security check: only allow http/https external video URLs
  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported' });
  }

  // SSRF guard: block localhost / private network ranges
  try {
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return res.status(403).json({ error: 'Restricted host' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    const forwardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    if (req.headers.range) {
      forwardHeaders['Range'] = req.headers.range;
    }

    const upstreamResponse = await fetch(cleanUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
    });

    const status = upstreamResponse.status || 200;
    res.status(status);

    const contentType = upstreamResponse.headers.get('content-type') || 'video/mp4';
    res.setHeader('Content-Type', contentType);

    const contentRange = upstreamResponse.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }

    const contentLength = upstreamResponse.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (req.method === 'HEAD' || !upstreamResponse.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(upstreamResponse.body);
    nodeStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      }
    });

    nodeStream.pipe(res);
  } catch (err) {
    console.error('[Snapshot Proxy Error]', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to stream media frame', details: String(err) });
    }
  }
}
