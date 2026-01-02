/**
 * Television Systems
 *
 * Systems that manage TV broadcasting, development, writing, production, and audience engagement.
 */

// Broadcasting & Ratings
export { TVBroadcastingSystem } from './TVBroadcastingSystem.js';
export { TVRatingsSystem } from './TVRatingsSystem.js';

// Development & Writing
export { TVDevelopmentSystem, type ShowConcept, type PitchSubmission, type GreenlightDecision } from './TVDevelopmentSystem.js';
export { TVWritingSystem, type WritingTask, type EpisodePlan } from './TVWritingSystem.js';

// Production & Post-Production
export {
  TVProductionSystem,
  type FilmingSession,
  type ActiveScene,
} from './TVProductionSystem.js';

export {
  TVPostProductionSystem,
  type PostProductionJob,
  type MusicCue,
  type VFXShot,
} from './TVPostProductionSystem.js';

// Advertising & Revenue
export {
  TVAdvertisingSystem,
  type Advertisement as TVAdvertisement,
  type AdSlot,
  type Sponsor,
  type SponsorshipDeal,
  type CommercialBreak as TVCommercialBreak,
  AdvertisingManager,
  getTVAdvertisingSystem,
  resetTVAdvertisingSystem,
} from './TVAdvertisingSystem.js';

// Cultural Impact
export {
  TVCulturalImpactSystem,
  type Catchphrase,
  type FashionTrend,
  type FashionElement,
  type FanCommunity,
  type FanTheory,
  type Celebrity,
  type IconicMoment,
  CulturalImpactManager,
  getTVCulturalImpactSystem,
  resetTVCulturalImpactSystem,
} from './TVCulturalImpactSystem.js';

// Archive & Preservation
export {
  TVArchiveSystem,
  type StorageTier as TVStorageTier,
  type ArchivedContent,
  type ContentMetadata,
  type HotContent,
  type WarmContent,
  type ColdContent,
  type RetrospectiveShow,
  type ArchiveCollection,
  type PreservationRequest,
  ArchiveManager,
  getArchiveManager,
  resetArchiveManager,
} from './TVArchiveSystem.js';
