#!/usr/bin/env node
/**
 * Multiverse: The End of Eternity - Orchestration Dashboard
 *
 * Simple HTTP server that serves a dashboard for viewing:
 * - LLM Provider Configuration
 * - Metrics and Statistics
 * - System Status
 *
 * Runs on port 3030 and proxies requests to the metrics server on 8766.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const METRICS_SERVER = 'http://localhost:8766';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Serve static files from public directory
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading dashboard');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Proxy API requests to metrics server
  if (url.pathname.startsWith('/api/')) {
    const metricsUrl = `${METRICS_SERVER}${url.pathname}${url.search}`;

    http.get(metricsUrl, (metricsRes) => {
      res.writeHead(metricsRes.statusCode, {
        'Content-Type': metricsRes.headers['content-type'],
        'Access-Control-Allow-Origin': '*'
      });
      metricsRes.pipe(res);
    }).on('error', (err) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Metrics server unavailable',
        message: err.message
      }));
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[Orchestration Dashboard] Running on http://localhost:${PORT}`);
  console.log(`[Orchestration Dashboard] Proxying API requests to ${METRICS_SERVER}`);
});

process.on('SIGINT', () => {
  console.log('\n[Orchestration Dashboard] Shutting down...');
  server.close(() => {
    console.log('[Orchestration Dashboard] Server closed');
    process.exit(0);
  });
});
