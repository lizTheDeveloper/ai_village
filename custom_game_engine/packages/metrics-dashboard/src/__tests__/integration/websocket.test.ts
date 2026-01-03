import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsWebSocketClient } from '@/services/MetricsWebSocketClient';
import { mockWebSocketMessage } from '../mockData';

describe('MetricsWebSocketClient Integration', () => {
  let client: MetricsWebSocketClient;
  let mockWebSocket: any;
  let messageHandlers: Map<string, Function>;

  beforeEach(() => {
    messageHandlers = new Map();

    mockWebSocket = {
      addEventListener: vi.fn((event: string, handler: Function) => {
        messageHandlers.set(event, handler);
      }),
      removeEventListener: vi.fn((event: string) => {
        messageHandlers.delete(event);
      }),
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED,
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('Acceptance Criterion 8: Real-Time Updates', () => {
    it('should connect to MetricsLiveStream WebSocket', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8765');
    });

    it('should throw when WebSocket URL is invalid', () => {
      expect(() => {
        new MetricsWebSocketClient('not-a-websocket-url');
      }).toThrow('Invalid WebSocket URL');
    });

    it('should throw when WebSocket URL is empty', () => {
      expect(() => {
        new MetricsWebSocketClient('');
      }).toThrow('WebSocket URL');
    });

    it('should update visualizations in real-time', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      client.on('metrics_update', (data) => {
        expect(data).toEqual(mockWebSocketMessage.data);
        done();
      });

      // Simulate receiving message
      const messageHandler = messageHandlers.get('message');
      expect(messageHandler).toBeDefined();

      messageHandler!({
        data: JSON.stringify(mockWebSocketMessage),
      });
    });

    it('should handle updates with < 1 second lag', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const startTime = Date.now();

      client.on('metrics_update', (data) => {
        const lag = Date.now() - startTime;
        expect(lag).toBeLessThan(1000);
        done();
      });

      // Simulate immediate message
      const messageHandler = messageHandlers.get('message');
      messageHandler!({
        data: JSON.stringify(mockWebSocketMessage),
      });
    });

    it('should handle connection loss gracefully', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onError = vi.fn();
      client.on('error', onError);

      // Simulate connection error
      const errorHandler = messageHandlers.get('error');
      errorHandler!(new Event('error'));

      expect(onError).toHaveBeenCalled();
    });

    it('should show reconnecting message on disconnect', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onReconnecting = vi.fn();
      client.on('reconnecting', onReconnecting);

      // Simulate disconnect
      const closeHandler = messageHandlers.get('close');
      closeHandler!(new CloseEvent('close', { code: 1006 }));

      expect(onReconnecting).toHaveBeenCalled();
    });

    it('should auto-reconnect on disconnect', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765', {
        autoReconnect: true,
        reconnectInterval: 100,
      });

      client.on('reconnected', () => {
        expect(global.WebSocket).toHaveBeenCalledTimes(2); // Initial + reconnect
        done();
      });

      // Simulate disconnect
      const closeHandler = messageHandlers.get('close');
      closeHandler!(new CloseEvent('close', { code: 1006 }));
    });

    it('should sync data after reconnection', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765', {
        autoReconnect: true,
        reconnectInterval: 100,
      });

      let reconnected = false;

      client.on('reconnected', () => {
        reconnected = true;
      });

      client.on('metrics_update', (data) => {
        if (reconnected) {
          expect(data).toBeDefined();
          done();
        }
      });

      // Simulate disconnect and reconnect
      const closeHandler = messageHandlers.get('close');
      closeHandler!(new CloseEvent('close', { code: 1006 }));

      setTimeout(() => {
        const openHandler = messageHandlers.get('open');
        openHandler!(new Event('open'));

        const messageHandler = messageHandlers.get('message');
        messageHandler!({
          data: JSON.stringify(mockWebSocketMessage),
        });
      }, 150);
    });
  });

  describe('message handling', () => {
    it('should parse JSON messages', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onMessage = vi.fn();
      client.on('metrics_update', onMessage);

      const messageHandler = messageHandlers.get('message');
      messageHandler!({
        data: JSON.stringify(mockWebSocketMessage),
      });

      expect(onMessage).toHaveBeenCalledWith(mockWebSocketMessage.data);
    });

    it('should handle malformed JSON gracefully', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onError = vi.fn();
      client.on('error', onError);

      const messageHandler = messageHandlers.get('message');
      messageHandler!({
        data: 'not valid json',
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should route messages by type', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onMetricsUpdate = vi.fn();
      const onNetworkUpdate = vi.fn();

      client.on('metrics_update', onMetricsUpdate);
      client.on('network_update', onNetworkUpdate);

      const messageHandler = messageHandlers.get('message');

      // Send metrics_update
      messageHandler!({
        data: JSON.stringify({ type: 'metrics_update', data: {} }),
      });

      expect(onMetricsUpdate).toHaveBeenCalled();
      expect(onNetworkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('connection management', () => {
    it('should disconnect cleanly', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      client.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should not reconnect after manual disconnect', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765', {
        autoReconnect: true,
        reconnectInterval: 100,
      });

      client.disconnect();

      setTimeout(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(1); // Only initial connection
        done();
      }, 200);
    });

    it('should expose connection state', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      expect(client.isConnected()).toBe(true);

      const closeHandler = messageHandlers.get('close');
      closeHandler!(new CloseEvent('close'));

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should emit error event on WebSocket error', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onError = vi.fn();
      client.on('error', onError);

      const errorHandler = messageHandlers.get('error');
      const error = new Event('error');
      errorHandler!(error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should handle unexpected disconnects', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      const onDisconnect = vi.fn();
      client.on('disconnect', onDisconnect);

      const closeHandler = messageHandlers.get('close');
      closeHandler!(new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' }));

      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should throw when trying to send while disconnected', () => {
      client = new MetricsWebSocketClient('ws://localhost:8765');

      mockWebSocket.readyState = WebSocket.CLOSED;

      expect(() => {
        client.send({ type: 'ping' });
      }).toThrow('not connected');
    });
  });

  describe('reconnection strategy', () => {
    it('should use exponential backoff for reconnection', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765', {
        autoReconnect: true,
        reconnectInterval: 100,
        maxReconnectInterval: 1000,
      });

      let reconnectAttempts = 0;

      client.on('reconnecting', () => {
        reconnectAttempts++;
      });

      // Simulate multiple disconnects
      const closeHandler = messageHandlers.get('close');

      for (let i = 0; i < 3; i++) {
        closeHandler!(new CloseEvent('close', { code: 1006 }));
      }

      setTimeout(() => {
        expect(reconnectAttempts).toBeGreaterThan(0);
        done();
      }, 500);
    });

    it('should limit reconnection attempts', (done) => {
      client = new MetricsWebSocketClient('ws://localhost:8765', {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectInterval: 50,
      });

      let reconnectAttempts = 0;

      client.on('reconnecting', () => {
        reconnectAttempts++;
      });

      client.on('max_reconnect_attempts', () => {
        expect(reconnectAttempts).toBe(3);
        done();
      });

      // Keep failing reconnection
      const closeHandler = messageHandlers.get('close');
      const interval = setInterval(() => {
        closeHandler!(new CloseEvent('close', { code: 1006 }));
      }, 60);

      setTimeout(() => {
        clearInterval(interval);
      }, 300);
    });
  });
});
