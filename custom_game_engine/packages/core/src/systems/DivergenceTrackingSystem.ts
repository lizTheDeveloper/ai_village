import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { DivergenceTrackingComponent, DivergenceEvent } from '../components/DivergenceTrackingComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { SkillsComponent, SkillId } from '../components/SkillsComponent.js';

/**
 * DivergenceTrackingSystem - Tracks timeline differences between fork and parent
 *
 * Calculates how much a forked universe has diverged from its parent over time.
 * Uses weighted comparison of:
 * - Agent states (40%): health, skills, relationships, inventory, memories
 * - Buildings (20%): presence/absence of structures
 * - Inventory (15%): item quantities
 * - Terrain (10%): world state changes
 * - Events (15%): major divergence events
 *
 * Formula:
 * divergence = agentDiv * 0.4 + buildingDiv * 0.2 + inventoryDiv * 0.15 +
 *              terrainDiv * 0.1 + eventDiv * 0.15
 * finalDivergence = divergence + (1 - divergence) * timeDecayFactor * 0.3
 *
 * Priority: 250 (late, after most gameplay)
 * Throttle: 500 ticks (25 seconds - divergence changes slowly)
 *
 * @see DivergenceTrackingComponent - Component tracking divergence data
 * @see CanonEventSystem - Manages timeline convergence based on divergence
 */
