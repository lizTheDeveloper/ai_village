/**
 * MoodSystem - Updates agent mood based on needs, social interactions, and experiences
 *
 * The mood system aggregates multiple factors to determine agent emotional state:
 * - Physical needs (hunger, energy, health)
 * - Social connections (conversations, shared meals)
 * - Food experiences (quality, variety, favorites)
 * - Environment (weather, shelter)
 * - Achievements (building, gathering, research)
 *
 * Part of Phase 2: Core Mood System
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import {
  type MoodComponent,
  type RecentMeal,
  createMoodComponent,
  updateMoodFactor,
  applyMoodChange,
  getMoodDescription,
  recordMeal,
} from '../components/MoodComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { BuildingHarmonyComponent } from '../components/BuildingHarmonyComponent.js';
import { getHarmonyMoodModifier } from '../components/BuildingHarmonyComponent.js';
import {
  type PreferenceComponent,
  type FlavorType,
  createPreferenceComponent,
  recordFoodExperience,
  updateFlavorPreferences,
  calculateFlavorAffinity,
} from '../components/PreferenceComponent.js';

/**
 * MoodSystem manages agent emotional states.
 */
export class MoodSystem implements System {
  public readonly id: SystemId = CT.Mood;
  public readonly priority: number = 48; // After NeedsSystem (40), before behavior systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Agent];

  private isInitialized = false;
  private eventBus: EventBus | null = null;
  private world: World | null = null;

  /** How often to fully update mood (in ticks) */
  private readonly UPDATE_INTERVAL = 60; // Every second at 60 tps

  /** Tick counter for update intervals */
  private tickCount = 0;

  /** Distance threshold for detecting social meals */
  private readonly SOCIAL_MEAL_DISTANCE = 5;

  /** Performance: Cache weather entity to avoid querying every update */
  private weatherEntityId: string | null = null;

  /** Performance: Cache building list with invalidation */
  private buildingCache: ReadonlyArray<Entity> | null = null;
  private buildingCacheValidUntil = 0;
  private readonly BUILDING_CACHE_DURATION = 60; // 1 second at 60 TPS

  /**
   * Initialize the system.
   */
  public initialize(world: World, eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }

    this.world = world;
    this.eventBus = eventBus;

    // Subscribe to events that affect mood
    this.setupEventListeners(eventBus);

