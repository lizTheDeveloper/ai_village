/**
 * CollapseSystem - Triggers civilization collapse and dark ages
 *
 * This system handles:
 * - Collapse triggers (war, plague, AI misalignment, β-space accidents, environment)
 * - Collapse severity calculation based on trigger type
 * - Era regression (minor: -1, major: -2 to -3, catastrophic: -5 to -7)
 * - Technology loss during collapse
 * - Historical collapse scenario templates
 *
 * Priority: 225 (after UpliftDiplomacySystem, before utility systems)
 * Throttle: 100 ticks (5 seconds) - rare catastrophic events
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
} from '../components/TechnologyEraComponent.js';
import {
  getEraIndex,
  getEraByIndex,
  calculateStability,
  updateCollapseRisk,
  recordEraTransition,
} from '../components/TechnologyEraComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

// ============================================================================
// CONSTANTS & OPTIMIZATIONS
// ============================================================================

/** Collapse risk threshold to trigger potential collapse */
const COLLAPSE_TRIGGER_THRESHOLD = 80;

/** Stability thresholds for different collapse triggers */
const STABILITY_THRESHOLDS = Object.freeze({
  /** Military stability below this triggers war-related collapse */
  WAR_DAMAGE: 30,
  /** Economic stability below this triggers famine/plague collapse */
  FAMINE_PLAGUE: 30,
  /** Environmental stability below this triggers environmental collapse */
  ENVIRONMENTAL: 20,
  /** Social stability below this (Era 13+) triggers AI misalignment */
  AI_MISALIGNMENT: 50,
});

/** Era indices for special collapse mechanics */
const ERA_INDEX = Object.freeze({
  INTERSTELLAR: 11, // β-space accidents possible
  POST_SINGULARITY: 13, // AI misalignment possible
});

/**
 * Collapse severity levels
 */
interface CollapseSeverity {
  /** Number of eras to regress */
  erasToRegress: number;
  /** Percentage of technologies to lose (0-1) */
  techLossRate: number;
  /** Recovery time estimate (in ticks, 1 year = 1051200 ticks) */
  recoveryTime: number;
  /** Human-readable description */
  description: string;
}

/**
 * Historical collapse templates
 */
const COLLAPSE_TEMPLATES = Object.freeze({
  /** Bronze Age Collapse: -2 eras, 500 year recovery */
  BRONZE_AGE: {
    erasToRegress: 2,
    techLossRate: 0.3,
    recoveryTime: 525600000, // 500 years
    description: 'Bronze Age Collapse',
  } as CollapseSeverity,
  /** Roman Fall: -1 to -3 eras, 500-1000 year recovery */
  ROMAN_FALL: {
    erasToRegress: 2,
    techLossRate: 0.4,
    recoveryTime: 788400000, // 750 years average
    description: 'Fall of Rome',
  } as CollapseSeverity,
  /** Nuclear Winter: -5 to -7 eras, 1000+ year recovery */
  NUCLEAR_WINTER: {
    erasToRegress: 6,
    techLossRate: 0.8,
    recoveryTime: 1051200000, // 1000 years
    description: 'Nuclear Winter',
  } as CollapseSeverity,
  /** Reality Breach: -5 to -7 eras, 1000+ year recovery */
  REALITY_BREACH: {
    erasToRegress: 7,
    techLossRate: 0.9,
    recoveryTime: 1576800000, // 1500 years
    description: 'Reality Breach',
  } as CollapseSeverity,
});

/**
 * Collapse trigger types
 */
type CollapseTrigger =
  | 'war_damage'
  | 'famine_plague'
  | 'ai_misalignment'
  | 'beta_space_accident'
  | 'environmental_collapse';

/**
 * CollapseSystem manages civilization collapse and dark ages
 */
export class CollapseSystem extends BaseSystem {
  public readonly id: SystemId = 'collapse';
  public readonly priority: number = 225; // After UpliftDiplomacySystem (220)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.TechnologyEra];
  // Only run when technology era components exist (O(1) activation check)
  public readonly activationComponents = [CT.TechnologyEra] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // Every 5 seconds (100 ticks)

