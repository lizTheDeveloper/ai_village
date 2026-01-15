/**
 * SharedWorker Universe Implementation
 *
 * Runs ONCE, shared by all tabs/windows on same origin.
 * Owns the simulation loop and IndexedDB.
 *
 * Based on: openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md
 */

/// <reference lib="webworker" />

import { GameLoop } from '@ai-village/core';
import { PersistenceService } from './persistence.js';
import { setupGameSystems, type GameSetupResult } from './game-setup.js';
import { PathPredictionSystem } from './PathPredictionSystem.js';
import { DeltaSyncSystem } from './DeltaSyncSystem.js';
import type {
  UniverseState,
  GameAction,
  WorkerConfig,
  ConnectionInfo,
  WorkerToWindowMessage,
  WindowToWorkerMessage,
  SerializedWorld,
  Viewport,
} from './types.js';
import type { DeltaUpdate } from './path-prediction-types.js';

/**
 * UniverseWorker - The heart of the SharedWorker architecture
 */
class UniverseWorker {
  private gameLoop: GameLoop;
  private persistence: PersistenceService;
  private connections: Map<string, ConnectionInfo> = new Map();
  private gameSetup: GameSetupResult | null = null;

  // Path prediction systems
  private pathPredictionSystem: PathPredictionSystem | null = null;
  private deltaSyncSystem: DeltaSyncSystem | null = null;

  private tick = 0;
  private running = false;
  private paused = false;

  private config: WorkerConfig = {
    targetTPS: 20,
    autoSaveInterval: 100, // Every 5 seconds
    debug: true,
    speedMultiplier: 1.0,
    enablePathPrediction: true, // Enable path prediction by default
  };

  constructor() {
    this.gameLoop = new GameLoop();
    this.persistence = new PersistenceService();
  }

  /**
   * Initialize the worker and start simulation
   */
  async init(): Promise<void> {
    // Set up all game systems using shared setup logic
    // This matches the initialization in demo/headless.ts
    this.gameSetup = await setupGameSystems(this.gameLoop, {
      sessionId: this.gameLoop.universeId,
      llmQueue: null, // Worker doesn't need LLM for now
      promptBuilder: null,
      metricsServerUrl: 'ws://localhost:8765',
      enableMetrics: true,
      enableAutoSave: false, // Worker manages its own persistence
    });

    // Register path prediction systems if enabled
    if (this.config.enablePathPrediction) {
      // Path prediction system (priority 50 - after movement, before rendering)
      this.pathPredictionSystem = new PathPredictionSystem();
      this.gameLoop.systemRegistry.register(this.pathPredictionSystem);

      // Delta sync system (priority 1000 - runs last)
      this.deltaSyncSystem = new DeltaSyncSystem();
      this.deltaSyncSystem.setBroadcastCallback((delta) => this.broadcastDelta(delta));
      this.gameLoop.systemRegistry.register(this.deltaSyncSystem);
    }

    // Try to load saved state
    const savedState = await this.persistence.loadState();

    if (savedState) {
      console.log(`[UniverseWorker] Loading saved state from tick ${savedState.tick}`);
      this.loadState(savedState);
      this.tick = savedState.tick;
    } else {
      console.log('[UniverseWorker] No saved state, starting fresh');
      this.tick = 0;
    }

    // Start simulation loop
    this.running = true;
    this.loop();
  }

  /**
   * Main simulation loop (20 TPS)
   */
  private loop(): void {
    if (!this.running) return;

    const startTime = performance.now();

    // Run simulation step (unless paused)
    if (!this.paused) {
      this.simulate();
      this.tick++;
    }

    // Broadcast to all connected windows
    // When path prediction is enabled, DeltaSyncSystem handles broadcasts
    // Otherwise, use full state broadcast
    if (!this.config.enablePathPrediction || !this.deltaSyncSystem) {
      this.broadcast();
    }

    // Auto-save periodically
    if (this.tick % this.config.autoSaveInterval === 0 && !this.paused) {
      this.persist().catch((error) => {
        console.error('[UniverseWorker] Auto-save failed:', error);
      });
    }

    // Maintain target TPS
    const elapsed = performance.now() - startTime;
    const targetDelay = (1000 / this.config.targetTPS) * (1 / this.config.speedMultiplier);
    const delay = Math.max(0, targetDelay - elapsed);

    setTimeout(() => this.loop(), delay);
  }

  /**
   * Run one simulation step
   */
  private simulate(): void {
    try {
      // Use public GameLoop tick method
      this.gameLoop.tick();
    } catch (error) {
      console.error('[UniverseWorker] Simulation error:', error);
      this.broadcastError('Simulation error', error);
    }
  }

