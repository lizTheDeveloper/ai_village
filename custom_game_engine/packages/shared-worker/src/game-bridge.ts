/**
 * Game Bridge - Compatibility layer between UniverseClient and existing game code
 *
 * This allows existing code that expects a GameLoop to work with the SharedWorker architecture.
 * The bridge maintains a local "view" World that gets updated from the worker's state.
 */

import { GameLoop, WorldImpl } from '@ai-village/core';
import { UniverseClient } from './universe-client.js';
import type { UniverseState, SerializedWorld } from './types.js';

/**
 * Bridge between UniverseClient and GameLoop-expecting code
 *
 * Strategy:
 * - SharedWorker runs the authoritative simulation
 * - This bridge maintains a local "view" World for rendering/queries
 * - User actions are dispatched to the worker
 * - Local World is updated when state arrives from worker
 */
export class GameBridge {
  public readonly gameLoop: GameLoop;
  private readonly universeClient: UniverseClient;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Create a local GameLoop for the "view" world
    // This won't run the simulation - just holds state for rendering
    this.gameLoop = new GameLoop();
    this.universeClient = new UniverseClient();
  }

  /**
   * Initialize the bridge and connect to SharedWorker
   */
  async init(): Promise<void> {
    console.log('[GameBridge] Initializing...');

    // Connect to SharedWorker
    this.universeClient.connect();

    // Subscribe to state updates
    this.unsubscribe = this.universeClient.subscribe((state: UniverseState) => {
      this.updateLocalWorld(state);
    });

    console.log('[GameBridge] Connected to SharedWorker');
  }

  /**
   * Update local world from worker state
   */
  private updateLocalWorld(state: UniverseState): void {
    const world = this.gameLoop.world as WorldImpl;

    // Update tick
    (world as any)._tick = state.tick;

    // Sync entities
    this.syncEntities(state.world, world);

    // Sync tiles
    this.syncTiles(state.world, world);

    // Sync globals (singletons)
    this.syncGlobals(state.world, world);
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
    // Clear existing tiles
    // Note: This is a simplified implementation - a real one would be more efficient
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
    return this.universeClient.getTick();
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
