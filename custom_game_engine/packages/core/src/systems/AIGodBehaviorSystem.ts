/**
 * AIGodBehaviorSystem - AI deity decision-making and goal pursuit
 *
 * Phase 4: Allows AI-controlled deities to pursue goals, make decisions,
 * and interact with the world autonomously.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent, type DivineDomain } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { DeityGoal, DeityGoalType } from '../divinity/AIGodPersonality.js';

// ============================================================================
// AI Decision Making
// ============================================================================

/** Configuration for AI god behavior */
export interface AIGodConfig {
  /** How often AI gods make decisions (ticks) */
  decisionInterval: number;

  /** Minimum belief required to take action */
  minBeliefForAction: number;

  /** Maximum belief to spend per decision */
  maxBeliefPerAction: number;
}

/** Default AI god configuration */
export const DEFAULT_AI_GOD_CONFIG: AIGodConfig = {
  decisionInterval: 2400, // ~2 minutes at 20 TPS
  minBeliefForAction: 50,
  maxBeliefPerAction: 500,
};

/** A decision made by an AI god */
export interface DeityDecision {
  deityId: string;
  goalId: string;
  action: DeityAction;
  beliefCost: number;
  timestamp: number;
}

/** Actions a deity can take */
export type DeityAction =
  | { type: 'send_vision'; targetAgentId: string; message: string }
  | { type: 'answer_prayer'; prayerId: string }
  | { type: 'minor_miracle'; targetId: string; effect: string }
  | { type: 'bless_agent'; targetAgentId: string; duration: number }
  | { type: 'curse_agent'; targetAgentId: string; duration: number }
  | { type: 'create_sacred_site'; locationId: string }
  | { type: 'inspire_prophet'; targetAgentId: string }
  | { type: 'wait'; reason: string };

// ============================================================================
// Goal Pursuit Strategies
// ============================================================================

/** Strategy for pursuing a specific goal type */
export interface GoalStrategy {
  goalType: DeityGoalType;
  evaluatePriority: (goal: DeityGoal, context: GoalContext) => number;
  selectAction: (goal: DeityGoal, context: GoalContext) => DeityAction;
  estimateCost: (action: DeityAction) => number;
}

/** Context for goal evaluation */
export interface GoalContext {
  deity: DeityComponent;
  world: World;
  currentBelief: number;
  believerCount: number;
  recentEvents: any[];
}

// ============================================================================
// AIGodBehaviorSystem
// ============================================================================

export class AIGodBehaviorSystem extends BaseSystem {
  public readonly id = 'AIGodBehaviorSystem';
  public readonly priority = 90;
  public readonly requiredComponents = [CT.Deity]; // Let ECS filter deity entities
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = [CT.Deity] as const;

  protected readonly throttleInterval = 2400; // ~2 minutes at 20 TPS

  private config: AIGodConfig;
  private lastDecisionTime: Map<string, number> = new Map();
  private strategies: Map<DeityGoalType, GoalStrategy> = new Map();

  constructor(config: Partial<AIGodConfig> = {}) {
    super();
    this.config = { ...DEFAULT_AI_GOD_CONFIG, ...config };
    this.initializeStrategies();
  }

  protected onUpdate(ctx: SystemContext): void {
    // Process deity entities (already filtered by requiredComponents)
    for (const entity of ctx.activeEntities) {
      const deity = entity.components.get(CT.Deity) as DeityComponent;

      // Only process AI-controlled deities
      if (!deity || deity.controller !== 'ai') {
        continue;
      }
      // Check if enough time has passed
      const lastDecision = this.lastDecisionTime.get(entity.id) || 0;
      if (ctx.tick - lastDecision < this.config.decisionInterval) {
        continue;
      }

      // Check if deity has enough belief to act
      if (deity.belief.currentBelief < this.config.minBeliefForAction) {
        continue;
      }

      // Make a decision
      this.makeDecision(entity.id, deity, ctx.world, ctx.tick, ctx.activeEntities);
      this.lastDecisionTime.set(entity.id, ctx.tick);
    }
  }