  /**
   * Update all civilizations, checking for collapse triggers
   */
  protected onUpdate(ctx: SystemContext): void {
    const { world } = ctx;

    // Get civilizations ONCE before loop (avoid repeated query)
    const civilizations = ctx.activeEntities;

    for (const civEntity of civilizations) {
      const civImpl = civEntity as EntityImpl;
      const eraComponent = civImpl.getComponent<TechnologyEraComponent>(CT.TechnologyEra);

      if (!eraComponent) {
        continue;
      }

      // Update stability factors from world state
      this.updateStabilityFactors(world, civImpl, eraComponent);

      // Update collapse risk
      updateCollapseRisk(eraComponent);

      // Check for collapse triggers
      this.checkCollapseTriggers(world, civImpl, eraComponent);
    }
  }

  /**
   * Update stability factors based on world state
   * (In a full implementation, this would query war systems, economy, environment, etc.)
   */
  private updateStabilityFactors(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent
  ): void {
    // TODO: In a full implementation, this would:
    // - Query war damage from EmpireWarSystem
    // - Query famine/plague from disease/economy systems
    // - Query environmental degradation from climate systems
    // - Query AI alignment metrics from AI systems
    //
    // For now, we use the existing stability values and let them
    // be managed by other systems (or manually set for testing)
  }

  /**
   * Check if any collapse triggers are active
   */
  private checkCollapseTriggers(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent
  ): void {
    // Early exit: Check collapse risk threshold
    const collapseRisk = eraComponent.collapseRisk;
    if (collapseRisk < COLLAPSE_TRIGGER_THRESHOLD) {
      return; // Not at risk
    }

    // Random check (throttled to once per 5 seconds)
    const collapseChance = (collapseRisk - COLLAPSE_TRIGGER_THRESHOLD) / 20; // 0-100% based on risk above threshold
    if (Math.random() > collapseChance) {
      return; // Escaped collapse this tick
    }

    // Determine trigger type and severity
    const trigger = this.determineTrigger(eraComponent);
    if (!trigger) {
      return; // No active triggers
    }

    // Calculate collapse severity
    const severity = this.calculateSeverity(trigger, eraComponent);

    // Apply collapse
    this.applyCollapse(world, civEntity, eraComponent, trigger, severity);
  }

  /**
   * Determine which collapse trigger is active (if any)
   */
  private determineTrigger(eraComponent: TechnologyEraComponent): CollapseTrigger | null {
    const { military, economic, environmental, social } = eraComponent.stability;
    const currentEraIndex = getEraIndex(eraComponent.currentEra);

    // Check each trigger in priority order (most severe first)

    // 1. Nuclear winter / reality breach (catastrophic)
    if (military < 10 && currentEraIndex >= 7) {
      // Atomic+ era with total military collapse
      return 'war_damage';
    }

    // 2. β-space accidents (Era 11+)
    if (currentEraIndex >= ERA_INDEX.INTERSTELLAR && environmental < STABILITY_THRESHOLDS.ENVIRONMENTAL) {
      return 'beta_space_accident';
    }

    // 3. AI misalignment (Era 13+)
    if (
      currentEraIndex >= ERA_INDEX.POST_SINGULARITY &&
      social < STABILITY_THRESHOLDS.AI_MISALIGNMENT
    ) {
      return 'ai_misalignment';
    }

    // 4. War damage
    if (military < STABILITY_THRESHOLDS.WAR_DAMAGE) {
      return 'war_damage';
    }

    // 5. Famine/plague
    if (economic < STABILITY_THRESHOLDS.FAMINE_PLAGUE) {
      return 'famine_plague';
    }

    // 6. Environmental collapse
    if (environmental < STABILITY_THRESHOLDS.ENVIRONMENTAL) {
      return 'environmental_collapse';
    }

    return null;
  }

