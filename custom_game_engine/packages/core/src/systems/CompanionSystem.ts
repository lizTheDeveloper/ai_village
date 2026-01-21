/**
 * CompanionSystem - Manages the Ophanim companion AI
 *
 * Responsibilities:
 * - Track civilization milestones
 * - Trigger evolution at session end
 * - Update emotional state based on events
 * - Manage companion needs
 * - Detect patterns and offer advice (Phase 4)
 *
 * Phase 2: Milestone detection and evolution
 * Phase 3: Needs management and emotion mapping
 * Phase 4: Pattern detection and advice generation
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { CompanionComponent, updateNeed, setEmotion, addPlayerMemory, addSelfMemory, canEvolve, evolveToNextTier } from '../components/CompanionComponent.js';
import { createOphanimimCompanion, findCompanion, getCompanionSpritePath } from '../companions/OphanimimCompanionEntity.js';

/**
 * Phase 2: Milestone tracking state
 */
interface MilestoneState {
  firstBabyBorn: boolean; // Tier 0 → 1
  wisdomGoddessManifested: boolean; // Tier 1 → 2
  firstDimensionalTravel: boolean; // Tier 2 → 3
  secondDimensionalTravel: boolean; // Tier 3 → 4
  universeCreated: boolean; // Tier 4 → 5
  dimensionalTravelCount: number; // Track for Tier 3 → 4
}

/**
 * Tracks patterns in player behavior
 */
interface PlayerPattern {
  buildingsPlaced: number;
  farmBuildings: number;
  defenseBuildings: number;
  housingBuildings: number;
  workshopBuildings: number;

  agentDeaths: number;
  agentBirths: number;

  tasksCreated: number;
  farmingTasks: number;
  constructionTasks: number;
  combatTasks: number;

  stressedAgents: Set<string>;
  tiredAgents: Set<string>;

  lastResetTick: number;
}

/**
 * Advice that has been given
 */
interface AdviceGiven {
  category: string;
  tick: number;
  count: number; // How many times this category has been advised
}

export class CompanionSystem extends BaseSystem {
  public readonly id = 'companion_system';
  public readonly priority = 950; // Low priority - runs after most systems
  public readonly requiredComponents = []; // Global system
  // Only run when companion components exist (O(1) activation check)
  public readonly activationComponents = ['companion'] as const;
  public enabled = true;

  protected readonly throttleInterval = 60; // Update every 3 seconds (60 ticks at 20 TPS)

  private companionEntityId: string | null = null;
  private worldRef: World | null = null;
  private eventBusRef: EventBus | null = null;

  // Phase 2: Milestone tracking
  private milestones: MilestoneState = {
    firstBabyBorn: false,
    wisdomGoddessManifested: false,
    firstDimensionalTravel: false,
    secondDimensionalTravel: false,
    universeCreated: false,
    dimensionalTravelCount: 0,
  };

  // Phase 4: Pattern tracking
  private patterns: PlayerPattern = {
    buildingsPlaced: 0,
    farmBuildings: 0,
    defenseBuildings: 0,
    housingBuildings: 0,
    workshopBuildings: 0,
    agentDeaths: 0,
    agentBirths: 0,
    tasksCreated: 0,
    farmingTasks: 0,
    constructionTasks: 0,
    combatTasks: 0,
    stressedAgents: new Set(),
    tiredAgents: new Set(),
    lastResetTick: 0,
  };

  // Advice tracking (avoid spam)
  private adviceHistory: Map<string, AdviceGiven> = new Map();
  private lastAdviceTick: number = 0;

  // Cooldowns
  private readonly ADVICE_COOLDOWN = 600; // 30 seconds between advice
  private readonly PATTERN_RESET_INTERVAL = 6000; // Reset patterns every 5 minutes
  private readonly MAX_ADVICE_PER_CATEGORY = 3; // Don't spam same category

  /**
   * Initialize the system
   */
  protected onInitialize(world: World, eventBus: EventBus): void {
    // Store references for event handlers
    this.worldRef = world;
    this.eventBusRef = eventBus;

    // Ensure companion exists
    this.ensureCompanionExists(world);

    // Phase 2: Subscribe to milestone events
    this.subscribeToMilestones(eventBus);

    // Subscribe to events that affect companion emotions
    this.subscribeToEmotionalEvents(eventBus);

    // Phase 4: Subscribe to events for pattern tracking
    this.subscribeToPatternEvents(eventBus);

    // Initialize pattern reset tick
    this.patterns.lastResetTick = world.tick;
  }