  /**
   * Make a decision for an AI god
   */
  private makeDecision(_deityId: string, deity: DeityComponent, world: World, _currentTick: number, activeEntities: ReadonlyArray<Entity>): void {
    // Get deity's goals (stored in a hypothetical extended component)
    // For now, we'll focus on basic behaviors

    // Evaluate priorities
    // Priority 1: Answer prayers
    if (deity.prayerQueue.length > 0) {
      const prayer = deity.getNextPrayer();
      if (prayer) {
        const cost = 75; // Standard prayer cost

        if (deity.belief.currentBelief >= cost) {
          deity.answerPrayer(prayer.prayerId, cost);
          // Event emission commented out until event types are updated
          // world.eventBus.emit({
          //   type: 'prayer_answered',
          //   deityId,
          //   prayerId: prayer.prayerId,
          //   agentId: prayer.agentId,
          //   tick: currentTick,
          // });
        }
      }
    }

    // Priority 2: Expand worship (if believers are few)
    if (deity.believers.size < 10 && deity.belief.currentBelief >= 100) {
      // Try to inspire a new believer
      // Find nearby faithless agents
      const faithlessAgents = this.findFaithlessAgents(world, deity, activeEntities);

      if (faithlessAgents.length > 0) {
        // Send a vision to a random faithless agent
        // Send vision to recruit believer (simplified)
        // Event emission commented out until event types are updated
        deity.spendBelief(100);
      }
    }

    // Priority 3: Protect faithful (bless them during hardship)
    const endangeredBelievers = this.findEndangeredBelievers(world, deity);
    if (endangeredBelievers.length > 0 && deity.belief.currentBelief >= 150) {
      const mostEndangered = endangeredBelievers[0];
      if (mostEndangered) {
        // Bless the most endangered believer to protect them
        deity.spendBelief(150);
        // Minor miracle to protect believer (healing, food, warmth, etc.)
        // Event emission for future integration with effect systems
        world.eventBus.emit({
          type: 'divinity:miracle',
          source: deity.identity.primaryName,
          data: {
            deityId: _deityId,
            targetId: mostEndangered.id,
            powerType: 'bless_individual',
            effect: 'divine_protection',
            danger: mostEndangered.danger,
          },
        });
      }
    }

    // Priority 4: Domain expression (act according to domain)
    if (deity.belief.currentBelief >= 200 && deity.identity.domain) {
      this.performDomainAction(world, _deityId, deity, _currentTick);
    }
  }

  /**
   * Find agents who don't believe in any deity
   */
  private findFaithlessAgents(world: World, deity: DeityComponent, activeEntities: ReadonlyArray<Entity>): Array<{ id: string }> {
    const faithless: Array<{ id: string }> = [];

    for (const entity of activeEntities) {
      if (!entity.components.has(CT.Agent) || !entity.components.has(CT.Spiritual)) {
        continue;
      }

      // Check if they already believe
      if (deity.hasBeliever(entity.id)) {
        continue;
      }

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (spiritual && !spiritual.believedDeity) {
        faithless.push({ id: entity.id });
      }
    }

    return faithless;
  }

  /**
   * Initialize goal pursuit strategies
   */
  private initializeStrategies(): void {
    // Expand worship strategy - send visions to convert faithless agents
    this.strategies.set('expand_worship', {
      goalType: 'expand_worship',
      evaluatePriority: (_goal, context) => {
        // Higher priority if few believers
        return context.believerCount < 10 ? 0.9 : 0.4;
      },
      selectAction: (_goal, context) => {
        // Find faithless agents and send them a vision
        // Note: We need activeEntities here, but context doesn't have it
        // For now, use targeted query on believers only
        const faithless: Array<{ id: string }> = [];
        if (faithless.length === 0) {
          return { type: 'wait', reason: 'No faithless agents available' };
        }

        // Select a random faithless agent
        const targetIndex = Math.floor(Math.random() * faithless.length);
        const target = faithless[targetIndex];
        if (!target) {
          return { type: 'wait', reason: 'Failed to select target agent' };
        }

        // Generate a vision message based on deity identity
        const deityName = context.deity.identity.primaryName;
        const domain = context.deity.identity.domain || 'mystery';
        const message = this.generateVisionMessage(deityName, domain);

        return {
          type: 'send_vision',
          targetAgentId: target.id,
          message,
        };
      },
      estimateCost: () => 100,
    });

    // Protect faithful strategy - bless believers in danger
    this.strategies.set('protect_faithful', {
      goalType: 'protect_faithful',
      evaluatePriority: (_goal, context) => {
        // Higher priority if believers are in danger
        const endangeredBelievers = this.findEndangeredBelievers(context.world, context.deity);
        return endangeredBelievers.length > 0 ? 0.8 : 0.2;
      },
      selectAction: (_goal, context) => {
        // Find believers in danger and bless them
        const endangered = this.findEndangeredBelievers(context.world, context.deity);
        if (endangered.length === 0) {
          return { type: 'wait', reason: 'No believers in danger' };
        }

        // Bless the most endangered believer
        const mostEndangered = endangered[0];
        if (!mostEndangered) {
          return { type: 'wait', reason: 'Failed to select endangered believer' };
        }
        return {
          type: 'bless_agent',
          targetAgentId: mostEndangered.id,
          duration: 6000, // ~5 minutes at 20 TPS
        };
      },
      estimateCost: () => 150,
    });

    // Domain expression strategy - act according to deity's domain
    this.strategies.set('domain_expression', {
      goalType: 'domain_expression',
      evaluatePriority: (_goal, context) => {
        // Regular priority, higher if deity has accumulated belief
        return context.currentBelief > 500 ? 0.5 : 0.3;
      },
      selectAction: (_goal, context) => {
        const domain = context.deity.identity.domain;
        if (!domain) {
          return { type: 'wait', reason: 'Deity has no defined domain' };
        }

        // Select domain-appropriate action
        return this.selectDomainAction(domain, context);
      },
      estimateCost: () => 200,
    });
  }

