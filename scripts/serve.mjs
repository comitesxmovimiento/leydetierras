import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const baseDirectory = resolve(process.cwd(), process.argv[2] || '.');
const port = Number(process.env.PORT) || 4173;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = normalize(pathname).replace(/^([/\\])+/, '');
    let filePath = join(baseDirectory, relativePath);

    if (!filePath.startsWith(`${baseDirectory}${sep}`) && filePath !== baseDirectory) {
      throw new Error('Ruta inválida');
    }

    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = join(filePath, 'index.html');
    const finalStats = await stat(filePath);
    if (!finalStats.isFile()) throw new Error('No encontrado');

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('No encontrado');
  }
}).listen(port, () => {
  console.log(`Servidor disponible en http://localhost:${port}`);
});