export class DivergenceTrackingSystem extends BaseSystem {
  public readonly id: SystemId = 'divergence_tracking';
  public readonly priority: number = 250; // Late, after most gameplay
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.DivergenceTracking,
  ];
  public readonly activationComponents = [CT.DivergenceTracking] as const;

  protected readonly throttleInterval = 500; // 25 seconds - divergence changes slowly

  // PERF: Cached string for current tick (avoid repeated toString calls)
  private cachedTickString = '0';
  private cachedTick = 0;

  /**
   * Update divergence scores for all forked universes
   */
  protected onUpdate(ctx: SystemContext): void {
    const entities = ctx.world.query()
      .with(CT.DivergenceTracking)
      .executeEntities();

    const currentTick = ctx.world.tick;

    // PERF: Cache stringified tick (used multiple times per update)
    if (this.cachedTick !== currentTick) {
      this.cachedTick = currentTick;
      this.cachedTickString = BigInt(currentTick).toString();
    }

    for (const entity of entities) {
      const divergence = entity.getComponent<DivergenceTrackingComponent>(CT.DivergenceTracking);
      if (!divergence) continue;

      // Calculate new divergence score
      const score = this.calculateDivergenceScore(ctx.world, entity, divergence, currentTick);

      // Update component
      divergence.divergenceScore = score;
      divergence.lastDivergenceUpdate = this.cachedTickString;
    }
  }

  /**
   * Calculate overall divergence score for a forked universe
   * Returns 0-1 (0 = identical, 1 = completely different)
   */
  private calculateDivergenceScore(
    world: World,
    forkEntity: Entity,
    divergence: DivergenceTrackingComponent,
    currentTick: number
  ): number {
    // TODO: This is a simplified version. Full implementation requires:
    // 1. Access to parent universe snapshot (via persistence system)
    // 2. Comparison of entity states between fork and parent
    // 3. Terrain comparison (would need world state access)

    // For now, calculate divergence based on events and time
    const eventDivergence = this.calculateEventDivergence(divergence.majorDifferences);

    // PERF: Early exit if no events and recently updated
    if (eventDivergence === 0 && divergence.lastDivergenceUpdate) {
      const lastUpdate = BigInt(divergence.lastDivergenceUpdate);
      const ticksSinceLastUpdate = Number(BigInt(currentTick) - lastUpdate);
      if (ticksSinceLastUpdate < 1000) {
        // Less than 50 seconds since last update, minimal change
        return divergence.divergenceScore;
      }
    }

    // Time decay: divergence naturally increases over time
    const lastUpdate = BigInt(divergence.lastDivergenceUpdate || '0');
    const ticksSinceLastUpdate = Number(BigInt(currentTick) - lastUpdate);

    // PERF: Precompute constants
    const MAX_TICKS = 100000;
    const TIME_WEIGHT = 0.3;
    const timeDecayFactor = ticksSinceLastUpdate < MAX_TICKS ? ticksSinceLastUpdate / MAX_TICKS : 1;

    // Simplified formula (full version would include agent, building, inventory, terrain)
    // For now: base divergence from events + time decay
    const baseDivergence = eventDivergence;
    const finalDivergence = baseDivergence + (1 - baseDivergence) * timeDecayFactor * TIME_WEIGHT;

    // PERF: Clamp using faster comparison
    return finalDivergence > 1 ? 1 : (finalDivergence < 0 ? 0 : finalDivergence);
  }

  /**
   * Calculate divergence from major divergence events
   * Each event contributes its impact, normalized by expected number of events
   */
  private calculateEventDivergence(majorDifferences: DivergenceEvent[]): number {
    // PERF: Early exit for empty array
    if (majorDifferences.length === 0) return 0;

    // PERF: Manual loop faster than reduce for simple accumulation
    let totalImpact = 0;
    for (let i = 0; i < majorDifferences.length; i++) {
      totalImpact += majorDifferences[i].divergenceImpact;
    }

    // Normalize by expected number of events (assume ~10 major events = full divergence)
    // PERF: Multiply by constant instead of divide
    const normalized = totalImpact * 0.1;
    return normalized > 1 ? 1 : normalized;
  }

  // PERF: Reusable Map for entity lookups (avoid repeated linear searches)
  private readonly agentLookupMap = new Map<string, Entity>();

  /**
   * Calculate agent state divergence between fork and parent
   * Compares: health, skills, relationships, inventory, memories
   * Returns 0-1 (0 = identical agents, 1 = completely different)
   */
  private calculateAgentDivergence(
    forkAgents: Entity[],
    parentAgents: Entity[]
  ): number {
    // PERF: Early exit for empty arrays
    if (forkAgents.length === 0 && parentAgents.length === 0) return 0;

    // PERF: Build lookup map once instead of repeated .find() calls
    this.agentLookupMap.clear();
    for (let i = 0; i < parentAgents.length; i++) {
      this.agentLookupMap.set(parentAgents[i].id, parentAgents[i]);
    }

    let differences = 0;
    let comparisons = 0;

    for (let i = 0; i < forkAgents.length; i++) {
      const forkAgent = forkAgents[i];
      const parentAgent = this.agentLookupMap.get(forkAgent.id);

      if (!parentAgent) {
        // Agent exists in fork but not parent (new birth, or immigration)
        differences += 1;
        comparisons += 1;
        continue;
      }

      // Compare critical components
      differences += this.compareAgentHealth(forkAgent, parentAgent);
      differences += this.compareAgentSkills(forkAgent, parentAgent);
      differences += this.compareAgentInventory(forkAgent, parentAgent);
      comparisons += 3;

      // PERF: Remove from map so we can count missing agents efficiently
      this.agentLookupMap.delete(forkAgent.id);
    }

    // PERF: Remaining entries are agents in parent but not fork (deaths)
    const missingCount = this.agentLookupMap.size;
    differences += missingCount;
    comparisons += missingCount;

    return comparisons > 0 ? differences / comparisons : 0;
  }

  /**
   * Compare agent health between fork and parent
   * Returns difference score (0 = identical, 1 = very different)
   */
  private compareAgentHealth(forkAgent: Entity, parentAgent: Entity): number {
    const forkNeeds = forkAgent.getComponent<NeedsComponent>(CT.Needs);
    const parentNeeds = parentAgent.getComponent<NeedsComponent>(CT.Needs);

    // PERF: Early exit if either component missing
    if (!forkNeeds || !parentNeeds) return 0;

    // Compare health level
    const healthDiff = Math.abs(forkNeeds.health - parentNeeds.health);

    // PERF: Multiply by 2 instead of divide, avoid Math.min for simple comparison
    const normalized = healthDiff * 2;
    return normalized > 1 ? 1 : normalized;
  }

  // PERF: Reusable Set for skill comparison (avoid allocation in hot path)
  private readonly skillSet = new Set<SkillId>();

  /**
   * Compare agent skills between fork and parent
   * Returns difference score (0 = identical, 1 = very different)
   */
  private compareAgentSkills(forkAgent: Entity, parentAgent: Entity): number {
    const forkSkills = forkAgent.getComponent<SkillsComponent>(CT.Skills);
    const parentSkills = parentAgent.getComponent<SkillsComponent>(CT.Skills);

    // PERF: Early exit if either component missing
    if (!forkSkills || !parentSkills) return 0;

    // PERF: Reuse Set instead of creating new one
    this.skillSet.clear();
    const forkKeys = Object.keys(forkSkills.levels);
    const parentKeys = Object.keys(parentSkills.levels);

    for (let i = 0; i < forkKeys.length; i++) {
      this.skillSet.add(forkKeys[i] as SkillId);
    }
    for (let i = 0; i < parentKeys.length; i++) {
      this.skillSet.add(parentKeys[i] as SkillId);
    }

    let totalDiff = 0;
    for (const skillName of this.skillSet) {
      const forkLevel = forkSkills.levels[skillName] || 0;
      const parentLevel = parentSkills.levels[skillName] || 0;
      totalDiff += Math.abs(forkLevel - parentLevel);
    }

    // Normalize (assume 10 skill levels difference = full divergence)
    // PERF: Multiply by constant instead of divide
    const normalized = totalDiff * 0.1;
    return normalized > 1 ? 1 : normalized;
  }

  /**
   * Compare agent inventory between fork and parent
   * Returns difference score (0 = identical, 1 = very different)
   */
  private compareAgentInventory(forkAgent: Entity, parentAgent: Entity): number {
    const forkInv = forkAgent.getComponent<InventoryComponent>(CT.Inventory);
    const parentInv = parentAgent.getComponent<InventoryComponent>(CT.Inventory);

    // PERF: Early exit if either component missing
    if (!forkInv || !parentInv) return 0;

    // PERF: Manual loop to count non-empty slots (faster than filter().length)
    let forkCount = 0;
    for (let i = 0; i < forkInv.slots.length; i++) {
      if (forkInv.slots[i].itemId !== null) forkCount++;
    }

    let parentCount = 0;
    for (let i = 0; i < parentInv.slots.length; i++) {
      if (parentInv.slots[i].itemId !== null) parentCount++;
    }

    const countDiff = Math.abs(forkCount - parentCount);

    // Normalize (assume 20 item difference = full divergence)
    // PERF: Multiply by constant instead of divide
    const normalized = countDiff * 0.05;
    return normalized > 1 ? 1 : normalized;
  }

  // PERF: Reusable Map for building lookups
  private readonly buildingLookupMap = new Map<string, Entity>();

  /**
   * Calculate building divergence between fork and parent
   * Returns 0-1 (0 = identical buildings, 1 = completely different)
   */
  private calculateBuildingDivergence(
    forkBuildings: Entity[],
    parentBuildings: Entity[]
  ): number {
    // PERF: Early exit for empty arrays
    if (forkBuildings.length === 0 && parentBuildings.length === 0) return 0;

    // PERF: Use Map instead of nested filter/some operations
    this.buildingLookupMap.clear();
    for (let i = 0; i < parentBuildings.length; i++) {
      this.buildingLookupMap.set(parentBuildings[i].id, parentBuildings[i]);
    }

    let differences = 0;

    // Buildings in fork but not parent
    for (let i = 0; i < forkBuildings.length; i++) {
      if (!this.buildingLookupMap.has(forkBuildings[i].id)) {
        differences++;
      } else {
        this.buildingLookupMap.delete(forkBuildings[i].id);
      }
    }

    // PERF: Remaining entries are buildings in parent but not fork
    differences += this.buildingLookupMap.size;

    const totalBuildings = forkBuildings.length > parentBuildings.length
      ? forkBuildings.length
      : parentBuildings.length;

    return totalBuildings > 0 ? differences / totalBuildings : 0;
  }

  /**
   * Record a divergence event when significant difference occurs
   * This is called by other systems when major timeline changes happen
   */
  public recordDivergenceEvent(
    world: World,
    forkEntity: Entity,
    eventType: string,
    description: string,
    impact: number
  ): void {
    const divergence = forkEntity.getComponent<DivergenceTrackingComponent>(CT.DivergenceTracking);
    if (!divergence) return;

    const divergenceEvent: DivergenceEvent = {
      tick: BigInt(world.tick).toString(),
      eventType,
      description,
      divergenceImpact: impact,
    };

    divergence.majorDifferences.push(divergenceEvent);
    divergence.lastDivergenceUpdate = BigInt(world.tick).toString();
  }
}
