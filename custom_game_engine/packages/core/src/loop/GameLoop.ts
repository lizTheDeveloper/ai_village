import type { World, WorldMutator } from '../ecs/World.js';
import type { ISystemRegistry } from '../ecs/SystemRegistry.js';
import type { IActionQueue } from '../actions/ActionQueue.js';
import { EventBusImpl } from '../events/EventBus.js';
import { WorldImpl } from '../ecs/World.js';
import { SystemRegistry } from '../ecs/SystemRegistry.js';
import { ActionRegistry } from '../actions/ActionRegistry.js';
import { ActionQueue } from '../actions/ActionQueue.js';
import { ComponentRegistry } from '../ecs/ComponentRegistry.js';
import { TICKS_PER_SECOND, MS_PER_TICK } from '../types.js';

export type GameLoopState = 'stopped' | 'running' | 'paused';

/**
 * The game loop - heart of the engine.
 * Runs at fixed 20 TPS, executes systems in order.
 */
export class GameLoop {
  readonly ticksPerSecond = TICKS_PER_SECOND;
  readonly msPerTick = MS_PER_TICK;

  private _state: GameLoopState = 'stopped';
  private _world: WorldImpl;
  private _systemRegistry: SystemRegistry;
  private _actionRegistry: ActionRegistry;
  private _actionQueue: ActionQueue;
  private _componentRegistry: ComponentRegistry;
  private eventBus: EventBusImpl;

  // Loop timing
  private lastTickTime = 0;
  private accumulator = 0;
  private animationFrameId: number | null = null;

  // Stats
  private tickCount = 0;
  private avgTickTime = 0;
  private maxTickTime = 0;

  constructor() {
    this.eventBus = new EventBusImpl();
    this._world = new WorldImpl(this.eventBus);
    this._systemRegistry = new SystemRegistry();
    this._componentRegistry = new ComponentRegistry();
    this._actionRegistry = new ActionRegistry();
    this._actionQueue = new ActionQueue(
      this._actionRegistry,
      () => this._world.tick
    );
  }

  get state(): GameLoopState {
    return this._state;
  }

  get world(): World {
    return this._world;
  }

  get systemRegistry(): ISystemRegistry {
    return this._systemRegistry;
  }

  get actionQueue(): IActionQueue {
    return this._actionQueue;
  }

  get componentRegistry() {
    return this._componentRegistry;
  }

  get actionRegistry() {
    return this._actionRegistry;
  }

  start(): void {
    if (this._state === 'running') return;

    this._state = 'running';
    this.lastTickTime = performance.now();
    this.accumulator = 0;

    // Initialize all systems
    const systems = this._systemRegistry.getSorted();
    for (const system of systems) {
      system.initialize?.(this._world, this.eventBus);
    }

    this.loop();
  }

  stop(): void {
    if (this._state === 'stopped') return;

    this._state = 'stopped';
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cleanup all systems
    const systems = this._systemRegistry.getSorted();
    for (const system of systems) {
      system.cleanup?.();
    }
  }

  pause(): void {
    if (this._state !== 'running') return;
    this._state = 'paused';
  }

  resume(): void {
    if (this._state !== 'paused') return;
    this._state = 'running';
    this.lastTickTime = performance.now();
    this.loop();
  }

  tick(): void {
    this.executeTick();
  }

  private loop = (): void => {
    if (this._state !== 'running') return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTickTime;
    this.lastTickTime = currentTime;

    // Accumulate time
    this.accumulator += deltaTime;

    // Execute fixed-timestep ticks
    let ticksThisFrame = 0;
    const maxTicksPerFrame = 5; // Prevent spiral of death

    while (this.accumulator >= this.msPerTick && ticksThisFrame < maxTicksPerFrame) {
      this.executeTick();
      this.accumulator -= this.msPerTick;
      ticksThisFrame++;
    }

    // If we're too far behind, reset
    if (this.accumulator > this.msPerTick * 10) {
      this.accumulator = 0;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private executeTick(): void {
    const tickStart = performance.now();

    // Update event bus tick
    this.eventBus.setCurrentTick(this._world.tick);

    // Emit tick start event
    this.eventBus.emit({
      type: 'world:tick:start',
      source: 'world',
      data: { tick: this._world.tick },
    });

    // Get all systems in priority order
    const systems = this._systemRegistry.getSorted();

    // Execute each system
    for (const system of systems) {
      const systemStart = performance.now();

      try {
        // Get entities that match this system's requirements
        let entities;
        if (system.requiredComponents.length === 0) {
          entities = [];
        } else {
          const query = this._world.query();
          for (const componentType of system.requiredComponents) {
            query.with(componentType);
          }
          entities = query.executeEntities();
        }

        // Update system
        system.update(this._world, entities, this.msPerTick / 1000);
      } catch (error) {
        console.error(`Error in system ${system.id}:`, error);
      }

      const systemTime = performance.now() - systemStart;

      // Record stats
      this._systemRegistry.recordStats(system.id, {
        systemId: system.id,
        enabled: true,
        avgTickTimeMs: systemTime,
        maxTickTimeMs: systemTime,
        lastEntityCount: 0,
        lastEventCount: 0,
      });
    }

    // Process actions
    this._actionQueue.process(this._world);

    // Flush events
    this.eventBus.flush();

    // Check for time-based events (hour, day, season, year)
    const prevGameTime = this._world.gameTime;

    // Advance tick
    this._world.advanceTick();

    const newGameTime = this._world.gameTime;

    // Emit time events if boundaries crossed
    if (newGameTime.hour !== prevGameTime.hour) {
      this.eventBus.emit({
        type: 'world:time:hour',
        source: 'world',
        data: { ...newGameTime },
      });
    }

    if (newGameTime.day !== prevGameTime.day) {
      this.eventBus.emit({
        type: 'world:time:day',
        source: 'world',
        data: { ...newGameTime },
      });
    }

    if (newGameTime.season !== prevGameTime.season) {
      this.eventBus.emit({
        type: 'world:time:season',
        source: 'world',
        data: { ...newGameTime },
      });
    }

    if (newGameTime.year !== prevGameTime.year) {
      this.eventBus.emit({
        type: 'world:time:year',
        source: 'world',
        data: { ...newGameTime },
      });
    }

    // Emit tick end event
    this.eventBus.emit({
      type: 'world:tick:end',
      source: 'world',
      data: { tick: this._world.tick },
    });

    // Final flush for tick-end events
    this.eventBus.flush();

    // Prune event history periodically to prevent memory leaks
    // Keep last 5000 ticks of history, prune every 1000 ticks
    if (this._world.tick % 1000 === 0) {
      this.eventBus.pruneHistory(this._world.tick - 5000);
    }

    // Update stats
    const tickTime = performance.now() - tickStart;
    this.tickCount++;
    this.avgTickTime = (this.avgTickTime * (this.tickCount - 1) + tickTime) / this.tickCount;
    this.maxTickTime = Math.max(this.maxTickTime, tickTime);

    // Warn if tick took too long
    if (tickTime > this.msPerTick) {
      console.warn(
        `Tick ${this._world.tick} took ${tickTime.toFixed(2)}ms (>${this.msPerTick}ms target)`
      );
    }
  }

  getStats() {
    return {
      tickCount: this.tickCount,
      currentTick: this._world.tick,
      avgTickTimeMs: this.avgTickTime,
      maxTickTimeMs: this.maxTickTime,
      systemStats: this._systemRegistry.getStats(),
    };
  }

  // Expose mutator for internal use only
  _getWorldMutator(): WorldMutator {
    return this._world;
  }
}