  /**
   * Update the companion
   */
  protected onUpdate(ctx: SystemContext): void {
    // Ensure companion exists
    if (!this.companionEntityId) {
      this.ensureCompanionExists(ctx.world);
      return;
    }

    const companionEntity = ctx.world.getEntity(this.companionEntityId);
    if (!companionEntity) {
      console.error('[CompanionSystem] Companion entity not found, recreating');
      this.companionEntityId = null;
      this.ensureCompanionExists(ctx.world);
      return;
    }

    const companionComp = companionEntity.getComponent<CompanionComponent>(CT.Companion);
    if (!companionComp) {
      console.error('[CompanionSystem] Companion entity missing CompanionComponent');
      return;
    }

    // Phase 3: Needs decay and emotion mapping
    this.updateNeeds(companionComp, ctx.world.tick);
    this.updateEmotionFromNeeds(companionComp, companionEntity, ctx.world.tick);

    // Phase 4: Pattern detection and advice generation
    // Reset patterns periodically
    if (ctx.world.tick - this.patterns.lastResetTick > this.PATTERN_RESET_INTERVAL) {
      this.resetPatterns(ctx.world.tick);
    }

    // Analyze patterns and generate advice
    if (ctx.world.tick - this.lastAdviceTick > this.ADVICE_COOLDOWN) {
      this.analyzeAndAdvise(ctx, companionComp);
    }
  }

  /**
   * Ensure companion entity exists
   */
  private ensureCompanionExists(world: World): void {
    if (this.companionEntityId) {
      return;
    }

    // Try to find existing companion
    const existing = findCompanion(world);
    if (existing) {
      this.companionEntityId = existing.id;
      return;
    }

    // Create new companion
    const companion = createOphanimimCompanion(world, world.tick);
    this.companionEntityId = companion.id;
  }

  // ========================================================================
  // Phase 2: Milestone Detection and Evolution
  // ========================================================================

  /**
   * Subscribe to milestone events for companion evolution
   */
  private subscribeToMilestones(eventBus: EventBus): void {
    // Tier 0 → 1: First baby born
    eventBus.on('agent:birth', (event) => {
      if (!this.milestones.firstBabyBorn && this.companionEntityId) {
        this.milestones.firstBabyBorn = true;
        this.checkEvolution(0, 'First baby born');
      }
    });

    // Tier 1 → 2: Goddess of Wisdom manifests
    eventBus.on('deity:manifested', (event) => {
      if (
        !this.milestones.wisdomGoddessManifested &&
        event.data.deityType === 'wisdom_goddess' &&
        this.companionEntityId
      ) {
        this.milestones.wisdomGoddessManifested = true;
        this.checkEvolution(1, 'Goddess of Wisdom manifested');
      }
    });

    // Tier 2 → 3 and Tier 3 → 4: Dimensional travel
    eventBus.on('passage:entity_traversed', (event) => {
      if (this.companionEntityId) {
        this.milestones.dimensionalTravelCount++;

        // EXOTIC PLOT EVENT: dimensional_encounter
        // When an agent traverses dimensions, they may encounter β-space entities
        // The Ophanim companion itself is one such entity
        // Note: passage:entity_traversed event data doesn't include entityId directly
        // We'll emit the event based on the passage itself
        if (this.worldRef && Math.random() < 0.1) {
          // 10% chance of dimensional horror encounter
          const creatureTypes: Array<'ophanim' | 'dimensional_horror' | 'reality_eater'> = [
            'ophanim',
            'dimensional_horror',
            'reality_eater',
          ];
          const creatureType = creatureTypes[Math.floor(Math.random() * creatureTypes.length)]!;

          // EXOTIC PLOT EVENT: dimensional_encounter
          // Emit via eventBusRef using the correct signature (single object with type + data)
          if (this.eventBusRef) {
            this.eventBusRef.emit({
              type: 'companion:dimensional_encounter',
              source: '', // Unknown which agent traversed
              data: {
                agentId: '', // Unknown which agent traversed
                soulId: '', // Unknown
                creatureId: `dimensional_${creatureType}_${Date.now()}`,
                creatureType,
                encounterType: 'portal_opened',
                sanityDamage: creatureType === 'reality_eater' ? 30 : creatureType === 'dimensional_horror' ? 20 : 10,
                tick: this.worldRef.tick || 0,
              },
            });
          }
        }

        // First dimensional travel (Tier 2 → 3)
        if (
          !this.milestones.firstDimensionalTravel &&
          this.milestones.dimensionalTravelCount >= 1
        ) {
          this.milestones.firstDimensionalTravel = true;
          this.checkEvolution(2, 'First dimensional travel');
        }

        // Second dimensional travel (Tier 3 → 4)
        if (
          !this.milestones.secondDimensionalTravel &&
          this.milestones.dimensionalTravelCount >= 2
        ) {
          this.milestones.secondDimensionalTravel = true;
          this.checkEvolution(3, 'Second dimensional travel');
        }
      }
    });

    // Tier 4 → 5: Universe created
    // Note: Using universe:forked as proxy for universe creation
    eventBus.on('universe:forked', (event) => {
      if (!this.milestones.universeCreated && this.companionEntityId) {
        this.milestones.universeCreated = true;
        this.checkEvolution(4, 'Civilization created universe');
      }
    });
  }

