/**
 * Agent-specific component schemas
 */

export * from './AgentSchema.js';
export * from './CircadianSchema.js';
export * from './MoodSchema.js';
export * from './TemperatureSchema.js';
export * from './CombatStatsSchema.js';
export * from './GatheringStatsSchema.js';
export * from './CookingSkillSchema.js';
export * from './ExplorationStateSchema.js';

// Batch 4: Core Gameplay
export * from './ProfessionSchema.js';
export * from './PreferenceSchema.js';
export * from './InterestsSchema.js';

// Batch 8: Military/Combat Components
export * from './MilitarySchema.js';
export * from './GuardDutySchema.js';
export * from './ThreatDetectionSchema.js';
export * from './HiveCombatSchema.js';
export * from './PackCombatSchema.js';

// Batch 9: Automation/Manufacturing + Miscellaneous
export { UpliftedTraitSchema, type UpliftedTraitComponent } from './UpliftedTraitSchema.js';
