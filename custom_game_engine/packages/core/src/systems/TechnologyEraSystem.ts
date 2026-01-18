/**
 * TechnologyEraSystem - Manages civilization advancement through 15 technological eras
 *
 * This system handles:
 * - Era advancement based on population, technology, and infrastructure
 * - Era regression during dark ages/collapses
 * - Technology breakthrough tracking
 * - Stability monitoring and collapse risk
 * - Integration with spaceship research stages
 * - Resource gating for advanced eras
 *
 * Priority: 200 (after most gameplay systems, before utility)
 * Throttle: 100 ticks (5 seconds) - era transitions are gradual
 *
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  TechnologyEraComponent,
  TechnologyEra,
  EraMetadata,
} from '../components/TechnologyEraComponent.js';
import {
  getEraMetadata,
  getNextEra,
  getPreviousEra,
  calculateStability,
  updateCollapseRisk,
  recordEraTransition,
  unlockTechnology,
  getEraIndex,
} from '../components/TechnologyEraComponent.js';
import type { TechnologyUnlockComponent } from '../components/TechnologyUnlockComponent.js';
import { isBuildingUnlocked } from '../components/TechnologyUnlockComponent.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * Era advancement condition check result
 */
interface AdvancementCheck {
  /** Can advance to next era? */
  canAdvance: boolean;
  /** Reasons why advancement is blocked (if any) */
  blockedReasons: string[];
  /** Progress percentage toward advancement (0-100) */
  progress: number;
}

/**
 * TechnologyEraSystem manages civilization technological progression
 */
export class TechnologyEraSystem extends BaseSystem {
  public readonly id: SystemId = 'technology_era';
  public readonly priority: number = 200; // After most gameplay systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.TechnologyEra];
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds (100 ticks)

  /**
   * Update all civilizations with technology era tracking
   */
  protected onUpdate(ctx: SystemContext): void {
    const civilizations = ctx.world.query().with(CT.TechnologyEra).executeEntities();

    for (const civEntity of civilizations) {
      const civImpl = civEntity as EntityImpl;
      const eraComponent = civImpl.getComponent<TechnologyEraComponent>(CT.TechnologyEra);

      if (!eraComponent) {
        continue;
      }

      // Update stability and collapse risk
      updateCollapseRisk(eraComponent);

      // Check for era regression (dark ages)
      this.checkEraRegression(ctx.world, civImpl, eraComponent);

      // Update research progress
      this.updateResearchProgress(ctx.world, civImpl, eraComponent);

      // Check for era advancement
      this.checkEraAdvancement(ctx.world, civImpl, eraComponent);
    }
  }

  /**
   * Check if civilization should regress to a lower era (dark age)
   */
  private checkEraRegression(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent
  ): void {
    // Can't regress below Paleolithic
    if (eraComponent.currentEra === 'paleolithic') {
      return;
    }

    // Calculate regression probability based on collapse risk
    const collapseRisk = eraComponent.collapseRisk;

    // Very high risk (90+) = certain regression
    // High risk (70-90) = likely regression
    // Medium risk (50-70) = possible regression
    // Low risk (<50) = unlikely regression
    const regressionThreshold = 70;

    if (collapseRisk < regressionThreshold) {
      return; // Not at risk
    }

    // Random check (throttled to once per 5 seconds)
    const regressionChance = (collapseRisk - regressionThreshold) / 30; // 0-100% based on risk above threshold
    if (Math.random() > regressionChance) {
      return; // Escaped regression this tick
    }

    // Determine severity of regression
    const stability = calculateStability(eraComponent);
    let erasToRegress = 1;

    if (stability < 20) {
      // Catastrophic collapse: -6+ eras
      erasToRegress = 6 + Math.floor(Math.random() * 3);
    } else if (stability < 40) {
      // Major collapse: -3 to -5 eras
      erasToRegress = 3 + Math.floor(Math.random() * 3);
    } else if (stability < 60) {
      // Minor collapse: -1 to -2 eras
      erasToRegress = 1 + Math.floor(Math.random() * 2);
    }

    // Apply regression
    this.regressEra(world, civEntity, eraComponent, erasToRegress);
  }