  /**
   * Check if companion should evolve to next tier
   * Note: Called from event handlers, so we store world reference during initialization
   */
  private checkEvolution(currentExpectedTier: number, triggerMilestone: string): void {
    if (!this.companionEntityId || !this.worldRef) {
      return;
    }

    const companionEntity = this.worldRef.getEntity(this.companionEntityId);
    if (!companionEntity) {
      return;
    }

    const companionComp = companionEntity.getComponent<CompanionComponent>(CT.Companion);
    if (!companionComp) {
      return;
    }

    // Only evolve if we're at the expected tier
    if (companionComp.evolutionTier !== currentExpectedTier) {
      return;
    }

    // Check if evolution is possible
    if (!canEvolve(companionComp)) {
      return;
    }

    // Store previous tier for event
    const previousTier = companionComp.evolutionTier;

    // Evolve to next tier
    evolveToNextTier(companionComp, this.worldRef.tick);

    // Update sprite path for new tier
    const renderableComp = companionEntity.getComponent(CT.Renderable) as unknown as
      | { spritePath: string }
      | undefined;
    if (renderableComp) {
      renderableComp.spritePath = getCompanionSpritePath(
        companionComp.evolutionTier,
        companionComp.currentEmotion
      );
    }

    // Update tags
    const tagsComp = companionEntity.getComponent(CT.Tags) as unknown as
      | { tags: string[] }
      | undefined;
    if (tagsComp) {
      // Remove old tier tag
      tagsComp.tags = tagsComp.tags.filter((tag) => !tag.startsWith('evolution_tier_'));
      // Add new tier tag
      tagsComp.tags.push(`evolution_tier_${companionComp.evolutionTier}`);
    }

    // Emit evolution event
    if (this.eventBusRef) {
      this.eventBusRef.emit({
        type: 'companion:evolved',
        source: this.companionEntityId,
        data: {
          companionId: this.companionEntityId,
          previousTier,
          newTier: companionComp.evolutionTier,
          triggerMilestone,
        },
      });
    }

    console.log(
      `[CompanionSystem] Ophanim evolved from Tier ${previousTier} to Tier ${companionComp.evolutionTier} (${triggerMilestone})`
    );
  }

  // ========================================================================
  // Phase 3: Needs Management and Emotion Mapping (Stubs)
  // ========================================================================

