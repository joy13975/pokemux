import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/DESIGN.md', ['DESIGN.md', 'text/plain; charset=utf-8']],
  ['/REVIEW.md', ['REVIEW.md', 'text/plain; charset=utf-8']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']],
  ['/app-icon.png', ['app-icon.png', 'image/png']],
]);
createServer(async (req, res) => {
  const route = routes.get(new URL(req.url, 'http://127.0.0.1').pathname);
  if (!route) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL(route[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': route[1], 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (error) {
    console.error(error);
    res.writeHead(500); res.end('Could not read the design artifact');
  }
}).listen(4387, '127.0.0.1', () => console.log('Design preview: http://127.0.0.1:4387'));
