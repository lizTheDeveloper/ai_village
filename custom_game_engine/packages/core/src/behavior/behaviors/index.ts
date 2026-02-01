/**
 * Behaviors Index
 *
 * Exports all behavior classes and WithContext functions for use with
 * the BehaviorRegistry and AgentBrainSystem.
 *
 * NOTE: Legacy standalone behavior functions (e.g., wanderBehavior) have been removed.
 * Use the *WithContext versions instead (e.g., wanderBehaviorWithContext).
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Base behavior
export { BaseBehavior, type BehaviorResult, type IBehavior } from './BaseBehavior.js';

// Simple behaviors
export { WanderBehavior, wanderBehaviorWithContext } from './WanderBehavior.js';
export { IdleBehavior, idleBehaviorWithContext } from './IdleBehavior.js';

// Idle & reflection behaviors
export { ReflectBehavior, reflectBehaviorWithContext } from './ReflectBehavior.js';
export { ObserveBehavior, observeBehaviorWithContext } from './ObserveBehavior.js';
export { SitQuietlyBehavior, sitQuietlyBehaviorWithContext } from './SitQuietlyBehavior.js';
export { AmuseSelfBehavior, amuseSelfBehaviorWithContext } from './AmuseSelfBehavior.js';
export { PracticeSkillBehavior, practiceSkillBehaviorWithContext } from './PracticeSkillBehavior.js';

// Sleep behaviors
export {
  SeekSleepBehavior,
  ForcedSleepBehavior,
  seekSleepBehaviorWithContext,
  forcedSleepBehaviorWithContext,
} from './SleepBehavior.js';

// Resource behaviors
export { GatherBehavior, gatherBehaviorWithContext } from './GatherBehavior.js';
export { DepositItemsBehavior, depositItemsBehaviorWithContext } from './DepositItemsBehavior.js';
export { SeekFoodBehavior, seekFoodBehaviorWithContext } from './SeekFoodBehavior.js';

// Social behaviors
export { FollowAgentBehavior, followAgentBehaviorWithContext } from './FollowAgentBehavior.js';
export { TalkBehavior, talkBehaviorWithContext } from './TalkBehavior.js';
export {
  CallMeetingBehavior,
  AttendMeetingBehavior,
  callMeetingBehaviorWithContext,
  attendMeetingBehaviorWithContext,
} from './MeetingBehaviors.js';

// Combat behaviors
export { InitiateCombatBehavior, initiateCombatBehaviorWithContext } from './InitiateCombatBehavior.js';

// Hunting behaviors
export { InitiateHuntBehavior, initiateHuntBehaviorWithContext } from './InitiateHuntBehavior.js';
export { ButcherBehavior, butcherBehaviorWithContext } from './ButcherBehavior.js';

// Farm behaviors
export {
  FarmBehavior,
  TillBehavior,
  PlantBehavior,
  WaterBehavior,
  HarvestBehavior,
  farmBehaviorWithContext,
  tillBehaviorWithContext,
  plantBehaviorWithContext,
  waterBehaviorWithContext,
  harvestBehaviorWithContext,
} from './FarmBehaviors.js';

// Build behaviors
export { BuildBehavior, buildBehaviorWithContext } from './BuildBehavior.js';

// Crafting behaviors
export { CraftBehavior, craftBehaviorWithContext } from './CraftBehavior.js';

// Research behaviors
export { ResearchBehavior, researchBehaviorWithContext } from './ResearchBehavior.js';

// Trade behaviors
export { TradeBehavior, tradeBehaviorWithContext } from './TradeBehavior.js';

// Magic behaviors
export { CastSpellBehavior, castSpellBehaviorWithContext } from './CastSpellBehavior.js';

// Survival behaviors
export { SeekWarmthBehavior, seekWarmthBehaviorWithContext } from './SeekWarmthBehavior.js';
export { SeekCoolingBehavior, seekCoolingBehaviorWithContext } from './SeekCoolingBehavior.js';
export { FleeToHomeBehavior, fleeToHomeBehaviorWithContext } from './FleeToHomeBehavior.js';

// Navigation behaviors
export {
  NavigateBehavior,
  ExploreFrontierBehavior,
  ExploreSpiralBehavior,
  FollowGradientBehavior,
  navigateBehaviorWithContext,
  exploreFrontierBehaviorWithContext,
  exploreSpiralBehaviorWithContext,
  followGradientBehaviorWithContext,
} from './NavigationBehaviors.js';

// Animal husbandry behaviors
export {
  TameAnimalBehavior,
  HouseAnimalBehavior,
  tameAnimalBehaviorWithContext,
  houseAnimalBehaviorWithContext,
} from './AnimalBehaviors.js';

// Spiritual & Prayer behaviors
export * from './PrayBehavior.js';
export * from './GroupPrayBehavior.js';
export * from './MeditateBehavior.js';

// Building maintenance behaviors
export { RepairBehavior, repairBehaviorWithContext } from './RepairBehavior.js';
export * from './UpgradeBehavior.js';

// Tile-Based Voxel Building Behaviors (Phase 4)
export { MaterialTransportBehavior, materialTransportBehaviorWithContext } from './MaterialTransportBehavior.js';
export { TileBuildBehavior, tileBuildBehaviorWithContext } from './TileBuildBehavior.js';