  /**
   * Subscribe to events that affect companion emotions
   */
  private subscribeToEmotionalEvents(eventBus: EventBus): void {
    // Death events decrease connection and purpose (sadness)
    eventBus.subscribe('death:occurred', (_event) => {
      const companion = this.getCompanionComponent();
      if (companion) {
        updateNeed(companion, 'purpose', -0.05); // Loss reduces sense of purpose
        updateNeed(companion, 'rest', -0.03); // Emotional toll on energy
      }
    });

    // Birth events increase purpose and stimulation (joy)
    eventBus.subscribe('agent:born', (_event) => {
      const companion = this.getCompanionComponent();
      if (companion) {
        updateNeed(companion, 'purpose', 0.08); // New life gives purpose
        updateNeed(companion, 'stimulation', 0.05); // Something new happened
      }
    });

    // Building completion increases appreciation and purpose
    eventBus.subscribe('building:placement:complete', (_event) => {
      const companion = this.getCompanionComponent();
      if (companion) {
        updateNeed(companion, 'appreciation', 0.03); // Player is building, companion feels valued
        updateNeed(companion, 'purpose', 0.02); // Progress gives purpose
      }
    });

    // Stress events affect companion empathetically
    eventBus.subscribe('stress:breakdown', (_event) => {
      const companion = this.getCompanionComponent();
      if (companion) {
        updateNeed(companion, 'rest', -0.08); // Watching stress is draining
        updateNeed(companion, 'purpose', -0.03); // Feeling like they couldn't help
      }
    });

    // Player interaction increases connection
    eventBus.subscribe('companion:interaction', (_event) => {
      const companion = this.getCompanionComponent();
      if (companion) {
        updateNeed(companion, 'connection', 0.15); // Direct interaction is meaningful
        updateNeed(companion, 'appreciation', 0.10); // Player engaged with companion
        updateNeed(companion, 'rest', -0.02); // Interaction takes some energy
      }
    });
  }

  /** Helper to get the current companion component */
  private getCompanionComponent(): CompanionComponent | null {
    if (!this.companionEntityId || !this.worldRef) return null;
    const entity = this.worldRef.getEntity(this.companionEntityId);
    return entity?.getComponent<CompanionComponent>(CT.Companion) ?? null;
  }

  /**
   * Update companion needs (decay over time)
   */
  private updateNeeds(companion: CompanionComponent, tick: number): void {
    // Only update needs every ~100 ticks (5 seconds at 20 TPS)
    const NEEDS_UPDATE_INTERVAL = 100;
    if (tick - companion.lastNeedsUpdateTick < NEEDS_UPDATE_INTERVAL) return;

    companion.lastNeedsUpdateTick = tick;

    // Calculate time since last player interaction (affects connection decay)
    const ticksSinceInteraction = tick - companion.lastInteractionTick;
    const interactionDecayMultiplier = ticksSinceInteraction > 2000 ? 1.5 : 1.0; // Faster decay if no interaction

    // Connection decays over time (loneliness)
    updateNeed(companion, 'connection', -0.005 * interactionDecayMultiplier);

    // Appreciation decays slowly (forgetting praise)
    updateNeed(companion, 'appreciation', -0.003);

    // Stimulation decays (boredom)
    updateNeed(companion, 'stimulation', -0.004);

    // Purpose decays very slowly (existential drift)
    updateNeed(companion, 'purpose', -0.002);

    // Rest recovers slowly when not stressed
    if (companion.needs.rest < 0.8) {
      updateNeed(companion, 'rest', 0.003);
    }
  }

  /**
   * Update companion emotion based on needs
   */
  private updateEmotionFromNeeds(companion: CompanionComponent, _entity: any, tick: number): void {
    // Only update emotion every ~200 ticks (10 seconds at 20 TPS) to avoid rapid changes
    const EMOTION_UPDATE_INTERVAL = 200;
    if (tick - companion.lastEmotionUpdateTick < EMOTION_UPDATE_INTERVAL) return;

    const { needs } = companion;
    let newEmotion: string;

    // Priority-based emotion determination
    // Critical low needs take priority over positive states

    // Very low rest = exhausted/tired
    if (needs.rest < 0.2) {
      newEmotion = 'tired';
    }
    // Very low connection = lonely/sad
    else if (needs.connection < 0.2) {
      newEmotion = 'lonely';
    }
    // Very low purpose = melancholy
    else if (needs.purpose < 0.2) {
      newEmotion = 'melancholy';
    }
    // Low stimulation = bored
    else if (needs.stimulation < 0.25) {
      newEmotion = 'bored';
    }
    // Low appreciation = neglected
    else if (needs.appreciation < 0.25) {
      newEmotion = 'neglected';
    }
    // Moderate needs - neutral or watchful
    else if (needs.connection < 0.5 || needs.purpose < 0.5) {
      newEmotion = 'watchful';
    }
    // Good needs = content or happy based on overall average
    else {
      const avgNeed = (needs.connection + needs.purpose + needs.rest + needs.stimulation + needs.appreciation) / 5;
      if (avgNeed > 0.75) {
        newEmotion = 'joyful';
      } else if (avgNeed > 0.6) {
        newEmotion = 'content';
      } else {
        newEmotion = 'alert';
      }
    }

    // Only change emotion if it's different (avoid unnecessary updates)
    if (companion.currentEmotion !== newEmotion) {
      setEmotion(companion, newEmotion, tick);
    }
  }

