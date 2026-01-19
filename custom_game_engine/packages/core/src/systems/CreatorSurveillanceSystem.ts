/**
 * CreatorSurveillanceSystem - Supreme Creator's magic surveillance network
 *
 * Monitors all magic use in deity-restricted universes. When mortals or gods
 * wield forbidden magic, this system determines if the Supreme Creator detects it.
 *
 * Detection is influenced by:
 * - Spell detection risk (from CreatorDetectionMetadata)
 * - Creator's paranoia level (increases over time)
 * - Spy god network (loyal deities who report suspicious activity)
 * - Creator's current surveillance awareness
 *
 * This creates the oppressive atmosphere where magic constantly threatens to
 * burst out but gets crushed whenever it's discovered.
 */

import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SupremeCreatorComponent } from '../components/SupremeCreatorComponent.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import { SpellRegistry } from '../magic/SpellRegistry.js';
import { calculateDetectionChance, triggersImmediateIntervention } from '../magic/MagicDetectionSystem.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

// ============================================================================
// Detection Event Types
// ============================================================================

/** Magic detection event emitted when creator notices forbidden magic */
export interface MagicDetectionEvent {
  /** Entity who cast the spell */
  casterId: string;

  /** Spell that was cast */
  spellId: string;

  /** Whether the creator detected it */
  detected: boolean;

  /** Detection chance that was rolled */
  detectionChance: number;

  /** Evidence strength (0-1) if detected */
  evidenceStrength?: number;

  /** Timestamp of detection */
  timestamp: number;

  /** Spell's detection risk level */
  detectionRisk: string;
}

/** Surveillance alert levels */
export type AlertLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Surveillance Statistics
// ============================================================================

/** Tracks surveillance activity and effectiveness */
export interface SurveillanceStats {
  /** Total spell casts monitored */
  totalMonitored: number;

  /** Number of detections made */
  totalDetections: number;

  /** Detections by risk level */
  detectionsByRisk: Record<string, number>;

  /** Recent detections (last 10) */
  recentDetections: MagicDetectionEvent[];

  /** Current alert level */
  alertLevel: AlertLevel;

  /** Time of last detection */
  lastDetectionTime?: number;
}

// ============================================================================
// CreatorSurveillanceSystem
// ============================================================================

export class CreatorSurveillanceSystem extends BaseSystem {
  public readonly id: SystemId = 'creator_surveillance';
  public readonly priority = 16; // Right after MagicSystem (15)
  public readonly requiredComponents = [CT.SupremeCreator] as const;
  // Only run when supreme_creator components exist (O(1) activation check)
  public readonly activationComponents = [CT.SupremeCreator] as const;

  /** Surveillance statistics */
  private stats: SurveillanceStats = {
    totalMonitored: 0,
    totalDetections: 0,
    detectionsByRisk: {},
    recentDetections: [],
    alertLevel: 'none',
  };

  /** Check interval for surveillance sweeps (ticks) */
  protected readonly throttleInterval = 600; // Every 30 seconds at 20 TPS

  protected onInitialize(_world: never, eventBus: EventBus): void {
    // Subscribe to spell cast events
    eventBus.subscribe('magic:spell_cast', (event) => {
      this.monitorSpellCast(event);
    });

  }

  protected onUpdate(ctx: SystemContext): void {
    // Periodic surveillance sweeps
    this.performSurveillanceSweep(ctx.world);

    // Update alert levels based on recent activity
    this.updateAlertLevel();
  }

  // ============================================================================
  // Spell Cast Monitoring
  // ============================================================================

