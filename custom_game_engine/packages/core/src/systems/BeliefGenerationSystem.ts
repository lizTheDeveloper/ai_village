import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';
import { DeityComponent, type BeliefActivity } from '../components/DeityComponent.js';
import type { BeliefEconomyConfig } from '../divinity/UniverseConfig.js';
import { getCanonicalTraits, type MythologyComponent } from '../components/MythComponent.js';

/**
 * Belief generation rates per hour (in-game time) by activity type
 * From spec: belief-and-deity-system.md
 */
const BELIEF_RATES_PER_HOUR: Record<BeliefActivity, number> = {
  passive_faith: 0.01,
  prayer: 0.1,
  meditation: 0.15,
  ritual: 0.3,
  sacrifice: 0.5, // Base, can scale up to 2.0
  pilgrimage: 1.0,
  proselytizing: 0.2,
  creation: 0.5,
  miracle_witness: 5.0,
};

type BeliefSpeciesArchetype = 'raksha' | 'norn' | 'quetzali' | 'other';

/**
 * BeliefGenerationSystem - Phase 1 of divinity system
 *
 * Generates belief from agents with faith and flows it to deities.
 *
 * Per spec:
 * - Agents generate belief through religious activity
 * - Generation rate depends on faith, spirituality, and activity type
 * - Belief accumulates in deity entities
 * - Deities experience decay without active worship
 */
export class BeliefGenerationSystem extends BaseSystem {
  public readonly id: SystemId = 'belief_generation';
  public readonly priority: number = 115; // After belief formation
  public readonly requiredComponents: string[] = [];
  // Only run when spiritual components exist (need believers to generate belief)
  // Early-exits efficiently when no deities exist yet (see onUpdate implementation)
  public readonly activationComponents = ['spiritual'] as const;

  protected readonly throttleInterval: number = 200; // VERY_SLOW - 10 seconds (belief generation is a slow process)

  /**
   * Get the belief economy config from the world's divine config
   */
  private getBeliefEconomyConfig(): BeliefEconomyConfig | undefined {
    const divineConfig = this.world.divineConfig;
    return divineConfig?.beliefEconomy;
  }

  protected onUpdate(ctx: SystemContext): void {
    const { activeEntities, tick } = ctx;

    // Find all deities
    const deities = activeEntities.filter(e => e.components.has(CT.Deity));

    // Process each deity
    for (const deity of deities) {
      this._processDeity(deity, activeEntities, tick);
    }
  }

