'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const publicDir = path.join(__dirname, 'public');
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || host}`);

  if (url.pathname === '/api/health') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: true, service: 'Python 进阶小课堂' }));
    return;
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(publicDir, `.${decodeURIComponent(requestedPath)}`);
  if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500, {
        'content-type': 'text/plain; charset=utf-8',
      });
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    response.writeHead(200, {
      'content-type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    response.end(content);
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${port} 已被占用。请关闭旧课堂窗口，或运行 PORT=4174 npm start。`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Python 进阶小课堂已启动：http://${host}:${port}`);
  console.log('按 Control + C 停止服务。');
});