  /**
   * Monitor a spell cast event for detection
   */
  private monitorSpellCast(event: any): void {
    if (!this.world) return;

    const { spellId } = event.data;
    const casterId = event.source;

    if (typeof casterId !== 'string') return;

    // Get the spell definition to check detection metadata
    const spellRegistry = SpellRegistry.getInstance();
    const spell = spellRegistry.getSpell(spellId);

    if (!spell || !spell.creatorDetection) {
      // No detection metadata = unmonitored spell
      return;
    }

    this.stats.totalMonitored++;

    // Find the Supreme Creator
    const creator = this.findSupremeCreator();
    if (!creator) {
      // No supreme creator yet, no surveillance
      return;
    }

    const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

    // Calculate detection chance
    const detectionChance = calculateDetectionChance(
      spell.creatorDetection,
      creatorComp.tyranny.paranoia,
      creatorComp.surveillance.detectionModifier
    );

    // Roll for detection
    const roll = Math.random();
    const detected = roll < detectionChance;

    // Immediate intervention spells are always detected
    const forcedDetection = triggersImmediateIntervention(spell.creatorDetection);

    const finalDetected = detected || forcedDetection;

    // Create detection event
    const detectionEvent: MagicDetectionEvent = {
      casterId,
      spellId,
      detected: finalDetected,
      detectionChance,
      evidenceStrength: finalDetected ? this.calculateEvidenceStrength(spell.creatorDetection, roll) : undefined,
      timestamp: this.world.tick,
      detectionRisk: spell.creatorDetection.detectionRisk,
    };

    // Record the detection
    this.recordDetection(detectionEvent, creatorComp);

    // Emit detection event
    if (finalDetected && this.events) {
      this.events.emit('divinity:magic_detected', {
        casterId,
        spellId,
        detectionRisk: spell.creatorDetection.detectionRisk,
        evidenceStrength: detectionEvent.evidenceStrength,
        forbiddenCategories: spell.creatorDetection.forbiddenCategories,
        forced: forcedDetection,
      }, creator.id);

    }
  }

  /**
   * Calculate evidence strength based on detection
   */
  private calculateEvidenceStrength(
    metadata: any,
    roll: number
  ): number {
    // Base evidence from detection risk
    const riskEvidence: Record<string, number> = {
      'undetectable': 0,
      'low': 0.2,
      'moderate': 0.4,
      'high': 0.6,
      'critical': 1.0,
    };

    let evidence = riskEvidence[metadata.detectionRisk] || 0.5;

    // Better roll = stronger evidence
    const rollMargin = 1 - roll; // How much under the threshold
    evidence += rollMargin * 0.3;

    // Magical signature increases evidence
    if (metadata.leavesMagicalSignature) {
      evidence += 0.2;
    }

    return Math.min(1, evidence);
  }

  /**
   * Record a detection event
   */
  private recordDetection(event: MagicDetectionEvent, creator: SupremeCreatorComponent): void {
    if (event.detected) {
      this.stats.totalDetections++;
      this.stats.detectionsByRisk[event.detectionRisk] =
        (this.stats.detectionsByRisk[event.detectionRisk] || 0) + 1;
      this.stats.lastDetectionTime = event.timestamp;

      // Add to recent detections
      this.stats.recentDetections.unshift(event);
      if (this.stats.recentDetections.length > 10) {
        this.stats.recentDetections.pop();
      }

      // Update creator surveillance state
      creator.surveillance.lastCheckTimestamp = event.timestamp;

      // Detect the rebel if evidence is strong enough
      if (event.evidenceStrength && event.evidenceStrength >= 0.3) {
        creator.detectRebel(event.casterId, event.evidenceStrength);

        // Increase paranoia slightly with each detection
        const paranoiaIncrease = event.evidenceStrength * 0.05;
        creator.increaseParanoia(paranoiaIncrease);
      }
    }
  }

  // ============================================================================
  // Surveillance Sweeps
  // ============================================================================

  /**
   * Perform periodic surveillance sweep
   * Spy gods report suspicious activity, paranoia naturally increases
   */
  private performSurveillanceSweep(world: { getEntity: (id: string) => Entity | undefined }): void {
    const creator = this.findSupremeCreator();
    if (!creator) return;

    const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

    // Process spy god reports
    this.processSpyGodReports(world, creatorComp);

    // Natural paranoia increase based on response stage
    const paranoiaGrowth = this.calculateParanoiaGrowth(creatorComp);
    if (paranoiaGrowth > 0) {
      creatorComp.increaseParanoia(paranoiaGrowth);
    }

    // Update surveillance awareness
    this.updateSurveillanceAwareness(creatorComp);
  }

