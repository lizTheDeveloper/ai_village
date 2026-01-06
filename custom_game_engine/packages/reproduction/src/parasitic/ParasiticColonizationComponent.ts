/**
 * ParasiticColonizationComponent
 *
 * Tracks whether an entity is colonized by a parasitic hive mind,
 * the integration status, and the relationship between host and parasite.
 *
 * This models scenarios like:
 * - Body Snatchers (pod people)
 * - Yeerks (Animorphs)
 * - Goa'uld (Stargate)
 * - Cordyceps-style fungal control
 * - The Pluribus concept
 */

import { ComponentBase } from '@ai-village/core';
import type { EntityId, Tick } from '@ai-village/core';

/** The degree of control the parasite has over the host */
export type ControlLevel =
  | 'none' // Host is uncolonized
  | 'contested' // Host is fighting back, control is partial
  | 'partial' // Parasite has control but host has moments of autonomy
  | 'full' // Complete control, host is suppressed
  | 'integrated' // Host personality has been absorbed/merged
  | 'symbiotic'; // Rare: both entities cooperate (becomes more like Trill)

/** How the host's original personality is treated */
export type HostPersonalityState =
  | 'intact' // Host is still there, aware, possibly screaming internally
  | 'suppressed' // Host is dormant but could potentially resurface
  | 'fragmented' // Host's personality is breaking down
  | 'absorbed' // Host's memories/skills absorbed, personality gone
  | 'destroyed' // Nothing left of the original
  | 'cooperative'; // Host and parasite work together (rare)

/** The method by which colonization occurred */
export type ColonizationMethod =
  | 'ear_entry' // Classic Yeerk-style
  | 'spore_inhalation' // Cordyceps-style
  | 'pod_replacement' // Body Snatchers - host body is replaced
  | 'injection' // Goa'uld-style through neck
  | 'consumption' // Eaten and rebuilt
  | 'psychic_override' // No physical parasite, pure mental takeover
  | 'birth_colonization' // Born already colonized
  | 'gradual_infiltration'; // Slow takeover over time

/** Integration stages during colonization */
export interface IntegrationProgress {
  /** Current stage of integration (0 = just invaded, 1 = fully integrated) */
  progress: number;

  /** Time colonization began */
  colonizationTick: Tick;

  /** Expected ticks until full integration */
  expectedIntegrationDuration: number;

  /** Whether integration is actively progressing or stalled */
  integrationStalled: boolean;

  /** Reason for stall if stalled */
  stallReason?: 'host_resistance' | 'nutrient_deficiency' | 'interference' | 'incompatibility';
}

/** Information about the parasite entity */
export interface ParasiteInfo {
  /** The parasite's entity ID (if it's a separate entity) */
  parasiteEntityId?: EntityId;

  /** The collective/hive this parasite belongs to */
  collectiveId: string;

  /** The parasite's generation (how many host-jumps from the original) */
  generation: number;

  /** Unique identifier for this specific parasite organism */
  parasiteLineageId: string;

  /** Special abilities this parasite has gained from previous hosts */
  absorbedSkills: string[];

  /** Memories accessible from previous hosts */
  accessibleMemories: Array<{
    hostId: EntityId;
    memoryTypes: string[];
    clarity: number; // 0-1, how clear the memories are
  }>;
}

/** Records of past hosts this parasite has inhabited */
export interface HostHistory {
  hostId: EntityId;
  colonizationTick: Tick;
  departureTick?: Tick;
  departureReason?: 'host_death' | 'host_transfer' | 'rejection' | 'voluntary';
  skillsAbsorbed: string[];
  memoriesRetained: boolean;
}

/**
 * Component tracking parasitic colonization of an entity.
 */
export class ParasiticColonizationComponent extends ComponentBase {
  public readonly type = 'parasitic_colonization';

  // ============================================================================
  // Colonization Status
  // ============================================================================

  /** Whether this entity is currently colonized */
  public isColonized: boolean = false;

