import type { WorldMutator } from '../ecs/World.js';
import type { ISystemRegistry } from '../ecs/SystemRegistry.js';
import type { IActionQueue } from '../actions/ActionQueue.js';
import type { Entity } from '../ecs/Entity.js';
import { EventBusImpl } from '../events/EventBus.js';
import { WorldImpl, type World } from '../ecs/World.js';
import { SystemRegistry } from '../ecs/SystemRegistry.js';
import { ActionRegistry } from '../actions/ActionRegistry.js';
import { ActionQueue } from '../actions/ActionQueue.js';
import { ComponentRegistry } from '../ecs/ComponentRegistry.js';
import { TICKS_PER_SECOND, MS_PER_TICK } from '../types.js';
import { timelineManager } from '../multiverse/TimelineManager.js';
import { SystemProfiler } from '../profiling/SystemProfiler.js';

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
  // EMA smoothing factor: 0.05 = ~60 samples (~3s at 20 TPS)
  private readonly EMA_ALPHA = 0.05;

  // Query cache - invalidated when archetypeVersion changes
  private queryCache = new Map<string, ReadonlyArray<Entity>>();
  private lastArchetypeVersion = -1;

  // Universe tracking for timeline management
  private _universeId: string = 'default';

  // Performance profiler (optional, disabled by default)
  private profiler: SystemProfiler | null = null;
  private profilingEnabled = false;

  constructor() {
    this.eventBus = new EventBusImpl();
    this._systemRegistry = new SystemRegistry();
    this._world = new WorldImpl(this.eventBus, undefined, this._systemRegistry);
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

  get world(): WorldMutator {
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

  get universeId(): string {
    return this._universeId;
  }

  set universeId(id: string) {
    this._universeId = id;
  }

  start(): void {
    if (this._state === 'running') return;

    this._state = 'running';
    this.lastTickTime = performance.now();
    this.accumulator = 0;

    // Attach timeline manager to world for canon event listening
    timelineManager.attachToWorld(this._universeId, this._world);

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

    // Detach timeline manager
    timelineManager.detachFromWorld(this._universeId);

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

    // Update profiler if enabled
    if (this.profilingEnabled && this.profiler) {
      this.profiler.setCurrentTick(this._world.tick);
    }

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
    const systemTimings: Array<{ id: string; time: number }> = [];

    // Check if archetype changed - invalidate query cache if so
    const currentArchetypeVersion = this._world.archetypeVersion;
    if (currentArchetypeVersion !== this.lastArchetypeVersion) {
      this.queryCache.clear();
      this.lastArchetypeVersion = currentArchetypeVersion;
    }

    // Execute each system
    for (const system of systems) {
      const systemStart = performance.now();

      // Skip systems whose activation components don't exist in the world (O(1) check)
      if (system.activationComponents && system.activationComponents.length > 0) {
        const hasActivation = system.activationComponents.some(
          componentType => this._world.hasComponentType(componentType)
        );
        if (!hasActivation) {
          // System has nothing to do - skip entirely
          continue;
        }
      }

      try {
        // Get entities that match this system's requirements (cached)
        let entities: ReadonlyArray<Entity>;
        if (system.requiredComponents.length === 0) {
          // Systems with no required components get ALL entities
          // This allows them to do their own filtering (e.g., BeliefGenerationSystem)
          entities = this._world.query().executeEntities();
        } else {
          // Check cache first
          const cached = this.queryCache.get(system.id);
          if (cached !== undefined) {
            entities = cached;
          } else {
            // Build query and cache result
            const query = this._world.query();
            for (const componentType of system.requiredComponents) {
              query.with(componentType);
            }
            entities = query.executeEntities();
            this.queryCache.set(system.id, entities);
          }
        }

        // Update system (with profiling if enabled)
        if (this.profilingEnabled && this.profiler) {
          this.profiler.profileSystem(
            system.id,
            () => {
              system.update(this._world, entities, this.msPerTick / 1000);
            },
            entities.length
          );
        } else {
          system.update(this._world, entities, this.msPerTick / 1000);
        }
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

      // Track ALL system timings for profiling
      systemTimings.push({ id: system.id, time: systemTime });
    }

    // Capture systems phase timing
    const systemsEndTime = performance.now();
    const totalSystemsTime = systemsEndTime - tickStart;

    // Process actions
    const actionStart = performance.now();
    this._actionQueue.process(this._world);
    const actionTime = performance.now() - actionStart;

    // Flush events
    const flushStart = performance.now();
    this.eventBus.flush();
    const flushTime = performance.now() - flushStart;

    // Check for time-based events (hour, day, season, year)
    const timeEventsStart = performance.now();
    const prevGameTime = this._world.gameTime;

    // Advance tick
    this._world.advanceTick();

    // Update introspection cache if API is attached
    // Type guard: Introspection API is dynamically attached at runtime by introspection package
    if ('__introspectionAPI' in this._world) {
      const worldWithAPI = this._world as World & {
        __introspectionAPI?: { onTick?: (tick: number) => void };
      };
      if (
        worldWithAPI.__introspectionAPI &&
        typeof worldWithAPI.__introspectionAPI.onTick === 'function'
      ) {
        worldWithAPI.__introspectionAPI.onTick(this._world.tick);
      }
    }

    // Update timeline manager for auto-snapshots (fire-and-forget)
    timelineManager.tick(
      this._universeId,
      this._world,
      BigInt(this._world.tick)
    ).catch(err => console.error('[GameLoop] Timeline tick error:', err));

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

    // Clear dirty tracking state for next tick
    // This must happen before tick-end so systems can still see dirty state during the tick
    this._world.dirtyTracker.clearTick();

    // Emit tick end event
    this.eventBus.emit({
      type: 'world:tick:end',
      source: 'world',
      data: { tick: this._world.tick },
    });

    // Final flush for tick-end events
    const flush2Start = performance.now();
    this.eventBus.flush();
    const flush2Time = performance.now() - flush2Start;
    const timeEventsTime = performance.now() - timeEventsStart;

    // Prune event history periodically to prevent memory leaks
    // Keep last 5000 ticks of history, prune every 1000 ticks
    if (this._world.tick % 1000 === 0) {
      this.eventBus.pruneHistory(this._world.tick - 5000);
      // Decay maxTickTime so it reflects recent performance (not ancient spikes)
      this.maxTickTime *= 0.5;
    }

    // Update stats using exponential moving average for responsiveness
    const tickTime = performance.now() - tickStart;
    this.tickCount++;
    // EMA: weights recent ticks more heavily (reflects ~last 3 seconds)
    // First tick uses actual value, then blends with EMA
    this.avgTickTime = this.tickCount === 1
      ? tickTime
      : this.EMA_ALPHA * tickTime + (1 - this.EMA_ALPHA) * this.avgTickTime;
    this.maxTickTime = Math.max(this.maxTickTime, tickTime);

    // Record tick time in profiler if enabled
    if (this.profilingEnabled && this.profiler) {
      this.profiler.recordTickTime(this._world.tick, tickTime);
    }

    // Warn if tick took too long - include full breakdown
    if (tickTime > this.msPerTick) {
      // Sort systems to find top 5 slowest
      systemTimings.sort((a, b) => b.time - a.time);
      const top3 = systemTimings.slice(0, 3).map(s => `${s.id}:${s.time.toFixed(0)}`).join(', ');
      console.warn(
        `Tick ${this._world.tick} took ${tickTime.toFixed(0)}ms | sys:${totalSystemsTime.toFixed(0)} act:${actionTime.toFixed(0)} flush:${flushTime.toFixed(0)} time:${timeEventsTime.toFixed(0)} flush2:${flush2Time.toFixed(0)} | top3: ${top3}`
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

  /**
   * Enable performance profiling
   * Profiles system execution times and generates performance reports
   */
  enableProfiling(): void {
    if (!this.profiler) {
      this.profiler = new SystemProfiler();
      this.profiler.startSession(this._world.tick);
    }
    this.profilingEnabled = true;
  }

  /**
   * Disable performance profiling
   */
  disableProfiling(): void {
    this.profilingEnabled = false;
  }

  /**
   * Get performance profiling report
   */
  getProfilingReport() {
    if (!this.profiler) {
      throw new Error('Profiling not enabled. Call enableProfiling() first.');
    }
    return this.profiler.getReport();
  }

  /**
   * Export profiling report as JSON
   */
  exportProfilingJSON(): string {
    if (!this.profiler) {
      throw new Error('Profiling not enabled. Call enableProfiling() first.');
    }
    return this.profiler.exportJSON();
  }

  /**
   * Export profiling report as Markdown
   */
  exportProfilingMarkdown(): string {
    if (!this.profiler) {
      throw new Error('Profiling not enabled. Call enableProfiling() first.');
    }
    return this.profiler.exportMarkdown();
  }

  // Expose mutator for internal use only
  _getWorldMutator(): WorldMutator {
    return this._world;
  }
}
