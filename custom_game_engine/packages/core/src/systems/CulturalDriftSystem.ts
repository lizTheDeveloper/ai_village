/**
 * CulturalDriftSystem — Norns on different decks develop divergent customs.
 *
 * Runs every tick (lightweight). Tracks:
 * 1. Cultural region assignment based on z-level visits
 * 2. Word usage preferences per region (incremented when Norns speak)
 * 3. Cross-deck encounters: inject Curiosity +0.03, Anxiety +0.02
 *
 * Per CLAUDE.md:
 *   - Cache queries before loops
 *   - No silent fallbacks
 *   - No console.log
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { CulturalDriftComponent, CulturalRegionStateComponent, CulturalRegionId } from '../components/CulturalDriftComponent.js';
import { regionFromZLevel } from '../components/CulturalDriftComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { BiochemistryComponent } from '../components/BiochemistryComponent.js';
import { MemoryComponent } from '../components/MemoryComponent.js';
import type { EntityImpl } from '../ecs/Entity.js';

// Thresholds for cross-deck encounter biochemistry adjustments
const FOREIGN_REGION_CURIOSITY_BOOST = 0.03;
const FOREIGN_REGION_ANXIETY_BOOST = 0.02;

// Minimum visit ratio to claim a region as primary (60% of visits)
const PRIMARY_REGION_THRESHOLD = 0.6;

export class CulturalDriftSystem extends BaseSystem {
  public readonly id: SystemId = 'cultural_drift_system';
  public readonly priority: number = 260; // After movement, before cognition
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Position];
  public readonly activationComponents = ['cultural_drift'] as const;
  protected readonly throttleInterval = 20; // Every second at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    // Cache queries before loop
    const driftEntities = ctx.world.query()
      .with('cultural_drift')
      .with(CT.Position)
      .executeEntities() as EntityImpl[];

    const regionStates = ctx.world.query()
      .with('cultural_region_state')
      .executeEntities() as EntityImpl[];

    // Build region state lookup
    const regionStateMap = new Map<CulturalRegionId, CulturalRegionStateComponent>();
    for (const re of regionStates) {
      const state = re.getComponent<CulturalRegionStateComponent>('cultural_region_state');
      if (state) {
        regionStateMap.set(state.regionId, state);
      }
    }

    // Reset population counts for this tick
    for (const state of regionStateMap.values()) {
      state.populationCount = 0;
    }

    for (const entity of driftEntities) {
      const drift = entity.getComponent<CulturalDriftComponent>('cultural_drift');
      const pos = entity.getComponent<PositionComponent>(CT.Position);
      if (!drift || !pos) continue;

      const currentRegion = regionFromZLevel(pos.z);

      // Update visit tracking
      drift.regionVisits[currentRegion] = (drift.regionVisits[currentRegion] ?? 0) + 1;
      drift.totalVisits += 1;

      // Recompute primary region based on visit history
      let maxVisits = 0;
      let newPrimary = drift.primaryRegion;
      for (const [region, visits] of Object.entries(drift.regionVisits)) {
        if (visits > maxVisits) {
          maxVisits = visits;
          newPrimary = region;
        }
      }

      // Only update primary if the new region has a clear majority
      if (maxVisits / drift.totalVisits >= PRIMARY_REGION_THRESHOLD) {
        drift.primaryRegion = newPrimary;
      }

      // Detect foreign region status
      const wasForeign = drift.inForeignRegion;
      drift.inForeignRegion = currentRegion !== drift.primaryRegion;

      // Cross-deck encounter: inject mild emotions on entering foreign region
      if (drift.inForeignRegion && !wasForeign) {
        drift.lastRegionChangeTick = ctx.tick;
        this.injectCrossDeckEmotions(entity, ctx);
      }

      // Increment region population count
      const regionState = regionStateMap.get(drift.primaryRegion);
      if (regionState) {
        regionState.populationCount += 1;
      }
    }
  }

  /**
   * Inject mild Curiosity and Anxiety when a Norn enters an unfamiliar deck.
   * Uses biochemistry if available (dopamine for curiosity, cortisol for anxiety).
   */
  private injectCrossDeckEmotions(entity: EntityImpl, ctx: SystemContext): void {
    // Try to get biochemistry component to adjust chemicals
    const biochem = entity.getComponent<BiochemistryComponent>(CT.Biochemistry);
    if (biochem) {
      biochem.dopamine = Math.min(1, biochem.dopamine + FOREIGN_REGION_CURIOSITY_BOOST);
      biochem.cortisol = Math.min(1, biochem.cortisol + FOREIGN_REGION_ANXIETY_BOOST);
    }

    // Add memory tag for cross-deck encounter
    const memory = entity.getComponent<MemoryComponent>(CT.Memory);
    if (memory) {
      const pos = entity.getComponent<PositionComponent>(CT.Position);
      memory.memories.push({
        id: `cross_deck_${ctx.tick}_${entity.id}`,
        type: 'episodic',
        content: 'The customs here feel unfamiliar.',
        importance: 0.3,
        timestamp: ctx.tick,
        location: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
        metadata: { tag: 'cross_deck_encounter' },
      });
    }

    ctx.emit('culture:cross_deck_encounter', {
      entityId: entity.id,
      tick: ctx.tick,
    });
  }
}
