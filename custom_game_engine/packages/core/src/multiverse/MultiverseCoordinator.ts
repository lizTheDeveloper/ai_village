/**
 * MultiverseCoordinator - Manages multiple universes with independent time scales
 *
 * Key responsibilities:
 * - Track absolute multiverse time (monotonic, never resets)
 * - Manage universe-relative time with different scales
 * - Enable universe forking for parallel testing
 * - Coordinate passage connections between universes
 */

import type { World } from '../ecs/World.js';
import { worldSerializer } from '../persistence/WorldSerializer.js';
import { timelineManager } from './TimelineManager.js';

export interface UniverseConfig {
  /** Unique universe identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Time scale multiplier (1.0 = normal, 2.0 = 2x speed, 0.5 = half speed) */
  timeScale: number;

  /** Multiverse identifier - universes in same multiverse share this ID */
  multiverseId: string;

  /** Creator identifier - who created this multiverse */
  creatorId?: string;

  /** Parent universe ID (for forked universes) */
  parentId?: string;

  /** Tick at which this universe was forked from parent */
  forkedAtTick?: bigint;

  /** Whether this universe is paused */
  paused: boolean;
}

export interface UniverseInstance {
  config: UniverseConfig;
  world: World;

  /** Current universe-relative tick count */
  universeTick: bigint;

  /** Last absolute tick when this universe was updated */
  lastAbsoluteTick: bigint;

  /** Accumulated paused duration (in absolute ticks) */
  pausedDuration: bigint;
}

export interface PassageConnection {
  id: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  type: 'thread' | 'bridge' | 'gate' | 'confluence';
  active: boolean;
}

export class MultiverseCoordinator {
  /** Absolute multiverse time (monotonic, never resets) */
  private absoluteTick: bigint = 0n;

  /** All universe instances */
  private universes: Map<string, UniverseInstance> = new Map();

  /** All passage connections */
  private passages: Map<string, PassageConnection> = new Map();

  /** Real-time origin (for calculating elapsed time) */
  private originTimestamp: number = Date.now();

  /** Current real-time timestamp */
  private currentTimestamp: number = Date.now();

  constructor() {
  }

  /**
   * Register a new universe.
   */
  registerUniverse(world: World, config: UniverseConfig): void {
    if (this.universes.has(config.id)) {
      throw new Error(`Universe ${config.id} is already registered`);
    }

    const instance: UniverseInstance = {
      config,
      world,
      universeTick: 0n,
      lastAbsoluteTick: this.absoluteTick,
      pausedDuration: 0n,
    };

    this.universes.set(config.id, instance);

  }

  /**
   * Unregister a universe.
   */
  unregisterUniverse(universeId: string): void {
    if (!this.universes.has(universeId)) {
      throw new Error(`Universe ${universeId} is not registered`);
    }

    this.universes.delete(universeId);
  }

  /**
   * Get a universe instance.
   */
  getUniverse(universeId: string): UniverseInstance | undefined {
    return this.universes.get(universeId);
  }

  /**
   * Get all universes.
   */
  getAllUniverses(): ReadonlyMap<string, UniverseInstance> {
    return this.universes;
  }