  /**
   * Broadcast state to all connected windows
   * Uses spatial culling - each window only receives entities in its viewport
   *
   * Note: This is the fallback method when path prediction is disabled.
   * When path prediction is enabled, DeltaSyncSystem calls broadcastDelta instead.
   */
  private broadcast(): void {
    if (this.connections.size === 0) return;

    for (const [id, conn] of this.connections) {
      if (!conn.connected) continue;

      try {
        // Serialize state for this connection's viewport
        const state = this.serializeState(conn.viewport);

        const message: WorkerToWindowMessage = {
          type: 'tick',
          tick: this.tick,
          state,
          timestamp: Date.now(),
        };

        conn.port.postMessage(message);
        conn.lastActivity = Date.now();
      } catch (error) {
        console.warn(`[UniverseWorker] Failed to send to connection ${id}:`, error);
        this.removeConnection(id);
      }
    }
  }

  /**
   * Broadcast delta update to all connected windows
   * Called by DeltaSyncSystem when path prediction is enabled
   *
   * Only sends entities that have changed (marked as dirty)
   */
  private broadcastDelta(delta: DeltaUpdate): void {
    if (this.connections.size === 0) return;

    // TODO: Apply per-connection viewport filtering to delta updates
    // For now, broadcast all delta updates to all connections

    const message: WorkerToWindowMessage = {
      type: 'delta',
      delta,
    };

    for (const [id, conn] of this.connections) {
      if (!conn.connected) continue;

      try {
        conn.port.postMessage(message);
        conn.lastActivity = Date.now();
      } catch (error) {
        console.warn(`[UniverseWorker] Failed to send delta to connection ${id}:`, error);
        this.removeConnection(id);
      }
    }
  }

  /**
   * Broadcast error to all connections
   */
  private broadcastError(error: string, details?: any): void {
    const message: WorkerToWindowMessage = {
      type: 'error',
      error,
      details,
    };

    for (const conn of this.connections.values()) {
      try {
        conn.port.postMessage(message);
      } catch {
        // Ignore send errors when broadcasting errors
      }
    }
  }

  /**
   * Persist current state to IndexedDB
   */
  private async persist(): Promise<void> {
    const state = this.serializeState();

    await this.persistence.saveState(state);
  }

  /**
   * Serialize current state for transfer/storage
   *
   * @param viewport Optional viewport for spatial culling
   */
  private serializeState(viewport?: Viewport): UniverseState {
    const world = this.serializeWorld(viewport);

    return {
      tick: this.tick,
      lastSaved: Date.now(),
      world,
      metadata: {
        version: '1.0.0',
        universeId: this.gameLoop.universeId,
      },
    };
  }

  /**
   * Serialize world state
   *
   * @param viewport Optional viewport for spatial culling
   */
  private serializeWorld(viewport?: Viewport): SerializedWorld {
    const entities: Record<string, Record<string, any>> = {};

    // Serialize entities (with optional spatial culling)
    const allEntities = this.gameLoop.world.getAllEntities();
    for (const entity of allEntities) {
      // Spatial culling: skip entities outside viewport
      if (viewport) {
        const position = entity.getComponent('position');
        if (position && !this.isInViewport(position, viewport)) {
          continue;  // Skip entity outside viewport
        }
      }

      const components: Record<string, any> = {};

      for (const [type, component] of entity.getAllComponents()) {
        components[type] = component;
      }

      entities[entity.id] = components;
    }

    // Serialize tiles
    const tiles = [];
    for (const tile of this.gameLoop.world.getAllTiles()) {
      tiles.push({
        x: tile.x,
        y: tile.y,
        type: tile.type,
        data: tile,
      });
    }

    // Extract global state (singletons)
    const globals: Record<string, any> = {};

    const timeEntity = this.gameLoop.world.query().with('time').executeEntities()[0];
    if (timeEntity) {
      globals.time = timeEntity.getComponent('time');
    }

    const weatherEntity = this.gameLoop.world.query().with('weather').executeEntities()[0];
    if (weatherEntity) {
      globals.weather = weatherEntity.getComponent('weather');
    }

    return {
      entities,
      tiles,
      globals,
    };
  }

  /**
   * Load state from serialized data
   */
  private loadState(state: UniverseState): void {
    // Clear current world
    for (const entity of this.gameLoop.world.getAllEntities()) {
      this.gameLoop.world.removeEntity(entity.id);
    }

    // Load entities
    for (const [entityId, components] of Object.entries(state.world.entities)) {
      const entity = this.gameLoop.world.createEntity(entityId);

      for (const [type, component] of Object.entries(components)) {
        entity.addComponent(component);
      }
    }

    // Load tiles
    for (const tileData of state.world.tiles) {
      this.gameLoop.world.setTile(tileData.x, tileData.y, tileData.type, tileData.data);
    }

    this.tick = state.tick;

    console.log(`[UniverseWorker] Loaded state with ${Object.keys(state.world.entities).length} entities`);
  }

