/**
 * SharedWorker Universe Implementation
 *
 * Runs ONCE, shared by all tabs/windows on same origin.
 * Owns the simulation loop and IndexedDB.
 *
 * KEY CHANGE: Now uses the SAME persistence layer as main thread (IndexedDBStorage)
 * so that saves created by main.ts can be loaded by the worker and vice versa.
 *
 * Based on: openspec/specs/ringworld-abstraction/RENORMALIZATION_LAYER.md
 */

/// <reference lib="webworker" />

import { GameLoop, worldSerializer, type WorldMutator } from '@ai-village/core';
import { IndexedDBStorage, type SaveMetadata as PersistenceSaveMetadata, type SaveFile } from '@ai-village/persistence';
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
  SaveMetadata,
  LoadingProgress,
} from './types.js';
import type { DeltaUpdate } from './path-prediction-types.js';

/**
 * UniverseWorker - The heart of the SharedWorker architecture
 *
 * KEY ARCHITECTURE:
 * - Worker starts but does NOT run simulation until a save is loaded or new universe created
 * - Uses the SAME IndexedDB storage as the main thread (database: 'ai_village')
 * - Main thread asks worker to list/load saves instead of loading itself
 * - Worker handles deserialization in background, streaming progress to main thread
 */
class UniverseWorker {
  private gameLoop: GameLoop;
  private storage: IndexedDBStorage;
  private connections: Map<string, ConnectionInfo> = new Map();
  private gameSetup: GameSetupResult | null = null;

  // Path prediction systems
  private pathPredictionSystem: PathPredictionSystem | null = null;
  private deltaSyncSystem: DeltaSyncSystem | null = null;

  private tick = 0;
  private running = false;
  private paused = false;
  private initialized = false;
  private currentSaveKey: string | null = null;

  private config: WorkerConfig = {
    targetTPS: 20,
    autoSaveInterval: 100, // Every 5 seconds
    debug: true,
    speedMultiplier: 1.0,
    enablePathPrediction: true, // Enable path prediction by default
  };

  constructor() {
    this.gameLoop = new GameLoop();
    // Use the SAME storage as main thread - database 'ai_village'
    this.storage = new IndexedDBStorage('ai_village');
  }

  /**
   * Initialize the worker systems (but don't start simulation yet)
   *
   * The worker initializes systems but waits for:
   * - 'load-save' message to load an existing save
   * - 'create-new-universe' message to start fresh
   *
   * This allows the main thread to show a universe browser first.
   */
  async init(): Promise<void> {
    console.log('[UniverseWorker] Initializing systems...');

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

    this.initialized = true;
    console.log('[UniverseWorker] Systems initialized, waiting for load-save or create-new-universe command');

    // NOTE: We do NOT start the simulation loop here
    // The main thread will tell us to load a save or create a new universe
  }

  /**
   * List all available saves from IndexedDB
   */
  async listSaves(): Promise<SaveMetadata[]> {
    const saves = await this.storage.list();

    // Convert PersistenceSaveMetadata to our SaveMetadata format
    return saves.map((save): SaveMetadata => ({
      key: save.key,
      name: save.name,
      timestamp: save.lastSavedAt,
      tick: 0, // Will be populated from save file if needed
      universeId: '', // Will be populated from save file if needed
      playTime: save.playTime,
    }));
  }