    this.isInitialized = true;
  }

  /**
   * Set up event listeners for mood-affecting events.
   */
  private setupEventListeners(eventBus: EventBus): void {
    // Eating events - includes optional quality and flavors for preference system
    eventBus.subscribe('agent:ate', (event) => {
      const data = event.data as {
        agentId: string;
        foodType: string;
        hungerRestored: number;
        quality?: number;
        flavors?: FlavorType[];
      };
      this.handleAteEvent(data.agentId, data.foodType, data.hungerRestored, data.quality, data.flavors);
    });

    // Conversation started - small initial boost for social contact
    eventBus.subscribe('conversation:started', (event) => {
      const data = event.data as { participants: string[] };
      for (const agentId of data.participants) {
        this.applyMoodBoost(agentId, 'social', 3);
      }
    });

    // Conversation ended - quality-based mood impact
    eventBus.subscribe('conversation:ended', (event) => {
      const data = event.data as {
        participants: string[];
        quality?: number;
        depth?: number;
        topics?: string[];
      };

      // Calculate mood boost based on conversation quality
      // Base mood boost for any conversation
      const baseMood = 3;

      // Quality bonus (0-7 additional mood based on 0-1 quality)
      const qualityBonus = (data.quality ?? 0.5) * 7;

      // Depth bonus - deep conversations are fulfilling
      const depthBonus = (data.depth ?? 0.5) * 3;

      // Total mood
      const totalMood = baseMood + qualityBonus + depthBonus;

      // Apply to all participants
      for (const agentId of data.participants) {
        this.applyMoodBoost(agentId, 'social', totalMood);

        // Extra fulfillment boost for deep conversations
        if ((data.depth ?? 0) > 0.7) {
          this.applyMoodBoost(agentId, 'achievement', 5);
        }
      }
    });

    // Building completion boosts achievement mood
    eventBus.subscribe('building:complete', (event) => {
      const data = event.data as { builderId?: string };
      if (data.builderId) {
        this.applyMoodBoost(data.builderId, 'achievement', 15);
      }
      // Invalidate building cache
      this.buildingCache = null;
    });

    // Invalidate building cache on building changes
    eventBus.subscribe('building:destroyed', () => {
      this.buildingCache = null;
    });

    eventBus.subscribe('building:placement:confirmed', () => {
      this.buildingCache = null;
    });

    // Research completion boosts achievement mood
    eventBus.subscribe('research:completed', (event) => {
      const data = event.data as { researchers?: string[] };
      if (data.researchers) {
        for (const researcherId of data.researchers) {
          this.applyMoodBoost(researcherId, 'achievement', 20);
        }
      }
    });

    // Gathering resources gives small achievement boost
    eventBus.subscribe('resource:gathered', (event) => {
      const data = event.data as { agentId: string };
      this.applyMoodBoost(data.agentId, 'achievement', 2);
    });

    // Critical needs cause immediate mood impact
    eventBus.subscribe('need:critical', (event) => {
      const data = event.data as { agentId: string; needType: string; value: number };
      // Physical stress from critical needs
      const stressPenalty = data.needType === 'hunger' ? -25 : -20;
      this.applyMoodBoost(data.agentId, 'physical', stressPenalty);
    });
  }

  /**
   * Handle eating event - update food-related mood factors.
   * Integrates with preferences, variety, and social meal detection.
   */
  private handleAteEvent(
    agentId: string,
    foodType: string,
    _hungerRestored: number,
    quality?: number,
    flavors?: FlavorType[]
  ): void {
    if (!this.world) return;

    const entity = this.world.getEntity(agentId);
    if (!entity) return;

    const impl = entity as EntityImpl;
    const tick = this.world.tick;

    // Get or create preference component
    let preferences = impl.getComponent<PreferenceComponent>(CT.Preference);
    if (!preferences) {
      const personality = impl.getComponent<PersonalityComponent>(CT.Personality);
      preferences = createPreferenceComponent({
        openness: personality?.openness,
        neuroticism: personality?.neuroticism,
      });
      impl.addComponent(preferences);
    }

    // Get or create mood component
    let existingMood = impl.getComponent<MoodComponent>(CT.Mood);
    if (!existingMood) {
      existingMood = this.createMoodForAgent(impl);
      impl.addComponent(existingMood);
    }
    let mood: MoodComponent = existingMood;

    // Detect social meal (other agents eating nearby)
    const isSocialMeal = this.detectSocialMeal(impl);

    // Calculate food satisfaction based on multiple factors
    const baseQuality = quality ?? 50; // Default to 50 if no quality data
    let satisfaction = 0;

    // 1. Quality bonus (-25 to +25 based on quality 0-100)
    satisfaction += (baseQuality - 50) / 2;

    // 2. Flavor preference bonus (-20 to +20)
    if (flavors && flavors.length > 0) {
      const flavorAffinity = calculateFlavorAffinity(preferences, flavors);
      satisfaction += flavorAffinity * 20;
    }

    // 3. Check if favorite or comfort food (+15 bonus)
    const isFavorite = mood.favorites.includes(foodType);
    const isComfortFood = mood.comfortFoods.includes(foodType);
    if (isFavorite) satisfaction += 10;
    if (isComfortFood) satisfaction += 15;

    // 4. Social meal bonus (+10)
    if (isSocialMeal) satisfaction += 10;

    // 5. Variety/monotony calculation
    const recentFoodTypes = mood.recentMeals.map((m) => m.foodId);
    const timesEatenRecently = recentFoodTypes.filter((f) => f === foodType).length;
    if (timesEatenRecently >= 3) {
      // Eating same food too often = monotony penalty
      satisfaction -= 10;
    } else if (new Set(recentFoodTypes).size >= 4) {
      // Good variety bonus
      satisfaction += 5;
    }

    // Apply mood boosts
    this.applyMoodBoost(agentId, 'foodSatisfaction', satisfaction);
    if (isSocialMeal) {
      this.applyMoodBoost(agentId, 'social', 5);
    }

    // Record the meal in mood component
    const mealRecord: RecentMeal = {
      foodId: foodType,
      foodName: foodType,
      timestamp: tick,
      quality: baseQuality,
      withCompanions: isSocialMeal,
    };
    mood = recordMeal(mood, mealRecord, isFavorite, isComfortFood);
    impl.updateComponent(CT.Mood, () => mood);

    // Record in preference component
    const experience = satisfaction > 10 ? 'positive' : satisfaction < -10 ? 'negative' : 'neutral';
    const context = isSocialMeal ? 'shared meal with others' : 'ate alone';
    preferences = recordFoodExperience(
      preferences,
      foodType,
      experience,
      context,
      satisfaction / 50, // Normalize to -1 to 1
      tick
    );

    // Update flavor preferences based on experience
    if (flavors && flavors.length > 0) {
      preferences = updateFlavorPreferences(preferences, flavors, experience, 0.05);
    }
    impl.updateComponent(CT.Preference, () => preferences);

    // Check if this should become a favorite (eaten 5+ times with positive experience)
    const positiveCount = preferences.foodMemories.filter(
      (m) => m.foodId === foodType && m.experience === 'positive'
    ).length;
    if (positiveCount >= 5 && !mood.favorites.includes(foodType)) {
      mood = {
        ...mood,
        favorites: [...mood.favorites, foodType],
      };
      impl.updateComponent(CT.Mood, () => mood);
    }
  }

  /**
   * Detect if the agent is eating near other agents (social meal).
   */
  private detectSocialMeal(agent: EntityImpl): boolean {
    if (!this.world) return false;

    const agentPos = agent.getComponent(CT.Position) as { x: number; y: number } | undefined;
    if (!agentPos) return false;

    // Find other agents with agent component
    const otherAgents = this.world.query()
      .with(CT.Agent)
      .with(CT.Position)
      .executeEntities();

    for (const other of otherAgents) {
      if (other.id === agent.id) continue;

      const otherPos = (other as EntityImpl).getComponent(CT.Position) as { x: number; y: number } | undefined;
      if (!otherPos) continue;

      const dx = agentPos.x - otherPos.x;
      const dy = agentPos.y - otherPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.SOCIAL_MEAL_DISTANCE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Apply a mood boost to a specific factor.
   */
  private applyMoodBoost(agentId: string, factor: string, amount: number): void {
    // Store pending boosts to apply in update
    this.pendingBoosts.set(agentId, [
      ...(this.pendingBoosts.get(agentId) || []),
      { factor, amount },
    ]);
  }

  private pendingBoosts: Map<string, Array<{ factor: string; amount: number }>> = new Map();

  /**
   * Main update loop.
   */
  public update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.tickCount++;

    // Process pending mood boosts immediately
    this.processPendingBoosts(world);

    // Full mood update at intervals
    if (this.tickCount % this.UPDATE_INTERVAL !== 0) {
      return;
    }

    // Use SimulationScheduler to only process active entities
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of activeEntities) {
      this.updateAgentMood(entity as EntityImpl, world);
    }
  }

  /**
   * Process pending mood boosts from events.
   */
  private processPendingBoosts(world: World): void {
    for (const [agentId, boosts] of this.pendingBoosts) {
      const entity = world.getEntity(agentId);
      if (!entity) continue;

      const impl = entity as EntityImpl;
      let mood = impl.getComponent<MoodComponent>(CT.Mood);

      if (!mood) {
        // Create mood component if it doesn't exist
        mood = this.createMoodForAgent(impl);
        impl.addComponent(mood);
      }

      // Apply all pending boosts
      for (const { factor, amount } of boosts) {
        const currentValue = mood.factors[factor as keyof typeof mood.factors] ?? 0;
        mood = updateMoodFactor(mood, factor as keyof typeof mood.factors, currentValue + amount);
      }

      impl.updateComponent(CT.Mood, () => mood);
    }

    this.pendingBoosts.clear();
  }

  /**
   * Update mood for an agent based on current state.
   */
  private updateAgentMood(entity: EntityImpl, world: World): void {
    let mood = entity.getComponent<MoodComponent>(CT.Mood);
    const needs = entity.getComponent<NeedsComponent>(CT.Needs);
    const relationships = entity.getComponent<RelationshipComponent>(CT.Relationship);

    // Create mood component if it doesn't exist
    if (!mood) {
      mood = this.createMoodForAgent(entity);
      entity.addComponent(mood);
    }

    // Update physical factor from needs
    if (needs) {
      const physicalScore = this.calculatePhysicalScore(needs);
      mood = updateMoodFactor(mood, 'physical', physicalScore);

      // Rest factor from energy
      const restScore = (needs.energy - 50) * 2; // -100 to +100
      mood = updateMoodFactor(mood, 'rest', restScore);
    }

    // Update social factor from relationships
    if (relationships) {
      const socialScore = this.calculateSocialScore(relationships);
      mood = updateMoodFactor(mood, 'social', socialScore);
    }

    // Update environment factor
    const envScore = this.calculateEnvironmentScore(entity, world);
    mood = updateMoodFactor(mood, 'environment', envScore);

    // Apply natural mood decay toward baseline
    mood = applyMoodChange(mood, 0, world.tick);

    // Update the component
    entity.updateComponent(CT.Mood, () => mood);

    // Emit mood changed event if significant change
    this.emitMoodEvent(entity.id, mood);
  }

  /**
   * Create a mood component for an agent, using personality to set baseline.
   */
  private createMoodForAgent(entity: EntityImpl): MoodComponent {
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);

    // Baseline mood influenced by neuroticism (lower = more stable/positive baseline)
    // and extraversion (higher = more positive baseline)
    let baselineMood = 0;
    if (personality) {
      const neuroticismPenalty = personality.neuroticism * -20; // -20 to 0
      const extraversionBonus = personality.extraversion * 20;   // 0 to +20
      baselineMood = neuroticismPenalty + extraversionBonus;
    }

    return createMoodComponent(baselineMood);
  }

  /**
   * Calculate physical score from needs.
   */
  private calculatePhysicalScore(needs: NeedsComponent): number {
    // Average of hunger, energy, health - each contributes
    const hungerScore = (needs.hunger - 50) * 2; // -100 to +100
    const energyScore = (needs.energy - 50) * 1; // -50 to +50 (less impact)
    const healthScore = (needs.health - 50) * 2; // -100 to +100

    // Weighted average
    return (hungerScore * 0.4 + energyScore * 0.2 + healthScore * 0.4);
  }

  /**
   * Calculate social score from relationships.
   */
  private calculateSocialScore(relationships: RelationshipComponent): number {
    const allRelationships = Array.from(relationships.relationships.values());

    if (allRelationships.length === 0) {
      return -30; // Lonely if no relationships
    }

    // Average affinity of relationships
    const totalAffinity = allRelationships.reduce((sum, r) => sum + r.affinity, 0);
    const avgAffinity = totalAffinity / allRelationships.length;

    // Bonus for having many relationships
    const relationshipCountBonus = Math.min(allRelationships.length * 5, 30);

    return avgAffinity * 0.7 + relationshipCountBonus;
  }

  /**
   * Calculate environment score based on weather, shelter, and building harmony.
   * Agents must be INSIDE a building (within its interior radius) to be sheltered.
   * Harmonious buildings provide additional mood benefits.
   */
  private calculateEnvironmentScore(entity: EntityImpl, world: World): number {
    let score = 0;
    let isSheltered = false;
    let currentBuildingHarmony = 0;

    // Check if inside a building (within its interior radius) - cached lookup
    const pos = entity.getComponent(CT.Position) as { x: number; y: number } | undefined;
    if (pos) {
      // Get cached buildings or query if cache expired
      if (!this.buildingCache || world.tick >= this.buildingCacheValidUntil) {
        this.buildingCache = world.query()
          .with(CT.Building)
          .with(CT.Position)
          .executeEntities();
        this.buildingCacheValidUntil = world.tick + this.BUILDING_CACHE_DURATION;
      }

      for (const building of this.buildingCache) {
        const buildingImpl = building as EntityImpl;
        const buildingPos = buildingImpl.getComponent(CT.Position) as { x: number; y: number } | undefined;
        const buildingComp = buildingImpl.getComponent<BuildingComponent>(CT.Building);

        if (!buildingPos || !buildingComp?.isComplete) continue;

        // Must have an interior to provide shelter
        if (!buildingComp.interior || buildingComp.interiorRadius <= 0) continue;

        const dx = pos.x - buildingPos.x;
        const dy = pos.y - buildingPos.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = buildingComp.interiorRadius * buildingComp.interiorRadius;

        // Agent must be within the building's interior radius (using squared distance)
        if (distanceSquared <= radiusSquared) {
          isSheltered = true;

          // Check building harmony for aesthetic mood bonus
          const harmony = buildingImpl.getComponent<BuildingHarmonyComponent>(CT.BuildingHarmony);
          if (harmony) {
            currentBuildingHarmony = harmony.harmonyScore;
          }
          break; // Found our building, no need to check others
        }
      }
    }

    if (isSheltered) {
      // Base shelter bonus
      score += 15;

      // Harmony modifier: -0.5 to +0.5 scaled to -25 to +25 mood points
      // A perfectly harmonious building (score 100) gives +25 bonus
      // A discordant building (score 0) gives -25 penalty
      // An average building (score 50) gives 0 additional bonus
      const harmonyModifier = getHarmonyMoodModifier(currentBuildingHarmony);
      score += harmonyModifier * 50; // Scale from -0.5..+0.5 to -25..+25
    }

    // Weather effects (if weather component exists on world) - cached lookup
    // Being sheltered reduces weather impact
    if (!this.weatherEntityId) {
      const weatherEntities = world.query().with(CT.Weather).executeEntities();
      if (weatherEntities.length > 0) {
        this.weatherEntityId = weatherEntities[0]!.id;
      }
    }

    if (this.weatherEntityId) {
      const weatherEntity = world.getEntity(this.weatherEntityId);
      if (weatherEntity) {
        const weather = (weatherEntity as EntityImpl).getComponent(CT.Weather) as { type: string } | undefined;
        if (weather) {
        let weatherImpact = 0;
        switch (weather.type) {
          case 'sunny':
            weatherImpact = 10;
            break;
          case 'cloudy':
            weatherImpact = 0;
            break;
          case 'rainy':
            weatherImpact = -15;
            break;
          case 'stormy':
            weatherImpact = -35;
            break;
        }

          // Sheltered agents are protected from negative weather
          if (isSheltered && weatherImpact < 0) {
            weatherImpact *= 0.2; // Only 20% of bad weather affects sheltered agents
          }
          score += weatherImpact;
        }
      } else {
        // Weather entity was destroyed, reset cache
        this.weatherEntityId = null;
      }
    }

    return score;
  }

  /**
   * Emit mood changed event for significant changes.
   */
  private emitMoodEvent(agentId: string, mood: MoodComponent): void {
    this.eventBus?.emit({
      type: 'mood:changed',
      source: agentId,
      data: {
        agentId,
        currentMood: mood.currentMood,
        emotionalState: mood.emotionalState,
        description: getMoodDescription(mood),
      },
    });
  }

  /**
   * Get mood description for an agent (for LLM context).
   */
  public getMoodContext(entity: EntityImpl): string {
    const mood = entity.getComponent<MoodComponent>(CT.Mood);
    if (!mood) {
      return 'feeling neutral';
    }
    return getMoodDescription(mood);
  }
}
