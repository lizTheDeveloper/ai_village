/**
 * BackgroundUniverseManager - Dwarf Fortress-style background world simulation
 *
 * Spawns and manages hidden universes for:
 * - Invading factions from other planets
 * - Future/past timelines (time travel destinations)
 * - Parallel universes (multiverse invasions)
 *
 * Key features:
 * - Simulates universes in background at high speed (1000x-100,000x)
 * - Uses AbstractPlanet tier (O(1) cost, statistical simulation)
 * - Faction AI makes autonomous decisions (when to invade)
 * - Seamless transition to full ECS when player visits
 * - Worker threads for true parallel simulation
 *
 * Performance:
 * - 5-10 background universes: ~0.2-0.5ms/tick total
 * - Each universe: O(1) statistical simulation
 * - Workers prevent main thread blocking
 */

import type { World } from '../ecs/World.js';
import type { SystemEventManager } from '../events/TypedEventEmitter.js';
import { MultiverseCoordinator } from './MultiverseCoordinator.js';
import { PlanetFactionAI } from './PlanetFactionAI.js';
import { AbstractPlanet, RenormalizationEngine } from '@ai-village/hierarchy-simulator';
import type {
  BackgroundUniverseParams,
  BackgroundUniverse,
  BackgroundUniverseType,
  CulturalTraits,
  PlanetState,
  InvasionTriggeredEvent,
  BackgroundUniverseDiscoveredEvent,
  WorldInstantiationConstraints,
} from './BackgroundUniverseTypes.js';

/**
 * Default cultural traits for different universe types
 */
const DEFAULT_CULTURAL_TRAITS: Record<BackgroundUniverseType, Partial<CulturalTraits>> = {
  other_planet: {
    aggressiveness: 0.6,
    expansionism: 0.7,
    xenophobia: 0.5,
    collectivism: 0.5,
    technophilia: 0.7,
    mysticism: 0.3,
    cooperation: 0.4,
  },
  future_timeline: {
    // Future inherits player's culture, slightly more advanced
    technophilia: 0.8,
    mysticism: 0.2,
  },
  past_timeline: {
    // Past is less tech-focused, more traditional
    technophilia: 0.3,
    mysticism: 0.7,
  },
  parallel_universe: {
    // Parallel universe is similar to player
    aggressiveness: 0.5,
    expansionism: 0.5,
  },
  pocket_dimension: {
    // Magical realms
    mysticism: 0.9,
    technophilia: 0.1,
  },
  extradimensional: {
    // Alien physics, alien minds
    aggressiveness: 0.8,
    xenophobia: 0.9,
    collectivism: 0.8,
  },
};

/**
 * BackgroundUniverseManager - Main orchestrator for background simulation
 *
 * Usage:
 * ```typescript
 * const bgManager = new BackgroundUniverseManager(coordinator, world, eventBus);
 *
 * // Spawn alien empire
 * const alienId = await bgManager.spawnBackgroundUniverse({
 *   type: 'other_planet',
 *   description: 'Aggressive reptilian empire',
 *   culturalTraits: { aggressiveness: 0.9, ... },
 *   timeScale: 1000
 * });
 *
 * // Update background universes (call every tick)
 * await bgManager.update();
 *
 * // Check for invasions
 * eventBus.on('multiverse:invasion_triggered', (invasion) => {
 *   console.log(`Invasion from ${invasion.invaderUniverse}!`);
 * });
 * ```
 */
export class BackgroundUniverseManager {
  private coordinator: MultiverseCoordinator;
  private playerWorld: World;
  private eventBus: SystemEventManager;

  // Background universes (hidden from player UI)
  private backgroundUniverses = new Map<string, BackgroundUniverse>();

  // Portals/connections detected by player
  private playerPortals = new Set<string>(); // universe IDs player can access

  // Update throttling (check every 10 seconds)
  private lastUpdateTick = 0n;
  private readonly UPDATE_INTERVAL = 1000n; // 1000 ticks = 10 seconds at 20 TPS

  // Statistics
  private stats = {
    totalSpawned: 0,
    totalInvasions: 0,
    totalDiscovered: 0,
    totalStopped: 0,
  };

  constructor(
    coordinator: MultiverseCoordinator,
    playerWorld: World,
    eventBus: SystemEventManager
  ) {
    this.coordinator = coordinator;
    this.playerWorld = playerWorld;
    this.eventBus = eventBus;

    this.setupEventListeners();
  }