  /**
   * Regress civilization by N eras (dark age)
   */
  private regressEra(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent,
    erasToRegress: number
  ): void {
    const currentIndex = getEraIndex(eraComponent.currentEra);
    const targetIndex = Math.max(0, currentIndex - erasToRegress);

    let newEra = eraComponent.currentEra;
    for (let i = 0; i < erasToRegress; i++) {
      const prevEra = getPreviousEra(newEra);
      if (!prevEra) break;
      newEra = prevEra;
    }

    if (newEra === eraComponent.currentEra) {
      return; // No change
    }

    const oldEra = eraComponent.currentEra;

    // Update era
    eraComponent.currentEra = newEra;
    eraComponent.eraProgress = 0;
    eraComponent.eraStartTick = world.tick;

    // Record transition
    recordEraTransition(eraComponent, oldEra, newEra, world.tick, 'regression');

    // Lose some technologies (knowledge loss)
    const lostTechs = this.loseRandomTechnologies(eraComponent, erasToRegress * 3);

    // Emit regression event (custom event - not in EventMap yet)
    console.warn(
      `[TechnologyEra] Era regression: ${civEntity.id} from ${oldEra} to ${newEra}, lost ${erasToRegress} eras, technologies: ${lostTechs.join(', ')}`
    );

    console.warn(
      `[TechnologyEra] Civilization ${civEntity.id} regressed from ${oldEra} to ${newEra} (dark age, -${erasToRegress} eras)`
    );
  }

  /**
   * Lose random technologies during a collapse
   */
  private loseRandomTechnologies(
    eraComponent: TechnologyEraComponent,
    count: number
  ): string[] {
    const unlockedTechs = Array.from(eraComponent.unlockedTechIds);
    if (unlockedTechs.length === 0) return [];

    const lostTechs: string[] = [];
    const toLose = Math.min(count, unlockedTechs.length);
    for (let i = 0; i < toLose; i++) {
      const randomIndex = Math.floor(Math.random() * unlockedTechs.length);
      const techId = unlockedTechs[randomIndex];

      if (!techId) continue; // Safety check

      // Mark as lost (but don't delete - conservation of game matter)
      eraComponent.lostTechnologies.push(techId);
      eraComponent.unlockedTechIds.delete(techId);
      lostTechs.push(techId);

      // Remove from unlocked techs list
      unlockedTechs.splice(randomIndex, 1);
    }

    return lostTechs;
  }

  /**
   * Update research progress toward next era
   */
  private updateResearchProgress(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent
  ): void {
    // Can't research beyond Transcendent
    if (eraComponent.currentEra === 'transcendent') {
      return;
    }

    // Calculate research rate
    const baseResearchRate = 0.1; // 0.1% per update (100 ticks)
    const scientistBonus = eraComponent.scientistCount * 0.01; // +1% per scientist
    const universityBonus = eraComponent.universityCount * 0.05; // +5% per university
    const researchRate = baseResearchRate * (1 + scientistBonus + universityBonus) * eraComponent.researchMultiplier;

    // Update progress
    eraComponent.eraProgress += researchRate;

    // Clamp to 100
    if (eraComponent.eraProgress > 100) {
      eraComponent.eraProgress = 100;
    }
  }

  /**
   * Check if civilization can advance to the next era
   */
  private checkEraAdvancement(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent
  ): void {
    // Can't advance beyond Transcendent
    const nextEra = getNextEra(eraComponent.currentEra);
    if (!nextEra) {
      return;
    }

    // Check advancement conditions
    const check = this.canAdvanceEra(world, civEntity, eraComponent, nextEra);

    if (check.canAdvance) {
      this.advanceEra(world, civEntity, eraComponent, nextEra);
    } else {
      // Update progress based on how close we are
      eraComponent.eraProgress = Math.min(eraComponent.eraProgress, check.progress);
    }
  }