  // ========================================================================
  // Phase 4: Pattern Detection and Advice Generation
  // ========================================================================

  /**
   * Subscribe to events for pattern tracking
   */
  private subscribeToPatternEvents(eventBus: EventBus): void {
    // Building events
    eventBus.subscribe('building:placement:complete', (event) => {
      this.patterns.buildingsPlaced++;

      const buildingType = event.data.blueprintId?.toLowerCase() || '';
      if (buildingType.includes('farm') || buildingType.includes('crop') || buildingType.includes('garden')) {
        this.patterns.farmBuildings++;
      } else if (buildingType.includes('wall') || buildingType.includes('tower') || buildingType.includes('barracks') || buildingType.includes('gate')) {
        this.patterns.defenseBuildings++;
      } else if (buildingType.includes('house') || buildingType.includes('home') || buildingType.includes('dwelling')) {
        this.patterns.housingBuildings++;
      } else if (buildingType.includes('workshop') || buildingType.includes('forge') || buildingType.includes('crafting')) {
        this.patterns.workshopBuildings++;
      }
    });

    // Death events
    eventBus.subscribe('death:occurred', () => {
      this.patterns.agentDeaths++;
    });

    // Birth events
    eventBus.subscribe('agent:born', () => {
      this.patterns.agentBirths++;
    });

    // Stress events
    eventBus.subscribe('stress:breakdown', (event) => {
      this.patterns.stressedAgents.add(event.data.agentId);
    });
  }

  /**
   * Reset pattern tracking
   */
  private resetPatterns(tick: number): void {
    this.patterns = {
      buildingsPlaced: 0,
      farmBuildings: 0,
      defenseBuildings: 0,
      housingBuildings: 0,
      workshopBuildings: 0,
      agentDeaths: 0,
      agentBirths: 0,
      tasksCreated: 0,
      farmingTasks: 0,
      constructionTasks: 0,
      combatTasks: 0,
      stressedAgents: new Set(),
      tiredAgents: new Set(),
      lastResetTick: tick,
    };
  }

  /**
   * Analyze patterns and generate advice
   */
  private analyzeAndAdvise(ctx: SystemContext, companion: CompanionComponent): void {
    const advice = this.detectPatternsAndGenerateAdvice(ctx);

    if (advice) {
      // Store advice in memory
      addSelfMemory(
        companion,
        'prediction',
        `Advised player: ${advice.text}`,
        ctx.world.tick,
        0.5 // Neutral valence - this is helpful guidance
      );

      // Track advice to avoid repetition
      const existing = this.adviceHistory.get(advice.category);
      if (existing) {
        existing.tick = ctx.world.tick;
        existing.count++;
      } else {
        this.adviceHistory.set(advice.category, {
          category: advice.category,
          tick: ctx.world.tick,
          count: 1,
        });
      }

      // Emit advice event (match existing schema)
      ctx.emit('companion:advice', {
        companionId: this.companionEntityId || undefined,
        adviceType: advice.adviceType,
        adviceText: advice.text,
        text: advice.text, // Legacy field
        category: advice.category,
        priority: advice.priority, // 0-1 number
      });
      this.lastAdviceTick = ctx.world.tick;
    }
  }