  /**
   * Process a deity: generate belief from believers and apply decay
   */
  private _processDeity(deityEntity: Entity, allEntities: ReadonlyArray<Entity>, currentTick: number): void {
    const deityComp = deityEntity.components.get(CT.Deity) as DeityComponent;
    if (!deityComp) return;

    // Get canonical myth traits for this deity (computed once, shared across all believers)
    const mythComp = deityEntity.components.get(CT.Mythology) as MythologyComponent | undefined;
    const canonicalTraits = mythComp ? getCanonicalTraits(mythComp) : null;

    // Fix believers Set if it was corrupted by serialization
    if (!(deityComp.believers instanceof Set)) {
      // If believers was serialized, it's either an object {} or an array
      if (Array.isArray(deityComp.believers)) {
        deityComp.believers = new Set(deityComp.believers);
      } else {
        // Plain object - convert to empty Set (will be repopulated below)
        deityComp.believers = new Set();
      }
    }

    // Get belief economy config for multipliers
    const beliefConfig = this.getBeliefEconomyConfig();

    let totalBeliefGenerated = 0;

    // Find all believers of this deity
    const believers = allEntities.filter(e => {
      if (!e.components.has(CT.Spiritual)) return false;
      const spiritual = e.components.get(CT.Spiritual) as SpiritualComponent;

      // Check if this agent believes in this deity
      return spiritual.believedDeity === deityEntity.id && spiritual.faith > 0;
    });

    // Update the deity's believers Set
    deityComp.believers.clear();
    for (const believerEntity of believers) {
      deityComp.believers.add(believerEntity.id);
    }

    // Generate belief from each believer
    for (const believerEntity of believers) {
      const beliefAmount = this._generateBeliefFromAgent(believerEntity, currentTick, beliefConfig, canonicalTraits);
      if (beliefAmount > 0) {
        totalBeliefGenerated += beliefAmount;

        // Directly manipulate belief state (methods may be missing due to serialization)
        if (typeof deityComp.addBelief === 'function') {
          deityComp.addBelief(beliefAmount, currentTick);
        } else {
          // Fallback: directly update belief state
          deityComp.belief.currentBelief += beliefAmount;
          deityComp.belief.totalBeliefEarned += beliefAmount;
          deityComp.belief.lastActivityTick = currentTick;
        }
      }
    }

    // Update belief generation rate
    if (typeof deityComp.updateBeliefRate === 'function') {
      deityComp.updateBeliefRate(totalBeliefGenerated * this.throttleInterval);
    } else {
      // Fallback: directly update rate
      deityComp.belief.beliefPerTick = totalBeliefGenerated * this.throttleInterval;
      deityComp.belief.peakBeliefRate = Math.max(deityComp.belief.peakBeliefRate, deityComp.belief.beliefPerTick);
    }

    // Apply decay with config multiplier
    const decayMultiplier = beliefConfig?.decayMultiplier ?? 1.0;
    if (typeof deityComp.applyDecay === 'function') {
      deityComp.applyDecay(currentTick, decayMultiplier);
    } else {
      // Fallback: manually apply decay
      const ticksSinceActivity = currentTick - deityComp.belief.lastActivityTick;
      let decay = deityComp.belief.decayRate;
      if (ticksSinceActivity > 2400) {
        decay *= 5;
      }
      decay *= decayMultiplier;
      const decayAmount = deityComp.belief.currentBelief * decay;
      deityComp.belief.currentBelief = Math.max(0, deityComp.belief.currentBelief - decayAmount);
    }

    // Emit event if belief was generated
    if (totalBeliefGenerated > 0) {
      this.events.emit('belief:generated', {
        deityId: deityEntity.id,
        amount: totalBeliefGenerated,
        believers: believers.length,
        currentBelief: deityComp.belief.currentBelief,
      });

      // Cross-game lore export event (see cross-game-lore-bridge-spec-v1.md)
      this.events.emitGeneric('lore:belief_emerged', {
        sourceGame: 'mvee',
        deityId: deityEntity.id,
        deityName: deityComp.identity.primaryName,
        epithets: deityComp.identity.epithets,
        domain: deityComp.identity.domain,
        beliefAmount: totalBeliefGenerated,
        believerCount: believers.length,
        currentBeliefTotal: deityComp.belief.currentBelief,
        peakBeliefRate: deityComp.belief.peakBeliefRate,
        timestamp: currentTick,
      });
    }
  }

  /**
   * Generate belief from a single agent
   */
  private _generateBeliefFromAgent(
    entity: Entity,
    currentTick: number,
    beliefConfig?: BeliefEconomyConfig,
    canonicalTraits?: Map<string, number> | null
  ): number {
    const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
    const personality = entity.components.get(CT.Personality) as PersonalityComponent;

    if (!spiritual || !personality) return 0;

    // Determine activity type based on agent's recent behavior
    // Check if agent has prayed recently (within last second = 20 ticks at 20 TPS)
    const timeSinceLastPrayer = currentTick - (spiritual.lastPrayerTime ?? -1000);
    const isCurrentlyPraying = timeSinceLastPrayer <= 20;

    const activity: BeliefActivity = isCurrentlyPraying ? 'prayer' : 'passive_faith';

    // Get base rate for this activity
    const baseRate = BELIEF_RATES_PER_HOUR[activity];

    // Apply activity-specific multiplier from config
    const activityMultiplier = beliefConfig?.activityMultipliers?.[activity] ?? 1.0;

    // Apply global generation multiplier from config
    const globalMultiplier = beliefConfig?.generationMultiplier ?? 1.0;

    // Modifiers
    const faithMultiplier = spiritual.faith; // 0-1
    const spiritualityMultiplier = personality.spirituality ?? 0.5; // 0-1
    const speciesMultiplier = this._getSpeciesBeliefMultiplier(entity, spiritual, personality);

    // Myth-faith multiplier: canonical myth traits modulate belief generation
    // Traits like 'benevolence' align with high spirituality; 'wrathfulness' with low openness
    const mythMultiplier = this._getMythFaithMultiplier(canonicalTraits, personality);

    // Calculate belief generated this tick
    // Convert per-hour rate to per-second rate (divide by 3600)
    // Then adjust for update interval (20 ticks = 1 second)
    const beliefPerSecond = baseRate / 3600;
    const beliefThisUpdate =
      beliefPerSecond *
      faithMultiplier *
      spiritualityMultiplier *
      activityMultiplier *
      globalMultiplier *
      speciesMultiplier *
      mythMultiplier;

    return beliefThisUpdate;
  }