  /**
   * Fork a universe (create a parallel timeline).
   *
   * The forked universe starts with a deep clone of the source world state.
   * Can optionally fork from a specific timeline snapshot.
   */
  async forkUniverse(
    sourceUniverseId: string,
    forkId: string,
    forkName: string,
    options?: {
      timeScale?: number;
      fromSnapshotId?: string;  // Fork from a specific timeline snapshot
    }
  ): Promise<UniverseInstance> {
    const source = this.universes.get(sourceUniverseId);

    if (!source) {
      throw new Error(`Source universe ${sourceUniverseId} not found`);
    }

    if (this.universes.has(forkId)) {
      throw new Error(`Fork ID ${forkId} already exists`);
    }

    const forkConfig: UniverseConfig = {
      id: forkId,
      name: forkName,
      timeScale: options?.timeScale ?? source.config.timeScale,
      multiverseId: source.config.multiverseId,
      parentId: sourceUniverseId,
      forkedAtTick: source.universeTick,
      paused: false,
    };

    // Import World implementation and EventBus
    const { WorldImpl } = await import('../ecs/World.js');
    const { EventBusImpl } = await import('../events/EventBus.js');

    // Create a new world with a fresh event bus
    const forkEventBus = new EventBusImpl();
    const forkWorld = new WorldImpl(forkEventBus);

    // Check if forking from a timeline snapshot
    if (options?.fromSnapshotId) {
      const snapshotEntry = timelineManager.getSnapshot(options.fromSnapshotId);
      if (!snapshotEntry || !snapshotEntry.snapshot) {
        throw new Error(`Timeline snapshot ${options.fromSnapshotId} not found`);
      }


      // Deserialize the snapshot into the new world
      await worldSerializer.deserializeWorld(snapshotEntry.snapshot, forkWorld);
      forkConfig.forkedAtTick = BigInt(snapshotEntry.tick);

    } else {
      // Clone the current world state

      await worldSerializer.cloneWorld(
        source.world,
        forkWorld,
        forkId,
        forkName
      );
    }

    const fork: UniverseInstance = {
      config: forkConfig,
      world: forkWorld,
      universeTick: forkConfig.forkedAtTick ?? source.universeTick,
      lastAbsoluteTick: this.absoluteTick,
      pausedDuration: 0n,
    };

    this.universes.set(forkId, fork);


    return fork;
  }

  /**
   * Create a manual timeline snapshot for a universe.
   */
  async createTimelineSnapshot(
    universeId: string,
    label?: string
  ): Promise<void> {
    const universe = this.universes.get(universeId);
    if (!universe) {
      throw new Error(`Universe ${universeId} not found`);
    }

    await timelineManager.createSnapshot(
      universeId,
      universe.world,
      universe.universeTick,
      false,  // Not auto-save
      label
    );
  }

  /**
   * Get the timeline for a universe.
   */
  getTimeline(universeId: string) {
    return timelineManager.getTimeline(universeId);
  }

  /**
   * Get the timeline manager instance.
   */
  getTimelineManager() {
    return timelineManager;
  }

  /**
   * Create a passage connection between two universes.
   */
  createPassage(
    id: string,
    sourceUniverseId: string,
    targetUniverseId: string,
    type: 'thread' | 'bridge' | 'gate' | 'confluence'
  ): void {
    if (this.passages.has(id)) {
      throw new Error(`Passage ${id} already exists`);
    }

    if (!this.universes.has(sourceUniverseId)) {
      throw new Error(`Source universe ${sourceUniverseId} not found`);
    }

    if (!this.universes.has(targetUniverseId)) {
      throw new Error(`Target universe ${targetUniverseId} not found`);
    }

    const passage: PassageConnection = {
      id,
      sourceUniverseId,
      targetUniverseId,
      type,
      active: true,
    };

    this.passages.set(id, passage);

  }

  /**
   * Get a passage connection.
   */
  getPassage(id: string): PassageConnection | undefined {
    return this.passages.get(id);
  }

  /**
   * Get all passages.
   */
  getAllPassages(): ReadonlyMap<string, PassageConnection> {
    return this.passages;
  }

  /**
   * Check if two universes belong to the same multiverse.
   */
  areUniversesInSameMultiverse(universeId1: string, universeId2: string): boolean {
    const universe1 = this.universes.get(universeId1);
    const universe2 = this.universes.get(universeId2);

    if (!universe1 || !universe2) {
      return false;
    }

    return universe1.config.multiverseId === universe2.config.multiverseId;
  }

  /**
   * Get the multiverse ID for a universe.
   */
  getMultiverseId(universeId: string): string | undefined {
    const universe = this.universes.get(universeId);
    return universe?.config.multiverseId;
  }