  /** The level of control the parasite has */
  public controlLevel: ControlLevel = 'none';

  /** State of the host's original personality */
  public hostPersonalityState: HostPersonalityState = 'intact';

  /** How colonization occurred */
  public colonizationMethod?: ColonizationMethod;

  /** Integration progress during colonization */
  public integration?: IntegrationProgress;

  // ============================================================================
  // Parasite Information
  // ============================================================================

  /** Information about the colonizing parasite */
  public parasite?: ParasiteInfo;

  /** History of previous hosts (if this is tracking the parasite's history) */
  public hostHistory: HostHistory[] = [];

  // ============================================================================
  // Host Resistance
  // ============================================================================

  /** Host's natural resistance to colonization (0-1) */
  public baseResistance: number = 0.3;

  /** Current resistance level (can be modified by items, magic, etc.) */
  public currentResistance: number = 0.3;

  /** Whether host is actively fighting colonization */
  public isResisting: boolean = false;

  /** Resistance attempts remaining before exhaustion */
  public resistanceStamina: number = 100;

  /** Whether this entity has been decolonized before (affects future resistance) */
  public previouslyColonized: boolean = false;

  /** Number of times this host has been colonized */
  public colonizationCount: number = 0;

  // ============================================================================
  // Breeding Status (for hive-controlled reproduction)
  // ============================================================================

  /** Whether the collective has designated this host for breeding */
  public designatedBreeder: boolean = false;

  /** Assigned mate (if breeding is assigned by collective) */
  public assignedMateId?: EntityId;

  /** Breeding priority assigned by collective */
  public breedingPriority: number = 0;

  /** Whether this host's offspring should be immediately colonized */
  public colonizeOffspring: boolean = true;

  /** Genetic traits the collective wants to propagate through this host */
  public desiredTraits: string[] = [];

  // ============================================================================
  // Hive Pressure (nearby colonized entities make resistance harder)
  // ============================================================================

  /** Current hive pressure from nearby colonized entities (0-1) */
  public hivePressure: number = 0;

  /** Number of nearby colonized entities contributing to pressure */
  public nearbyColonizedCount: number = 0;

  /** Resistance stamina drain multiplier from hive pressure */
  public get staminaDrainMultiplier(): number {
    // More nearby colonized = faster stamina drain
    // At 0 pressure: 1x drain, at max pressure: 3x drain
    return 1 + this.hivePressure * 2;
  }

  /** Resistance success penalty from hive pressure */
  public get resistancePenalty(): number {
    // Each nearby colonized reduces effective resistance
    // At 0 pressure: no penalty, at max pressure: -50% resistance
    return this.hivePressure * 0.5;
  }

  // ============================================================================
  // Detection & Camouflage
  // ============================================================================

  /** How well the parasite is hiding (0 = obvious, 1 = undetectable) */
  public camouflageLevel: number = 0.8;

  /** Whether the colonization has been detected by others */
  public detectedBy: EntityId[] = [];

  /** Behaviors that might reveal the colonization */
  public suspiciousBehaviors: Array<{
    behavior: string;
    witnessedBy: EntityId[];
    tick: Tick;
  }> = [];

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Begin colonization of this host.
   */
  public colonize(
    collectiveId: string,
    method: ColonizationMethod,
    parasiteLineageId: string,
    currentTick: Tick,
    parasiteEntityId?: EntityId,
  ): void {
    if (this.isColonized) {
      throw new Error('Entity is already colonized');
    }

    this.isColonized = true;
    this.colonizationMethod = method;
    this.controlLevel = 'contested';
    this.hostPersonalityState = 'intact';
    this.colonizationCount++;
    this.isResisting = this.currentResistance > 0.5;

    this.parasite = {
      collectiveId,
      parasiteEntityId,
      parasiteLineageId,
      generation: 0,
      absorbedSkills: [],
      accessibleMemories: [],
    };

    this.integration = {
      progress: 0,
      colonizationTick: currentTick,
      expectedIntegrationDuration: this.calculateIntegrationDuration(),
      integrationStalled: false,
    };
  }

