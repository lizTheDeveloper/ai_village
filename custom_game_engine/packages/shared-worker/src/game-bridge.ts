/**
 * Game Bridge - View-Only Window Interface
 *
 * CRITICAL ARCHITECTURE PRINCIPLE:
 * Windows DO NOT run the simulation. They are PURE VIEWS.
 *
 * The SharedWorker is the single source of truth. Windows:
 * - Maintain a local "view" World for rendering/queries
 * - Sync state from the worker
 * - Forward all actions to the worker
 * - Never run game systems or the simulation loop
 *
 * This provides compatibility with existing code that expects a GameLoop,
 * while ensuring only the worker runs the actual simulation.
 */

import { World, WorldImpl, SystemRegistry, EventBusImpl, type IActionQueue, type Action, type Tick, type EntityId, ComponentType, type Component } from '@ai-village/core';
import { UniverseClient, type LoadingProgressCallback, type WorkerReadyCallback, type LoadCompleteCallback, type ChatMessageCallback, type ChatMessageData } from './universe-client.js';
import { PathInterpolationSystem } from './PathInterpolationSystem.js';
import type { UniverseState, SerializedWorld, SaveMetadata, LoadingProgress } from './types.js';
import type { DeltaUpdate } from './path-prediction-types.js';

/**
 * View-only action queue that doesn't process actions locally.
 * Actions are forwarded to the SharedWorker for processing.
 */
class ViewOnlyActionQueue implements IActionQueue {
  submit(_action: Omit<Action, 'id' | 'status' | 'createdAt'>): string {
    // View-only: actions should be dispatched via GameBridge.dispatchAction
    console.warn('[ViewOnlyActionQueue] submit() called - use GameBridge.dispatchAction() instead');
    return '';
  }
  getPending(_entityId: EntityId): ReadonlyArray<Action> {
    return [];
  }
  getExecuting(_entityId: EntityId): Action | undefined {
    return undefined;
  }
  cancel(_actionId: string, _reason: string): boolean {
    return false;
  }
  process(_world: any): void {
    // No-op: worker handles action processing
  }
  getHistory(_since?: Tick): ReadonlyArray<Action> {
    return [];
  }
}

/**
 * GameLoop-compatible interface for view-only windows
 *
 * This is NOT a real GameLoop - it's a compatibility shim that provides
 * the same interface so existing code works, but doesn't run any simulation.
 */
export interface ViewOnlyGameLoop {
  /** View-only World (synced from worker) */
  readonly world: World;

  /** Action queue (forwards to worker) */
  readonly actionQueue: IActionQueue;

  /** System registry (empty - systems run in worker) */
  readonly systemRegistry: SystemRegistry;

  /** Universe ID */
  readonly universeId: string;

  /** Current tick (from worker) */
  get tick(): number;

  /** Pause simulation (dispatches to worker) */
  pause(): void;

  /** Resume simulation (dispatches to worker) */
  resume(): void;

  /** Set simulation speed (dispatches to worker) */
  setSpeed(speed: number): void;

  /** Get stats (returns stub values for view-only mode) */
  getStats(): {
    tickCount: number;
    currentTick: number;
    avgTickTimeMs: number;
    maxTickTimeMs: number;
    systemStats: Record<string, any>;
  };
}

/**
 * Bridge between UniverseClient and GameLoop-expecting code
 *
 * Strategy:
 * - SharedWorker runs the authoritative simulation
 * - This bridge maintains a local "view" World for rendering/queries
 * - User actions are dispatched to the worker
 * - Local World is updated when state arrives from worker
 * - NO SYSTEMS RUN LOCALLY - all systems execute in the worker
 */
export class GameBridge {
  /** View-only game loop interface */
  public readonly gameLoop: ViewOnlyGameLoop;

  private readonly universeClient: UniverseClient;
  private readonly viewWorld: WorldImpl;
  private readonly viewActionQueue: IActionQueue;
  private readonly viewSystemRegistry: SystemRegistry;
  private unsubscribe: (() => void) | null = null;
  private currentTick: number = 0;
  private universeId: string = '';

  constructor() {
    // Create view-only components (NO SIMULATION)
    const viewEventBus = new EventBusImpl();
    this.viewWorld = new WorldImpl(viewEventBus);
    this.viewActionQueue = new ViewOnlyActionQueue();
    this.viewSystemRegistry = new SystemRegistry();
    this.universeClient = new UniverseClient();

    // Register path interpolation system (runs locally in window)
    const pathInterpolator = new PathInterpolationSystem();
    this.viewSystemRegistry.register(pathInterpolator);

    // Create GameLoop-compatible interface
    const self = this;
    this.gameLoop = {
      get world(): WorldImpl {
        return self.viewWorld;
      },
      get actionQueue(): IActionQueue {
        return self.viewActionQueue;
      },
      get systemRegistry(): SystemRegistry {
        return self.viewSystemRegistry;
      },
      get universeId(): string {
        return self.universeId;
      },
      get tick(): number {
        return self.currentTick;
      },
      pause(): void {
        self.pause();
      },
      resume(): void {
        self.resume();
      },
      setSpeed(speed: number): void {
        self.setSpeed(speed);
      },
      getStats() {
        // Return stub stats for view-only mode (real stats are in worker)
        return {
          tickCount: self.currentTick,
          currentTick: self.currentTick,
          avgTickTimeMs: 0,
          maxTickTimeMs: 0,
          systemStats: {},
        };
      },
    };
  }

