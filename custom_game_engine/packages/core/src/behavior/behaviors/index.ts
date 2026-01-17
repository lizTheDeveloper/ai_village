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
export { WanderBehavior, wanderBehavior, wanderBehaviorWithContext } from './WanderBehavior.js';
export { IdleBehavior, idleBehavior, idleBehaviorWithContext } from './IdleBehavior.js';

// Idle & reflection behaviors
export { ReflectBehavior, reflectBehavior, reflectBehaviorWithContext } from './ReflectBehavior.js';
export { ObserveBehavior, observeBehavior, observeBehaviorWithContext } from './ObserveBehavior.js';
export { SitQuietlyBehavior, sitQuietlyBehavior, sitQuietlyBehaviorWithContext } from './SitQuietlyBehavior.js';
export { AmuseSelfBehavior, amuseSelfBehavior, amuseSelfBehaviorWithContext } from './AmuseSelfBehavior.js';
export { PracticeSkillBehavior, practiceSkillBehavior, practiceSkillBehaviorWithContext } from './PracticeSkillBehavior.js';

// Sleep behaviors
export {
  SeekSleepBehavior,
  ForcedSleepBehavior,
  seekSleepBehavior,
  forcedSleepBehavior,
  seekSleepBehaviorWithContext,
  forcedSleepBehaviorWithContext,
  injectChunkSpatialQueryToSleep,
} from './SleepBehavior.js';

// Resource behaviors
export { GatherBehavior, gatherBehavior, gatherBehaviorWithContext, injectChunkSpatialQueryToGather } from './GatherBehavior.js';
export { DepositItemsBehavior, depositItemsBehavior, depositItemsBehaviorWithContext, injectChunkSpatialQueryToDepositItems } from './DepositItemsBehavior.js';
export { SeekFoodBehavior, seekFoodBehavior, seekFoodBehaviorWithContext, injectChunkSpatialQueryToSeekFood } from './SeekFoodBehavior.js';

// Social behaviors
export { FollowAgentBehavior, followAgentBehavior, followAgentBehaviorWithContext } from './FollowAgentBehavior.js';
export { TalkBehavior, talkBehavior, talkBehaviorWithContext } from './TalkBehavior.js';
export {
  CallMeetingBehavior,
  AttendMeetingBehavior,
  callMeetingBehavior,
  attendMeetingBehavior,
  callMeetingBehaviorWithContext,
  attendMeetingBehaviorWithContext,
} from './MeetingBehaviors.js';

// Combat behaviors
export { InitiateCombatBehavior, initiateCombatBehavior, initiateCombatBehaviorWithContext } from './InitiateCombatBehavior.js';

// Hunting behaviors
export { InitiateHuntBehavior, initiateHuntBehavior, initiateHuntBehaviorWithContext } from './InitiateHuntBehavior.js';
export { ButcherBehavior, butcherBehavior, butcherBehaviorWithContext } from './ButcherBehavior.js';

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
  tillBehaviorWithContext,
  plantBehaviorWithContext,
  waterBehaviorWithContext,
  harvestBehaviorWithContext,
  injectChunkSpatialQueryToFarmBehaviors,
} from './FarmBehaviors.js';

// Build behaviors
export { BuildBehavior, buildBehavior, buildBehaviorWithContext, injectChunkSpatialQueryToBuild } from './BuildBehavior.js';

// Crafting behaviors
export { CraftBehavior, craftBehavior, craftBehaviorWithContext } from './CraftBehavior.js';

// Research behaviors
export { ResearchBehavior, researchBehavior, researchBehaviorWithContext } from './ResearchBehavior.js';

// Trade behaviors
export { TradeBehavior, tradeBehavior, tradeBehaviorWithContext } from './TradeBehavior.js';

// Magic behaviors
export { CastSpellBehavior, castSpellBehavior, castSpellBehaviorWithContext } from './CastSpellBehavior.js';

// Survival behaviors
export { SeekWarmthBehavior, seekWarmthBehavior, seekWarmthBehaviorWithContext } from './SeekWarmthBehavior.js';
export { SeekCoolingBehavior, seekCoolingBehavior, seekCoolingBehaviorWithContext, injectChunkSpatialQueryToSeekCooling } from './SeekCoolingBehavior.js';
export { FleeToHomeBehavior, fleeToHomeBehavior, fleeToHomeBehaviorWithContext } from './FleeToHomeBehavior.js';

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
  navigateBehaviorWithContext,
  exploreFrontierBehaviorWithContext,
  exploreSpiralBehaviorWithContext,
  followGradientBehaviorWithContext,
} from './NavigationBehaviors.js';

// Animal husbandry behaviors
export {
  TameAnimalBehavior,
  HouseAnimalBehavior,
  tameAnimalBehavior,
  houseAnimalBehavior,
  tameAnimalBehaviorWithContext,
  houseAnimalBehaviorWithContext,
} from './AnimalBehaviors.js';

// Spiritual & Prayer behaviors
export * from './PrayBehavior.js';
export * from './GroupPrayBehavior.js';
export * from './MeditateBehavior.js';

// Building maintenance behaviors
export { RepairBehavior, repairBehavior, repairBehaviorWithContext, injectChunkSpatialQueryToRepair } from './RepairBehavior.js';
export * from './UpgradeBehavior.js';

// Tile-Based Voxel Building Behaviors (Phase 4)
export { MaterialTransportBehavior, materialTransportBehavior, materialTransportBehaviorWithContext } from './MaterialTransportBehavior.js';
export { TileBuildBehavior, tileBuildBehavior, tileBuildBehaviorWithContext } from './TileBuildBehavior.js';