  /**
   * Handle new window connection
   */
  addConnection(port: MessagePort): void {
    const id = crypto.randomUUID();

    const conn: ConnectionInfo = {
      id,
      port,
      subscribedDomains: new Set(['village']), // Default subscription
      connected: true,
      lastActivity: Date.now(),
    };

    this.connections.set(id, conn);

    // Send initial state
    const state = this.serializeState();
    const initMessage: WorkerToWindowMessage = {
      type: 'init',
      connectionId: id,
      state,
      tick: this.tick,
    };

    port.postMessage(initMessage);

    // Handle messages from this connection
    port.onmessage = (e: MessageEvent<WindowToWorkerMessage>) => {
      this.handleMessage(id, e.data);
    };

    port.start();

    console.log(`[UniverseWorker] New connection: ${id} (total: ${this.connections.size})`);
  }

  /**
   * Remove a connection
   */
  private removeConnection(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.connected = false;
      this.connections.delete(id);
      console.log(`[UniverseWorker] Removed connection: ${id} (remaining: ${this.connections.size})`);
    }
  }

  /**
   * Handle message from a window
   */
  private handleMessage(connectionId: string, message: WindowToWorkerMessage): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    conn.lastActivity = Date.now();

    switch (message.type) {
      case 'action':
        this.applyAction(message.action);
        break;

      case 'subscribe':
        conn.subscribedDomains = new Set(message.domains);
        console.log(`[UniverseWorker] Connection ${connectionId} subscribed to:`, message.domains);
        break;

      case 'request-snapshot':
        this.sendSnapshot(conn.port).catch((error) => {
          console.error('[UniverseWorker] Failed to send snapshot:', error);
        });
        break;

      case 'pause':
        this.paused = true;
        console.log('[UniverseWorker] Paused');
        break;

      case 'resume':
        this.paused = false;
        console.log('[UniverseWorker] Resumed');
        break;

      case 'set-speed':
        this.config.speedMultiplier = message.speed;
        console.log(`[UniverseWorker] Speed set to ${message.speed}x`);
        break;

      case 'set-viewport':
        conn.viewport = message.viewport;
        break;
    }
  }

  /**
   * Apply a game action
   */
  private applyAction(action: GameAction): void {
    try {
      // Log action to IndexedDB
      this.persistence.logEvent(action, this.tick).catch((error) => {
        console.error('[UniverseWorker] Failed to log action:', error);
      });

      // Handle action based on type
      switch (action.type) {
        case 'SPAWN_AGENT':
          this.handleSpawnAgent(action.payload);
          break;

        default:
          console.warn(`[UniverseWorker] Unknown action: ${action.domain}/${action.type}`);
      }
    } catch (error) {
      console.error('[UniverseWorker] Failed to apply action:', error);
      this.broadcastError('Action failed', { action, error });
    }
  }

  /**
   * Handle SPAWN_AGENT action
   */
  private handleSpawnAgent(payload: any): void {
    const { x = 0, y = 0, name = 'Agent' } = payload;

    const agent = this.gameLoop.world.createEntity();

    // Add basic components for agent
    agent.addComponent({
      type: 'identity',
      name: name || `Agent ${this.gameLoop.world.getAllEntities().length}`,
      age: 18,
      species: 'human',
    });

    agent.addComponent({
      type: 'position',
      x,
      y,
    });

    agent.addComponent({
      type: 'agent',
    });

    console.log(`[UniverseWorker] Spawned agent "${name}" at (${x}, ${y})`);
  }

  /**
   * Check if position is within viewport bounds
   *
   * @param position Entity position component
   * @param viewport Viewport bounds
   * @returns true if position is visible in viewport
   */
  private isInViewport(position: any, viewport: Viewport): boolean {
    const margin = viewport.margin || 50;  // Default margin for smooth scrolling

    const minX = viewport.x - viewport.width / 2 - margin;
    const maxX = viewport.x + viewport.width / 2 + margin;
    const minY = viewport.y - viewport.height / 2 - margin;
    const maxY = viewport.y + viewport.height / 2 + margin;

    return (
      position.x >= minX &&
      position.x <= maxX &&
      position.y >= minY &&
      position.y <= maxY
    );
  }

  /**
   * Send snapshot to a specific port
   */
  private async sendSnapshot(port: MessagePort): Promise<void> {
    const state = this.serializeState();
    const snapshotId = await this.persistence.createSnapshot(state);

    const snapshot = await this.persistence.loadSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error('Failed to load snapshot after creation');
    }

    // Compress and send
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(snapshot));

    const message: WorkerToWindowMessage = {
      type: 'snapshot',
      data,
    };

    port.postMessage(message);
  }
}

// Global instance
const universe = new UniverseWorker();
universe.init().catch((error) => {
  console.error('[UniverseWorker] Initialization failed:', error);
});

// SharedWorker connection handler
// @ts-ignore - SharedWorkerGlobalScope
self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  universe.addConnection(port);
};
