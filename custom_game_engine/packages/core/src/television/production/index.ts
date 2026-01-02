/**
 * TV Production Module Exports
 *
 * Production pipeline components for TV content creation:
 * - CastingSystem: Agent auditions and contracts
 * - ScheduleManager: Production scheduling and resource allocation
 */

export {
  // Casting types
  type CastingCall,
  type CastingRequirements,
  type Audition,
  type ActorContract,
  // Note: CastMember not exported to avoid conflict with TVShow.CastMember
  // Casting manager
  CastingManager,
  getCastingManager,
  resetCastingManager,
} from './CastingSystem.js';

export {
  // Schedule types
  type ProductionSchedule,
  type ScheduleMilestone,
  type ResourceBooking,
  type ScheduledSession,
  type ScheduleConflict,
  type StudioResource,
  type CrewAvailability,
  // Schedule manager
  ScheduleManager,
  getScheduleManager,
  resetScheduleManager,
} from './ScheduleManager.js';
