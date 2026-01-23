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

import { World, ActionQueue, SystemRegistry, EventBus } from '@ai-village/core';
import { UniverseClient } from './universe-client.js';
import { PathInterpolationSystem } from './PathInterpolationSystem.js';
import type { UniverseState, SerializedWorld } from './types.js';
import type { DeltaUpdate } from './path-prediction-types.js';

/**
 * GameLoop-compatible interface for view-only windows
 *
 * This is NOT a real GameLoop - it's a compatibility shim that provides
 * the same interface so existing code works, but doesn't run any simulation.
 */
export interface ViewOnlyGameLoop {
  /** View-only World (synced from worker) */
  readonly world: WorldImpl;

  /** Action queue (forwards to worker) */
  readonly actionQueue: ActionQueue;

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
  private readonly viewActionQueue: ActionQueue;
  private readonly viewSystemRegistry: SystemRegistry;
  private unsubscribe: (() => void) | null = null;
  private currentTick: number = 0;
  private universeId: string = '';

  constructor() {
    // Create view-only components (NO SIMULATION)
    this.viewWorld = new WorldImpl();
    this.viewActionQueue = new ActionQueue();
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
      get actionQueue(): ActionQueue {
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

      // Update position (correction from worker)
      entity.addComponent({
        type: 'position',
        ...update.position,
      });

      // Update path interpolator if prediction changed
      if (update.prediction) {
        entity.addComponent({
          type: 'path_interpolator',
          version: 1,
          prediction: update.prediction,
          basePosition: update.position,
          baseTick: delta.tick,
        });
      }

      // Update full components if this is a new entity
      if (update.components) {
        for (const [type, component] of Object.entries(update.components)) {
          entity.addComponent(component);
        }
      }
    }

    // Remove deleted entities
    if (delta.removed) {
      for (const entityId of delta.removed) {
        this.viewWorld.removeEntity(entityId);
      }
    }

    // Run path interpolation system to update positions
    this.viewSystemRegistry.executeAll(this.viewWorld);
  }

  /**
   * Forward any queued actions to the worker
   *
   * Actions queued locally (via actionQueue.enqueue) are forwarded to
   * the worker for execution.
   */
  private forwardQueuedActions(): void {
    const actions = this.viewActionQueue.dequeueAll();
    for (const action of actions) {
      this.universeClient.dispatch({
        type: action.type,
        domain: 'village', // TODO: Determine domain from action
        payload: action.payload,
      });
    }
  }

  /**
   * Sync entities from serialized state to local world
   */
  private syncEntities(serializedWorld: SerializedWorld, world: WorldImpl): void {
    const serializedIds = new Set(Object.keys(serializedWorld.entities));

    // Remove entities that no longer exist
    for (const entity of world.getAllEntities()) {
      if (!serializedIds.has(entity.id)) {
        world.removeEntity(entity.id);
      }
    }

    // Add/update entities
    for (const [entityId, components] of Object.entries(serializedWorld.entities)) {
      let entity = world.getEntity(entityId);

      if (!entity) {
        // Create new entity
        entity = world.createEntity(entityId);
      }

      // Update components
      const currentComponentTypes = new Set(
        Array.from(entity.getAllComponents()).map(([type]) => type)
      );

      // Remove components that no longer exist
      for (const type of currentComponentTypes) {
        if (!(type in components)) {
          entity.removeComponent(type);
        }
      }

      // Add/update components
      for (const [type, component] of Object.entries(components)) {
        if (currentComponentTypes.has(type)) {
          // Update existing component
          entity.removeComponent(type);
          entity.addComponent(component);
        } else {
          // Add new component
          entity.addComponent(component);
        }
      }
    }
  }

  /**
   * Sync tiles from serialized state to local world
   */
  private syncTiles(serializedWorld: SerializedWorld, world: WorldImpl): void {
    // Sync tiles (simplified - could be optimized with dirty tracking)
    for (const tile of serializedWorld.tiles) {
      world.setTile(tile.x, tile.y, tile.type, tile.data);
    }
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
        timeEntity.removeComponent('time');
        timeEntity.addComponent(serializedWorld.globals.time);
      } else {
        const timeEntity = world.createEntity();
        timeEntity.addComponent(serializedWorld.globals.time);
      }
    }

    // Update weather entity
    if (serializedWorld.globals.weather) {
      const weatherEntities = world.query().with('weather').executeEntities();
      if (weatherEntities.length > 0) {
        const weatherEntity = weatherEntities[0];
        weatherEntity.removeComponent('weather');
        weatherEntity.addComponent(serializedWorld.globals.weather);
      } else {
        const weatherEntity = world.createEntity();
        weatherEntity.addComponent(serializedWorld.globals.weather);
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
