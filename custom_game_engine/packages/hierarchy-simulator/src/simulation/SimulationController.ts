/**
 * Simulation Controller
 *
 * Central data controller for the hierarchy simulation.
 * Owns all game state, runs the simulation loop, and provides read access to renderers.
 *
 * Integrates with RenormalizationEngine for:
 * - Time scaling per tier (ringworld = decade per tick)
 * - Statistical simulation of inactive tiers
 * - Summarization when zooming out
 * - Instantiation constraints when zooming in
 *
 * Pattern: Single source of truth for simulation data
 */

import type { AbstractTier, SimulationStats, GameEvent, TierLevel } from '../abstraction/types.js';
import { dataGenerator } from '../mock/DataGenerator.js';
import {
  renormalizationEngine,
  TIME_SCALE,
  type TierSummary,
  type InstantiationConstraints,
} from '../renormalization/index.js';

export interface SimulationState {
  rootTier: AbstractTier;
  tick: number;
  speed: number; // Simulation speed multiplier
  running: boolean;
  allEvents: GameEvent[]; // All events for history
  stats: SimulationStats;
}

export class SimulationController {
  private state: SimulationState;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  // History for graphs (circular buffer, last 100 ticks)
  private readonly MAX_HISTORY = 100;
  private history: {
    ticks: number[];
    population: number[];
    production: number[];
    consumption: number[];
    tradeVolume: number[];
    efficiency: number[];
  } = {
    ticks: [],
    population: [],
    production: [],
    consumption: [],
    tradeVolume: [],
    efficiency: []
  };

  constructor(hierarchyDepth: number = 5) {
    const rootTier = dataGenerator.generateHierarchy(hierarchyDepth);
    this.state = {
      rootTier,
      tick: 0,
      speed: 10, // 10x speed default
      running: true,
      allEvents: [],
      stats: {
        tick: 0,
        activeTiers: 0,
        totalPopulation: 0,
        totalProduction: new Map(),
        totalConsumption: new Map(),
        activeTradeRoutes: 0,
        economicEfficiency: 1.0
      }
    };
    // Calculate stats after state is initialized
    this.state.stats = this.calculateStats(rootTier);
  }

  /**
   * Start the simulation loop
   */
  start(): void {
    if (this.animationFrameId !== null) return; // Already running
    this.state.running = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  /**
   * Stop the simulation loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.state.running = false;
  }

  /**
   * Toggle pause/resume
   */
  togglePause(): boolean {
    this.state.running = !this.state.running;
    if (this.state.running && this.animationFrameId === null) {
      this.lastFrameTime = performance.now();
      this.loop();
    }
    return this.state.running;
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.1, Math.min(1000, speed));
  }

  /**
   * Reset simulation to initial state
   */
  reset(hierarchyDepth: number = 5): void {
    this.stop();
    this.state.rootTier = dataGenerator.generateHierarchy(hierarchyDepth);
    this.state.tick = 0;
    this.state.allEvents = [];
    this.state.stats = this.calculateStats(this.state.rootTier);
    this.history = {
      ticks: [],
      population: [],
      production: [],
      consumption: [],
      tradeVolume: [],
      efficiency: []
    };
    this.start();
  }

  /**
   * Get current simulation state (read-only)
   */
  getState(): Readonly<SimulationState> {
    return this.state;
  }

  /**
   * Get historical data for charts
   */
  getHistory(): Readonly<typeof this.history> {
    return this.history;
  }

  /**
   * Get specific tier by ID
   */
  getTierById(tierId: string): AbstractTier | null {
    return this.findTierById(this.state.rootTier, tierId);
  }

  /**
   * Get all descendants of a tier (flattened)
   */
  getAllDescendants(tier: AbstractTier): AbstractTier[] {
    const descendants: AbstractTier[] = [];
    for (const child of tier.children) {
      descendants.push(child);
      descendants.push(...this.getAllDescendants(child));
    }
    return descendants;
  }

  // ============================================================================
  // RENORMALIZATION: Zoom in/out and time scaling
  // ============================================================================

  /**
   * Get the renormalization engine for direct access
   */
  getRenormalizationEngine() {
    return renormalizationEngine;
  }

  /**
   * Get time scale multiplier for a tier level
   * Higher tiers simulate faster (ringworld = 5.2M ticks per tick = 1 decade)
   */
  getTimeScale(tierLevel: TierLevel): number {
    return TIME_SCALE[tierLevel] ?? 1;
  }

  /**
   * Zoom out: Summarize a tier and switch to statistical simulation
   * Called when player moves away from a tier
   */
  zoomOut(tierId: string): TierSummary | null {
    const tier = this.getTierById(tierId);
    if (!tier) return null;

    // Summarize the tier
    const summary = renormalizationEngine.summarize(tier);

    // Deactivate it (will use statistical simulation)
    renormalizationEngine.deactivateTier(tierId);

    // Set tier to abstract mode
    tier.mode = 'abstract';
    tier.timeScale = 0.1; // Slow down when abstract

    return summary;
  }

  /**
   * Zoom in: Get constraints for generating detailed entities
   * Called when player zooms into a tier
   */
  zoomIn(tierId: string): InstantiationConstraints | null {
    const tier = this.getTierById(tierId);
    if (!tier) return null;

    // Get constraints from summary
    const constraints = renormalizationEngine.getInstantiationConstraints(tierId);

    // Activate the tier (switch to full simulation)
    renormalizationEngine.activateTier(tierId);

    // Set tier to active mode
    tier.mode = 'active';
    tier.timeScale = 1.0;

    return constraints;
  }