  /**
   * Calculate collapse severity based on trigger type
   */
  private calculateSeverity(
    trigger: CollapseTrigger,
    eraComponent: TechnologyEraComponent
  ): CollapseSeverity {
    const currentEraIndex = getEraIndex(eraComponent.currentEra);
    const { military, economic, environmental, social } = eraComponent.stability;

    switch (trigger) {
      case 'war_damage': {
        // Nuclear winter / catastrophic war
        if (currentEraIndex >= 7 && military < 10) {
          return COLLAPSE_TEMPLATES.NUCLEAR_WINTER;
        }
        // Major war collapse
        if (military < 20) {
          return {
            erasToRegress: 3 + Math.floor(Math.random() * 2), // -3 to -4
            techLossRate: 0.5,
            recoveryTime: 525600000, // 500 years
            description: 'Major War Collapse',
          };
        }
        // Minor war collapse
        return {
          erasToRegress: 1 + Math.floor(Math.random() * 2), // -1 to -2
          techLossRate: 0.2,
          recoveryTime: 262800000, // 250 years
          description: 'War-Induced Collapse',
        };
      }

      case 'famine_plague': {
        // Catastrophic famine/plague
        if (economic < 10) {
          return {
            erasToRegress: 4 + Math.floor(Math.random() * 2), // -4 to -5
            techLossRate: 0.6,
            recoveryTime: 788400000, // 750 years
            description: 'Catastrophic Famine/Plague',
          };
        }
        // Major famine/plague
        if (economic < 20) {
          return {
            erasToRegress: 2 + Math.floor(Math.random() * 2), // -2 to -3
            techLossRate: 0.4,
            recoveryTime: 525600000, // 500 years
            description: 'Major Famine/Plague',
          };
        }
        // Minor famine/plague
        return {
          erasToRegress: 1,
          techLossRate: 0.2,
          recoveryTime: 262800000, // 250 years
          description: 'Famine/Plague Collapse',
        };
      }

      case 'ai_misalignment': {
        // AI takeover / singularity gone wrong
        if (social < 20) {
          return {
            erasToRegress: 6 + Math.floor(Math.random() * 2), // -6 to -7
            techLossRate: 0.85,
            recoveryTime: 1576800000, // 1500 years
            description: 'AI Misalignment Catastrophe',
          };
        }
        // Partial AI misalignment
        return {
          erasToRegress: 3 + Math.floor(Math.random() * 3), // -3 to -5
          techLossRate: 0.6,
          recoveryTime: 1051200000, // 1000 years
          description: 'AI Alignment Failure',
        };
      }

      case 'beta_space_accident': {
        // Reality breach
        if (environmental < 10) {
          return COLLAPSE_TEMPLATES.REALITY_BREACH;
        }
        // Major β-space accident
        return {
          erasToRegress: 5 + Math.floor(Math.random() * 2), // -5 to -6
          techLossRate: 0.7,
          recoveryTime: 1051200000, // 1000 years
          description: 'β-Space Reality Breach',
        };
      }

      case 'environmental_collapse': {
        // Total environmental collapse
        if (environmental < 10) {
          return {
            erasToRegress: 5 + Math.floor(Math.random() * 2), // -5 to -6
            techLossRate: 0.75,
            recoveryTime: 1051200000, // 1000 years
            description: 'Total Environmental Collapse',
          };
        }
        // Major environmental collapse
        return {
          erasToRegress: 3 + Math.floor(Math.random() * 2), // -3 to -4
          techLossRate: 0.5,
          recoveryTime: 788400000, // 750 years
          description: 'Environmental Collapse',
        };
      }

      default:
        // Fallback: minor collapse
        return {
          erasToRegress: 1,
          techLossRate: 0.2,
          recoveryTime: 262800000, // 250 years
          description: 'Minor Collapse',
        };
    }
  }

