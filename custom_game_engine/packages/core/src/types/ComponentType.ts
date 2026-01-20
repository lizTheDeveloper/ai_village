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
  KnowledgeLoss = 'knowledge_loss',  // Singleton: tracks lost knowledge from deaths

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
  ExplorationMission = 'exploration_mission',

  // Buildings & Structures
  Building = 'building',
  BuildingHarmony = 'building_harmony',
  TownHall = 'town_hall',
  CensusBureau = 'census_bureau',
  VillageGovernance = 'village_governance',
  CityGovernance = 'city_governance',  // Political hierarchy: city governance (Tier 1.5)
  ProvinceGovernance = 'province_governance',  // Political hierarchy: regional governance (legacy)
  Province = 'province',  // Political hierarchy: province component (Tier 2)
  NationGovernance = 'nation_governance',  // Political hierarchy: national governance (legacy)
  Nation = 'nation',  // Political hierarchy: nation component (Tier 3)
  EmpireGovernance = 'empire_governance',  // Political hierarchy: imperial governance (legacy)
  Empire = 'empire',  // Political hierarchy: empire component (Tier 4)
  FederationGovernance = 'federation_governance',  // Political hierarchy: federal governance
  GalacticCouncil = 'galactic_council',  // Political hierarchy: galactic governance
  Governor = 'governor',  // Phase 6: AI Governance - LLM-powered political decision making
  PoliticalEntity = 'political_entity',  // Phase 6: Political entity in hierarchy
  GovernanceHistory = 'governance_history',  // Phase 6: Governance audit trail
  Dynasty = 'dynasty',  // Empire dynasty membership for soul agents
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
  ProductionCapability = 'production_capability',  // Grand strategy: civilization production scaling

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
  ShippingLane = 'shipping_lane',
  TradeCaravan = 'trade_caravan',
  TradeNetwork = 'trade_network',  // Tier 3: Network topology
  Blockade = 'blockade',  // Strategic chokepoint blockades
  MiningOperation = 'mining_operation',  // Stellar mining operations at phenomena

  // Research & Technology
  ResearchState = 'research_state',
  TechnologyUnlock = 'technology_unlock',
  TechnologyEra = 'technology_era',

  // Publishing & Knowledge Infrastructure
  Library = 'library',
  Bookstore = 'bookstore',
  University = 'university',
  UniversityLibrary = 'university_library',
  Biography = 'biography',
  PublishingCompany = 'publishing_company',
  Newspaper = 'newspaper',
  Recording = 'recording',
  VideoReplay = 'video_replay',

  // Skills & Crafting
  CookingSkill = 'cooking_skill',
  GatheringStats = 'gathering_stats',
  RecipeDiscovery = 'recipe_discovery',

  // Plants & Nature
  Plant = 'plant',
  Seed = 'seed',

  // Animals
  Animal = 'animal',
  Bioluminescent = 'bioluminescent',

  // Body Parts, Species & Genetics
  Body = 'body',
  Species = 'species',
  Genetic = 'genetic',

  // Magic & Divine
  Magic = 'magic',  // Monolithic magic component (migration to split components in progress - see MagicComponentMigration.ts)
  Mana = 'mana',
  ManaPoolsComponent = 'mana_pools',              // Magic: Resource pools (mana, favor, etc.)
  SpellKnowledgeComponent = 'spell_knowledge',    // Magic: Known spells and proficiency
  CastingStateComponent = 'casting_state',        // Magic: Active casting state
  SkillProgressComponent = 'skill_progress',      // Magic: Skill tree progression
  ParadigmStateComponent = 'paradigm_state',      // Magic: Paradigm-specific state

  // World & Time
  Time = 'time',
  TimeCompression = 'time_compression',  // Grand strategy time scaling
  TimeCompressionSnapshot = 'time_compression_snapshot',  // Era snapshots for time-travel archaeology
  Weather = 'weather',
  Vision = 'vision',
  Passage = 'passage',
  PassageExtended = 'passage_extended',  // Multiverse: extended passage metadata for inter-universe travel

  // Universe Metadata (Conservation of Game Matter)
  Corrupted = 'corrupted',                          // Generic corruption marker (Conservation of Game Matter)
  ProtoReality = 'proto_reality',
  CorruptedUniverse = 'corrupted_universe',
  UniverseForkMetadata = 'universe_fork_metadata',  // Multiverse: timeline forking and divergence
  DivergenceTracking = 'divergence_tracking',       // Multiverse: track timeline differences
  CanonEvent = 'canon_event',                       // Multiverse: narrative anchors that resist change
  CausalChain = 'causal_chain',                     // Multiverse: paradox detection via causal history
  MergeCompatibility = 'merge_compatibility',       // Multiverse: timeline merge compatibility tracking
  TimelineMergerOperation = 'timeline_merger_operation', // Multiverse: active timeline merger ship operations

  // World-level Registries
  NamedLandmarks = 'named_landmarks',

  // Journal
  Journal = 'journal',

  // Divinity & Religion
  Spiritual = 'spiritual',
  Spirit = 'spirit',
  Deity = 'deity',
  Angel = 'angel',
  Mythology = 'mythology',
  DivineChat = 'divine_chat',
  DivineAbility = 'divine_ability',
  ChatRoom = 'chat_room',
  Companion = 'companion',

  // Divine Rebellion & Cosmic Systems
  RebellionOutcome = 'rebellion_outcome',
  LoreFrag = 'lore_frag',
  RealityAnchor = 'reality_anchor',
  RebellionThreshold = 'rebellion_threshold',
  SupremeCreator = 'supreme_creator',
  PowerVacuum = 'power_vacuum',     // Tracks vacant positions of authority
  PositionHolder = 'position_holder', // Marks entities holding positions of power
  DimensionalRift = 'dimensional_rift', // Tears in spacetime from rebellion, magic failures, or cosmic events

  // Combat
  Conflict = 'conflict',
  CombatStats = 'combat_stats',
  ThreatDetection = 'threat_detection',
  Injury = 'injury',
  Burning = 'burning',
  PackCombat = 'pack_combat',      // Pack mind collective combat component
  HiveCombat = 'hive_combat',      // Hive mind collective combat component
  PackMember = 'pack_member',      // Individual pack member marker
  HiveQueen = 'hive_queen',        // Hive queen marker
  HiveWorker = 'hive_worker',      // Hive worker marker

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
  Afterlife = 'afterlife',
  AfterlifeMemory = 'afterlife_memory',
  SoulWisdom = 'soul_wisdom',
  SoulIdentity = 'soul_identity',
  SilverThread = 'silver_thread',
  PlotLines = 'plot_lines',
  Incarnation = 'incarnation',
  SoulLink = 'soul_link',
  SoulCreationEvent = 'soul_creation_event',
  Realm = 'realm',
  RealmLocation = 'realm_location',
  PlanetLocation = 'planet_location',
  CurrentLifeMemory = 'current_life_memory',
  VeilOfForgetting = 'veil_of_forgetting',

  // Television & Broadcasting
  TVContent = 'tv_content',
  TVStation = 'tv_station',
  TVShow = 'tv_show',
  TVBroadcast = 'tv_broadcast',

  // Navigation & β-space
  Spaceship = 'spaceship',
  ShipCrew = 'ship_crew',  // Ship-fleet hierarchy: crew member aboard a ship
  Squadron = 'squadron',  // Ship-fleet hierarchy: 3-10 ships
  Fleet = 'fleet',        // Ship-fleet hierarchy: 3-10 squadrons
  Armada = 'armada',      // Ship-fleet hierarchy: 3-10 fleets
  Navy = 'navy',          // Ship-fleet hierarchy: all military forces
  RainbowPlanet = 'rainbow_planet',  // Quantum superposition of planetary histories (Rainbow Mars)

  // Planet Travel
  PlanetTravel = 'planet_travel',    // Active travel state between planets
  PlanetPortal = 'planet_portal',    // Intra-universe portal between planets

  // Ship Components (internal spaceship infrastructure)
  EmotionTheater = 'emotion_theater',      // VR space for emotional induction
  MemoryHall = 'memory_hall',              // Memory preservation and replay
  MeditationChamber = 'meditation_chamber', // Emotional regulation
  HeartChamber = 'heart_chamber',          // The Heart - crew sync for jumps
  Straggler = 'straggler',                 // Ship left behind during fleet β-jump

  // Virtual Reality
  VRSystem = 'vr_system',

  // Invasion (Multiverse warfare)
  Invasion = 'invasion',

  // Megastructures (Grand Strategy Phase 5)
  Megastructure = 'megastructure',           // Massive engineering projects (Dyson swarms, wormholes)
  ConstructionProject = 'construction_project', // Active megastructure construction tracking
  ArchaeologicalSite = 'archaeological_site', // Excavation sites for discovering ancient technologies
}