  /**
   * Get summary for a tier (from cache or generate)
   */
  getTierSummary(tierId: string): TierSummary | null {
    // Check cache first
    let summary = renormalizationEngine.getSummary(tierId);

    if (!summary) {
      // Generate if not cached
      const tier = this.getTierById(tierId);
      if (tier) {
        summary = renormalizationEngine.summarize(tier);
      }
    }

    return summary ?? null;
  }

  /**
   * Get all tier summaries (for dashboard view)
   */
  getAllTierSummaries(): Map<string, TierSummary> {
    return renormalizationEngine.getAllSummaries();
  }

  /**
   * Check if a tier is currently active (full simulation)
   */
  isTierActive(tierId: string): boolean {
    return renormalizationEngine.isTierActive(tierId);
  }

  /**
   * Record a miracle performed in a tier
   */
  recordMiracle(tierId: string, deityId: string): void {
    renormalizationEngine.recordMiracle(tierId, deityId);
  }

  /**
   * Add a temple to a tier
   */
  addTemple(tierId: string, deityId: string): void {
    renormalizationEngine.addTemple(tierId, deityId);
  }

  /**
   * Get belief stats for all tiers (for heatmap)
   */
  getBeliefHeatmap(): Map<string, { density: number; dominant: string | null }> {
    const heatmap = new Map<string, { density: number; dominant: string | null }>();

    const collectBelief = (tier: AbstractTier): void => {
      const summary = this.getTierSummary(tier.id);
      if (summary) {
        heatmap.set(tier.id, {
          density: summary.belief.beliefDensity,
          dominant: summary.belief.dominantDeity,
        });
      }

      for (const child of tier.children) {
        collectBelief(child);
      }
    };

    collectBelief(this.state.rootTier);
    return heatmap;
  }

  // ============================================================================
  // PRIVATE: Simulation loop
  // ============================================================================

  private loop = (): void => {
    const now = performance.now();
    const deltaSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
    this.lastFrameTime = now;

    if (this.state.running) {
      const deltaTime = deltaSeconds * this.state.speed;
      this.update(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    // Update root tier (cascades to children)
    this.state.rootTier.update(deltaTime);
    this.state.tick += deltaTime;

    // Collect events from all tiers
    this.collectEvents(this.state.rootTier);

    // Calculate stats
    this.state.stats = this.calculateStats(this.state.rootTier);

    // Update history (every ~1 simulated tick)
    if (this.state.tick % 1 < deltaTime) {
      this.updateHistory();
    }
  }

  private collectEvents(tier: AbstractTier): void {
    // Collect events from this tier
    for (const event of tier.activeEvents) {
      // Check if we've already logged this event
      if (!this.state.allEvents.some(e => e.id === event.id)) {
        this.state.allEvents.push(event);

        // Trim old events (keep last 100)
        if (this.state.allEvents.length > 100) {
          this.state.allEvents.shift();
        }
      }
    }

    // Recurse to children
    for (const child of tier.children) {
      this.collectEvents(child);
    }
  }

  private updateHistory(): void {
    this.history.ticks.push(this.state.tick);
    this.history.population.push(this.state.stats.totalPopulation);

    // Calculate total production/consumption
    let totalProduction = 0;
    let totalConsumption = 0;
    for (const amount of this.state.stats.totalProduction.values()) {
      totalProduction += amount;
    }
    for (const amount of this.state.stats.totalConsumption.values()) {
      totalConsumption += amount;
    }

    this.history.production.push(totalProduction);
    this.history.consumption.push(totalConsumption);
    this.history.tradeVolume.push(this.state.stats.activeTradeRoutes);
    this.history.efficiency.push(this.state.stats.economicEfficiency);

    // Trim to max history length
    if (this.history.ticks.length > this.MAX_HISTORY) {
      this.history.ticks.shift();
      this.history.population.shift();
      this.history.production.shift();
      this.history.consumption.shift();
      this.history.tradeVolume.shift();
      this.history.efficiency.shift();
    }
  }

  private calculateStats(tier: AbstractTier): SimulationStats {
    const production = new Map<string, number>();
    const consumption = new Map<string, number>();
    let activeTradeRoutes = 0;
    let totalEfficiency = 0;
    let tierCount = 0;

    const collectStats = (t: AbstractTier): void => {
      tierCount++;

      // Aggregate production/consumption
      for (const [resource, amount] of t.economy.production) {
        production.set(resource, (production.get(resource) || 0) + amount);
      }
      for (const [resource, amount] of t.economy.consumption) {
        consumption.set(resource, (consumption.get(resource) || 0) + amount);
      }

      // Count trade routes
      activeTradeRoutes += t.tradeRoutes.filter(r => r.active).length;

      // Average efficiency
      totalEfficiency += t.tech.efficiency;

      // Recurse
      for (const child of t.children) {
        collectStats(child);
      }
    };

    collectStats(tier);

    return {
      tick: this.state.tick,
      activeTiers: tierCount,
      totalPopulation: tier.getTotalPopulation(),
      totalProduction: production,
      totalConsumption: consumption,
      activeTradeRoutes,
      economicEfficiency: tierCount > 0 ? totalEfficiency / tierCount : 1.0
    };
  }

  private findTierById(tier: AbstractTier, id: string): AbstractTier | null {
    if (tier.id === id) return tier;
    for (const child of tier.children) {
      const found = this.findTierById(child, id);
      if (found) return found;
    }
    return null;
  }
}