  /**
   * Update integration progress.
   */
  public updateIntegration(currentTick: Tick): void {
    if (!this.isColonized || !this.integration) return;

    const elapsed = currentTick - this.integration.colonizationTick;
    const baseProgress = elapsed / this.integration.expectedIntegrationDuration;

    // Resistance slows integration
    const resistanceModifier = this.isResisting ? 0.5 : 1.0;
    this.integration.progress = Math.min(1, baseProgress * resistanceModifier);

    // Update control level based on progress
    if (this.integration.progress < 0.25) {
      this.controlLevel = 'contested';
    } else if (this.integration.progress < 0.5) {
      this.controlLevel = 'partial';
    } else if (this.integration.progress < 0.9) {
      this.controlLevel = 'full';
      this.hostPersonalityState = 'suppressed';
    } else {
      this.controlLevel = 'integrated';
      this.hostPersonalityState = 'absorbed';
    }

    // Drain resistance stamina if resisting (hive pressure makes it drain faster)
    if (this.isResisting) {
      const staminaDrain = 1 * this.staminaDrainMultiplier;
      this.resistanceStamina = Math.max(0, this.resistanceStamina - staminaDrain);
      if (this.resistanceStamina === 0) {
        this.isResisting = false;
      }
    }
  }

  /**
   * Update hive pressure based on nearby colonized entities.
   * Should be called by the ColonizationSystem with proximity data.
   */
  public updateHivePressure(nearbyColonizedCount: number, maxPressureAt: number = 5): void {
    this.nearbyColonizedCount = nearbyColonizedCount;
    // Pressure scales from 0 to 1 based on nearby count
    // At 5 nearby colonized (default), pressure is maxed
    this.hivePressure = Math.min(1, nearbyColonizedCount / maxPressureAt);
  }

  /**
   * Attempt to resist/break free from colonization.
   */
  public attemptResistance(): { success: boolean; message: string } {
    if (!this.isColonized) {
      return { success: false, message: 'Not colonized' };
    }

    if (this.resistanceStamina <= 0) {
      return { success: false, message: 'Too exhausted to resist' };
    }

    if (this.hostPersonalityState === 'destroyed' || this.hostPersonalityState === 'absorbed') {
      return { success: false, message: 'Host personality no longer exists' };
    }

    // Resistance check - hive pressure makes it much harder
    const resistanceRoll = Math.random();
    const integrationPenalty = this.integration?.progress ?? 0;
    const hivePenalty = this.resistancePenalty; // From nearby colonized
    const effectiveResistance = Math.max(0,
      this.currentResistance * (1 - integrationPenalty * 0.5) - hivePenalty
    );

    // Hive pressure message
    const pressureMessage = this.hivePressure > 0.5
      ? ` The collective's presence is overwhelming (${this.nearbyColonizedCount} nearby).`
      : this.hivePressure > 0
        ? ` The hive's whispers grow louder (${this.nearbyColonizedCount} nearby).`
        : '';

    if (resistanceRoll < effectiveResistance * 0.1) {
      // Critical success - break free!
      this.decolonize('rejection');
      return { success: true, message: 'Host broke free from colonization!' };
    } else if (resistanceRoll < effectiveResistance) {
      // Partial success - stall integration
      if (this.integration) {
        this.integration.integrationStalled = true;
        this.integration.stallReason = 'host_resistance';
      }
      this.isResisting = true;
      return { success: true, message: 'Host is fighting back, integration stalled' + pressureMessage };
    } else {
      // Failure - costs stamina (more when surrounded)
      const staminaCost = Math.round(10 * this.staminaDrainMultiplier);
      this.resistanceStamina = Math.max(0, this.resistanceStamina - staminaCost);
      return { success: false, message: `Resistance failed, host exhausted.${pressureMessage}` };
    }
  }

