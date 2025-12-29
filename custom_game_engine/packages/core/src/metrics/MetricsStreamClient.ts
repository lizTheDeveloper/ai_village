/**
 * MetricsStreamClient - Browser-compatible WebSocket client for streaming metrics
 *
 * Connects to the metrics server and streams collected metrics in real-time.
 * Buffers metrics when disconnected and sends them when reconnected.
 */

import type { StoredMetric } from './MetricsStorage.js';

/**
 * Query request from the metrics server
 */
export interface QueryRequest {
  requestId: string;
  queryType: 'entities' | 'entity' | 'entity_prompt';
  entityId?: string;
}

/**
 * Query response to send back to server
 */
export interface QueryResponse {
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Handler function for processing queries from the server
 */
export type QueryHandler = (query: QueryRequest) => Promise<QueryResponse>;

export interface MetricsStreamConfig {
  /** WebSocket server URL (default: ws://localhost:8765) */
  serverUrl?: string;
  /** Game session ID - if provided, server will use this instead of generating one */
  gameSessionId?: string;
  /** Batch size before sending (default: 10) */
  batchSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Max buffer size before dropping old metrics (default: 10000) */
  maxBufferSize?: number;
  /** Mark this session as a test run (default: auto-detect via VITEST env) */
  isTest?: boolean;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StreamStats {
  messagesSent: number;
  messagesBuffered: number;
  bytesTransmitted: number;
  connectionState: ConnectionState;
  sessionId: string | null;
  lastError: string | null;
}

/**
 * Browser-compatible metrics streaming client
 */
export class MetricsStreamClient {
  private ws: WebSocket | null = null;
  private buffer: StoredMetric[] = [];
  private config: Required<Omit<MetricsStreamConfig, 'gameSessionId'>> & Pick<MetricsStreamConfig, 'gameSessionId'>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private sessionId: string | null = null;
  private lastError: string | null = null;
  private queryHandler: QueryHandler | null = null;
  private stats = {
    messagesSent: 0,
    bytesTransmitted: 0,
  };

  constructor(config: MetricsStreamConfig = {}) {
    // Auto-detect test environment if not explicitly set
    const isTest = config.isTest ?? this.detectTestEnvironment();

    this.config = {
      serverUrl: config.serverUrl ?? 'ws://localhost:8765',
      gameSessionId: config.gameSessionId,  // Pass through game's session ID
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 5000,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 3000,
      maxBufferSize: config.maxBufferSize ?? 10000,
      isTest,
    };
  }

  /**
   * Detect if running in a test environment
   */
  private detectTestEnvironment(): boolean {
    // Check for common test environment indicators
    if (typeof process !== 'undefined' && process.env) {
      // Vitest, Jest, Mocha, etc.
      if (process.env.VITEST || process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
        return true;
      }
    }
    // Check for Vite's import.meta.env in browser
    if (typeof globalThis !== 'undefined') {
      const meta = (globalThis as any).import?.meta?.env;
      if (meta?.VITEST || meta?.MODE === 'test') {
        return true;
      }
    }
    return false;
  }

  /**
   * Connect to the metrics server
   */
  connect(): void {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return;
    }

    this.connectionState = 'connecting';

    try {
      this.ws = new WebSocket(this.config.serverUrl);

      this.ws.onopen = () => {
        this.connectionState = 'connected';
        this.lastError = null;

        // Send client info including test status and game session ID
        this.ws!.send(JSON.stringify({
          type: 'client_info',
          isTest: this.config.isTest,
          gameSessionId: this.config.gameSessionId,  // Tell server which game this is
        }));

        // Start flush timer
        this.startFlushTimer();

        // Send any buffered metrics
        if (this.buffer.length > 0) {
          this.flush();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'session') {
            this.sessionId = message.sessionId;
          } else if (message.type === 'query' && this.queryHandler) {
            // Handle query request from server
            const query: QueryRequest = {
              requestId: message.requestId,
              queryType: message.queryType,
              entityId: message.entityId,
            };
            this.queryHandler(query).then((response) => {
              this.sendQueryResponse(response);
            }).catch((err) => {
              this.sendQueryResponse({
                requestId: query.requestId,
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
            });
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        this.lastError = 'WebSocket error';
        this.connectionState = 'error';
        console.error('[MetricsStreamClient] WebSocket error:', error);
      };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Connection failed';
      this.connectionState = 'error';
      console.error('[MetricsStreamClient] Failed to connect:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the metrics server
   */
  disconnect(): void {
    this.stopFlushTimer();
    this.stopReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
  }

  /**
   * Set a handler for processing queries from the server.
   * The handler receives query requests and should return responses.
   */
  setQueryHandler(handler: QueryHandler): void {
    this.queryHandler = handler;
  }

  /**
   * Send a query response back to the server
   */
  private sendQueryResponse(response: QueryResponse): void {
    if (!this.isConnected()) {
      console.error('[MetricsStreamClient] Cannot send query response - not connected');
      return;
    }

    try {
      this.ws!.send(JSON.stringify({
        type: 'query_response',
        ...response,
      }));
    } catch (err) {
      console.error('[MetricsStreamClient] Failed to send query response:', err);
    }
  }

  /**
   * Send a single metric to the server
   */
  send(metric: StoredMetric): void {
    this.buffer.push(metric);

    // Enforce max buffer size
    if (this.buffer.length > this.config.maxBufferSize) {
      const dropped = this.buffer.length - this.config.maxBufferSize;
      this.buffer = this.buffer.slice(dropped);
      console.warn(`[MetricsStreamClient] Buffer overflow, dropped ${dropped} old metrics`);
    }

    // Send immediately if we have enough
    if (this.buffer.length >= this.config.batchSize && this.isConnected()) {
      this.flush();
    }
  }

  /**
   * Flush buffered metrics to the server
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    if (!this.isConnected()) {
      return;
    }

    const batch = this.buffer.splice(0, this.buffer.length);
    const message = JSON.stringify({ type: 'batch', data: batch });

    try {
      this.ws!.send(message);
      this.stats.messagesSent += batch.length;
      this.stats.bytesTransmitted += message.length;
    } catch (err) {
      // Put back in buffer on failure
      this.buffer = batch.concat(this.buffer);
      console.error('[MetricsStreamClient] Failed to send batch:', err);
    }
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current stats
   */
  getStats(): StreamStats {
    return {
      messagesSent: this.stats.messagesSent,
      messagesBuffered: this.buffer.length,
      bytesTransmitted: this.stats.bytesTransmitted,
      connectionState: this.connectionState,
      sessionId: this.sessionId,
      lastError: this.lastError,
    };
  }

  private handleDisconnect(): void {
    this.connectionState = 'disconnected';
    this.ws = null;
    this.stopFlushTimer();

    if (this.config.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.config.reconnectDelay);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
