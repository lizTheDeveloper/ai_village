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
  VoxelResource = 'voxel_resource',
  Equipment = 'equipment',  // Phase 36: Body-based equipment system
  EquipmentSlots = 'equipment_slots',

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
  Interests = 'interests',

  // Exploration
  ExplorationState = 'exploration_state',

  // Buildings & Structures
  Building = 'building',
  BuildingHarmony = 'building_harmony',
  TownHall = 'town_hall',
  CensusBureau = 'census_bureau',
  HealthClinic = 'health_clinic',
  WeatherStation = 'weather_station',
  Shop = 'shop',
  Warehouse = 'warehouse',

  // Automation & Production
  Power = 'power',
  Belt = 'belt',
  AssemblyMachine = 'assembly_machine',
  MachineConnection = 'machine_connection',
  MachinePlacement = 'machine_placement',
  Roboport = 'roboport',
  Robot = 'robot',
  LogisticsChest = 'logistics_chest',
  ChunkProductionState = 'chunk_production_state',
  FactoryAI = 'factory_ai',

  // City Management
  CityDirector = 'city_director',
  Profession = 'profession',
  UpliftCandidate = 'uplift_candidate',
  UpliftProgram = 'uplift_program',
  UpliftedTrait = 'uplifted_trait',
  ProtoSapience = 'proto_sapience',

  // Economy & Trade
  Currency = 'currency',
  MarketState = 'market_state',

  // Research & Technology
  ResearchState = 'research_state',
  TechnologyUnlock = 'technology_unlock',

  // Publishing & Knowledge Infrastructure
  Library = 'library',
  Bookstore = 'bookstore',
  University = 'university',
  UniversityLibrary = 'university_library',
  Biography = 'biography',
  PublishingCompany = 'publishing_company',
  Newspaper = 'newspaper',
  Recording = 'recording',

  // Skills & Crafting
  CookingSkill = 'cooking_skill',
  GatheringStats = 'gathering_stats',
  RecipeDiscovery = 'recipe_discovery',

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
  Spirit = 'spirit',
  Deity = 'deity',
  Mythology = 'mythology',
  DivineChat = 'divine_chat',
  ChatRoom = 'chat_room',
  Companion = 'companion',

  // Divine Rebellion & Cosmic Systems
  RebellionOutcome = 'rebellion_outcome',
  LoreFrag = 'lore_frag',
  RealityAnchor = 'reality_anchor',
  RebellionThreshold = 'rebellion_threshold',
  SupremeCreator = 'supreme_creator',

  // Combat
  Conflict = 'conflict',
  CombatStats = 'combat_stats',
  ThreatDetection = 'threat_detection',

  // Reproduction & Life
  Sexuality = 'sexuality',
  Courtship = 'courtship',
  Parenting = 'parenting',
  Jealousy = 'jealousy',
  Pregnancy = 'pregnancy',
  Labor = 'labor',

  // Death, Afterlife & Souls
  DeathJudgment = 'death_judgment',
  DeathBargain = 'death_bargain',
  AfterlifeMemory = 'afterlife_memory',
  SoulWisdom = 'soul_wisdom',
  SoulIdentity = 'soul_identity',
  Incarnation = 'incarnation',
  SoulLink = 'soul_link',
  SoulCreationEvent = 'soul_creation_event',
  RealmLocation = 'realm_location',

  // Television & Broadcasting
  TVContent = 'tv_content',
  TVStation = 'tv_station',
  TVShow = 'tv_show',
  TVBroadcast = 'tv_broadcast',

  // Navigation & β-space
  Spaceship = 'spaceship',
  RainbowPlanet = 'rainbow_planet',  // Quantum superposition of planetary histories (Rainbow Mars)

  // Virtual Reality
  VRSystem = 'vr_system',
}
