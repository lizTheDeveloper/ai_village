/**
 * Component schemas
 *
 * Phase 4: Schema Migration - Tiers 1-4 implemented
 */

// ===== TIER 1: CORE COMPONENTS =====
export { IdentitySchema } from './IdentitySchema.js';
export type { IdentityComponent } from './IdentitySchema.js';

export { PositionSchema } from './PositionSchema.js';
export type { PositionComponent } from './PositionSchema.js';

export { RenderableSchema } from './RenderableSchema.js';
export type { RenderableComponent, RenderLayer } from './RenderableSchema.js';

// ===== TIER 2: AGENT COMPONENTS =====
export { PersonalitySchema } from './PersonalitySchema.js';
export type { PersonalityComponent } from './PersonalitySchema.js';

export { SkillsSchema } from './SkillsSchema.js';
export type {
  SkillsComponent,
  SkillLevel,
  SkillId,
} from './SkillsSchema.js';

export { NeedsSchema } from './NeedsSchema.js';
export type { NeedsComponent } from './NeedsSchema.js';

// New agent schemas
export * from './agent/index.js';

// ===== TIER 3: PHYSICAL COMPONENTS =====
export { InventorySchema } from './InventorySchema.js';
export type { InventoryComponent, InventorySlot } from './InventorySchema.js';

export { EquipmentSchema } from './EquipmentSchema.js';
export type { EquipmentComponent, EquipmentSlot } from './EquipmentSchema.js';

// New physical schemas
export * from './physical/index.js';

// ===== TIER 4: SOCIAL COMPONENTS =====
export { RelationshipSchema } from './RelationshipSchema.js';
export type {
  RelationshipComponent,
  Relationship,
  PerceivedSkill,
} from './RelationshipSchema.js';

export { SocialMemorySchema } from './SocialMemorySchema.js';
export type {
  SocialMemoryData,
  SocialMemory,
  Impression,
  KnownFact,
} from './SocialMemorySchema.js';

// Tier 5: Cognitive
export * from './cognitive/index.js';

// Tier 6: Magic
export * from './magic/index.js';

// Tier 7: World
export * from './world/index.js';

// Tier 8: System
export * from './system/index.js';

// Tier 9: Afterlife
export * from './afterlife/index.js';

// Tier 10: Social
export * from './social/index.js';