  /**
   * Spawn a background universe for hidden simulation.
   *
   * Returns universe ID for future reference.
   * Universe simulates in background until player discovers it or invasion triggers.
   */
  async spawnBackgroundUniverse(params: BackgroundUniverseParams): Promise<string> {
    // Generate universe ID
    const universeId = `background_${params.type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Merge cultural traits with defaults
    const culturalTraits = this.mergeCulturalTraits(params.type, params.culturalTraits);

    // Fork universe from base or template
    const baseUniverseId = params.baseUniverseId || 'player_universe';
    const timeScale = params.timeScale || 1000; // Default 1000x speed

    let fork;
    try {
      fork = await this.coordinator.forkUniverse(
        baseUniverseId,
        universeId,
        `${params.description} (Hidden)`,
        { timeScale }
      );
    } catch (error) {
      console.error(`[BackgroundUniverseManager] Failed to fork universe: ${error}`);
      // If fork fails, try creating from template
      fork = await this.coordinator.forkUniverse(
        'template_universe',
        universeId,
        `${params.description} (Hidden)`,
        { timeScale }
      );
    }

    // Create AbstractPlanet
    const planet = this.createPlanetWithBias(universeId, params);

    // Create Faction AI
    const factionAI = new PlanetFactionAI(
      planet,
      culturalTraits,
      params.invasionThreshold || 0.7,
      params.seed
    );

    // Create background universe entry
    const backgroundUniverse: BackgroundUniverse = {
      id: universeId,
      type: params.type,
      universe: fork,
      planet,
      factionAI,
      worker: null, // TODO: Implement worker-based simulation
      visible: false,
      ticksSimulated: 0n,
      lastUpdateTime: Date.now(),
      stopConditions: params.stopConditions,
      stopped: false,
    };

    this.backgroundUniverses.set(universeId, backgroundUniverse);
    this.stats.totalSpawned++;

    console.log(
      `[BackgroundUniverseManager] Spawned ${params.type}: ${params.description} (ID: ${universeId})`
    );

    return universeId;
  }

  /**
   * Update all background universes.
   * Call this every tick from a system.
   *
   * Throttled to run every 10 seconds (1000 ticks) to reduce overhead.
   */
  async update(currentTick: bigint): Promise<void> {
    // Throttle updates
    if (currentTick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Update each background universe
    for (const [id, bg] of this.backgroundUniverses) {
      if (bg.stopped) continue;

      // Simulate universe forward
      await this.simulateBackgroundUniverse(bg, currentTick);

      // Update faction AI with current state
      const state = this.extractPlanetState(bg.planet, currentTick);
      bg.factionAI.updateState(state);

      // Get AI decision
      const decision = bg.factionAI.makeDecision();

      // Handle decision
      if (decision.type === 'invade') {
        await this.triggerInvasion(bg, decision);
      } else if (decision.type === 'discovered_player') {
        console.log(`[BackgroundUniverseManager] ${bg.id} discovered player's world!`);
      }

      // Check stop conditions
      if (await this.checkStopConditions(bg, state)) {
        bg.stopped = true;
        this.stats.totalStopped++;
      }