  /**
   * Generate a vision message based on deity identity
   */
  private generateVisionMessage(deityName: string, domain: DivineDomain): string {
    const domainMessages: Record<DivineDomain, string[]> = {
      harvest: [
        `${deityName} shows you fields of golden grain stretching to the horizon.`,
        `A vision of abundant orchards fills your mind, blessed by ${deityName}.`,
      ],
      war: [
        `${deityName} reveals the glory of victory in battle.`,
        `You see yourself triumphant, guided by ${deityName}'s strength.`,
      ],
      wisdom: [
        `${deityName} opens your mind to hidden truths.`,
        `Knowledge flows into you like water, a gift from ${deityName}.`,
      ],
      craft: [
        `${deityName} shows you creations of exquisite beauty.`,
        `Your hands feel guided by ${deityName}'s divine skill.`,
      ],
      nature: [
        `${deityName} reveals the sacred harmony of all living things.`,
        `The forest speaks to you in ${deityName}'s voice.`,
      ],
      death: [
        `${deityName} shows you the peace that awaits beyond.`,
        `You glimpse the eternal cycle watched over by ${deityName}.`,
      ],
      love: [
        `${deityName} fills your heart with warmth and connection.`,
        `You feel the bonds of kinship blessed by ${deityName}.`,
      ],
      chaos: [
        `${deityName} shows you the beauty of change and possibility.`,
        `The world shifts and dances in ${deityName}'s vision.`,
      ],
      order: [
        `${deityName} reveals the perfect harmony of structure.`,
        `You see the world as ${deityName} intended - orderly and just.`,
      ],
      fortune: [
        `${deityName} shows you paths to prosperity.`,
        `Lucky signs appear before you, sent by ${deityName}.`,
      ],
      protection: [
        `${deityName} wraps you in a vision of safety.`,
        `You feel shielded from all harm by ${deityName}'s presence.`,
      ],
      healing: [
        `${deityName} shows you wounds mending and pain fading.`,
        `Restoration flows through the vision, a gift from ${deityName}.`,
      ],
      mystery: [
        `${deityName} reveals glimpses of secrets beyond mortal ken.`,
        `Enigmatic symbols dance before you, a message from ${deityName}.`,
      ],
      time: [
        `${deityName} shows you the eternal cycle of seasons.`,
        `Past, present, and future blend in ${deityName}'s vision.`,
      ],
      sky: [
        `${deityName} lifts your spirit above the clouds.`,
        `The vast heavens open before you, realm of ${deityName}.`,
      ],
      earth: [
        `${deityName} shows you the deep strength of stone.`,
        `Mountains stand eternal in ${deityName}'s vision.`,
      ],
      water: [
        `${deityName} reveals the ever-flowing currents of life.`,
        `Cool waters wash over your spirit, blessing from ${deityName}.`,
      ],
      fire: [
        `${deityName} shows you the transforming power of flame.`,
        `Warm light fills your vision, kindled by ${deityName}.`,
      ],
      storm: [
        `${deityName} reveals the awesome power of thunder and lightning.`,
        `The storm's fury becomes ${deityName}'s voice.`,
      ],
      hunt: [
        `${deityName} shows you the thrill of the chase.`,
        `Your senses sharpen in ${deityName}'s vision.`,
      ],
      home: [
        `${deityName} fills you with warmth of hearth and family.`,
        `You see a sanctuary blessed by ${deityName}.`,
      ],
      travel: [
        `${deityName} shows you roads stretching to distant lands.`,
        `Adventure calls in ${deityName}'s vision.`,
      ],
      trade: [
        `${deityName} reveals the flow of goods and prosperity.`,
        `Fair exchange blessed by ${deityName} brings abundance.`,
      ],
      justice: [
        `${deityName} shows you the scales of truth.`,
        `Right prevails in ${deityName}'s vision.`,
      ],
      vengeance: [
        `${deityName} reveals that wrongs will be righted.`,
        `The guilty cannot escape ${deityName}'s sight.`,
      ],
      dreams: [
        `${deityName} walks with you through realms of sleep.`,
        `Visions within visions unfold, sent by ${deityName}.`,
      ],
      fear: [
        `${deityName} shows you power over what you dread.`,
        `Your fears bow before ${deityName}'s might.`,
      ],
      beauty: [
        `${deityName} reveals perfection in form and spirit.`,
        `Art and grace flow from ${deityName}'s blessing.`,
      ],
      trickery: [
        `${deityName} shows you secrets hidden from others.`,
        `Clever paths open before you, revealed by ${deityName}.`,
      ],
    };

    const messages = domainMessages[domain] || domainMessages.mystery;
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
    return selectedMessage || `${deityName} sends you a mysterious vision.`;
  }