  /**
   * Initialize the bridge and connect to SharedWorker
   */
  async init(): Promise<void> {
    // Connect to SharedWorker
    this.universeClient.connect();

    // Subscribe to state updates from worker (full state - fallback or initial)
    this.unsubscribe = this.universeClient.subscribe((state: UniverseState) => {
      this.updateLocalWorld(state);
    });

    // Subscribe to delta updates (path prediction)
    this.universeClient.subscribeDelta((delta: DeltaUpdate) => {
      this.handleDeltaUpdate(delta);
    });

    // Wait for initial connection
    let attempts = 0;
    while (!this.universeClient.isConnected() && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.universeClient.isConnected()) {
      throw new Error('[GameBridge] Failed to connect to SharedWorker after 5 seconds');
    }
  }

  /**
   * Update local world from worker state
   *
   * This is the ONLY way the local World changes - from worker updates.
   */
  private updateLocalWorld(state: UniverseState): void {
    // Update tick
    this.currentTick = state.tick;
    this.universeId = state.metadata.universeId;

    // Sync entities
    this.syncEntities(state.world, this.viewWorld);

    // Sync tiles
    this.syncTiles(state.world, this.viewWorld);

    // Sync globals (singletons)
    this.syncGlobals(state.world, this.viewWorld);

    // Process any actions in the view queue by forwarding to worker
    this.forwardQueuedActions();
  }

  /**
   * Handle delta update from worker (path prediction)
   *
   * Updates only the entities that changed, using path interpolation
   * components to predict positions locally.
   */
  private handleDeltaUpdate(delta: DeltaUpdate): void {
    // Update tick
    this.currentTick = delta.tick;

    // Process entity updates
    for (const update of delta.updates) {
      let entity = this.viewWorld.getEntity(update.entityId);

      if (!entity) {
        // New entity - create it
        entity = this.viewWorld.createEntity(update.entityId);
      }

      // Update position (correction from worker) - use World.addComponent
      this.viewWorld.addComponent(entity.id, {
        type: 'position' as ComponentType,
        version: 1,
        x: update.position.x,
        y: update.position.y,
      } as Component);

      // Update path interpolator if prediction changed
      if (update.prediction) {
        this.viewWorld.addComponent(entity.id, {
          type: 'path_interpolator' as ComponentType,
          version: 1,
          prediction: update.prediction,
          basePosition: update.position,
          baseTick: delta.tick,
        } as Component);
      }

      // Update full components if this is a new entity
      if (update.components) {
        for (const [, component] of Object.entries(update.components)) {
          this.viewWorld.addComponent(entity.id, component);
        }
      }
    }

    // Remove deleted entities
    if (delta.removed) {
      for (const entityId of delta.removed) {
        this.viewWorld.destroyEntity(entityId, 'delta_sync_removed');
      }
    }

    // Run path interpolation system to update positions
    // SystemRegistry internally has a private systems Map
    // We need to access it through reflection for now until a proper API is added
    interface SystemRegistryInternal {
      systems?: Map<string, { system: { update(world: World): void }; enabled: boolean }>;
    }
    const registryInternal = this.viewSystemRegistry as unknown as SystemRegistryInternal;
    const systems = Array.from(registryInternal.systems?.values() || []);
    for (const entry of systems) {
      if (entry && entry.system && entry.enabled) {
        entry.system.update(this.viewWorld);
      }
    }
  }

  /**
   * Forward any queued actions to the worker
   *
   * Actions queued locally (via actionQueue.enqueue) are forwarded to
   * the worker for execution.
   */
  private forwardQueuedActions(): void {
    // TODO: ActionQueue doesn't have dequeueAll method
    // For now, this is a no-op - actions would need to be processed differently
    // Possibly via getPending() and iterating entities
  }

  /**
   * Sync entities from serialized state to local world
   */
  private syncEntities(serializedWorld: SerializedWorld, world: WorldImpl): void {
    const serializedIds = new Set(Object.keys(serializedWorld.entities));

    // Remove entities that no longer exist
    for (const entity of world.getAllEntities()) {
      if (!serializedIds.has(entity.id)) {
        world.destroyEntity(entity.id, 'sync_removed');
      }
    }

    // Add/update entities
    for (const [entityId, components] of Object.entries(serializedWorld.entities)) {
      let entity = world.getEntity(entityId);

      if (!entity) {
        // Create new entity
        entity = world.createEntity(entityId);
      }

      // Update components - get current types from entity.components Map
      const currentComponentTypes = new Set(
        Array.from(entity.components.keys())
      );

      // Remove components that no longer exist
      for (const type of currentComponentTypes) {
        if (!(type in components)) {
          world.removeComponent(entity.id, type);
        }
      }

      // Add/update components - World.addComponent handles both add and update
      for (const [, component] of Object.entries(components)) {
        world.addComponent(entity.id, component);
      }
    }
  }