  /**
   * Get all passages connected to a universe.
   */
  getPassagesForUniverse(universeId: string): PassageConnection[] {
    const passages: PassageConnection[] = [];

    for (const passage of this.passages.values()) {
      if (
        passage.sourceUniverseId === universeId ||
        passage.targetUniverseId === universeId
      ) {
        passages.push(passage);
      }
    }

    return passages;
  }

  /**
   * Pause a universe.
   */
  pauseUniverse(universeId: string): void {
    const universe = this.universes.get(universeId);

    if (!universe) {
      throw new Error(`Universe ${universeId} not found`);
    }

    if (universe.config.paused) {
      return;  // Already paused
    }

    universe.config.paused = true;
  }

  /**
   * Resume a universe.
   */
  resumeUniverse(universeId: string): void {
    const universe = this.universes.get(universeId);

    if (!universe) {
      throw new Error(`Universe ${universeId} not found`);
    }

    if (!universe.config.paused) {
      return;  // Already running
    }

    // Track how long we were paused
    const pausedTicks = this.absoluteTick - universe.lastAbsoluteTick;
    universe.pausedDuration += pausedTicks;
    universe.lastAbsoluteTick = this.absoluteTick;

    universe.config.paused = false;
  }

  /**
   * Set universe time scale.
   */
  setTimeScale(universeId: string, timeScale: number): void {
    const universe = this.universes.get(universeId);

    if (!universe) {
      throw new Error(`Universe ${universeId} not found`);
    }

    if (timeScale <= 0) {
      throw new Error('Time scale must be positive');
    }

    universe.config.timeScale = timeScale;
  }

  /**
   * Tick all universes (advance multiverse time).
   *
   * Each universe advances according to its time scale:
   * - Time scale 1.0: advances 1 tick per absolute tick
   * - Time scale 2.0: advances 2 ticks per absolute tick
   * - Time scale 0.5: advances 1 tick per 2 absolute ticks
   */
  tick(): void {
    this.absoluteTick += 1n;
    this.currentTimestamp = Date.now();

    for (const universe of this.universes.values()) {
      if (universe.config.paused) {
        continue;  // Skip paused universes
      }

      // Calculate ticks to advance based on time scale and absolute ticks elapsed
      const absoluteTicksElapsed = this.absoluteTick - universe.lastAbsoluteTick;
      const universeTicksToAdvance = BigInt(
        Math.floor(Number(absoluteTicksElapsed) * universe.config.timeScale)
      );

      if (universeTicksToAdvance > 0n) {
        universe.universeTick += universeTicksToAdvance;
        universe.lastAbsoluteTick = this.absoluteTick;

        // Note: Actual world.tick() is called by the game loop
        // This just tracks the time progression
      }
    }
  }

  /**
   * Get absolute multiverse tick.
   */
  getAbsoluteTick(): bigint {
    return this.absoluteTick;
  }

  /**
   * Get universe-relative tick.
   */
  getUniverseTick(universeId: string): bigint {
    const universe = this.universes.get(universeId);

    if (!universe) {
      throw new Error(`Universe ${universeId} not found`);
    }

    return universe.universeTick;
  }

  /**
   * Get real-time elapsed since origin.
   */
  getRealTimeElapsed(): number {
    return (this.currentTimestamp - this.originTimestamp) / 1000;
  }

  /**
   * Reset multiverse time (for new game).
   */
  reset(): void {
    this.absoluteTick = 0n;
    this.originTimestamp = Date.now();
    this.currentTimestamp = Date.now();

    for (const universe of this.universes.values()) {
      universe.universeTick = 0n;
      universe.lastAbsoluteTick = 0n;
      universe.pausedDuration = 0n;
    }

  }

  /**
   * Load state from snapshot.
   */
  loadFromSnapshot(snapshot: {
    absoluteTick: string;
    originTimestamp: number;
    currentTimestamp: number;
  }): void {
    this.absoluteTick = BigInt(snapshot.absoluteTick);
    this.originTimestamp = snapshot.originTimestamp;
    this.currentTimestamp = snapshot.currentTimestamp;

  }
}

// Global singleton
export const multiverseCoordinator = new MultiverseCoordinator();
