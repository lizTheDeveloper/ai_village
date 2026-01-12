/**
 * DivinePowerSystem - Executes divine powers and manages their effects
 *
 * Allows deities to spend belief to perform divine actions:
 * - Visions/dreams sent to believers
 * - Miracles (physical effects)
 * - Blessings/curses
 * - Angel creation
 * - Avatar manifestation
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent, Vision } from '../components/SpiritualComponent.js';
import { receiveVision, answerPrayer } from '../components/SpiritualComponent.js';
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
import type { DivinePowerType } from '../divinity/DivinePowerTypes.js';

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
 * DivinePowerSystem - Processes divine power executions
 */
export class DivinePowerSystem implements System {
  public readonly id = 'divine_power';
  public readonly priority: number = 120; // After belief generation
  public readonly requiredComponents: ReadonlyArray<string> = [];

  private eventBus?: EventBus;
  private pendingPowers: DivinePowerRequest[] = [];
  private unsubscribe?: () => void;

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;

    // Listen for divine power requests from UI
    this.unsubscribe = eventBus.subscribe('divine_power:request', (event) => {
      const data = event.data as DivinePowerRequest;
      if (data && data.deityId && data.powerType) {
        this.queuePower(data);
      }
    });
  }

  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  update(world: World, _entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Process pending power requests
    while (this.pendingPowers.length > 0) {
      const request = this.pendingPowers.shift();
      if (request) {
        this._executePower(world, request, currentTick);
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

    const spiritual = target.components.get(CT.Spiritual) as SpiritualComponent;
    if (!spiritual) return;

    const updatedSpiritual = answerPrayer(spiritual, prayerId, responseType, deityId);
    (target as EntityImpl).addComponent(updatedSpiritual);

    // Remove from deity's prayer queue
    const deityEntity = world.getEntity(deityId);
    if (!deityEntity) return;

    const deityComp = deityEntity.components.get(CT.Deity) as DeityComponent;
    if (!deityComp) return;

    deityComp.prayerQueue = deityComp.prayerQueue.filter(
      p => p.prayerId !== prayerId
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

    const deityComp = deityEntity.components.get(CT.Deity) as DeityComponent;
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
  private getPowerConfig(world: World): PowerConfig | undefined {
    const divineConfig = (world as any).divineConfig;
    return divineConfig?.powers;
  }

  /**
   * Calculate the effective cost for a power, applying universe config multipliers
   */
  private getEffectiveCost(
    baseCost: number,
    powerType: DivinePowerType,
    world: World,
    isOffDomain: boolean = false
  ): number {
    const powerConfig = this.getPowerConfig(world);
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

    const deityComp = deityEntity.components.get(CT.Deity) as DeityComponent;
    if (!deityComp) {
      throw new Error(`Entity ${request.deityId} has no deity component`);
    }

    // Check if power is available in this universe
    const powerConfig = this.getPowerConfig(world);
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
    const cost = this.getEffectiveCost(baseCost, 'whisper', world);

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
    const agentComp = target.components.get(CT.Agent) as any;
    const targetName = agentComp?.name ?? 'Unknown';
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
    this.emitGeneric('divine_power:whisper', 'divine_power', {
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
    const cost = this.getEffectiveCost(baseCost, 'subtle_sign', world);

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
    const agentComp = target.components.get(CT.Agent) as any;
    const targetName = agentComp?.name ?? 'Unknown';
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
    this.emitGeneric('divine_power:subtle_sign', 'divine_power', {
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
    const cost = this.getEffectiveCost(baseCost, 'dream_hint', world);

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
    const agentComp = target.components.get(CT.Agent) as any;
    const targetName = agentComp?.name ?? 'Unknown';
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

    this.emitGeneric('divine_power:dream_hint', 'divine_power', {
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
    const cost = this.getEffectiveCost(baseCost, 'clear_vision', world);

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
    const agentComp = target.components.get(CT.Agent) as any;
    const targetName = agentComp?.name ?? 'Unknown';
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
    this.emitGeneric('divine_power:clear_vision', 'divine_power', {
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
    const baseCost = this.getEffectiveCost(baseBaseCost, 'minor_miracle', world);
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
    this.emitGeneric('divine_power:minor_miracle', 'divine_power', {
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
    const cost = this.getEffectiveCost(baseCost, 'bless_individual', world);

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
      const agentComp = target.components.get(CT.Agent) as any;
      const targetName = agentComp?.name ?? 'Unknown';
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
    this.emitGeneric('divine_power:bless_individual', 'divine_power', {
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
  private emitGeneric(type: string, source: string, data: Record<string, unknown>): void {
    if (!this.eventBus) return;
    (this.eventBus as unknown as { emit: (e: Record<string, unknown>) => void }).emit({
      type,
      source,
      data,
    });
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

    this.emitGeneric('divine_power:universe_crossing', 'divine_power', {
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

    this.emitGeneric('divine_power:passage_created', 'divine_power', {
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

    this.emitGeneric('divine_power:projection_created', 'divine_power', {
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
    this.emitGeneric('divine_power:spell_cast', 'divine_power', {
      deityId: request.deityId,
      spellId,
      spellName: spellDef.name,
      targetId: request.targetId,
      beliefSpent: spellResult.beliefSpent,
      beliefGained: spellResult.beliefGained,
      wasWitnessed: spellResult.wasWitnessed,
    });

    // Also emit standard magic:spell_cast event for tracking
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'magic:spell_cast',
        source: deityEntity.id,
        data: {
          spellId,
          spell: spellDef.name,
          technique: spellDef.technique,
          form: spellDef.form,
          paradigm: 'divine',
          manaCost: spellResult.beliefSpent,
          targetId: request.targetId,
          success: true,
        },
      });
    }
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
