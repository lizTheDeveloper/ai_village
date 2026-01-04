/**
 * Soul System Exports
 *
 * The eternal aspect of agents - identity that persists beyond individual
 * lives and across timeline forks.
 */

// Soul Identity Component
export type {
  SoulIdentityComponent,
  LessonRecord,
  WisdomDomain,
  SoulCreationType,
} from './SoulIdentityComponent.js';
export {
  createSoulIdentityComponent,
  addLessonToSoul,
  hasLearnedLesson,
  getWisdomInDomain,
} from './SoulIdentityComponent.js';

// Silver Thread Component
export type {
  SilverThreadComponent,
  ThreadSegment,
  SegmentEntry,
  SegmentExit,
  SignificantEvent,
  SignificantEventType,
} from './SilverThreadComponent.js';
export {
  createSilverThreadComponent,
  addSignificantEvent,
  incrementPersonalTick,
  forkToNewUniverse,
  getEventsByType,
  getEventsInRange,
  getCurrentSegment,
  recordSnapshotWaypoint,
} from './SilverThreadComponent.js';

// Soul Link Component
export type {
  SoulLinkComponent,
} from './SoulLinkComponent.js';
export {
  createSoulLinkComponent,
  increaseSoulInfluence,
  decreaseSoulInfluence,
  shouldSoulInfluence,
  severSoulLink,
} from './SoulLinkComponent.js';