  /**
   * Calculate myth-faith multiplier from canonical myth traits
   * Myths that align with an agent's personality amplify belief generation.
   * Capped to [0.5, 1.5] to prevent runaway amplification.
   */
  private _getMythFaithMultiplier(
    canonicalTraits: Map<string, number> | null | undefined,
    personality: PersonalityComponent
  ): number {
    if (!canonicalTraits || canonicalTraits.size === 0) return 1.0;

    let alignmentScore = 0;
    let traitCount = 0;

    for (const [trait, score] of canonicalTraits) {
      traitCount++;
      // Map myth traits to personality dimensions
      switch (trait) {
        case 'benevolence':
        case 'compassion':
        case 'mercy':
          // Benevolent myths resonate with agreeable, spiritual agents
          alignmentScore += score * (personality.agreeableness + (personality.spirituality ?? 0.5)) / 2;
          break;
        case 'wrathfulness':
        case 'vengeance':
        case 'judgment':
          // Wrathful myths resonate with neurotic, conscientious agents (fear-driven faith)
          alignmentScore += score * (personality.neuroticism + personality.conscientiousness) / 2;
          break;
        case 'wisdom':
        case 'knowledge':
          // Wisdom myths resonate with open, curious agents
          alignmentScore += score * personality.openness;
          break;
        case 'power':
        case 'dominion':
        case 'creation':
          // Power myths resonate with extraverted, ambitious agents
          alignmentScore += score * personality.extraversion;
          break;
        default:
          // Generic trait: use spirituality as default resonance
          alignmentScore += score * (personality.spirituality ?? 0.5);
          break;
      }
    }

    // Normalize by number of traits and convert to multiplier
    const normalizedAlignment = traitCount > 0 ? alignmentScore / traitCount : 0;

    // Clamp to [0.5, 1.5] — myths can halve or boost belief by 50%
    return Math.max(0.5, Math.min(1.5, 1.0 + normalizedAlignment));
  }

  private _getSpeciesBeliefMultiplier(
    entity: Entity,
    spiritual: SpiritualComponent,
    personality: PersonalityComponent
  ): number {
    const species = entity.components.get(CT.Species) as SpeciesComponent | undefined;
    const archetype = this._resolveSpeciesArchetype(species?.speciesId);

    switch (archetype) {
      case 'raksha': {
        // Raksha belief tracks observed divine power (answered signs/visions), not baseline faith alone.
        const observedPowerScore = Math.min(
          1,
          (spiritual.answeredPrayers ?? 0) / 8 + (spiritual.hasReceivedVision ? 0.4 : 0)
        );
        return 0.9 + observedPowerScore * 0.5;
      }
      case 'norn': {
        // Norns form faith through questioning and reflective synthesis.
        const questioningScore = Math.min(
          1,
          personality.openness * 0.7 + (1 - personality.neuroticism) * 0.3
        );
        return 0.85 + questioningScore * 0.45;
      }
      case 'quetzali': {
        // Quetzali belief spreads through teaching and social leadership.
        const teachingScore = Math.min(
          1,
          personality.leadership * 0.5 +
            personality.generosity * 0.3 +
            (spiritual.religiousLeader ? 0.2 : 0)
        );
        return 0.9 + teachingScore * 0.4;
      }
      default:
        return 1.0;
    }
  }

  private _resolveSpeciesArchetype(speciesId?: string): BeliefSpeciesArchetype {
    if (!speciesId) return 'other';

    const normalized = speciesId.toLowerCase().replace(/[\s-]+/g, '_');

    if (normalized.includes('raksha') || normalized.includes('rakshasa')) {
      return 'raksha';
    }
    if (normalized.includes('norn')) {
      return 'norn';
    }
    if (normalized.includes('quetzali')) {
      return 'quetzali';
    }

    return 'other';
  }
}
