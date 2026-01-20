/**
 * DivinePowerSystem - Execute divine powers and manage active effects
 *
 * Phase 27: Divinity System - Divine Power Execution
 * Priority: 120 (between DeityEmergenceSystem at 115 and PrayerSystem at 130)
 *
 * Responsibilities:
 * - Energy regeneration from belief income
 * - Active effect maintenance (drain energy/belief for sustained effects)
 * - Cooldown management for power usage
 * - Power cleanup (remove expired blessings/curses)
 * - Cost validation (check if deity can afford power execution)
 *
 * Related Systems:
 * - DeityEmergenceSystem (115): Creates deities
 * - PrayerSystem (130): Generates prayers that trigger power usage
 * - PrayerAnsweringSystem: May use this system to execute powers in response to prayers
 * - PossessionSystem: Player-controlled deities use this to execute powers
 *
 * Integration:
 * - DeityComponent: Tracks belief reserves and believers
 * - DivineAbilityComponent: Tracks available powers, active effects, cooldowns
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { DivineAbilityComponent } from '../components/DivineAbilityComponent.js';
import type { SpiritualComponent, Vision } from '../components/SpiritualComponent.js';
import { receiveVision, answerPrayer } from '../components/SpiritualComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import {
  type CrossingMethod,
  type PassageType,
  createPassage,
  type MultiversePassage,
} from '../divinity/MultiverseCrossing.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { DivineCastingCalculator, createDivineCastingContext } from '../magic/costs/calculators/DivineCastingCalculator.js';
import type { ComposedSpell } from '../components/MagicComponent.js';
import { SpellRegistry } from '../magic/SpellRegistry.js';
import { SpellEffectExecutor } from '../magic/SpellEffectExecutor.js';
import {
  isPowerAvailable,
  calculateEffectivePowerCost,
  type PowerConfig,
} from '../divinity/UniverseConfig.js';
import type {
  DivinePower,
  DivinePowerType,
  PowerUseRequest,
  PowerUseResult,
  ActiveBlessing,
  ActiveCurse,
} from '../divinity/DivinePowerTypes.js';
import { getTierForBelief, canUsePower } from '../divinity/DivinePowerTypes.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * Simplified presence data for crossing calculations.
 * Full PresenceComponent not yet available.
 */
interface PresenceData {
  spectrumPosition: number; // 0-1, how divine this entity is
  universeId: string;
}

/**
 * Divine power request
 */
export interface DivinePowerRequest {
  /** Deity entity performing the power */
  deityId: string;

  /** Type of power */
  powerType: string;

  /** Target entity (if applicable) */
  targetId?: string;

  /** Prayer ID being answered (if applicable) */
  prayerId?: string;

  /** Additional parameters */
  params?: Record<string, any>;
}

/**
 * DivinePowerSystem - Manages divine power execution and active effects
 */
export class DivinePowerSystem extends BaseSystem {
  public readonly id = 'divine_power';
  public readonly priority: number = 120; // After DeityEmergence (115), before Prayer (130)
  public readonly requiredComponents = [CT.Deity, CT.DivineAbility] as const;
  // Lazy activation: only run when deities with divine abilities exist
  public readonly activationComponents = ['deity', 'divine_ability'] as const;
  protected readonly throttleInterval = THROTTLE.FAST; // Every tick (20 TPS)

  private pendingPowers: DivinePowerRequest[] = [];