  /**
   * Check if civilization meets requirements to advance to next era
   */
  private canAdvanceEra(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent,
    targetEra: TechnologyEra
  ): AdvancementCheck {
    const metadata = getEraMetadata(targetEra);
    const blockedReasons: string[] = [];
    let progressContributions: number[] = [];

    // 1. Research progress requirement (must be at 100%)
    if (eraComponent.eraProgress < 100) {
      blockedReasons.push(`Research progress: ${eraComponent.eraProgress.toFixed(1)}% (need 100%)`);
      progressContributions.push(eraComponent.eraProgress);
    } else {
      progressContributions.push(100);
    }

    // 2. Population threshold
    if (metadata.populationThreshold !== null) {
      const population = this.getCivilizationPopulation(world, civEntity);
      if (population < metadata.populationThreshold) {
        blockedReasons.push(`Population: ${population} (need ${metadata.populationThreshold})`);
        progressContributions.push((population / metadata.populationThreshold) * 100);
      } else {
        progressContributions.push(100);
      }
    }

    // 3. Required buildings
    const techUnlock = this.getTechnologyUnlockComponent(world);
    if (techUnlock) {
      for (const buildingType of metadata.requiredBuildings) {
        if (!isBuildingUnlocked(techUnlock, buildingType)) {
          blockedReasons.push(`Missing building: ${buildingType}`);
          progressContributions.push(0);
        } else {
          progressContributions.push(100);
        }
      }
    }

    // 4. Required technologies
    for (const techId of metadata.requiredTechnologies) {
      if (!eraComponent.unlockedTechIds.has(techId)) {
        blockedReasons.push(`Missing technology: ${techId}`);
        progressContributions.push(0);
      } else {
        progressContributions.push(100);
      }
    }

    // 5. Special requirements for advanced eras
    if (targetEra === 'interplanetary') {
      // Requires gated resources (stellarite_ore, neutronium_shard, helium_3)
      const requiredResources = ['helium_3']; // Minimum for worldships
      for (const resource of requiredResources) {
        if (!eraComponent.gatedResourcesDiscovered.has(resource)) {
          blockedReasons.push(`Missing resource: ${resource} (requires space exploration)`);
          progressContributions.push(0);
        } else {
          progressContributions.push(100);
        }
      }
    }

    if (targetEra === 'interstellar') {
      // Requires multi-star-system resources (void_essence, temporal_dust, etc.)
      const requiredResources = ['void_essence']; // Minimum for probability scouts
      for (const resource of requiredResources) {
        if (!eraComponent.gatedResourcesDiscovered.has(resource)) {
          blockedReasons.push(`Missing resource: ${resource} (requires interstellar exploration)`);
          progressContributions.push(0);
        } else {
          progressContributions.push(100);
        }
      }
    }

    // 6. Stability requirement (must be above 40 to advance)
    const stability = calculateStability(eraComponent);
    if (stability < 40) {
      blockedReasons.push(`Stability too low: ${stability.toFixed(1)}% (need 40%+)`);
      progressContributions.push((stability / 40) * 100);
    } else {
      progressContributions.push(100);
    }

    // Calculate overall progress (average of all contributions)
    const progress = progressContributions.length > 0
      ? progressContributions.reduce((sum, val) => sum + val, 0) / progressContributions.length
      : 0;

    return {
      canAdvance: blockedReasons.length === 0,
      blockedReasons,
      progress,
    };
  }

  /**
   * Advance civilization to the next era
   */
  private advanceEra(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent,
    newEra: TechnologyEra
  ): void {
    const oldEra = eraComponent.currentEra;
    const metadata = getEraMetadata(newEra);

    // Update era
    eraComponent.currentEra = newEra;
    eraComponent.eraProgress = 0;
    eraComponent.eraStartTick = world.tick;

    // Unlock era-specific technologies
    for (const techId of metadata.requiredTechnologies) {
      if (!eraComponent.unlockedTechIds.has(techId)) {
        unlockTechnology(
          eraComponent,
          techId,
          techId.replace(/_/g, ' '),
          `Unlocked in ${metadata.name} era`,
          world.tick
        );
      }
    }

    // Record transition
    recordEraTransition(eraComponent, oldEra, newEra, world.tick, 'advancement');

    // Update spaceship research stage (if applicable)
    if (metadata.spaceshipStage !== null) {
      if (
        eraComponent.spaceshipResearchStage === null ||
        eraComponent.spaceshipResearchStage < metadata.spaceshipStage
      ) {
        eraComponent.spaceshipResearchStage = metadata.spaceshipStage;
        eraComponent.spaceshipResearchProgress = 0;
      }
    }

    // Log advancement (custom events - not in EventMap yet)
    console.log(
      `[TechnologyEra] Era advancement: ${civEntity.id} from ${oldEra} to ${newEra}, unlocked: ${metadata.requiredTechnologies.join(', ')}`
    );

    console.log(
      `[TechnologyEra] Civilization ${civEntity.id} advanced from ${oldEra} to ${newEra} (Era ${getEraIndex(newEra)})`
    );
  }

  /**
   * Get total population of a civilization (sum of all cities)
   */
  private getCivilizationPopulation(world: World, civEntity: EntityImpl): number {
    // For now, get city population from CityDirector component
    // In grand strategy, this would aggregate across multiple cities
    const cityDirector = civEntity.getComponent<CityDirectorComponent>(CT.CityDirector);
    if (cityDirector) {
      // CityDirector doesn't have population field yet, count agents instead
      // TODO: When CityDirector gets population tracking, use that instead
      const agents = world.query().with(CT.Agent).executeEntities();
      return agents.length;
    }

    // Fallback: count agents in the civilization (if no city director)
    const agents = world.query().with(CT.Agent).executeEntities();
    return agents.length;
  }

  /**
   * Get the global TechnologyUnlock singleton
   */
  private getTechnologyUnlockComponent(world: World): TechnologyUnlockComponent | null {
    const entities = world.query().with(CT.TechnologyUnlock).executeEntities();
    if (entities.length === 0) {
      return null;
    }
    const entity = entities[0] as EntityImpl;
    return entity.getComponent<TechnologyUnlockComponent>(CT.TechnologyUnlock) || null;
  }
}
