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
  farmBehavior,
  tillBehavior,
} from './FarmBehaviors.js';

// Build behaviors
export { BuildBehavior, buildBehavior } from './BuildBehavior.js';

// Survival behaviors
export { SeekWarmthBehavior, seekWarmthBehavior } from './SeekWarmthBehavior.js';

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