  /**
   * Remove the parasite from this host.
   */
  public decolonize(reason: 'host_death' | 'host_transfer' | 'rejection' | 'voluntary'): void {
    if (!this.isColonized || !this.parasite) return;

    // Record in host history
    this.hostHistory.push({
      hostId: this.parasite.parasiteEntityId ?? ('' as EntityId),
      colonizationTick: this.integration?.colonizationTick ?? (0 as Tick),
      departureReason: reason,
      skillsAbsorbed: [...this.parasite.absorbedSkills],
      memoriesRetained: true,
    });

    this.isColonized = false;
    this.controlLevel = 'none';
    this.colonizationMethod = undefined;
    this.integration = undefined;
    this.parasite = undefined;
    this.previouslyColonized = true;
    this.designatedBreeder = false;
    this.assignedMateId = undefined;

    // Host may be damaged depending on how long they were colonized
    if (this.hostPersonalityState === 'fragmented') {
      // Personality may recover but with trauma
      this.hostPersonalityState = 'intact';
    }
  }

  /**
   * Assign this host for breeding by the collective.
   */
  public assignForBreeding(mateId: EntityId, priority: number, traits: string[]): void {
    if (!this.isColonized) {
      throw new Error('Cannot assign uncolonized host for breeding');
    }

    this.designatedBreeder = true;
    this.assignedMateId = mateId;
    this.breedingPriority = priority;
    this.desiredTraits = traits;
  }

  /**
   * Record a suspicious behavior that might reveal colonization.
   */
  public recordSuspiciousBehavior(behavior: string, witnessId: EntityId, tick: Tick): void {
    this.suspiciousBehaviors.push({
      behavior,
      witnessedBy: [witnessId],
      tick,
    });

    // Degrade camouflage
    this.camouflageLevel = Math.max(0, this.camouflageLevel - 0.05);
  }

  /**
   * Calculate expected integration duration based on host resistance.
   */
  private calculateIntegrationDuration(): number {
    const baseDuration = 1000; // Base ticks for integration
    const resistanceMultiplier = 1 + this.currentResistance * 2;
    const previousColonizationBonus = this.previouslyColonized ? 0.7 : 1.0;

    return Math.floor(baseDuration * resistanceMultiplier * previousColonizationBonus);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an uncolonized entity (potential host).
 */
export function createPotentialHost(
  baseResistance: number = 0.3,
): ParasiticColonizationComponent {
  const component = new ParasiticColonizationComponent();
  component.baseResistance = baseResistance;
  component.currentResistance = baseResistance;
  return component;
}

/**
 * Create an already-colonized entity.
 */
export function createColonizedHost(
  collectiveId: string,
  method: ColonizationMethod,
  parasiteLineageId: string,
  currentTick: Tick,
  integrationProgress: number = 1.0,
): ParasiticColonizationComponent {
  const component = new ParasiticColonizationComponent();
  component.colonize(collectiveId, method, parasiteLineageId, currentTick);

  // Fast-forward integration if needed
  if (integrationProgress > 0 && component.integration) {
    component.integration.progress = integrationProgress;
    if (integrationProgress >= 0.9) {
      component.controlLevel = 'integrated';
      component.hostPersonalityState = 'absorbed';
    } else if (integrationProgress >= 0.5) {
      component.controlLevel = 'full';
      component.hostPersonalityState = 'suppressed';
    }
  }

  return component;
}

/**
 * Create a high-resistance host (harder to colonize).
 */
export function createResistantHost(): ParasiticColonizationComponent {
  const component = new ParasiticColonizationComponent();
  component.baseResistance = 0.8;
  component.currentResistance = 0.8;
  component.resistanceStamina = 200;
  return component;
}

/**
 * Create a previously-colonized host (has some immunity).
 */
export function createPreviouslyColonizedHost(): ParasiticColonizationComponent {
  const component = new ParasiticColonizationComponent();
  component.previouslyColonized = true;
  component.colonizationCount = 1;
  component.baseResistance = 0.5; // Higher resistance from experience
  component.currentResistance = 0.5;
  return component;
}
