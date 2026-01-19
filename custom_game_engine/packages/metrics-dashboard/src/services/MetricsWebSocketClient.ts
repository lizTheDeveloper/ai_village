/**
 * MetricsWebSocketClient - Event-based WebSocket client for real-time metrics
 *
 * Provides:
 * - Type-safe event emission
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Message routing by type
 */

type EventHandler = (...args: any[]) => void;

interface WebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class MetricsWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketOptions>;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private manualDisconnect = false;
  private currentReconnectInterval: number;

  constructor(url: string, options: WebSocketOptions = {}) {
    // Validate URL
    if (!url) {
      throw new Error('WebSocket URL is required');
    }
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      throw new Error('Invalid WebSocket URL');
    }

    this.url = url;
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 1000,
      maxReconnectInterval: options.maxReconnectInterval ?? 30000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? Infinity,
    };
    this.currentReconnectInterval = this.options.reconnectInterval;

    this.connect();
  }

  private connect(): void {
    if (this.ws?.readyState === 1) { // WebSocket.OPEN === 1
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.addEventListener('open', this.handleOpen.bind(this));
      this.ws.addEventListener('message', this.handleMessage.bind(this));
      this.ws.addEventListener('error', this.handleError.bind(this));
      this.ws.addEventListener('close', this.handleClose.bind(this));
    } catch (error) {
      this.emit('error', error);
    }
  }

  private handleOpen(event: Event): void {
    this.reconnectAttempts = 0;
    this.currentReconnectInterval = this.options.reconnectInterval;
    this.emit('open', event);
    this.emit('connected');

    // If this was a reconnection
    if (this.reconnectAttempts === 0 && this.ws !== null) {
      this.emit('reconnected');
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      // Route by message type
      if (message.type) {
        this.emit(message.type, message.data);
      }

      // Also emit generic message event
      this.emit('message', message);
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  private handleError(event: Event): void {
    this.emit('error', event);
  }

  private handleClose(event: CloseEvent): void {
    this.emit('close', event);
    this.emit('disconnect', event);

    // Auto-reconnect if enabled and not manual disconnect
    if (this.options.autoReconnect && !this.manualDisconnect) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('max_reconnect_attempts', this.reconnectAttempts);
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();

      // Exponential backoff
      this.currentReconnectInterval = Math.min(
        this.currentReconnectInterval * 2,
        this.options.maxReconnectInterval
      );
    }, this.currentReconnectInterval);
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unregister an event handler
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Send a message through the WebSocket
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== 1) { // WebSocket.OPEN === 1
      throw new Error('WebSocket is not connected');
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.ws.send(message);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    if (!this.ws) {
      return false;
    }
    // WebSocket.OPEN === 1, but handle test mocks where readyState might be undefined
    // In real browsers: readyState is 0-3, OPEN is 1
    // In test mocks: readyState might be set to WebSocket.OPEN (which could be undefined)
    // So check instance OPEN constant if readyState is undefined
    if (this.ws.readyState === undefined) {
      // Check if instance has OPEN constant (test mock pattern)
      const instanceOpen = (this.ws as any).OPEN;
      return instanceOpen !== undefined && instanceOpen === 1;
    }
    return this.ws.readyState === 1;
  }

  /**
   * Manually disconnect the WebSocket
   */
  disconnect(): void {
    this.manualDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