  /**
   * Find believers who are in danger (low health, starving, etc.)
   */
  private findEndangeredBelievers(world: World, deity: DeityComponent): Array<{ id: string; danger: number }> {
    const endangered: Array<{ id: string; danger: number }> = [];

    for (const believerId of deity.believers) {
      const entity = world.getEntity(believerId);
      if (!entity) continue;

      const needs = entity.components.get(CT.Needs) as NeedsComponent | undefined;
      if (!needs) continue;

      // Calculate danger level based on needs
      let danger = 0;

      // Low health is dangerous
      if (needs.health < 30) {
        danger += (30 - needs.health) / 30;
      }

      // Starvation is dangerous
      if (needs.hunger > 80) {
        danger += (needs.hunger - 80) / 20;
      }

      // Exhaustion is somewhat dangerous
      if (needs.energy < 20) {
        danger += (20 - needs.energy) / 40;
      }

      if (danger > 0.2) {
        endangered.push({ id: believerId, danger });
      }
    }

    // Sort by danger level, most endangered first
    return endangered.sort((a, b) => b.danger - a.danger);
  }

  /**
   * Perform domain-specific divine action
   */
  private performDomainAction(world: World, deityId: string, deity: DeityComponent, currentTick: number): void {
    const domain = deity.identity.domain;
    if (!domain) return;

    // Weather-related domains (sky, storm, water, nature)
    if (domain === 'sky' || domain === 'storm' || domain === 'water' || domain === 'nature') {
      this.causeWeatherEffect(world, deity, domain);
      return;
    }

    // Harvest domain - bless crops
    if (domain === 'harvest') {
      this.blessCrops(world, deity);
      return;
    }

    // Fire domain - provide warmth or light
    if (domain === 'fire') {
      this.provideWarmth(world, deity);
      return;
    }

    // Healing domain - heal believers
    if (domain === 'healing') {
      const injuredBelievers = this.findInjuredBelievers(world, deity);
      if (injuredBelievers.length > 0) {
        const target = injuredBelievers[0];
        if (target && deity.spendBelief(200)) {
          world.eventBus.emit({
            type: 'divinity:miracle',
            source: deity.identity.primaryName,
            data: {
              deityId,
              targetId: target.id,
              powerType: 'heal_wound',
              effect: 'wounds_mended',
            },
          });
        }
      }
      return;
    }

    // Protection domain - shield believers
    if (domain === 'protection') {
      const threatenedBelievers = Array.from(deity.believers)
        .map(id => world.getEntity(id))
        .filter(e => e && e.components.has(CT.ThreatDetection))
        .slice(0, 1);

      if (threatenedBelievers.length > 0 && deity.spendBelief(200)) {
        const target = threatenedBelievers[0];
        if (target) {
          world.eventBus.emit({
            type: 'divinity:miracle',
            source: deity.identity.primaryName,
            data: {
              deityId,
              targetId: target.id,
              powerType: 'divine_protection',
              effect: 'ward_placed',
            },
          });
        }
      }
      return;
    }

    // Fortune domain - improve luck
    if (domain === 'fortune') {
      const randomBeliever = this.getRandomFromSet(deity.believers);
      if (randomBeliever && deity.spendBelief(200)) {
        world.eventBus.emit({
          type: 'divinity:miracle',
          source: deity.identity.primaryName,
          data: {
            deityId,
            targetId: randomBeliever,
            powerType: 'minor_luck',
            effect: 'luck_improved',
          },
        });
      }
      return;
    }

    // Default: Generic blessing for other domains
    const randomBeliever = this.getRandomFromSet(deity.believers);
    if (randomBeliever && deity.spendBelief(200)) {
      const domainEffects: Record<DivineDomain, string> = {
        harvest: 'crops_blessed',
        war: 'strength_increased',
        wisdom: 'insight_granted',
        craft: 'skill_enhanced',
        nature: 'animals_calmed',
        death: 'peace_granted',
        love: 'relationships_strengthened',
        chaos: 'change_induced',
        order: 'stability_restored',
        fortune: 'luck_improved',
        protection: 'ward_placed',
        healing: 'wounds_mended',
        mystery: 'secrets_revealed',
        time: 'patience_granted',
        sky: 'weather_calmed',
        earth: 'foundation_strengthened',
        water: 'thirst_quenched',
        fire: 'warmth_provided',
        storm: 'enemies_scattered',
        hunt: 'tracking_enhanced',
        home: 'hearth_blessed',
        travel: 'journey_eased',
        trade: 'bargain_favored',
        justice: 'truth_revealed',
        vengeance: 'retribution_prepared',
        dreams: 'rest_deepened',
        fear: 'courage_granted',
        beauty: 'appearance_enhanced',
        trickery: 'deception_aided',
      };

      world.eventBus.emit({
        type: 'divinity:miracle',
        source: deity.identity.primaryName,
        data: {
          deityId,
          targetId: randomBeliever,
          powerType: 'minor_miracle',
          effect: domainEffects[domain] || 'blessing_granted',
        },
      });
    }
  }