  /**
   * Process reports from spy gods
   */
  private processSpyGodReports(world: { getEntity: (id: string) => Entity | undefined }, creator: SupremeCreatorComponent): void {
    for (const spyGodId of creator.surveillance.spyGods) {
      const spyGod = world.getEntity(spyGodId);
      if (!spyGod) {
        // Spy god no longer exists, remove them
        creator.removeSpyGod(spyGodId);
        continue;
      }

      const deityComp = spyGod.components.get(CT.Deity) as DeityComponent | undefined;
      if (!deityComp) continue;

      // Spy gods increase detection effectiveness
      // (this is already factored into detectionModifier, but we log it)
      // Could emit events here for spy god reports
    }
  }

  /**
   * Calculate natural paranoia growth rate
   */
  private calculateParanoiaGrowth(creator: SupremeCreatorComponent): number {
    const stageGrowth: Record<string, number> = {
      'dormant': 0.001,      // Minimal growth when calm
      'suspicious': 0.005,   // Moderate growth
      'investigating': 0.01, // Faster growth
      'cracking_down': 0.02, // Rapid growth
      'purge': 0.03,         // Maximum growth
    };

    return stageGrowth[creator.responseStage] || 0.001;
  }

  /**
   * Update surveillance awareness based on activity
   */
  private updateSurveillanceAwareness(creator: SupremeCreatorComponent): void {
    // Awareness increases with detections
    const recentDetections = this.stats.recentDetections.length;

    if (recentDetections > 5) {
      creator.surveillance.awareness = Math.min(1, creator.surveillance.awareness + 0.05);
    } else if (recentDetections > 2) {
      creator.surveillance.awareness = Math.min(1, creator.surveillance.awareness + 0.02);
    } else if (recentDetections === 0) {
      // Awareness slowly decays without activity
      creator.surveillance.awareness = Math.max(0, creator.surveillance.awareness - 0.01);
    }
  }

  // ============================================================================
  // Alert Level Management
  // ============================================================================

  /**
   * Update alert level based on recent activity
   */
  private updateAlertLevel(): void {
    const recentDetections = this.stats.recentDetections.length;
    const criticalDetections = this.stats.recentDetections.filter(
      d => d.detectionRisk === 'critical'
    ).length;

    let newAlert: AlertLevel = 'none';

    if (criticalDetections > 0) {
      newAlert = 'critical';
    } else if (recentDetections >= 5) {
      newAlert = 'high';
    } else if (recentDetections >= 3) {
      newAlert = 'medium';
    } else if (recentDetections >= 1) {
      newAlert = 'low';
    }

    // Emit alert level change event if changed
    if (newAlert !== this.stats.alertLevel && this.events) {
      const creator = this.findSupremeCreator();
      if (creator) {
        this.events.emit('divinity:surveillance_alert', {
          oldLevel: this.stats.alertLevel,
          newLevel: newAlert,
          recentDetections,
          criticalDetections,
        }, creator.id);
      }

      this.stats.alertLevel = newAlert;
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Find the Supreme Creator entity
   * Note: Supreme Creator is ALWAYS simulated, so using targeted query is fine
   */
  private findSupremeCreator(): Entity | null {
    if (!this.world) return null;

    // This is a targeted singleton query - Supreme Creator always exists
    for (const entity of this.world.entities.values()) {
      if (entity.components.has(CT.SupremeCreator)) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Get surveillance statistics (for debugging/UI)
   */
  public getStats(): SurveillanceStats {
    return { ...this.stats };
  }

  /**
   * Get current creator surveillance state (for debugging/UI)
   */
  public getCreatorState(): any {
    const creator = this.findSupremeCreator();
    if (!creator) return null;

    const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;
    return {
      paranoia: creatorComp.tyranny.paranoia,
      responseStage: creatorComp.responseStage,
      awareness: creatorComp.surveillance.awareness,
      detectionModifier: creatorComp.surveillance.detectionModifier,
      spyGodCount: creatorComp.surveillance.spyGods.length,
      detectedRebels: creatorComp.detectedRebels.length,
    };
  }
}