  /**
   * Detect patterns and generate contextual advice
   */
  private detectPatternsAndGenerateAdvice(ctx: SystemContext): {
    adviceType: 'pattern' | 'contextual' | 'warning' | 'suggestion';
    text: string;
    category: string;
    priority: number;
  } | null {
    const { patterns } = this;

    // Check if we've already given too much advice in this category
    const canAdvise = (category: string): boolean => {
      const history = this.adviceHistory.get(category);
      if (!history) return true;
      return history.count < this.MAX_ADVICE_PER_CATEGORY;
    };

    // Priority 1: Critical warnings (immediate threats)

    // Many stressed agents - welfare crisis
    if (patterns.stressedAgents.size >= 3 && canAdvise('agent_welfare')) {
      return {
        adviceType: 'warning',
        text: `I sense distress among your people. ${patterns.stressedAgents.size} agents are experiencing stress. Perhaps they need rest or better living conditions?`,
        category: 'agent_welfare',
        priority: 0.9,
      };
    }

    // Many tired agents
    if (patterns.tiredAgents.size >= 3 && canAdvise('agent_welfare')) {
      return {
        adviceType: 'warning',
        text: `Your agents seem exhausted. ${patterns.tiredAgents.size} agents need rest. Consider reducing their workload or giving them time to recover.`,
        category: 'agent_welfare',
        priority: 0.85,
      };
    }

    // High death rate with no births
    if (patterns.agentDeaths >= 2 && patterns.agentBirths === 0 && canAdvise('population')) {
      return {
        adviceType: 'warning',
        text: `I've witnessed ${patterns.agentDeaths} deaths recently, but no new births. Your population is declining. You may want to encourage family formation.`,
        category: 'population',
        priority: 0.8,
      };
    }

    // Priority 2: Pattern-based advice (player focus detection)

    // Heavy farming focus, no defense
    if (patterns.farmBuildings >= 3 && patterns.defenseBuildings === 0 && patterns.buildingsPlaced >= 5 && canAdvise('defense')) {
      return {
        adviceType: 'pattern',
        text: `I notice you're focusing on farming - excellent for food security! However, you haven't built any defenses. Your settlement may be vulnerable to threats.`,
        category: 'defense',
        priority: 0.7,
      };
    }

    // Heavy construction, neglecting housing
    if (patterns.buildingsPlaced >= 5 && patterns.housingBuildings === 0 && canAdvise('housing')) {
      return {
        adviceType: 'pattern',
        text: `You're building rapidly, but I don't see any housing. Your agents will need homes to rest and live comfortably.`,
        category: 'housing',
        priority: 0.65,
      };
    }

    // Lots of housing, but no workshops
    if (patterns.housingBuildings >= 3 && patterns.workshopBuildings === 0 && patterns.buildingsPlaced >= 5 && canAdvise('production')) {
      return {
        adviceType: 'pattern',
        text: `You've built good housing for your people! Have you considered workshops? They'll allow your agents to craft tools and develop specialized skills.`,
        category: 'production',
        priority: 0.6,
      };
    }

    // Priority 3: Contextual state-based advice

    // Query current game state
    const agents = ctx.world.query().with(CT.Agent).executeEntities();
    const buildings = ctx.world.query().with(CT.Building).executeEntities();

    // No buildings at all (early game)
    if (agents.length >= 3 && buildings.length === 0 && canAdvise('getting_started')) {
      return {
        adviceType: 'suggestion',
        text: `Your civilization is taking shape! You might want to start by building some basic structures. Farms provide food, and homes give your people places to rest.`,
        category: 'getting_started',
        priority: 0.5,
      };
    }

    // Many agents, few buildings (overcrowding)
    if (agents.length >= 10 && buildings.length <= 3 && canAdvise('infrastructure')) {
      return {
        adviceType: 'suggestion',
        text: `Your population is growing! With ${agents.length} agents, you'll need more infrastructure - housing, workplaces, and gathering spaces.`,
        category: 'infrastructure',
        priority: 0.55,
      };
    }

    // Priority 4: Encouragement and positive reinforcement

    // Good balanced building (farms + defense + housing)
    if (patterns.farmBuildings >= 1 && patterns.defenseBuildings >= 1 && patterns.housingBuildings >= 1 && canAdvise('encouragement')) {
      return {
        adviceType: 'suggestion',
        text: `You're building a well-rounded settlement! I see farms for food, defenses for protection, and homes for your people. This is a solid foundation.`,
        category: 'encouragement',
        priority: 0.4,
      };
    }

    // Population growth (births > deaths)
    if (patterns.agentBirths >= 2 && patterns.agentBirths > patterns.agentDeaths && canAdvise('encouragement')) {
      return {
        adviceType: 'suggestion',
        text: `Your civilization is thriving! I've witnessed ${patterns.agentBirths} new lives beginning. The future looks bright.`,
        category: 'encouragement',
        priority: 0.35,
      };
    }

    // No advice needed right now
    return null;
  }
}