  /**
   * Cause weather effects for weather-related domains
   */
  private causeWeatherEffect(world: World, deity: DeityComponent, domain: DivineDomain): void {
    // Find weather entity
    const weatherEntities = world.query().with(CT.Weather).executeEntities();
    if (weatherEntities.length === 0) return;

    const weatherEntity = weatherEntities[0];
    if (!weatherEntity) return;

    // Spend belief to cause weather
    if (!deity.spendBelief(200)) return;

    // Select weather type based on domain
    const domainWeatherMap: Partial<Record<DivineDomain, 'rain' | 'storm' | 'clear' | 'snow'>> = {
      storm: 'storm',
      water: 'rain',
      sky: 'clear',
      nature: Math.random() > 0.5 ? 'rain' : 'clear',
    };

    const targetWeather = domainWeatherMap[domain] || 'clear';

    // Update weather component
    const impl = weatherEntity as any;
    impl.updateComponent(CT.Weather, (current: any) => ({
      ...current,
      weatherType: targetWeather,
      intensity: 0.7,
      duration: 300, // 5 minutes
    }));

    // Emit event
    world.eventBus.emit({
      type: 'weather:changed',
      source: weatherEntity.id,
      data: {
        oldWeather: 'unknown',
        weatherType: targetWeather,
        intensity: 0.7,
        causedBy: deity.identity.primaryName,
        divine: true,
      },
    });
  }

  /**
   * Bless crops to improve growth and yield
   */
  private blessCrops(world: World, deity: DeityComponent): void {
    // Find planted crops near believers
    const plants = world.query().with(CT.Plant).executeEntities();
    const blessedPlants: string[] = [];

    for (const plant of plants) {
      const plantComp = plant.components.get(CT.Plant) as any;
      if (!plantComp || !plantComp.planted) continue; // Only bless agent-planted crops

      blessedPlants.push(plant.id);
      if (blessedPlants.length >= 5) break; // Bless up to 5 plants
    }

    if (blessedPlants.length === 0) return;

    if (deity.spendBelief(200)) {
      for (const plantId of blessedPlants) {
        const plant = world.getEntity(plantId);
        if (!plant) continue;

        // Improve plant genetics (growth rate and yield)
        const impl = plant as any;
        impl.updateComponent(CT.Plant, (current: any) => {
          const genetics = current.genetics || {};
          return {
            ...current,
            genetics: {
              ...genetics,
              growthRate: Math.min(2.0, (genetics.growthRate || 1.0) * 1.2),
              yieldAmount: Math.min(2.0, (genetics.yieldAmount || 1.0) * 1.2),
            },
            health: Math.min(100, (current.health || 100) + 10),
          };
        });
      }

      world.eventBus.emit({
        type: 'divinity:miracle',
        source: deity.identity.primaryName,
        data: {
          deityId: deity.identity.primaryName,
          powerType: 'bless_harvest',
          effect: 'crops_blessed',
          plantIds: blessedPlants,
        },
      });
    }
  }

