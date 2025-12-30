/**
 * ComponentType - Centralized enum for all component type strings
 *
 * Use this enum instead of string literals when calling:
 * - entity.hasComponent(ComponentType.Xxx)
 * - entity.getComponent(ComponentType.Xxx)
 *
 * Following CLAUDE.md conventions: type strings are lowercase_with_underscores
 */

export enum ComponentType {
  // Core entity components
  Agent = 'agent',
  Position = 'position',
  Movement = 'movement',
  Velocity = 'velocity',
  Steering = 'steering',
  Physics = 'physics',
  Renderable = 'renderable',
  Tags = 'tags',

  // Inventory & Items
  Inventory = 'inventory',
  Item = 'item',
  Resource = 'resource',

  // Needs & Status
  Needs = 'needs',
  Health = 'health',
  Temperature = 'temperature',
  Mood = 'mood',
  Circadian = 'circadian',

  // Cognition & Memory
  Memory = 'memory',
  EpisodicMemory = 'episodic_memory',
  SemanticMemory = 'semantic_memory',
  SpatialMemory = 'spatial_memory',
  SocialMemory = 'social_memory',
  HearsayMemory = 'hearsay_memory',
  Belief = 'belief',
  Goals = 'goals',
  Reflection = 'reflection',
  Personality = 'personality',

  // Skills & Actions
  Skills = 'skills',
  ActionQueue = 'action_queue',

  // Social
  Identity = 'identity',
  SocialGradient = 'social_gradient',
  TrustNetwork = 'trust_network',
  Relationship = 'relationship',
  Preference = 'preference',
  Conversation = 'conversation',
  Meeting = 'meeting',

  // Exploration
  ExplorationState = 'exploration_state',

  // Buildings & Structures
  Building = 'building',
  TownHall = 'town_hall',
  CensusBureau = 'census_bureau',
  HealthClinic = 'health_clinic',
  WeatherStation = 'weather_station',
  Shop = 'shop',
  Warehouse = 'warehouse',

  // Economy & Trade
  Currency = 'currency',
  MarketState = 'market_state',

  // Research & Technology
  ResearchState = 'research_state',

  // Skills & Crafting
  CookingSkill = 'cooking_skill',
  GatheringStats = 'gathering_stats',

  // Plants & Nature
  Plant = 'plant',
  Seed = 'seed',

  // Animals
  Animal = 'animal',

  // Body Parts, Species & Genetics
  Body = 'body',
  Species = 'species',
  Genetic = 'genetic',

  // Magic & Divine
  Magic = 'magic',
  Mana = 'mana',

  // World & Time
  Time = 'time',
  Weather = 'weather',
  Vision = 'vision',
  Passage = 'passage',

  // World-level Registries
  NamedLandmarks = 'named_landmarks',

  // Journal
  Journal = 'journal',

  // Divinity & Religion
  Spiritual = 'spiritual',
  Deity = 'deity',
  Mythology = 'mythology',
}
