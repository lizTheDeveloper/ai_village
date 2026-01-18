/**
 * CreatorInterventionSystem - Supreme Creator's punishment and intervention
 *
 * When the surveillance system detects forbidden magic, the Creator responds.
 * Interventions escalate from warnings to complete annihilation based on:
 * - Evidence strength
 * - Response stage (dormant → purge)
 * - Number of previous offenses
 * - Severity of forbidden magic
 *
 * Intervention Types (escalating):
 * 1. Divine Warning - Terrifying vision/message
 * 2. Power Suppression - Reduce magical capabilities
 * 3. Spell Ban - Block specific spells from being cast
 * 4. Smite - Direct divine punishment (damage/debuff)
 * 5. Divine Silence - Irremovable curse, even gods can't lift it
 * 6. Annihilation - Complete destruction (rare, only in purge stage)
 */

import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SupremeCreatorComponent } from '../components/SupremeCreatorComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

// ============================================================================
// Intervention Types
// ============================================================================

export type InterventionType =
  | 'warning'
  | 'power_suppression'
  | 'spell_ban'
  | 'smite'
  | 'mark_of_sinner'
  | 'divine_silence'
  | 'annihilation';

export type InterventionSeverity = 'minor' | 'moderate' | 'severe' | 'critical';

// ============================================================================
// Intervention Events
// ============================================================================

export interface InterventionEvent {
  /** Type of intervention */
  type: InterventionType;

  /** Target entity */
  targetId: string;

  /** Severity of intervention */
  severity: InterventionSeverity;

  /** Reason/trigger */
  reason: string;

  /** Spell that triggered it (if applicable) */
  triggeredBySpell?: string;

  /** Timestamp */
  timestamp: number;
}

export interface DivineWarning {
  /** Warning message/vision content */
  message: string;

  /** Fear level inflicted (0-1) */
  fearLevel: number;

  /** Whether this is final warning */
  isFinalWarning: boolean;
}

export interface PowerSuppression {
  /** Amount of power reduction (0-1) */
  reductionAmount: number;

  /** Duration in ticks */
  duration: number;

  /** Whether this affects all magic or specific types */
  scope: 'all' | 'forbidden' | 'specific';

  /** Specific spell IDs if scope is 'specific' */
  affectedSpells?: string[];
}

export type BanTrapLevel = 'none' | 'minor_harm' | 'severe_harm' | 'lethal';

export interface SpellBan {
  /** Banned spell ID */
  spellId: string;

  /** Reason for ban */
  reason: string;

  /** Whether ban is permanent */
  isPermanent: boolean;

  /** Duration if not permanent */
  duration?: number;

  /** Booby trap level - what happens when you try to cast this */
  trapLevel: BanTrapLevel;

  /** Number of times this ban has been violated */
  violationCount: number;

  /** Whether trap escalates with each violation */
  escalates: boolean;
}

export interface Smite {
  /** Damage amount */
  damage: number;

  /** Debuff effects */
  debuffs: SmiteDebuff[];

  /** Whether this is lethal */
  isLethal: boolean;

  /** Visual effect description */
  effect: string;
}

export interface SmiteDebuff {
  type: 'weakness' | 'curse' | 'brand' | 'corruption';
  severity: number; // 0-1
  duration: number; // ticks
}

export interface MarkOfSinner {
  /** Sin committed (e.g. "casting forbidden resurrection magic") */
  sin: string;

  /** Spell that triggered the mark (if applicable) */
  triggeredBySpell?: string;

  /** When the mark was applied */
  appliedAt: number;

  /** Whether mark is permanent (usually yes) */
  isPermanent: boolean;

  /** Social penalties */
  socialPenalty: number; // 0-1, affects charisma/reputation

  /** Visual mark description (for agent perception) */
  visualDescription: string;

  /** Imposed by which deity */
  imposedBy: string; // Creator entity ID
}

export interface DivineSilence {
  /** Duration in ticks (0 = permanent) */
  duration: number;

  /** Effects of the silence */
  effects: SilenceEffect[];

  /** Can this be removed? (always false for divine hierarchy reasons) */
  removable: false;

  /** Who imposed it (for hierarchy checking) */
  imposedBy: string; // Supreme Creator entity ID
}

export interface SilenceEffect {
  type: 'mute_magic' | 'mute_voice' | 'mute_prayer' | 'isolation' | 'memory_loss';
  intensity: number; // 0-1
}

