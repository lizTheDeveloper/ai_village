/**
 * Behaviors Index
 *
 * Exports all behavior classes and standalone functions for use with
 * the BehaviorRegistry and AgentBrainSystem.
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Base behavior
export { BaseBehavior, type BehaviorResult, type IBehavior } from './BaseBehavior.js';

// Simple behaviors
export { WanderBehavior, wanderBehavior } from './WanderBehavior.js';
export { IdleBehavior, idleBehavior } from './IdleBehavior.js';

// Idle & reflection behaviors
export { ReflectBehavior, reflectBehavior } from './ReflectBehavior.js';
export { ObserveBehavior, observeBehavior } from './ObserveBehavior.js';
export { SitQuietlyBehavior, sitQuietlyBehavior } from './SitQuietlyBehavior.js';
export { AmuseSelfBehavior, amuseSelfBehavior } from './AmuseSelfBehavior.js';
export { PracticeSkillBehavior, practiceSkillBehavior } from './PracticeSkillBehavior.js';

// Sleep behaviors
export {
  SeekSleepBehavior,
  ForcedSleepBehavior,
  seekSleepBehavior,
  forcedSleepBehavior,
} from './SleepBehavior.js';

// Resource behaviors
export { GatherBehavior, gatherBehavior } from './GatherBehavior.js';
export { DepositItemsBehavior, depositItemsBehavior } from './DepositItemsBehavior.js';
export { SeekFoodBehavior, seekFoodBehavior } from './SeekFoodBehavior.js';

// Social behaviors
export { FollowAgentBehavior, followAgentBehavior } from './FollowAgentBehavior.js';
export { TalkBehavior, talkBehavior } from './TalkBehavior.js';
export {
  CallMeetingBehavior,
  AttendMeetingBehavior,
  callMeetingBehavior,
  attendMeetingBehavior,
} from './MeetingBehaviors.js';

// Farm behaviors
export {
  FarmBehavior,
  TillBehavior,
  PlantBehavior,
  WaterBehavior,
  HarvestBehavior,
  farmBehavior,
  tillBehavior,
  plantBehavior,
  waterBehavior,
  harvestBehavior,
} from './FarmBehaviors.js';

// Build behaviors
export { BuildBehavior, buildBehavior } from './BuildBehavior.js';

// Crafting behaviors
export { CraftBehavior, craftBehavior } from './CraftBehavior.js';

// Research behaviors
export { ResearchBehavior, researchBehavior } from './ResearchBehavior.js';

// Trade behaviors
export { TradeBehavior, tradeBehavior } from './TradeBehavior.js';

// Magic behaviors
export { CastSpellBehavior, castSpellBehavior } from './CastSpellBehavior.js';

// Survival behaviors
export { SeekWarmthBehavior, seekWarmthBehavior } from './SeekWarmthBehavior.js';
export { SeekCoolingBehavior, seekCoolingBehavior } from './SeekCoolingBehavior.js';

// Navigation behaviors
export {
  NavigateBehavior,
  ExploreFrontierBehavior,
  ExploreSpiralBehavior,
  FollowGradientBehavior,
  navigateBehavior,
  exploreFrontierBehavior,
  exploreSpiralBehavior,
  followGradientBehavior,
} from './NavigationBehaviors.js';

// Animal husbandry behaviors
export {
  TameAnimalBehavior,
  HouseAnimalBehavior,
  tameAnimalBehavior,
  houseAnimalBehavior,
} from './AnimalBehaviors.js';

// Spiritual & Prayer behaviors
export * from './PrayBehavior.js';
export * from './GroupPrayBehavior.js';
export * from './MeditateBehavior.js';

// Building maintenance behaviors
export * from './RepairBehavior.js';
export * from './UpgradeBehavior.js';

// Tile-Based Voxel Building Behaviors (Phase 4)
export { MaterialTransportBehavior, materialTransportBehavior } from './MaterialTransportBehavior.js';
export { TileBuildBehavior, tileBuildBehavior } from './TileBuildBehavior.js';
