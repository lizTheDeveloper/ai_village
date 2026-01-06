/**
 * Social interaction schemas
 */

export * from './ConversationSchema.js';

// Batch 6: Buildings & Systems
export { NewspaperSchema } from './NewspaperSchema.js';
export { CensusBureauSchema } from './CensusBureauSchema.js';
export { MarketStateSchema } from './MarketStateSchema.js';
export { TradeAgreementSchema } from './TradeAgreementSchema.js';
export { TrustNetworkSchema } from './TrustNetworkSchema.js';

// Tier 10: Social/Community
export { InterestsSchema, type InterestsComponent } from './InterestsSchema.js';
export { JournalSchema, type JournalComponent } from './JournalSchema.js';
export { JealousySchema, type JealousyComponent } from './JealousySchema.js';
export { ParentingSchema, type ParentingComponent } from './ParentingSchema.js';
export { ConflictSchema, type ConflictComponent } from './ConflictSchema.js';
export { MeetingSchema, type MeetingComponent } from './MeetingSchema.js';

// Tier 11: Economic/Governance
export { SocialGradientSchema, type SocialGradientComponent } from './SocialGradientSchema.js';
export { CosmicRebellionOutcomeSchema, type CosmicRebellionOutcomeComponent } from './CosmicRebellionOutcomeSchema.js';
export { RebellionThresholdSchema, type RebellionThresholdComponent } from './RebellionThresholdSchema.js';
// Note: SupremeCreatorSchema moved to magic/ directory (Batch 8)