  /**
   * Load a specific save by key
   * Sends progress updates to all connected windows
   */
  async loadSave(saveKey: string, requestingPort?: MessagePort): Promise<boolean> {
    console.log(`[UniverseWorker] Loading save: ${saveKey}`);

    try {
      // Phase 1: Reading from storage
      this.broadcastLoadingProgress({
        phase: 'reading',
        progress: 10,
        message: 'Reading save file...',
      });

      const saveFile = await this.storage.load(saveKey);

      if (!saveFile) {
        this.broadcastLoadComplete(false, 'Save file not found');
        return false;
      }

      // Phase 2: Deserializing
      this.broadcastLoadingProgress({
        phase: 'deserializing',
        progress: 30,
        message: 'Deserializing world state...',
        entityCount: Object.keys(saveFile.universes?.[0]?.world?.entities || {}).length,
      });

      // Pause simulation during load
      const wasRunning = this.running;
      this.running = false;
      this.paused = true;

      // Clear current world
      const world = this.gameLoop.world as WorldMutator;
      for (const entity of Array.from(world.entities.values())) {
        world.destroyEntity(entity.id, 'save_load');
      }

      // Deserialize the save file using the proper WorldSerializer
      if (saveFile.universes && saveFile.universes.length > 0) {
        const universeSnapshot = saveFile.universes[0];

        this.broadcastLoadingProgress({
          phase: 'deserializing',
          progress: 50,
          message: `Loading ${Object.keys(universeSnapshot?.world?.entities || {}).length} entities...`,
        });

        // Use the worldSerializer to properly deserialize
        await worldSerializer.deserializeWorld(universeSnapshot, this.gameLoop.world);

        // Update tick from save
        if (universeSnapshot.time?.tick) {
          this.tick = universeSnapshot.time.tick;
        }
      }

      // Phase 3: Initializing
      this.broadcastLoadingProgress({
        phase: 'initializing',
        progress: 80,
        message: 'Initializing systems...',
      });

      this.currentSaveKey = saveKey;

      // Phase 4: Ready
      this.broadcastLoadingProgress({
        phase: 'ready',
        progress: 100,
        message: 'World loaded!',
        loadedEntities: Array.from(world.entities.values()).length,
      });

      // Resume simulation
      this.paused = false;
      if (!this.running) {
        this.running = true;
        this.loop();
      }

      this.broadcastLoadComplete(true, undefined, this.gameLoop.universeId, this.tick);

      console.log(`[UniverseWorker] Save loaded successfully: ${saveKey}, ${world.entities.size} entities`);
      return true;
    } catch (error) {
      console.error('[UniverseWorker] Failed to load save:', error);
      this.broadcastLoadComplete(false, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Broadcast loading progress to all connections
   */
  private broadcastLoadingProgress(progress: LoadingProgress): void {
    const message: WorkerToWindowMessage = {
      type: 'loading-progress',
      progress,
    };

    for (const conn of this.connections.values()) {
      if (conn.connected) {
        try {
          conn.port.postMessage(message);
        } catch {
          // Ignore errors during progress updates
        }
      }
    }
  }

  /**
   * Broadcast load complete to all connections
   */
  private broadcastLoadComplete(success: boolean, error?: string, universeId?: string, tick?: number): void {
    const message: WorkerToWindowMessage = {
      type: 'load-complete',
      success,
      error,
      universeId,
      tick,
    };

    for (const conn of this.connections.values()) {
      if (conn.connected) {
        try {
          conn.port.postMessage(message);
        } catch {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Send worker status to a specific connection
   */
  private async sendWorkerStatus(port: MessagePort): Promise<void> {
    const saves = await this.listSaves();
    const hasExistingSave = saves.length > 0;

    const message: WorkerToWindowMessage = {
      type: 'worker-ready',
      hasExistingSave,
      currentUniverseId: this.running ? this.gameLoop.universeId : undefined,
      currentTick: this.running ? this.tick : undefined,
    };

    port.postMessage(message);
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
   * Persist current state to IndexedDB using the same format as saveLoadService
   */
  private async persist(): Promise<void> {
    if (!this.currentSaveKey) {
      // Auto-generate a save key if we don't have one
      this.currentSaveKey = `autosave_${Date.now()}`;
    }

    try {
      // Use worldSerializer to create a proper save file
      const universeSnapshot = await worldSerializer.serializeWorld(
        this.gameLoop.world,
        this.gameLoop.universeId,
        'SharedWorker Auto-save'
      );

      const saveFile: SaveFile = {
        $schema: 'https://aivillage.dev/schemas/savefile/v1',
        $version: 1,
        header: {
          createdAt: Date.now(),
          lastSavedAt: Date.now(),
          playTime: 0,
          gameVersion: '1.0.0',
          formatVersion: 1,
          name: 'Auto-save',
          description: 'SharedWorker auto-save',
          decayPolicy: { decayAfterTicks: 1728000 },
        },
        multiverse: {
          $schema: 'https://aivillage.dev/schemas/multiverse/v1',
          $version: 1,
          time: {
            absoluteTick: this.tick.toString(),
            originTimestamp: Date.now(),
            currentTimestamp: Date.now(),
            realTimeElapsed: 0,
          },
          config: {},
        },
        universes: [universeSnapshot],
        passages: [],
        player: undefined,
        godCraftedQueue: [],
        checksums: {
          overall: '',
          universes: {},
          multiverse: '',
        },
      };

      await this.storage.save(this.currentSaveKey, saveFile);
    } catch (error) {
      console.error('[UniverseWorker] Failed to persist:', error);
    }
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
    const allEntities = Array.from(this.gameLoop.world.entities.values());
    for (const entity of allEntities) {
      // Spatial culling: skip entities outside viewport
      if (viewport) {
        const position = entity.getComponent('position');
        if (position && !this.isInViewport(position, viewport)) {
          continue;  // Skip entity outside viewport
        }
      }

      const components: Record<string, any> = {};

      for (const [type, component] of entity.components) {
        components[type] = component;
      }

      entities[entity.id] = components;
    }

    // Serialize tiles (Note: World doesn't expose tile iteration)
    // TODO: Use ChunkManager or WorldSerializer for proper tile serialization
    const tiles: any[] = [];

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

    // Handle messages from this connection
    port.onmessage = (e: MessageEvent<WindowToWorkerMessage>) => {
      this.handleMessage(id, e.data);
    };

    port.start();

    // If simulation is running, send current state
    // Otherwise, send worker-ready status so main thread knows what to do
    if (this.running) {
      const state = this.serializeState();
      const initMessage: WorkerToWindowMessage = {
        type: 'init',
        connectionId: id,
        state,
        tick: this.tick,
      };
      port.postMessage(initMessage);
    } else {
      // Worker is initialized but waiting for load-save or create-new-universe
      this.sendWorkerStatus(port).catch((error) => {
        console.error('[UniverseWorker] Failed to send initial status:', error);
      });
    }
  }

  /**
   * Remove a connection
   */
  private removeConnection(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.connected = false;
      this.connections.delete(id);
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
        break;

      case 'request-snapshot':
        this.sendSnapshot(conn.port).catch((error) => {
          console.error('[UniverseWorker] Failed to send snapshot:', error);
        });
        break;

      case 'pause':
        this.paused = true;
        break;

      case 'resume':
        this.paused = false;
        break;

      case 'set-speed':
        this.config.speedMultiplier = message.speed;
        break;

      case 'set-viewport':
        conn.viewport = message.viewport;
        break;

      // NEW: Save management messages
      case 'list-saves':
        this.handleListSaves(conn.port);
        break;

      case 'load-save':
        this.loadSave(message.saveKey, conn.port).catch((error) => {
          console.error('[UniverseWorker] Failed to load save:', error);
        });
        break;

      case 'create-new-universe':
        this.handleCreateNewUniverse(message.config, conn.port);
        break;

      case 'get-status':
        this.sendWorkerStatus(conn.port).catch((error) => {
          console.error('[UniverseWorker] Failed to send status:', error);
        });
        break;
    }
  }

  /**
   * Handle list-saves request
   */
  private async handleListSaves(port: MessagePort): Promise<void> {
    try {
      const saves = await this.listSaves();
      const message: WorkerToWindowMessage = {
        type: 'saves-list',
        saves,
      };
      port.postMessage(message);
    } catch (error) {
      console.error('[UniverseWorker] Failed to list saves:', error);
      this.broadcastError('Failed to list saves', error);
    }
  }

  /**
   * Handle create-new-universe request
   * Starts a fresh simulation without loading a save
   */
  private handleCreateNewUniverse(config: { name?: string; magicParadigm?: string; scenario?: string }, port: MessagePort): void {
    console.log('[UniverseWorker] Creating new universe:', config);

    this.broadcastLoadingProgress({
      phase: 'initializing',
      progress: 50,
      message: 'Creating new universe...',
    });

    // Reset world state
    const world = this.gameLoop.world as WorldMutator;
    for (const entity of Array.from(world.entities.values())) {
      world.destroyEntity(entity.id, 'new_universe');
    }

    this.tick = 0;
    this.currentSaveKey = null;

    // Start simulation loop if not already running
    if (!this.running) {
      this.running = true;
      this.paused = false;
      this.loop();
    }

    this.broadcastLoadingProgress({
      phase: 'ready',
      progress: 100,
      message: 'Universe ready!',
    });

    this.broadcastLoadComplete(true, undefined, this.gameLoop.universeId, 0);
  }

  /**
   * Apply a game action
   */
  private applyAction(action: GameAction): void {
    try {
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

    // Add basic components for agent using world.addComponent
    this.gameLoop.world.addComponent(agent.id, {
      type: 'identity',
      version: 1,
      name: name || `Agent ${Array.from(this.gameLoop.world.entities.values()).length}`,
      age: 18,
      species: 'human',
    });

    this.gameLoop.world.addComponent(agent.id, {
      type: 'position',
      version: 1,
      x,
      y,
    });

    this.gameLoop.world.addComponent(agent.id, {
      type: 'agent',
      version: 1,
      behavior: 'wander',
      behaviorState: {},
      thinkInterval: 20,
      lastThinkTick: 0,
      useLLM: false,
      llmCooldown: 0,
    });
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
  private async sendSnapshot(port: MessagePort | undefined): Promise<void> {
    if (!port) {
      throw new Error('Port is undefined');
    }

    // Create a snapshot using worldSerializer
    const universeSnapshot = await worldSerializer.serializeWorld(
      this.gameLoop.world,
      this.gameLoop.universeId,
      'Snapshot'
    );

    // Compress and send
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(universeSnapshot));

    const message: WorkerToWindowMessage = {
      type: 'snapshot',
      data,
    };

    port.postMessage(message);
  }

  /**
   * Remove the old loadState method - we now use loadSave
   */
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
  if (port) {
    universe.addConnection(port);
  } else {
    console.error('[UniverseWorker] No port available in connection event');
  }
};