  protected onInitialize(): void {
    // Listen for divine power requests from UI
    this.events.onGeneric('divine_power:request', (data: unknown) => {
      // Type guard: ensure data has required DivinePowerRequest fields
      if (data && typeof data === 'object' && 'deityId' in data && 'powerType' in data) {
        this.queuePower(data as DivinePowerRequest);
      }
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Process active deities with divine abilities
    for (const entity of ctx.activeEntities) {
      if (!entity.components.has(CT.Deity) || !entity.components.has(CT.DivineAbility)) {
        continue;
      }

      const deity = entity.components.get(CT.Deity) as DeityComponent;
      const divineAbility = entity.components.get(CT.DivineAbility) as DivineAbilityComponent;

      // Update divine energy pool
      this._regenerateEnergy(deity, divineAbility, ctx.tick);

      // Apply maintenance costs for active effects
      this._applyMaintenanceCosts(ctx, entity.id, deity, divineAbility, ctx.tick);

      // Cleanup expired effects
      this._cleanupExpiredEffects(ctx, entity.id, deity, divineAbility, ctx.tick);
    }

    // Process pending power requests
    while (this.pendingPowers.length > 0) {
      const request = this.pendingPowers.shift();
      if (request) {
        this._executePower(ctx.world, request, ctx.tick);
      }
    }
  }

  /**
   * Queue a divine power for execution
   */
  public queuePower(request: DivinePowerRequest): void {
    this.pendingPowers.push(request);
  }

  /**
   * Regenerate divine energy pool based on belief income
   */
  private _regenerateEnergy(
    deity: DeityComponent,
    divineAbility: DivineAbilityComponent,
    currentTick: number
  ): void {
    // Base regen from belief income (1% of belief per tick becomes energy)
    const beliefRegen = deity.belief.beliefPerTick * 0.01;

    // Apply regen rate multiplier from component
    const totalRegen = beliefRegen + divineAbility.energyRegenRate;

    divineAbility.regenerateEnergy(totalRegen);

    // Update the component's regen rate for display
    divineAbility.energyRegenRate = totalRegen;
  }

  /**
   * Apply maintenance costs for active blessings and curses
   */
  private _applyMaintenanceCosts(
    ctx: SystemContext,
    deityId: string,
    deity: DeityComponent,
    divineAbility: DivineAbilityComponent,
    currentTick: number
  ): void {
    const totalCost = divineAbility.getTotalMaintenanceCost();

    if (totalCost === 0) {
      return; // No maintenance costs
    }

    // Try to pay from energy pool first
    if (divineAbility.spendEnergy(totalCost)) {
      return; // Paid from energy
    }

    // Not enough energy, try to pay from belief reserves
    if (deity.spendBelief(totalCost)) {
      return; // Paid from belief
    }

    // Cannot afford maintenance - start dropping effects
    this.events.emit('divine:maintenance_failed', {
      deityId,
      deityName: deity.identity.primaryName,
      maintenanceCost: totalCost,
      currentBelief: deity.belief.currentBelief,
      currentEnergy: divineAbility.divineEnergyPool,
      activeEffects: divineAbility.getActiveEffectCount(),
    });

    // Drop lowest-cost effects first (player should have warning)
    this._dropCheapestEffects(ctx, deityId, deity, divineAbility, totalCost, currentTick);
  }

  /**
   * Drop cheapest active effects when maintenance cannot be afforded
   */
  private _dropCheapestEffects(
    ctx: SystemContext,
    deityId: string,
    deity: DeityComponent,
    divineAbility: DivineAbilityComponent,
    totalCost: number,
    currentTick: number
  ): void {
    // Collect all effects with costs
    const effects: Array<{
      type: 'blessing' | 'curse';
      id: string;
      cost: number;
      data: ActiveBlessing | ActiveCurse;
    }> = [];

    for (const [id, blessing] of divineAbility.activeBlessings) {
      effects.push({ type: 'blessing', id, cost: blessing.maintenanceCost, data: blessing });
    }

    for (const [id, curse] of divineAbility.activeCurses) {
      effects.push({ type: 'curse', id, cost: curse.maintenanceCost, data: curse });
    }

    // Sort by cost (cheapest first)
    effects.sort((a, b) => a.cost - b.cost);

    // Drop effects until we can afford remaining ones
    let saved = 0;
    for (const effect of effects) {
      if (saved >= totalCost) {
        break;
      }

      // Remove the effect
      if (effect.type === 'blessing') {
        divineAbility.removeBlessing(effect.id);
        divineAbility.removeActivePower(effect.id);

        this.events.emit('divine:blessing_expired', {
          deityId,
          deityName: deity.identity.primaryName,
          blessingId: effect.id,
          targetId: effect.data.targetId,
          blessingType: (effect.data as ActiveBlessing).blessingType,
          reason: 'maintenance_failure',
          tick: currentTick,
        });
      } else {
        divineAbility.removeCurse(effect.id);
        divineAbility.removeActivePower(effect.id);

        this.events.emit('divine:curse_expired', {
          deityId,
          deityName: deity.identity.primaryName,
          curseId: effect.id,
          targetId: effect.data.targetId,
          curseType: (effect.data as ActiveCurse).curseType,
          reason: 'maintenance_failure',
          tick: currentTick,
        });
      }

      saved += effect.cost;
    }
  }

  /**
   * Cleanup expired blessings and curses
   */
  private _cleanupExpiredEffects(
    ctx: SystemContext,
    deityId: string,
    deity: DeityComponent,
    divineAbility: DivineAbilityComponent,
    currentTick: number
  ): void {
    // Check blessings
    const expiredBlessings: string[] = [];
    for (const [id, blessing] of divineAbility.activeBlessings) {
      if (blessing.expiresAt !== -1 && blessing.expiresAt <= currentTick) {
        expiredBlessings.push(id);
      }
    }

    for (const id of expiredBlessings) {
      const blessing = divineAbility.activeBlessings.get(id);
      if (!blessing) continue;

      divineAbility.removeBlessing(id);
      divineAbility.removeActivePower(id);

      this.events.emit('divine:blessing_expired', {
        deityId,
        deityName: deity.identity.primaryName,
        blessingId: id,
        targetId: blessing.targetId,
        blessingType: blessing.blessingType,
        reason: 'duration_ended',
        tick: currentTick,
      });
    }

    // Check curses
    const expiredCurses: string[] = [];
    for (const [id, curse] of divineAbility.activeCurses) {
      if (curse.expiresAt !== -1 && curse.expiresAt <= currentTick) {
        expiredCurses.push(id);
      }
    }

    for (const id of expiredCurses) {
      const curse = divineAbility.activeCurses.get(id);
      if (!curse) continue;

      divineAbility.removeCurse(id);
      divineAbility.removeActivePower(id);

      this.events.emit('divine:curse_expired', {
        deityId,
        deityName: deity.identity.primaryName,
        curseId: id,
        targetId: curse.targetId,
        curseType: curse.curseType,
        reason: 'duration_ended',
        tick: currentTick,
      });
    }
  }

  /**
   * Answer a prayer and remove it from deity's queue
   */
  private _answerPrayer(
    world: World,
    deityId: string,
    targetId: string,
    prayerId: string,
    responseType: 'vision' | 'sign' | 'silence' | 'angel_response'
  ): void {
    // Update spiritual component to mark prayer as answered
    const target = world.getEntity(targetId);
    if (!target) return;

    const spiritual = target.getComponent<SpiritualComponent>(CT.Spiritual);
    if (!spiritual) return;

    const updatedSpiritual = answerPrayer(spiritual, prayerId, responseType, deityId);
    (target as EntityImpl).addComponent(updatedSpiritual);

    // Remove from deity's prayer queue
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return;

    const deityComp = deityEntity.getComponent<DeityComponent>(CT.Deity);
    if (!deityComp) return;

    deityComp.prayerQueue = deityComp.prayerQueue.filter(
      (p) => p.prayerId !== prayerId
    );
  }

  /**
   * Track a sent vision in the deity component
   */
  private _trackSentVision(
    world: World,
    deityId: string,
    visionId: string,
    targetId: string,
    targetName: string,
    content: string,
    powerType: string,
    cost: number,
    timestamp: number
  ): void {
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return;

    const deityComp = deityEntity.getComponent<DeityComponent>(CT.Deity);
    if (!deityComp) return;

    deityComp.sentVisions.push({
      visionId,
      targetId,
      targetName,
      content,
      powerType,
      cost,
      timestamp,
      wasReceived: true, // Assume received for now
      interpretation: undefined,
    });

    // Keep last 50 visions
    if (deityComp.sentVisions.length > 50) {
      deityComp.sentVisions.shift();
    }
  }

  /**
   * Get the power config from the world's divine config
   */
  private getPowerConfig(): PowerConfig | undefined {
    const divineConfig = this.world.divineConfig;
    return divineConfig?.powers;
  }

  /**
   * Calculate the effective cost for a power, applying universe config multipliers
   */
  private getEffectiveCost(
    baseCost: number,
    powerType: DivinePowerType,
    isOffDomain: boolean = false
  ): number {
    const powerConfig = this.getPowerConfig();
    if (!powerConfig) {
      return baseCost; // No config, use base cost
    }
    return calculateEffectivePowerCost(baseCost, powerType, powerConfig, isOffDomain);
  }

  /**
   * Execute a divine power
   */
  private _executePower(world: World, request: DivinePowerRequest, currentTick: number): void {
    const deityEntity = world.getEntity(request.deityId);
    if (!deityEntity) {
      throw new Error(`Deity entity ${request.deityId} not found`);
    }

    const deityComp = deityEntity.getComponent<DeityComponent>(CT.Deity);
    if (!deityComp) {
      throw new Error(`Entity ${request.deityId} has no deity component`);
    }

    // Check if power is available in this universe
    const powerConfig = this.getPowerConfig();
    if (powerConfig && !isPowerAvailable(request.powerType as DivinePowerType, powerConfig)) {
      throw new Error(`Power '${request.powerType}' is disabled in this universe`);
    }

    // Execute based on power type
    switch (request.powerType) {
      case 'whisper':
        this._executeWhisper(world, deityComp, request, currentTick);
        break;

      case 'subtle_sign':
        this._executeSubtleSign(world, deityComp, request, currentTick);
        break;

      case 'dream_hint':
        this._executeDreamHint(world, deityComp, request, currentTick);
        break;

      case 'clear_vision':
        this._executeClearVision(world, deityComp, request, currentTick);
        break;

      case 'minor_miracle':
        this._executeMinorMiracle(world, deityComp, request, currentTick);
        break;

      case 'bless_individual':
        this._executeBlessIndividual(world, deityComp, request, currentTick);
        break;

      // Multiverse crossing powers
      case 'universe_crossing':
        this._executeUniverseCrossing(world, deityComp, deityEntity as EntityImpl, request, currentTick);
        break;

      case 'create_passage':
        this._executeCreatePassage(world, deityComp, deityEntity as EntityImpl, request, currentTick);
        break;

      case 'divine_projection':
        this._executeDivineProjection(world, deityComp, deityEntity as EntityImpl, request, currentTick);
        break;

      case 'cast_divine_spell':
        this._executeDivineSpell(world, deityComp, deityEntity as EntityImpl, request, currentTick);
        break;

      default:
        throw new Error(`Unknown divine power: ${request.powerType}`);
    }
  }

  /**
   * Execute: Whisper (5 belief) - Send vague feeling to one mortal
   */
  private _executeWhisper(
    world: World,
    deityComp: DeityComponent,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const baseCost = 5;
    const cost = this.getEffectiveCost(baseCost, 'whisper');

    if (!deityComp.spendBelief(cost)) {
      throw new Error('Insufficient belief for whisper');
    }

    if (!request.targetId) {
      throw new Error('Whisper requires targetId');
    }

    const target = world.getEntity(request.targetId);
    if (!target) {
      throw new Error(`Target entity ${request.targetId} not found`);
    }

    const spiritual = target.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    if (!spiritual) {
      throw new Error(`Target ${request.targetId} has no spiritual component`);
    }

    // Add a vague vision to their spiritual component
    const message = request.params?.message ?? 'You feel a presence watching over you.';

    const vision: Vision = {
      id: `vision_${Date.now()}_${Math.random()}`,
      content: message,
      clarity: 0.3, // Very vague
      receivedAt: currentTick,
      source: 'deity',
    };

    // Use helper to update spiritual component immutably
    const updatedSpiritual = receiveVision(spiritual, vision);
    (target as EntityImpl).addComponent(updatedSpiritual);

    // Track sent vision
    const identity = target.getComponent<IdentityComponent>(CT.Identity);
    const targetName = identity?.name ?? 'Unknown';
    this._trackSentVision(
      world,
      request.deityId,
      vision.id!,
      request.targetId,
      targetName,
      message,
      'whisper',
      cost,
      currentTick
    );

    // Answer prayer if this was in response to one
    if (request.prayerId) {
      this._answerPrayer(world, request.deityId, request.targetId, request.prayerId, 'vision');
    }

    // Emit event
    this.emitGeneric('divine_power:whisper', {
      deityId: request.deityId,
      targetId: request.targetId!,
      message,
      cost,
    });
  }

  /**
   * Execute: Subtle Sign (8 belief) - Create a minor omen in the world
   */
  private _executeSubtleSign(
    world: World,
    deityComp: DeityComponent,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const baseCost = 8;
    const cost = this.getEffectiveCost(baseCost, 'subtle_sign');

    if (!deityComp.spendBelief(cost)) {
      throw new Error('Insufficient belief for subtle sign');
    }

    if (!request.targetId) {
      throw new Error('Subtle sign requires targetId');
    }

    const target = world.getEntity(request.targetId);
    if (!target) {
      throw new Error(`Target entity ${request.targetId} not found`);
    }

    const spiritual = target.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    if (!spiritual) {
      throw new Error(`Target ${request.targetId} has no spiritual component`);
    }

    // Get sign details from params
    const signName = request.params?.signName ?? 'A subtle sign';
    const signDescription = request.params?.signDescription ?? 'You notice a strange occurrence.';

    // Create a vision with the sign
    const vision: Vision = {
      id: `vision_${Date.now()}_${Math.random()}`,
      content: `${signName}: ${signDescription}`,
      clarity: 0.4, // Subtle but noticeable
      receivedAt: currentTick,
      source: 'deity',
    };

    const updatedSpiritual = receiveVision(spiritual, vision);
    (target as EntityImpl).addComponent(updatedSpiritual);

    // Track sent vision
    const identity = target.getComponent<IdentityComponent>(CT.Identity);
    const targetName = identity?.name ?? 'Unknown';
    this._trackSentVision(
      world,
      request.deityId,
      vision.id!,
      request.targetId,
      targetName,
      vision.content,
      'subtle_sign',
      cost,
      currentTick
    );

    // Answer prayer if this was in response to one
    if (request.prayerId) {
      this._answerPrayer(world, request.deityId, request.targetId, request.prayerId, 'sign');
    }

    // Emit event
    this.emitGeneric('divine_power:subtle_sign', {
      deityId: request.deityId,
      targetId: request.targetId!,
      signType: request.params?.signType,
      signName,
      signDescription,
      cost,
    });
  }

  /**
   * Execute: Dream Hint (10 belief) - Send vague dream imagery
   */
  private _executeDreamHint(
    world: World,
    deityComp: DeityComponent,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const baseCost = 10;
    const cost = this.getEffectiveCost(baseCost, 'dream_hint');

    if (!deityComp.spendBelief(cost)) {
      throw new Error('Insufficient belief for dream hint');
    }

    if (!request.targetId) {
      throw new Error('Dream hint requires targetId');
    }

    const target = world.getEntity(request.targetId);
    if (!target) {
      throw new Error(`Target entity ${request.targetId} not found`);
    }

    const spiritual = target.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    if (!spiritual) {
      throw new Error(`Target ${request.targetId} has no spiritual component`);
    }

    // Add a dream vision
    const dreamContent = request.params?.content ?? 'You dream of strange symbols and vague shapes.';

    const vision: Vision = {
      id: `vision_${Date.now()}_${Math.random()}`,
      content: dreamContent,
      clarity: 0.5, // Moderate clarity
      receivedAt: currentTick,
      source: 'deity',
      isDream: true,
    };

    const updatedSpiritual = receiveVision(spiritual, vision);
    (target as EntityImpl).addComponent(updatedSpiritual);

    // Track sent vision
    const identity = target.getComponent<IdentityComponent>(CT.Identity);
    const targetName = identity?.name ?? 'Unknown';
    this._trackSentVision(
      world,
      request.deityId,
      vision.id!,
      request.targetId,
      targetName,
      dreamContent,
      'dream_hint',
      cost,
      currentTick
    );

    // Answer prayer if this was in response to one
    if (request.prayerId) {
      this._answerPrayer(world, request.deityId, request.targetId, request.prayerId, 'vision');
    }

    this.emitGeneric('divine_power:dream_hint', {
      deityId: request.deityId,
      targetId: request.targetId!,
      content: dreamContent,
      cost,
    });
  }

  /**
   * Execute: Clear Vision (50 belief) - Send clear dream or vision
   */
  private _executeClearVision(
    world: World,
    deityComp: DeityComponent,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const baseCost = 50;
    const cost = this.getEffectiveCost(baseCost, 'clear_vision');

    if (!deityComp.spendBelief(cost)) {
      throw new Error('Insufficient belief for clear vision');
    }

    if (!request.targetId) {
      throw new Error('Clear vision requires targetId');
    }

    const target = world.getEntity(request.targetId);
    if (!target) {
      throw new Error(`Target entity ${request.targetId} not found`);
    }

    const spiritual = target.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    if (!spiritual) {
      throw new Error(`Target ${request.targetId} has no spiritual component`);
    }

    // Add a clear vision
    const visionContent = request.params?.content ?? 'You see a vivid vision from your deity.';

    const vision: Vision = {
      id: `vision_${Date.now()}_${Math.random()}`,
      content: visionContent,
      clarity: 0.9, // High clarity
      receivedAt: currentTick,
      source: 'deity',
    };

    // receiveVision helper already increases faith, so just use it
    const updatedSpiritual = receiveVision(spiritual, vision);
    (target as EntityImpl).addComponent(updatedSpiritual);

    // Track sent vision
    const identity = target.getComponent<IdentityComponent>(CT.Identity);
    const targetName = identity?.name ?? 'Unknown';
    this._trackSentVision(
      world,
      request.deityId,
      vision.id!,
      request.targetId,
      targetName,
      visionContent,
      'clear_vision',
      cost,
      currentTick
    );

    // Answer prayer if this was in response to one
    if (request.prayerId) {
      this._answerPrayer(world, request.deityId, request.targetId, request.prayerId, 'vision');
    }

    // Emit event
    this.emitGeneric('divine_power:clear_vision', {
      deityId: request.deityId,
      targetId: request.targetId!,
      visionContent,
      cost,
    });
  }

  /**
   * Execute: Minor Miracle (100 belief) - Small physical effect
   */
  private _executeMinorMiracle(
    world: World,
    deityComp: DeityComponent,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const baseBaseCost = 100;
    // Apply universe config multiplier to base cost
    const baseCost = this.getEffectiveCost(baseBaseCost, 'minor_miracle');
    const miracleType = request.params?.type ?? 'warmth';
    const targetId = request.targetId;

    // Find witnesses near the miracle location
    const witnessIds: string[] = [];
    const witnessDevotions: number[] = [];

    if (targetId) {
      const target = world.getEntity(targetId);
      if (target) {
        const pos = target.components.get(CT.Position) as PositionComponent | undefined;
        if (pos) {
          // Find all agents near the miracle (within 10 tiles)
          const allEntities = world.query().with(CT.Agent).with(CT.Position).with(CT.Spiritual).executeEntities();
          for (const entity of allEntities) {
            const entityPos = entity.components.get(CT.Position) as PositionComponent;
            if (entityPos) {
              const dx = entityPos.x - pos.x;
              const dy = entityPos.y - pos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= 10) {
                witnessIds.push(entity.id);
                // Get witness faith level
                const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
                witnessDevotions.push(spiritual?.faith ?? 0.1);
              }
            }
          }
        }
      }
    }

    // Create a synthetic spell for the miracle
    const miracleSpell: ComposedSpell = {
      id: `miracle_${miracleType}`,
      name: `Divine ${miracleType}`,
      technique: 'create',
      form: miracleType === 'warmth' ? 'fire' : 'body',
      source: 'divine',
      manaCost: baseCost,
      castTime: 0,
      range: 10,
      effectId: `miracle_${miracleType}`,
    };

    // Create divine casting context
    const context = createDivineCastingContext(
      currentTick,
      request.deityId,
      witnessIds,
      witnessDevotions
    );

    // Use DivineCastingCalculator to calculate miracle result with witness tracking
    const calculator = new DivineCastingCalculator();
    const miracleResult = calculator.calculateMiracleResult(miracleSpell, context);

    // Check if deity has enough belief
    if (!deityComp.spendBelief(miracleResult.beliefSpent)) {
      throw new Error('Insufficient belief for minor miracle');
    }

    // Apply belief gain from witnesses
    if (miracleResult.beliefGained > 0) {
      deityComp.belief.currentBelief += miracleResult.beliefGained;
    }

    // Increase faith of witnesses who believe in this deity
    if (miracleResult.wasWitnessed) {
      for (const witnessId of witnessIds) {
        const witness = world.getEntity(witnessId);
        if (witness) {
          const spiritual = witness.components.get(CT.Spiritual) as SpiritualComponent | undefined;
          if (spiritual && spiritual.believedDeity === request.deityId) {
            // Witnessing a miracle increases faith
            const updatedSpiritual: SpiritualComponent = {
              ...spiritual,
              faith: Math.min(1.0, spiritual.faith + 0.1),
            };
            (witness as EntityImpl).addComponent(updatedSpiritual);
          }
        }
      }
    }

    // Emit event
    this.emitGeneric('divine_power:minor_miracle', {
      deityId: request.deityId,
      miracleType,
      cost: miracleResult.beliefSpent,
    });
  }

  /**
   * Execute: Bless Individual (75 belief) - Grant minor blessing
   */
  private _executeBlessIndividual(
    world: World,
    deityComp: DeityComponent,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const baseCost = 75;
    const cost = this.getEffectiveCost(baseCost, 'bless_individual');

    if (!deityComp.spendBelief(cost)) {
      throw new Error('Insufficient belief for blessing');
    }

    if (!request.targetId) {
      throw new Error('Blessing requires targetId');
    }

    const target = world.getEntity(request.targetId);
    if (!target) {
      throw new Error(`Target entity ${request.targetId} not found`);
    }

    // In full implementation, would add a blessing effect component
    // For now, just boost their faith and log

    const spiritual = target.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    if (spiritual) {
      const vision: Vision = {
        id: `vision_${Date.now()}_${Math.random()}`,
        content: 'You feel blessed by divine grace.',
        clarity: 0.8,
        receivedAt: currentTick,
        source: 'deity',
      };

      const updatedSpiritual = receiveVision(spiritual, vision);
      // receiveVision adds 0.15 faith, let's add a bit more for blessing
      updatedSpiritual.faith = Math.min(1.0, updatedSpiritual.faith + 0.05);
      (target as EntityImpl).addComponent(updatedSpiritual);

      // Track sent vision
      const identity = target.getComponent<IdentityComponent>(CT.Identity);
      const targetName = identity?.name ?? 'Unknown';
      this._trackSentVision(
        world,
        request.deityId,
        vision.id!,
        request.targetId,
        targetName,
        vision.content,
        'bless_individual',
        cost,
        currentTick
      );

      // Answer prayer if this was in response to one
      if (request.prayerId) {
        this._answerPrayer(world, request.deityId, request.targetId, request.prayerId, 'vision');
      }
    }

    // Emit event
    this.emitGeneric('divine_power:bless_individual', {
      deityId: request.deityId,
      targetId: request.targetId!,
      blessingType: 'grace',
      cost,
    });
  }

  // ========== Multiverse Crossing Powers ==========

  /** Store passages owned by deities */
  private passages: Map<string, MultiversePassage> = new Map();

  /**
   * Get presence data for a deity entity.
   * Uses spectrum position from deity's belief level.
   */
  private getPresenceData(deityComp: DeityComponent): PresenceData {
    // Calculate spectrum position from belief level (0-1)
    // More belief = higher divine presence
    const maxBelief = 10000; // Arbitrary max for scaling
    const spectrumPosition = Math.min(1.0, deityComp.belief.currentBelief / maxBelief);
    return {
      spectrumPosition,
      universeId: 'primary', // Default universe
    };
  }

  /**
   * Emit a generic event (avoiding strict type checking)
   */
  private emitGeneric(type: string, data: Record<string, unknown>): void {
    this.events.emitGeneric(type, data);
  }

  /**
   * Execute: Universe Crossing - Attempt to cross to another universe
   * Requires:
   *   params.targetUniverseId: string
   *   params.method: CrossingMethod
   *   params.passageId?: string (if using existing passage)
   */
  private _executeUniverseCrossing(
    _world: World,
    deityComp: DeityComponent,
    deityEntity: EntityImpl,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const { targetUniverseId, method, passageId } = request.params ?? {};

    if (!targetUniverseId || !method) {
      throw new Error('Universe crossing requires targetUniverseId and method');
    }

    // Get presence data from deity
    const presence = this.getPresenceData(deityComp);
    const sourceUniverseId = presence.universeId;

    // Get passage if using one
    let passage: MultiversePassage | undefined;
    if (passageId) {
      passage = this.passages.get(passageId);
      if (!passage) {
        throw new Error(`Passage ${passageId} not found`);
      }
      if (!passage.owners.includes(deityEntity.id) && passage.accessPolicy !== 'public') {
        throw new Error('No access to this passage');
      }
    }

    // Calculate cost based on method and passage
    // Using partial record since we only define costs for common methods
    const methodCosts: Partial<Record<CrossingMethod, number>> = {
      presence_extension: 500,
      divine_projection: 1000,
      divine_conveyance: 300,
      collective_passage: 200,
      worship_tunnel: 150,
      passage_crossing: passage ? 50 : 500, // Cheap with passage
      cosmic_wound: 100,
      death_passage: 50,
      anchor_transfer: 400,
      transcendent_carving: 2000,
      syncretism_absorption: 0,
    };

    const baseCost = methodCosts[method as CrossingMethod] ?? 500;
    const beliefCost = passage ? Math.ceil(baseCost * 0.1) : baseCost;

    if (!deityComp.spendBelief(beliefCost)) {
      throw new Error(`Insufficient belief. Need: ${beliefCost}, Have: ${deityComp.belief.currentBelief}`);
    }

    // Create crossing result
    const crossingResult = {
      success: true,
      method,
      sourceUniverseId,
      targetUniverseId,
      costPaid: beliefCost,
      timestamp: currentTick,
    };

    // Update passage usage if applicable
    if (passage) {
      passage.totalCrossings++;
      passage.recentCrossings.push({
        entityId: deityEntity.id,
        entityType: 'deity',
        timestamp: currentTick,
        direction: 'forward',
        costPaid: beliefCost,
        success: true,
      });

      if (passage.recentCrossings.length > 100) {
        passage.recentCrossings.shift();
      }
    }

    this.emitGeneric('divine_power:universe_crossing', {
      deityId: request.deityId,
      method,
      sourceUniverseId,
      targetUniverseId,
      beliefCost,
      result: crossingResult,
    });
  }

  /**
   * Execute: Create Passage - Establish a permanent crossing
   * Requires:
   *   params.targetUniverseId: string
   *   params.passageType: PassageType
   */
  private _executeCreatePassage(
    _world: World,
    deityComp: DeityComponent,
    deityEntity: EntityImpl,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const { targetUniverseId, passageType } = request.params ?? {};

    if (!targetUniverseId || !passageType) {
      throw new Error('Create passage requires targetUniverseId and passageType');
    }

    const presence = this.getPresenceData(deityComp);
    const sourceUniverseId = presence.universeId;

    // Calculate creation cost based on passage type
    const passageTypeCosts: Record<PassageType, number> = {
      thread: 100,
      bridge: 500,
      gate: 2000,
      confluence: 5000,
    };

    const baseCost = passageTypeCosts[passageType as PassageType] ?? 1000;
    const beliefCost = baseCost;

    if (!deityComp.spendBelief(beliefCost)) {
      throw new Error(`Insufficient belief. Need: ${beliefCost}, Have: ${deityComp.belief.currentBelief}`);
    }

    // Create the passage
    const passageId = `passage_${currentTick}_${Math.random().toString(36).slice(2)}`;
    const passage = createPassage(
      passageId,
      passageType as PassageType,
      sourceUniverseId,
      targetUniverseId,
      deityEntity.id,
      currentTick
    );

    // Set costs
    passage.currentCrossingCost = Math.ceil(baseCost * 0.1);
    passage.maintenanceCost = Math.ceil(baseCost * 0.02);

    // Store the passage
    this.passages.set(passageId, passage);

    this.emitGeneric('divine_power:passage_created', {
      deityId: request.deityId,
      passageId,
      passageType,
      sourceUniverseId,
      targetUniverseId,
      beliefCost,
    });
  }

  /**
   * Execute: Divine Projection - Send a fragment to another universe
   * Requires:
   *   params.targetUniverseId: string
   */
  private _executeDivineProjection(
    _world: World,
    deityComp: DeityComponent,
    deityEntity: EntityImpl,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const { targetUniverseId } = request.params ?? {};

    if (!targetUniverseId) {
      throw new Error('Divine projection requires targetUniverseId');
    }

    const presence = this.getPresenceData(deityComp);

    // Minimum position for divine projection is 0.75
    if (presence.spectrumPosition < 0.75) {
      throw new Error('Divine projection requires spectrum position >= 0.75 (need more belief)');
    }

    // Cost: 20% of deity's current belief (high investment)
    const beliefCost = Math.ceil(deityComp.belief.currentBelief * 0.20);
    const minCost = 100;
    const actualCost = Math.max(minCost, beliefCost);

    if (!deityComp.spendBelief(actualCost)) {
      throw new Error(`Insufficient belief. Need: ${actualCost}`);
    }

    // Create projection data
    const projectionData = {
      id: `projection_${currentTick}_${Math.random().toString(36).slice(2)}`,
      parentDeityId: deityEntity.id,
      targetUniverseId,
      spectrumPosition: presence.spectrumPosition * 0.4,
      beliefPool: actualCost * 0.8,
      connected: true,
      createdAt: currentTick,
    };

    this.emitGeneric('divine_power:projection_created', {
      deityId: request.deityId,
      projection: projectionData,
      beliefCost: actualCost,
    });
  }

  /**
   * Execute: Cast Divine Spell - Cast a spell from the divine paradigm
   * Requires:
   *   params.spellId: string (spell ID from SpellRegistry)
   *   targetId?: string (optional target)
   *   targetPosition?: { x: number; y: number } (optional position)
   */
  private _executeDivineSpell(
    world: World,
    deityComp: DeityComponent,
    deityEntity: EntityImpl,
    request: DivinePowerRequest,
    currentTick: number
  ): void {
    const { spellId } = request.params ?? {};

    if (!spellId) {
      throw new Error('Cast divine spell requires spellId');
    }

    // Get the spell from registry
    const spellRegistry = SpellRegistry.getInstance();
    const spellDef = spellRegistry.getSpell(spellId);
    if (!spellDef) {
      throw new Error(`Divine spell ${spellId} not found in registry`);
    }

    // Verify it's a divine paradigm spell
    if (spellDef.paradigmId !== 'divine') {
      throw new Error(`Spell ${spellId} is not a divine paradigm spell`);
    }

    // Find witnesses for casting calculation
    const witnessIds: string[] = [];
    const witnessDevotions: number[] = [];

    if (request.targetId) {
      const target = world.getEntity(request.targetId);
      if (target) {
        const pos = target.components.get(CT.Position) as PositionComponent | undefined;
        if (pos) {
          // Find all agents near the spell target
          const allEntities = world.query().with(CT.Agent).with(CT.Position).with(CT.Spiritual).executeEntities();
          for (const entity of allEntities) {
            const entityPos = entity.components.get(CT.Position) as PositionComponent;
            if (entityPos) {
              const dx = entityPos.x - pos.x;
              const dy = entityPos.y - pos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= spellDef.range) {
                witnessIds.push(entity.id);
                const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
                witnessDevotions.push(spiritual?.faith ?? 0.1);
              }
            }
          }
        }
      }
    }

    // Create divine casting context
    const context = createDivineCastingContext(
      currentTick,
      deityEntity.id,
      witnessIds,
      witnessDevotions
    );

    // Calculate costs using divine calculator
    const calculator = new DivineCastingCalculator();
    const spellResult = calculator.calculateMiracleResult(spellDef, context);

    // Check belief cost
    if (!deityComp.spendBelief(spellResult.beliefSpent)) {
      throw new Error(`Insufficient belief. Need: ${spellResult.beliefSpent}, Have: ${deityComp.belief.currentBelief}`);
    }

    // Apply spell effect using SpellEffectExecutor
    const effectExecutor = SpellEffectExecutor.getInstance();
    if (spellDef.effectId && effectExecutor) {
      // Get target entity if there is one
      const targetEntity = request.targetId ? world.getEntity(request.targetId) : null;

      // Apply the spell effect (deity is caster, target is the entity if exists)
      if (targetEntity) {
        effectExecutor.executeEffect(
          spellDef.effectId,
          deityEntity,
          targetEntity,
          spellDef,
          world,
          currentTick,
          1.0 // Power multiplier
        );
      }
    }

    // Gain belief from witnesses
    if (spellResult.beliefGained > 0) {
      deityComp.belief.currentBelief += spellResult.beliefGained;
    }

    // Increase faith of believing witnesses
    if (spellResult.wasWitnessed) {
      for (const witnessId of witnessIds) {
        const witness = world.getEntity(witnessId);
        if (witness) {
          const spiritual = witness.components.get(CT.Spiritual) as SpiritualComponent | undefined;
          if (spiritual && spiritual.believedDeity === deityEntity.id) {
            const updatedSpiritual: SpiritualComponent = {
              ...spiritual,
              faith: Math.min(1.0, spiritual.faith + 0.05),
            };
            (witness as EntityImpl).addComponent(updatedSpiritual);
          }
        }
      }
    }

    // Emit event
    this.emitGeneric('divine_power:spell_cast', {
      deityId: request.deityId,
      spellId,
      spellName: spellDef.name,
      targetId: request.targetId,
      beliefSpent: spellResult.beliefSpent,
      beliefGained: spellResult.beliefGained,
      wasWitnessed: spellResult.wasWitnessed,
    });

    // Also emit standard magic:spell_cast event for tracking
    this.events.emit('magic:spell_cast', {
      spellId,
      spell: spellDef.name,
      technique: spellDef.technique,
      form: spellDef.form,
      paradigm: 'divine',
      manaCost: spellResult.beliefSpent,
      targetId: request.targetId,
      success: true,
    });
  }