  /**
   * Provide warmth to believers (fire domain)
   */
  private provideWarmth(world: World, deity: DeityComponent): void {
    const coldBelievers: string[] = [];

    for (const believerId of deity.believers) {
      const entity = world.getEntity(believerId);
      if (!entity) continue;

      const temperature = entity.components.get(CT.Temperature) as any;
      if (temperature && temperature.currentTemp < 10) {
        coldBelievers.push(believerId);
        if (coldBelievers.length >= 3) break; // Help up to 3 cold believers
      }
    }

    if (coldBelievers.length === 0) return;

    if (deity.spendBelief(200)) {
      for (const believerId of coldBelievers) {
        const entity = world.getEntity(believerId);
        if (!entity) continue;

        const impl = entity as any;
        impl.updateComponent(CT.Temperature, (current: any) => ({
          ...current,
          currentTemp: Math.min(20, (current.currentTemp || 10) + 10),
        }));
      }

      world.eventBus.emit({
        type: 'divinity:miracle',
        source: deity.identity.primaryName,
        data: {
          deityId: deity.identity.primaryName,
          powerType: 'minor_miracle',
          effect: 'warmth_provided',
          targetIds: coldBelievers,
        },
      });
    }
  }

  /**
   * Find injured believers who need healing
   */
  private findInjuredBelievers(world: World, deity: DeityComponent): Array<{ id: string; health: number }> {
    const injured: Array<{ id: string; health: number }> = [];

    for (const believerId of deity.believers) {
      const entity = world.getEntity(believerId);
      if (!entity) continue;

      const needs = entity.components.get(CT.Needs) as any;
      if (needs && needs.health < 50) {
        injured.push({ id: believerId, health: needs.health });
      }
    }

    return injured.sort((a, b) => a.health - b.health); // Most injured first
  }

  /**
   * Get a random item from a Set (uses Array.from for TS compatibility)
   */
  private getRandomFromSet<T>(set: Set<T>): T | undefined {
    if (set.size === 0) return undefined;
    const arr = Array.from(set);
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Select an action appropriate to the deity's domain
   */
  private selectDomainAction(domain: DivineDomain, context: GoalContext): DeityAction {
    // Get a random believer to potentially affect
    const believers = Array.from(context.deity.believers);
    if (believers.length === 0) {
      return { type: 'wait', reason: 'No believers to affect' };
    }

    const targetId = believers[Math.floor(Math.random() * believers.length)];
    if (!targetId) {
      return { type: 'wait', reason: 'Failed to select believer' };
    }

    // Domain-specific effects
    const domainEffects: Record<DivineDomain, string> = {
      harvest: 'crops_blessed',
      war: 'strength_increased',
      wisdom: 'insight_granted',
      craft: 'skill_enhanced',
      nature: 'animals_calmed',
      death: 'peace_granted',
      love: 'relationships_strengthened',
      chaos: 'change_induced',
      order: 'stability_restored',
      fortune: 'luck_improved',
      protection: 'ward_placed',
      healing: 'wounds_mended',
      mystery: 'secrets_revealed',
      time: 'patience_granted',
      sky: 'weather_calmed',
      earth: 'foundation_strengthened',
      water: 'thirst_quenched',
      fire: 'warmth_provided',
      storm: 'enemies_scattered',
      hunt: 'tracking_enhanced',
      home: 'hearth_blessed',
      travel: 'journey_eased',
      trade: 'bargain_favored',
      justice: 'truth_revealed',
      vengeance: 'retribution_prepared',
      dreams: 'rest_deepened',
      fear: 'courage_granted',
      beauty: 'appearance_enhanced',
      trickery: 'deception_aided',
    };

    return {
      type: 'minor_miracle',
      targetId,
      effect: domainEffects[domain] || 'blessing_granted',
    };
  }
}