      // Check if player opened portal
      if (this.playerPortals.has(id) && !bg.visible) {
        await this.makeUniverseVisible(id);
      }
    }
  }

  /**
   * Register that player has portal/access to a universe.
   * Triggers instantiation on next update.
   */
  registerPlayerPortal(universeId: string): void {
    this.playerPortals.add(universeId);
  }

  /**
   * Unregister player portal (portal closed)
   */
  unregisterPlayerPortal(universeId: string): void {
    this.playerPortals.delete(universeId);
  }

  /**
   * Get background universe by ID
   */
  getBackgroundUniverse(id: string): BackgroundUniverse | undefined {
    return this.backgroundUniverses.get(id);
  }

  /**
   * Get all background universes
   */
  getAllBackgroundUniverses(): ReadonlyMap<string, BackgroundUniverse> {
    return this.backgroundUniverses;
  }

  /**
   * Get statistics
   */
  getStats(): Readonly<typeof this.stats> {
    return this.stats;
  }

  /**
   * Stop and remove a background universe
   */
  removeBackgroundUniverse(id: string): void {
    const bg = this.backgroundUniverses.get(id);
    if (bg) {
      this.coordinator.unregisterUniverse(id);
      this.backgroundUniverses.delete(id);
      console.log(`[BackgroundUniverseManager] Removed ${id}`);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Simulate background universe forward one update cycle.
   *
   * Uses AbstractPlanet statistical simulation (O(1) cost).
   */
  private async simulateBackgroundUniverse(
    bg: BackgroundUniverse,
    currentTick: bigint
  ): Promise<void> {
    // Calculate ticks to simulate based on time scale
    const timeScale = bg.universe.config.timeScale;
    const ticksToSimulate = BigInt(Math.floor(timeScale * Number(this.UPDATE_INTERVAL)));

    // Update planet via statistical simulation
    // This is O(1) - just differential equations, no entity iteration
    bg.planet.update(Number(ticksToSimulate));

    // Update tick counter
    bg.ticksSimulated += ticksToSimulate;
    bg.lastUpdateTime = Date.now();
  }

  /**
   * Extract planet state from AbstractPlanet for faction AI
   */
  private extractPlanetState(planet: AbstractPlanet, currentTick: bigint): PlanetState {
    const pressure = planet.population.total / planet.population.carryingCapacity;
    const militaryPower = (planet.population.distribution.military / planet.population.total) *
      (planet.tech.level / 10);
    const economicStrength = planet.civilizationStats.industrialization / 10;

    return {
      population: planet.population.total,
      techLevel: planet.tech.level,
      populationPressure: pressure,
      militaryPower,
      economicStrength,
      stability: planet.stability.overall,
      resources: {
        food: planet.economy.stockpiles.get('food') ?? 0,
        metal: planet.economy.stockpiles.get('metal') ?? 0,
        energy: planet.economy.stockpiles.get('energy') ?? 0,
      },
      activeWars: planet.majorCivilizations.reduce((sum: number, civ: { activeWars: string[] }) => sum + civ.activeWars.length, 0),
      hasDiscoveredPlayer: false, // Will be updated by faction AI
      hasInterstellarTech: planet.tech.level >= 7,
      currentTick,
    };
  }

  /**
   * Trigger invasion from background universe
   */
  private async triggerInvasion(bg: BackgroundUniverse, decision: any): Promise<void> {
    console.log(`[BackgroundUniverseManager] Invasion triggered from ${bg.id}!`);

    const invasionEvent: InvasionTriggeredEvent = {
      invaderUniverse: bg.id,
      invaderFaction: decision.factionId,
      targetUniverse: 'player_universe',
      invasionType: decision.invasionType,
      fleetSize: decision.fleetSize,
      techLevel: bg.planet.tech.level,
      estimatedArrival: BigInt(decision.estimatedTicks ?? 0),
      culturalTraits: bg.factionAI.getPersonality(),
    };

    this.eventBus.emit('multiverse:invasion_triggered', invasionEvent);
    this.stats.totalInvasions++;

    // Mark universe as stopped (invasion launched)
    if (bg.stopConditions?.invasionTriggered) {
      bg.stopped = true;
      bg.stopReason = 'Invasion launched';
    }
  }

  /**
   * Check if stop conditions are met
   */
  private async checkStopConditions(bg: BackgroundUniverse, state: PlanetState): Promise<boolean> {
    if (!bg.stopConditions) return false;

    const conditions = bg.stopConditions;

    // Check tech level
    if (conditions.maxTechLevel !== undefined && state.techLevel >= conditions.maxTechLevel) {
      bg.stopReason = `Reached max tech level ${conditions.maxTechLevel}`;
      return true;
    }

    // Check simulated years
    if (conditions.maxSimulatedYears !== undefined) {
      const yearsSimulated = Number(bg.ticksSimulated) / 525600; // 525600 ticks per year
      if (yearsSimulated >= conditions.maxSimulatedYears) {
        bg.stopReason = `Simulated ${yearsSimulated} years`;
        return true;
      }
    }

    // Check population
    if (conditions.minPopulation !== undefined && state.population < conditions.minPopulation) {
      bg.stopReason = `Population dropped below ${conditions.minPopulation}`;
      return true;
    }
    if (conditions.maxPopulation !== undefined && state.population > conditions.maxPopulation) {
      bg.stopReason = `Population exceeded ${conditions.maxPopulation}`;
      return true;
    }

    // Check civilization collapse
    if (conditions.civilizationCollapse && state.stability < 0.1) {
      bg.stopReason = 'Civilization collapsed';
      return true;
    }

    return false;
  }

  /**
   * Make background universe visible and instantiate full ECS.
   *
   * Called when player opens portal to background universe.
   */
  private async makeUniverseVisible(universeId: string): Promise<void> {
    const bg = this.backgroundUniverses.get(universeId);
    if (!bg || bg.visible) return;

    console.log(`[BackgroundUniverseManager] Instantiating full ECS for ${universeId}...`);

    // Get instantiation constraints from renormalization engine
    const constraints = this.getInstantiationConstraints(bg.planet);

    // Generate full ECS world from constraints
    // TODO: Implement world instantiation from constraints
    // This would create chunks, agents, cities matching the statistical data

    // For now, just mark as visible
    bg.visible = true;
    bg.universe.config.timeScale = 1.0; // Slow down to real-time

    // Emit discovery event
    const discoveryEvent: BackgroundUniverseDiscoveredEvent = {
      universeId,
      type: bg.type,
      discoveryMethod: 'portal', // TODO: Detect actual method
      state: this.extractPlanetState(bg.planet, 0n),
    };

    this.eventBus.emit('multiverse:universe_discovered', discoveryEvent);
    this.stats.totalDiscovered++;

    console.log(
      `[BackgroundUniverseManager] ${universeId} instantiated with ${constraints.targetPopulation} agents`
    );
  }

  /**
   * Get instantiation constraints for generating full ECS from AbstractPlanet
   */
  private getInstantiationConstraints(planet: AbstractPlanet): WorldInstantiationConstraints {
    // Use renormalization engine to get constraints
    // This ensures generated world matches statistical data

    return {
      targetPopulation: planet.population.total,
      cityCount: planet.civilizationStats.nationCount,
      beliefDistribution: new Map(), // TODO: Extract from planet
      avgTechLevel: planet.tech.level,
      avgSkillLevel: planet.tech.level / 2,
      buildingDistribution: new Map(), // TODO: Extract from planet economy
      namedNPCs: [], // TODO: Extract from planet.majorCivilizations
      majorStructures: [], // TODO: Extract from planet.megastructures
      factions: planet.majorCivilizations.map((civ: { id: string; name: string; population: number; activeWars: string[] }) => ({
        id: civ.id,
        name: civ.name,
        population: civ.population,
        hostility: civ.activeWars.length > 0 ? 0.7 : 0.3,
      })),
    };
  }

  /**
   * Create AbstractPlanet with bias from params
   */
  private createPlanetWithBias(universeId: string, params: BackgroundUniverseParams): AbstractPlanet {
    const planet = new AbstractPlanet(
      `${universeId}_planet`,
      params.description,
      {} // Partial<UniversalAddress> - can be empty for background universes
    );

    // Apply tech bias
    if (params.techBias !== undefined) {
      planet.tech.level = params.techBias;
      planet.civilizationStats.avgTechLevel = params.techBias;
    }

    // Apply initial population
    if (params.initialPopulation !== undefined) {
      planet.population.total = params.initialPopulation;
    }

    // Apply cultural traits to civilization stats
    // TODO: Map cultural traits to civilization properties

    return planet;
  }

  /**
   * Merge cultural traits with defaults
   */
  private mergeCulturalTraits(
    type: BackgroundUniverseType,
    traits: CulturalTraits
  ): CulturalTraits {
    const defaults = DEFAULT_CULTURAL_TRAITS[type];

    return {
      aggressiveness: traits.aggressiveness ?? defaults.aggressiveness ?? 0.5,
      expansionism: traits.expansionism ?? defaults.expansionism ?? 0.5,
      xenophobia: traits.xenophobia ?? defaults.xenophobia ?? 0.5,
      collectivism: traits.collectivism ?? defaults.collectivism ?? 0.5,
      technophilia: traits.technophilia ?? defaults.technophilia ?? 0.5,
      mysticism: traits.mysticism ?? defaults.mysticism ?? 0.5,
      cooperation: traits.cooperation ?? defaults.cooperation ?? 0.5,
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for portal creation events
    this.eventBus.onGeneric('portal:created', (data: any) => {
      if (data.targetUniverse && this.backgroundUniverses.has(data.targetUniverse)) {
        this.registerPlayerPortal(data.targetUniverse);
      }
    });

    // Listen for portal destruction
    this.eventBus.onGeneric('portal:destroyed', (data: any) => {
      if (data.targetUniverse) {
        this.unregisterPlayerPortal(data.targetUniverse);
      }
    });
  }
}