  /**
   * Get all passages owned by a deity
   */
  getDeityPassages(deityId: string): MultiversePassage[] {
    return Array.from(this.passages.values()).filter(p => p.owners.includes(deityId));
  }

  /**
   * Get a passage by ID
   */
  getPassage(passageId: string): MultiversePassage | undefined {
    return this.passages.get(passageId);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute a divine power
 * @param ctx - System context
 * @param deityId - Deity entity ID
 * @param power - Divine power definition
 * @param request - Power use request
 * @returns Power use result
 */
export function executeDivinePower(
  ctx: SystemContext,
  deityId: string,
  power: DivinePower,
  request: PowerUseRequest
): PowerUseResult {
  const deityEntity = ctx.world.getEntity(deityId);
  if (!deityEntity) {
    throw new Error(`Deity entity ${deityId} not found`);
  }

  const deity = deityEntity.components.get(CT.Deity) as DeityComponent | undefined;
  const divineAbility = deityEntity.components.get(CT.DivineAbility) as DivineAbilityComponent | undefined;

  if (!deity || !divineAbility) {
    throw new Error(`Deity ${deityId} missing required components`);
  }

  // Check if power is on cooldown
  if (!divineAbility.isPowerAvailable(power.type, ctx.tick)) {
    return {
      success: false,
      beliefSpent: 0,
      effects: [],
      witnessed: false,
      witnessIds: [],
      mythWorthy: false,
      identityImplications: [],
      cooldownUntil: divineAbility.powerCooldowns.get(power.type) || ctx.tick,
      failureReason: 'on_cooldown',
    };
  }

  // Calculate actual cost (with domain modifiers and specialization)
  const { canAfford, actualCost } = canAffordPower(deity, divineAbility, power);

  if (!canAfford) {
    return {
      success: false,
      beliefSpent: 0,
      effects: [],
      witnessed: false,
      witnessIds: [],
      mythWorthy: false,
      identityImplications: [],
      cooldownUntil: ctx.tick,
      failureReason: 'insufficient_belief',
    };
  }

  // Spend belief
  if (!deity.spendBelief(actualCost)) {
    return {
      success: false,
      beliefSpent: 0,
      effects: [],
      witnessed: false,
      witnessIds: [],
      mythWorthy: false,
      identityImplications: [],
      cooldownUntil: ctx.tick,
      failureReason: 'insufficient_belief',
    };
  }

  // Calculate cooldown (in ticks: hours * 1200 ticks/hour at 20 TPS)
  const cooldownTicks = power.cooldown * 1200;
  const cooldownUntil = ctx.tick + cooldownTicks;

  // Create power use result
  const result: PowerUseResult = {
    success: true,
    beliefSpent: actualCost,
    effects: [],
    witnessed: false,
    witnessIds: [],
    mythWorthy: power.mythogenic,
    identityImplications: [],
    cooldownUntil,
  };

  // Record power use
  divineAbility.recordPowerUse(power.type, ctx.tick, actualCost, request.targets[0]?.id || '', result);

  return result;
}

/**
 * Check if deity can afford a power
 * @param deity - Deity component
 * @param divineAbility - Divine ability component
 * @param power - Power definition
 * @returns Whether deity can afford the power and the actual cost
 */
export function canAffordPower(
  deity: DeityComponent,
  divineAbility: DivineAbilityComponent,
  power: DivinePower
): { canAfford: boolean; actualCost: number } {
  // Get deity's current tier
  const deityTier = getTierForBelief(deity.belief.currentBelief);

  // Check tier requirement
  const tierCheck = canUsePower(power.requiredTier, deity.belief.currentBelief, power.baseCost);
  if (!tierCheck.canUse) {
    return { canAfford: false, actualCost: power.baseCost };
  }

  // Calculate domain cost modifier
  let domainModifier = 1.0;
  const isInDomain = power.nativeDomains.includes(deity.identity.domain || 'mystery');
  const isInSecondaryDomain = deity.identity.secondaryDomains.some(d => power.nativeDomains.includes(d));

  if (isInDomain) {
    domainModifier = 1.0; // Native domain - no modifier
  } else if (isInSecondaryDomain) {
    domainModifier = 1.25; // Secondary domain - slight penalty
  } else {
    domainModifier = power.offDomainMultiplier; // Off-domain - full penalty
  }

  // Apply specialization bonus (reduces cost)
  const specializationBonus = divineAbility.getSpecializationBonus(power.type);
  const specializationModifier = 1.0 - (specializationBonus * 0.5); // Max 50% reduction at full specialization

  // Calculate final cost
  const actualCost = Math.ceil(power.baseCost * domainModifier * specializationModifier);

  // Check if deity has enough belief
  const canAfford = deity.belief.currentBelief >= actualCost;

  return { canAfford, actualCost };
}

/**
 * Apply maintenance costs for active effects (called by system update)
 * @param ctx - System context
 * @param deity - Deity component
 * @param divineAbility - Divine ability component
 * @param tick - Current tick
 */
export function applyMaintenanceCosts(
  ctx: SystemContext,
  deity: DeityComponent,
  divineAbility: DivineAbilityComponent,
  tick: number
): void {
  // Maintenance is applied per tick in the system update
  // This helper is for external use if needed
  const totalCost = divineAbility.getTotalMaintenanceCost();

  if (totalCost === 0) {
    return;
  }

  // Try energy first, then belief
  if (!divineAbility.spendEnergy(totalCost)) {
    deity.spendBelief(totalCost);
  }
}
