/**
 * Metrics Streaming Server
 *
 * WebSocket server that receives metrics from the browser client
 * and persists them using MetricsStorage.
 *
 * Usage: npx tsx scripts/metrics-server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import { MetricsStorage, type StoredMetric } from '../packages/core/src/metrics/MetricsStorage.js';
import * as path from 'path';
import * as fs from 'fs';

const PORT = 8765;
const DATA_DIR = path.join(process.cwd(), 'metrics-data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize storage
const storage = new MetricsStorage(DATA_DIR);

// Track sessions
const sessions = new Map<WebSocket, string>();
let messageCount = 0;
let lastLogTime = Date.now();

console.log(`
====================================
  Metrics Streaming Server
====================================
  Port: ${PORT}
  Data Directory: ${DATA_DIR}
====================================
`);

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(ws, sessionId);

  console.log(`[${new Date().toISOString()}] Client connected: ${sessionId}`);

  // Send session ID to client
  ws.send(JSON.stringify({ type: 'session', sessionId }));

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      messageCount++;

      // Log progress periodically
      const now = Date.now();
      if (now - lastLogTime > 5000) {
        console.log(`[${new Date().toISOString()}] Received ${messageCount} messages total`);
        lastLogTime = now;
      }

      switch (message.type) {
        case 'metric':
          await handleMetric(sessionId, message.data);
          break;

        case 'batch':
          await handleBatch(sessionId, message.data);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${sessionId}`);
    sessions.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`[${sessionId}] WebSocket error:`, err);
  });
});

async function handleMetric(sessionId: string, metric: StoredMetric): Promise<void> {
  await storage.store(metric);
}

async function handleBatch(sessionId: string, metrics: StoredMetric[]): Promise<void> {
  for (const metric of metrics) {
    await storage.store(metric);
  }
  console.log(`[${new Date().toISOString()}] Stored batch of ${metrics.length} metrics from ${sessionId}`);
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down...');

  // Close all connections
  wss.clients.forEach((client) => {
    client.close();
  });

  // Flush storage
  await storage.flush();

  console.log('Metrics server stopped.');
  process.exit(0);
});

console.log(`Metrics server listening on ws://localhost:${PORT}`);
console.log('Press Ctrl+C to stop\n');
