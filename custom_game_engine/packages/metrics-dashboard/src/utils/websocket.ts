const WS_URL = 'ws://localhost:8765';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export type MetricsUpdateHandler = (data: any) => void;

export class MetricsWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private handlers: Set<MetricsUpdateHandler> = new Set();
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor(onConnectionChange?: (connected: boolean) => void) {
    this.onConnectionChange = onConnectionChange || null;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(data));
        } catch (error) {
          throw new Error(`Failed to parse WebSocket message: ${error}`);
        }
      };

      this.ws.onerror = (error) => {
        throw new Error(`WebSocket error: ${error}`);
      };

      this.ws.onclose = () => {
        this.onConnectionChange?.(false);
        this.attemptReconnect();
      };
    } catch (error) {
      throw new Error(`Failed to create WebSocket connection: ${error}`);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      throw new Error(
        `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`
      );
    }

    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.onConnectionChange?.(false);
  }

  subscribe(handler: MetricsUpdateHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

let wsInstance: MetricsWebSocket | null = null;

export function getWebSocket(
  onConnectionChange?: (connected: boolean) => void
): MetricsWebSocket {
  if (!wsInstance) {
    wsInstance = new MetricsWebSocket(onConnectionChange);
  }
  return wsInstance;
}