  /**
   * Sync tiles from serialized state to local world
   */
  private syncTiles(_serializedWorld: SerializedWorld, _world: WorldImpl): void {
    // Tiles are managed by ChunkManager, not synced via SharedWorker state
    // The worker serialization sends empty tiles array anyway
    // Future: Could sync visible chunks here if needed
  }

  /**
   * Sync global state (singletons)
   */
  private syncGlobals(serializedWorld: SerializedWorld, world: WorldImpl): void {
    // Update time entity
    if (serializedWorld.globals.time) {
      const timeEntities = world.query().with('time').executeEntities();
      if (timeEntities.length > 0) {
        const timeEntity = timeEntities[0];
        if (timeEntity) {
          // World.addComponent handles update if component already exists
          world.addComponent(timeEntity.id, serializedWorld.globals.time);
        }
      } else {
        const timeEntity = world.createEntity();
        world.addComponent(timeEntity.id, serializedWorld.globals.time);
      }
    }

    // Update weather entity
    if (serializedWorld.globals.weather) {
      const weatherEntities = world.query().with('weather').executeEntities();
      if (weatherEntities.length > 0) {
        const weatherEntity = weatherEntities[0];
        if (weatherEntity) {
          world.addComponent(weatherEntity.id, serializedWorld.globals.weather);
        }
      } else {
        const weatherEntity = world.createEntity();
        world.addComponent(weatherEntity.id, serializedWorld.globals.weather);
      }
    }
  }

  /**
   * Dispatch an action to the SharedWorker
   */
  dispatchAction(type: string, domain: 'village' | 'city' | 'deity' | 'cosmic', payload: any): void {
    this.universeClient.dispatch({
      type,
      domain,
      payload,
    });
  }

  /**
   * Emit an event to the SharedWorker's eventBus
   *
   * Use this for events that need to reach systems in the worker,
   * such as chat messages from DivineChatPanel.
   */
  emitEvent(event: { type: string; source: string; data: unknown }): void {
    this.universeClient.emitEvent(event);
  }

  /**
   * Pause simulation
   */
  pause(): void {
    this.universeClient.pause();
  }

  /**
   * Resume simulation
   */
  resume(): void {
    this.universeClient.resume();
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed: number): void {
    this.universeClient.setSpeed(speed);
  }

  /**
   * Get current state
   */
  getState(): UniverseState | null {
    return this.universeClient.getState();
  }

  /**
   * Get current tick
   */
  getTick(): number {
    return this.currentTick;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.universeClient.isConnected();
  }

  /**
   * Request snapshot for export
   */
  async requestSnapshot(): Promise<Uint8Array> {
    return this.universeClient.requestSnapshot();
  }

  // ============================================================================
  // SAVE MANAGEMENT API - Worker-first loading
  // ============================================================================

  /**
   * List all available saves from the worker
   * This allows the main thread to show a save browser without blocking
   */
  async listSaves(): Promise<SaveMetadata[]> {
    return this.universeClient.listSaves();
  }

  /**
   * Request the worker to load a specific save
   * The worker handles deserialization in the background
   * Subscribe to onLoadingProgress and onLoadComplete for updates
   */
  loadSave(saveKey: string): void {
    this.universeClient.loadSave(saveKey);
  }

  /**
   * Request the worker to create a new universe
   * Subscribe to onLoadComplete for when it's ready
   */
  createNewUniverse(config: { name?: string; magicParadigm?: string; scenario?: string } = {}): void {
    this.universeClient.createNewUniverse(config);
  }

  /**
   * Subscribe to loading progress updates
   * Useful for showing a loading bar while the worker loads a save
   */
  onLoadingProgress(callback: LoadingProgressCallback): () => void {
    return this.universeClient.onLoadingProgress(callback);
  }

  /**
   * Subscribe to worker ready status
   * Called when the worker is initialized and ready to receive commands
   */
  onWorkerReady(callback: WorkerReadyCallback): () => void {
    return this.universeClient.onWorkerReady(callback);
  }

  /**
   * Subscribe to load complete events
   * Called when save loading or new universe creation is complete
   */
  onLoadComplete(callback: LoadCompleteCallback): () => void {
    return this.universeClient.onLoadComplete(callback);
  }

  /**
   * Check if the worker is ready (systems initialized)
   */
  isWorkerReady(): boolean {
    return this.universeClient.isWorkerReady();
  }

  /**
   * Check if there are existing saves
   */
  hasExistingSaves(): boolean {
    return this.universeClient.hasExistingSaves();
  }

  /**
   * Subscribe to chat messages from the worker
   * These are chat:message_sent events forwarded from the SharedWorker
   */
  onChatMessage(callback: ChatMessageCallback): () => void {
    return this.universeClient.onChatMessage(callback);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.universeClient.disconnect();
  }
}

/**
 * Singleton game bridge instance
 */
export const gameBridge = new GameBridge();