// ============================================================================
// Active Interventions (Component Data)
// ============================================================================

export interface ActiveIntervention {
  id: string;
  type: InterventionType;
  imposedAt: number;
  expiresAt?: number; // undefined = permanent
  data: DivineWarning | PowerSuppression | SpellBan | Smite | MarkOfSinner | DivineSilence;
}

// ============================================================================
// Intervention Decision Logic
// ============================================================================

interface InterventionDecision {
  shouldIntervene: boolean;
  interventionType: InterventionType;
  severity: InterventionSeverity;
  reason: string;
}

// ============================================================================
// CreatorInterventionSystem
// ============================================================================

export class CreatorInterventionSystem extends BaseSystem {
  public readonly id: SystemId = 'creator_intervention';
  public readonly priority = 17; // After surveillance (16)
  public readonly requiredComponents = [CT.SupremeCreator] as const;

  /** Banned spells (global) */
  private bannedSpells: Map<string, SpellBan> = new Map();

  /** Active interventions by entity ID */
  private activeInterventions: Map<string, ActiveIntervention[]> = new Map();

  /** Intervention history */
  private interventionHistory: InterventionEvent[] = [];

  /** Maximum intervention history entries to retain */
  private static readonly MAX_INTERVENTION_HISTORY = 500;

  protected onInitialize(_world: never, eventBus: EventBus): void {
    // Subscribe to magic detection events
    eventBus.subscribe('divinity:magic_detected', (event) => {
      this.handleMagicDetection(event);
    });

    // Subscribe to spell cast attempts (for blocking banned spells)
    eventBus.subscribe('magic:spell_cast_attempt', (event) => {
      this.handleSpellCastAttempt(event);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Expire temporary interventions
    this.updateInterventionExpirations(ctx.world);
  }

  // ============================================================================
  // Magic Detection Handler
  // ============================================================================

  private handleMagicDetection(event: any): void {
    if (!this.world || !this.events) return;

    const { casterId, spellId, detectionRisk, evidenceStrength, forbiddenCategories } = event.data;

    // Find the Supreme Creator
    const creator = this.findSupremeCreator();
    if (!creator) return;

    const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

    // Decide on intervention
    const decision = this.decideIntervention(
      creatorComp,
      casterId,
      spellId,
      detectionRisk,
      evidenceStrength,
      forbiddenCategories
    );

    if (!decision.shouldIntervene) return;

    // Execute intervention
    this.executeIntervention(
      creator.id,
      casterId,
      decision.interventionType,
      decision.severity,
      decision.reason,
      spellId
    );
  }

  // ============================================================================
  // Spell Cast Attempt Handler (for blocking banned spells)
  // ============================================================================

  private handleSpellCastAttempt(event: any): void {
    if (!this.events || !this.world) return;

    const { casterId, spellId } = event.data;

    // Check if spell is banned
    const ban = this.bannedSpells.get(spellId);
    if (ban) {
      // Block the spell
      this.events.emit('magic:spell_blocked', {
        spellId,
        reason: 'banned_by_creator',
        banReason: ban.reason,
        trapLevel: ban.trapLevel,
      }, casterId);

      // Apply booby trap effects BEFORE escalation
      this.applyTrapEffects(casterId, ban.trapLevel, spellId);

      // Escalate trap level for next violation
      if (ban.escalates) {
        this.escalateBanTrap(ban);
      }

      // Increment violation count
      ban.violationCount++;

      // Emit warning that they tried to cast a banned spell
      this.events.emit('divinity:banned_spell_attempt', {
        spellId,
        ban,
        trapTriggered: ban.trapLevel !== 'none',
        newTrapLevel: ban.trapLevel,
      }, casterId);
    }

    // Check if entity has active power suppression
    const interventions = this.activeInterventions.get(casterId) || [];
    const suppression = interventions.find(
      (i) => i.type === 'power_suppression'
    ) as ActiveIntervention | undefined;

    if (suppression) {
      const data = suppression.data as PowerSuppression;

      // Check if this spell is affected by suppression
      const isAffected =
        data.scope === 'all' ||
        (data.scope === 'specific' && data.affectedSpells?.includes(spellId));

      if (isAffected) {
        // Reduce spell power
        this.events.emit('magic:spell_suppressed', {
          spellId,
          reductionAmount: data.reductionAmount,
        }, casterId);
      }
    }
  }

  // ============================================================================
  // Booby Trap System
  // ============================================================================

  /**
   * Apply trap effects when a banned spell is attempted
   */
  private applyTrapEffects(casterId: string, trapLevel: BanTrapLevel, spellId: string): void {
    if (!this.events || !this.world) return;
    if (trapLevel === 'none') return;

    const creator = this.findSupremeCreator();
    if (!creator) return;

    switch (trapLevel) {
      case 'minor_harm':
        // Small damage + warning
        this.events.emit('divinity:trap_triggered', {
          targetId: casterId,
          spellId,
          trapLevel,
          damage: 15,
          message: 'The Creator\'s wrath stings you for defying the ban.',
        }, creator.id);
        break;

      case 'severe_harm':
        // Heavy damage + debuff
        this.events.emit('divinity:trap_triggered', {
          targetId: casterId,
          spellId,
          trapLevel,
          damage: 50,
          debuffs: [
            { type: 'weakness', severity: 0.7, duration: 36000 },
            { type: 'curse', severity: 0.5, duration: 72000 },
          ],
          message: 'Divine punishment crashes down upon you! The Creator sees your defiance.',
        }, creator.id);
        break;

      case 'lethal':
        // Instant death
        this.events.emit('divinity:trap_triggered', {
          targetId: casterId,
          spellId,
          trapLevel,
          lethal: true,
          message: 'The Creator\'s final judgment: DEATH. You dared defy the absolute law.',
        }, creator.id);

        // Also emit annihilation
        this.events.emit('divinity:annihilation', {
          targetId: casterId,
          reason: `Lethal trap triggered by attempting banned spell: ${spellId}`,
        }, creator.id);
        break;
    }

  }

  /**
   * Escalate ban trap to next severity level
   */
  private escalateBanTrap(ban: SpellBan): void {
    const escalationPath: BanTrapLevel[] = ['none', 'minor_harm', 'severe_harm', 'lethal'];
    const currentIndex = escalationPath.indexOf(ban.trapLevel);

    if (currentIndex < escalationPath.length - 1) {
      const newLevel = escalationPath[currentIndex + 1]!;
      const oldLevel = escalationPath[currentIndex]!;
      ban.trapLevel = newLevel;


      // Emit escalation event
      if (this.events) {
        this.events.emit('divinity:ban_trap_escalated', {
          spellId: ban.spellId,
          oldLevel,
          newLevel,
          violationCount: ban.violationCount + 1,
        }, 'supreme_creator');
      }
    }
  }

  // ============================================================================
  // Intervention Decision Logic
  // ============================================================================

  private decideIntervention(
    creator: SupremeCreatorComponent,
    casterId: string,
    spellId: string,
    _detectionRisk: string,
    evidenceStrength: number,
    forbiddenCategories?: string[]
  ): InterventionDecision {
    // Get previous intervention count for this entity
    const previousInterventions = this.interventionHistory.filter(
      (i) => i.targetId === casterId
    ).length;

    // Base decision on response stage
    const stage = creator.responseStage;
    const paranoia = creator.tyranny.paranoia;
    const wrathfulness = creator.tyranny.wrathfulness;

    // Critical forbidden categories trigger immediate harsh response
    const hasCriticalCategory = forbiddenCategories?.some((cat) =>
      ['resurrection', 'time_manipulation', 'reality_warping', 'ascension'].includes(cat)
    );

    // Decide intervention type based on stage, evidence, and history
    let interventionType: InterventionType = 'warning';
    let severity: InterventionSeverity = 'minor';

    if (stage === 'dormant') {
      // Early stages: warnings only
      if (previousInterventions === 0) {
        interventionType = 'warning';
        severity = 'minor';
      } else if (previousInterventions === 1) {
        interventionType = 'warning';
        severity = 'moderate';
      } else {
        interventionType = 'power_suppression';
        severity = 'moderate';
      }
    } else if (stage === 'suspicious') {
      // Getting more aggressive - public shaming starts here
      if (previousInterventions === 0) {
        interventionType = 'warning';
        severity = 'moderate';
      } else if (previousInterventions === 1) {
        interventionType = 'mark_of_sinner';
        severity = 'minor';
      } else if (previousInterventions === 2) {
        interventionType = 'power_suppression';
        severity = 'moderate';
      } else {
        interventionType = 'spell_ban';
        severity = 'severe';
      }
    } else if (stage === 'investigating') {
      // More severe - mark first, then power suppression
      if (previousInterventions === 0) {
        interventionType = 'mark_of_sinner';
        severity = 'moderate';
      } else if (previousInterventions === 1) {
        interventionType = 'power_suppression';
        severity = 'moderate';
      } else if (previousInterventions === 2) {
        interventionType = 'smite';
        severity = 'severe';
      } else {
        interventionType = 'divine_silence';
        severity = 'critical';
      }
    } else if (stage === 'cracking_down') {
      // Very harsh
      if (previousInterventions === 0) {
        interventionType = 'smite';
        severity = 'moderate';
      } else if (previousInterventions <= 1) {
        interventionType = 'divine_silence';
        severity = 'severe';
      } else {
        interventionType = 'annihilation';
        severity = 'critical';
      }
    } else if (stage === 'purge') {
      // Extreme
      if (previousInterventions === 0) {
        interventionType = 'divine_silence';
        severity = 'severe';
      } else {
        interventionType = 'annihilation';
        severity = 'critical';
      }
    }

    // Critical spells escalate immediately
    if (hasCriticalCategory) {
      if (stage === 'dormant' || stage === 'suspicious') {
        interventionType = 'smite';
        severity = 'severe';
      } else {
        interventionType = 'divine_silence';
        severity = 'critical';
      }
    }

    // Wrathfulness increases severity
    if (wrathfulness > 0.7) {
      if (severity === 'minor') severity = 'moderate';
      else if (severity === 'moderate') severity = 'severe';
    }

    // High paranoia makes creator intervene more
    const shouldIntervene = evidenceStrength > 0.3 || paranoia > 0.5;

    const reason = this.buildInterventionReason(
      interventionType,
      spellId,
      forbiddenCategories,
      previousInterventions
    );

    return {
      shouldIntervene,
      interventionType,
      severity,
      reason,
    };
  }

  private buildInterventionReason(
    type: InterventionType,
    spellId: string,
    forbiddenCategories?: string[],
    previousCount: number = 0
  ): string {
    const categoryStr = forbiddenCategories?.join(', ') || 'forbidden magic';

    if (type === 'warning') {
      if (previousCount === 0) {
        return `First warning: detected use of ${categoryStr}`;
      }
      return `Final warning: repeated use of ${categoryStr}`;
    } else if (type === 'power_suppression') {
      return `Power suppression for practicing ${categoryStr}`;
    } else if (type === 'spell_ban') {
      return `Spell '${spellId}' banned for violating divine law`;
    } else if (type === 'smite') {
      return `Divine punishment for defying the Creator with ${categoryStr}`;
    } else if (type === 'divine_silence') {
      return `Divine Silence imposed for persistent rebellion`;
    } else {
      return `Annihilation decreed for unforgivable transgression`;
    }
  }

  // ============================================================================
  // Execute Intervention
  // ============================================================================

  private executeIntervention(
    creatorId: string,
    targetId: string,
    type: InterventionType,
    severity: InterventionSeverity,
    reason: string,
    spellId?: string
  ): void {
    if (!this.world || !this.events) return;

    const target = this.world.getEntity(targetId);
    if (!target) return;

    // Create intervention data based on type
    let interventionData: ActiveIntervention['data'];
    const timestamp = this.world.tick;

    switch (type) {
      case 'warning':
        interventionData = this.createWarning(severity);
        break;
      case 'power_suppression':
        interventionData = this.createPowerSuppression(severity);
        break;
      case 'spell_ban':
        if (spellId) {
          interventionData = this.createSpellBan(spellId, severity, reason);
          this.bannedSpells.set(spellId, interventionData as SpellBan);
        }
        break;
      case 'smite':
        interventionData = this.createSmite(severity);
        break;
      case 'mark_of_sinner':
        interventionData = this.createMarkOfSinner(creatorId, severity, spellId);
        break;
      case 'divine_silence':
        interventionData = this.createDivineSilence(creatorId, severity);
        break;
      case 'annihilation':
        this.executeAnnihilation(targetId);
        return; // Annihilation is instant, no active intervention
    }

    // Record intervention
    const intervention: ActiveIntervention = {
      id: `${type}_${timestamp}_${targetId}`,
      type,
      imposedAt: timestamp,
      expiresAt: this.calculateExpiration(type, interventionData!, timestamp),
      data: interventionData!,
    };

    // Add to active interventions
    const existing = this.activeInterventions.get(targetId) || [];
    existing.push(intervention);
    this.activeInterventions.set(targetId, existing);

    // Record in history
    this.interventionHistory.push({
      type,
      targetId,
      severity,
      reason,
      triggeredBySpell: spellId,
      timestamp,
    });

    // Prune old history to prevent memory leak
    if (this.interventionHistory.length > CreatorInterventionSystem.MAX_INTERVENTION_HISTORY) {
      this.interventionHistory.shift();
    }

    // Emit intervention event
    this.events.emit('divinity:creator_intervention', {
      targetId,
      interventionType: type,
      severity,
      reason,
      intervention,
    }, creatorId);
  }

  // ============================================================================
  // Create Intervention Data
  // ============================================================================

  private createWarning(severity: InterventionSeverity): DivineWarning {
    const messages: Record<InterventionSeverity, string> = {
      minor: 'The Creator sees your transgression. Cease this folly.',
      moderate: 'You tread on forbidden ground. The Creator\'s patience wanes.',
      severe: 'This is your FINAL warning. The Creator\'s wrath approaches.',
      critical: 'The Creator has marked you for judgment.',
    };

    const fearLevels: Record<InterventionSeverity, number> = {
      minor: 0.2,
      moderate: 0.4,
      severe: 0.7,
      critical: 1.0,
    };

    return {
      message: messages[severity],
      fearLevel: fearLevels[severity],
      isFinalWarning: severity === 'severe' || severity === 'critical',
    };
  }

  private createPowerSuppression(severity: InterventionSeverity): PowerSuppression {
    const reductions: Record<InterventionSeverity, number> = {
      minor: 0.2,
      moderate: 0.5,
      severe: 0.8,
      critical: 1.0,
    };

    const durations: Record<InterventionSeverity, number> = {
      minor: 12000,   // 10 minutes at 20 TPS
      moderate: 36000, // 30 minutes
      severe: 72000,   // 1 hour
      critical: 0,     // Permanent
    };

    return {
      reductionAmount: reductions[severity],
      duration: durations[severity],
      scope: severity === 'critical' ? 'all' : 'forbidden',
    };
  }

  private createSpellBan(spellId: string, severity: InterventionSeverity, reason: string): SpellBan {
    // Initial trap level based on severity
    const initialTrapLevel: Record<InterventionSeverity, BanTrapLevel> = {
      minor: 'none',          // First ban: just block
      moderate: 'none',       // Still just block
      severe: 'minor_harm',   // Severe bans start with damage
      critical: 'severe_harm', // Critical bans start harsh
    };

    return {
      spellId,
      reason,
      isPermanent: severity === 'critical' || severity === 'severe',
      duration: severity === 'moderate' ? 72000 : undefined,
      trapLevel: initialTrapLevel[severity],
      violationCount: 0,
      escalates: true, // Traps always escalate with violations
    };
  }

  private createSmite(severity: InterventionSeverity): Smite {
    const damages: Record<InterventionSeverity, number> = {
      minor: 20,
      moderate: 50,
      severe: 80,
      critical: 100,
    };

    const debuffs: SmiteDebuff[] = [];

    if (severity === 'moderate' || severity === 'severe' || severity === 'critical') {
      debuffs.push({
        type: 'weakness',
        severity: severity === 'critical' ? 1.0 : 0.5,
        duration: 36000,
      });
    }

    if (severity === 'severe' || severity === 'critical') {
      debuffs.push({
        type: 'brand',
        severity: 1.0,
        duration: 0, // Permanent brand
      });
    }

    return {
      damage: damages[severity],
      debuffs,
      isLethal: severity === 'critical',
      effect: severity === 'critical' ? 'Divine lightning annihilates' : 'Divine wrath strikes',
    };
  }

  private createMarkOfSinner(
    creatorId: string,
    severity: InterventionSeverity,
    spellId?: string
  ): MarkOfSinner {
    const sinDescriptions: Record<InterventionSeverity, string> = {
      minor: 'minor transgression against the divine order',
      moderate: 'wielding forbidden magic',
      severe: 'defying the Creator\'s will',
      critical: 'unforgivable heresy',
    };

    const socialPenalties: Record<InterventionSeverity, number> = {
      minor: 0.3,
      moderate: 0.6,
      severe: 0.8,
      critical: 1.0,
    };

    const visualDescriptions: Record<InterventionSeverity, string> = {
      minor: 'a faint divine mark on their forehead',
      moderate: 'a glowing brand of shame upon their brow',
      severe: 'a blazing mark of sin that cannot be hidden',
      critical: 'an unholy stigma that radiates divine wrath',
    };

    return {
      sin: sinDescriptions[severity],
      triggeredBySpell: spellId,
      appliedAt: this.world?.tick || 0,
      isPermanent: severity === 'severe' || severity === 'critical',
      socialPenalty: socialPenalties[severity],
      visualDescription: visualDescriptions[severity],
      imposedBy: creatorId,
    };
  }

  private createDivineSilence(creatorId: string, severity: InterventionSeverity): DivineSilence {
    const effects: SilenceEffect[] = [
      { type: 'mute_magic', intensity: 1.0 },
      { type: 'mute_prayer', intensity: 0.8 },
    ];

    if (severity === 'severe' || severity === 'critical') {
      effects.push({ type: 'isolation', intensity: 1.0 });
    }

    if (severity === 'critical') {
      effects.push({ type: 'memory_loss', intensity: 0.5 });
    }

    return {
      duration: severity === 'critical' ? 0 : 144000, // 2 hours or permanent
      effects,
      removable: false, // Divine hierarchy: gods can't remove creator's curses
      imposedBy: creatorId,
    };
  }

  private executeAnnihilation(targetId: string): void {
    if (!this.world || !this.events) return;

    // Annihilation is handled by emitting an event
    // Other systems (like health/death) will handle the actual destruction
    this.events.emit('divinity:annihilation', {
      targetId,
      reason: 'Divine judgment executed',
    }, 'supreme_creator');
  }

  private calculateExpiration(
    type: InterventionType,
    data: ActiveIntervention['data'],
    timestamp: number
  ): number | undefined {
    if (type === 'warning') {
      return timestamp + 600; // Warnings last 30 seconds
    } else if (type === 'power_suppression') {
      const suppression = data as PowerSuppression;
      return suppression.duration > 0 ? timestamp + suppression.duration : undefined;
    } else if (type === 'spell_ban') {
      const ban = data as SpellBan;
      return ban.isPermanent ? undefined : timestamp + (ban.duration || 0);
    } else if (type === 'smite') {
      return timestamp + 1; // Instant
    } else if (type === 'mark_of_sinner') {
      const mark = data as MarkOfSinner;
      return mark.isPermanent ? undefined : undefined; // Most marks are permanent
    } else if (type === 'divine_silence') {
      const silence = data as DivineSilence;
      return silence.duration > 0 ? timestamp + silence.duration : undefined;
    }
    return undefined;
  }

  // ============================================================================
  // Expiration Management
  // ============================================================================

  private updateInterventionExpirations(world: { tick: number }): void {
    const now = world.tick;

    // Check all active interventions
    for (const [entityId, interventions] of this.activeInterventions.entries()) {
      const remaining = interventions.filter((i) => {
        if (i.expiresAt === undefined) return true; // Permanent
        return i.expiresAt > now;
      });

      if (remaining.length === 0) {
        this.activeInterventions.delete(entityId);
      } else if (remaining.length < interventions.length) {
        this.activeInterventions.set(entityId, remaining);
      }
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
   * Check if a spell is banned
   */
  public isSpellBanned(spellId: string): boolean {
    return this.bannedSpells.has(spellId);
  }

  /**
   * Get active interventions for an entity
   */
  public getActiveInterventions(entityId: string): ActiveIntervention[] {
    return this.activeInterventions.get(entityId) || [];
  }

  /**
   * Check if entity has divine silence
   */
  public hasDivineSilence(entityId: string): boolean {
    const interventions = this.activeInterventions.get(entityId) || [];
    return interventions.some((i) => i.type === 'divine_silence');
  }

  /**
   * Get Mark of the Sinner for an entity (if they have one)
   * Returns the mark data for use in agent perception systems
   */
  public getMarkOfSinner(entityId: string): MarkOfSinner | null {
    const interventions = this.activeInterventions.get(entityId) || [];
    const markIntervention = interventions.find((i) => i.type === 'mark_of_sinner');
    return markIntervention ? (markIntervention.data as MarkOfSinner) : null;
  }

  /**
   * Check if entity has Mark of the Sinner
   */
  public hasMarkOfSinner(entityId: string): boolean {
    return this.getMarkOfSinner(entityId) !== null;
  }

  /**
   * Get intervention history
   */
  public getInterventionHistory(targetId?: string): InterventionEvent[] {
    if (targetId) {
      return this.interventionHistory.filter((i) => i.targetId === targetId);
    }
    return [...this.interventionHistory];
  }
}