  /**
   * Apply collapse to civilization
   */
  private applyCollapse(
    world: World,
    civEntity: EntityImpl,
    eraComponent: TechnologyEraComponent,
    trigger: CollapseTrigger,
    severity: CollapseSeverity
  ): void {
    const currentIndex = getEraIndex(eraComponent.currentEra);
    const targetIndex = Math.max(0, currentIndex - severity.erasToRegress);

    // Determine new era
    const newEra = getEraByIndex(targetIndex);
    if (!newEra || newEra === eraComponent.currentEra) {
      return; // No change possible
    }

    const oldEra = eraComponent.currentEra;

    // Update era
    eraComponent.currentEra = newEra;
    eraComponent.eraProgress = 0;
    eraComponent.eraStartTick = world.tick;

    // Record transition
    recordEraTransition(eraComponent, oldEra, newEra, world.tick, 'regression');

    // Lose technologies
    const lostTechs = this.loseTechnologies(eraComponent, severity);

    // Emit events
    this.emitCollapseEvents(
      world,
      civEntity.id,
      trigger,
      severity,
      oldEra,
      newEra,
      lostTechs
    );

    console.warn(
      `[Collapse] Civilization ${civEntity.id} collapsed from ${oldEra} to ${newEra}`,
      `Trigger: ${trigger}, Severity: ${severity.description}`,
      `Lost ${severity.erasToRegress} eras, ${lostTechs.length} technologies`
    );
  }

  /**
   * Lose technologies during collapse
   */
  private loseTechnologies(
    eraComponent: TechnologyEraComponent,
    severity: CollapseSeverity
  ): string[] {
    const unlockedTechs = Array.from(eraComponent.unlockedTechIds);
    if (unlockedTechs.length === 0) return [];

    const lostTechs: string[] = [];
    const currentEraIndex = getEraIndex(eraComponent.currentEra);

    // For each technology, roll to see if it's lost
    for (const techId of unlockedTechs) {
      // Higher era techs are more likely to be lost
      // (complex technologies are harder to preserve)
      const baseLossChance = severity.techLossRate;

      // TODO: In a full implementation, we would look up the tech's era
      // and increase loss chance for advanced techs
      // For now, use base loss chance

      if (Math.random() < baseLossChance) {
        // Mark as lost (but don't delete - conservation of game matter)
        eraComponent.lostTechnologies.push(techId);
        eraComponent.unlockedTechIds.delete(techId);
        lostTechs.push(techId);
      }
    }

    return lostTechs;
  }

  /**
   * Emit collapse events
   */
  private emitCollapseEvents(
    world: World,
    civilizationId: string,
    trigger: CollapseTrigger,
    severity: CollapseSeverity,
    oldEra: TechnologyEra,
    newEra: TechnologyEra,
    lostTechnologies: string[]
  ): void {
    const eventBus = world.eventBus;

    // Civilization collapse triggered
    eventBus.emit({
      type: 'civilization:collapse_triggered',
      source: civilizationId,
      data: {
        civilizationId,
        trigger,
        severity: severity.description,
        erasLost: severity.erasToRegress,
        tick: world.tick,
      },
    });

    // Era regression
    eventBus.emit({
      type: 'civilization:era_regression',
      source: civilizationId,
      data: {
        civilizationId,
        fromEra: oldEra,
        toEra: newEra,
        erasRegressed: severity.erasToRegress,
        reason: trigger,
        tick: world.tick,
      },
    });

    // Technology lost (emit for each lost tech)
    for (const techId of lostTechnologies) {
      eventBus.emit({
        type: 'civilization:technology_lost',
        source: civilizationId,
        data: {
          civilizationId,
          technologyId: techId,
          reason: trigger,
          tick: world.tick,
        },
      });
    }

    // Dark age started
    eventBus.emit({
      type: 'civilization:dark_age_started',
      source: civilizationId,
      data: {
        civilizationId,
        trigger,
        severity: severity.description,
        estimatedRecoveryTime: severity.recoveryTime,
        tick: world.tick,
      },
    });
  }
}
