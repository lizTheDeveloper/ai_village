/**
 * Research System Type Definitions
 *
 * Core types for the Phase 13 Research & Discovery system.
 * This module defines research projects, tech tree structure,
 * unlock mechanisms, and procedural content generation context.
 *
 * Part of Phase 13: Research & Discovery
 */

/**
 * Research fields representing different domains of knowledge.
 * Each field has its own tech tree branch and specialization bonuses.
 */
export type ResearchField =
  | 'agriculture'
  | 'construction'
  | 'crafting'
  | 'metallurgy'
  | 'alchemy'
  | 'textiles'
  | 'cuisine'
  | 'machinery'
  | 'nature'
  | 'society'
  | 'arcane'
  | 'experimental'
  | 'genetics';

/**
 * Types of content that can be unlocked by research.
 * Discriminated union for type-safe unlock handling.
 */
export type ResearchUnlock =
  | { type: 'recipe'; recipeId: string }
  | { type: 'building'; buildingId: string }
  | { type: 'item'; itemId: string }
  | { type: 'crop'; cropId: string }
  | { type: 'research'; researchId: string }
  | { type: 'ability'; abilityId: string }
  | { type: 'knowledge'; knowledgeId: string }
  | { type: 'generated'; generationType: string };

/**
 * Material requirement for starting research.
 */
export interface ResearchMaterialRequirement {
  itemId: string;
  amount: number;
}

/**
 * Context for procedurally generated research.
 * Stored for audit and reproduction.
 */
export interface GenerationContext {
  generatedBy: string;
  generatedAt: number;
  inputMaterials: ResearchMaterialRequirement[];
  researcherPersonality?: string;
  researcherSkills?: Record<string, number>;
  fieldFocus: ResearchField;
  promptHash?: string;
}

/**
 * Complete definition of a research project.
 * Can be predefined (tech tree) or generated (procedural).
 */
export interface ResearchDefinition {
  /** Unique identifier for this research */
  id: string;

  /** Display name */
  name: string;

  /** Description of what this research represents */
  description: string;

  /** Research field/category */
  field: ResearchField;

  /** Complexity tier (1-5+). Higher tiers require more resources. */
  tier: number;

  /** Progress points required to complete */
  progressRequired: number;

  /** Materials consumed when starting research */
  requiredItems?: ResearchMaterialRequirement[];

  /** Building type required to conduct this research */
  requiredBuilding?: string;

  /** Other research IDs that must be completed first */
  prerequisites: string[];

  /** What completing this research unlocks */
  unlocks: ResearchUnlock[];

  /** Whether this is predefined, agent-generated, or experimental */
  type: 'predefined' | 'generated' | 'experimental';

  /** For generated research, context about how it was created */
  generationContext?: GenerationContext;
}

/**
 * Progress tracking for in-progress research.
 */
export interface ResearchProgress {
  /** Research being worked on */
  researchId: string;

  /** Current progress points accumulated */
  currentProgress: number;

  /** Game tick when research was started */
  startedAt: number;

  /** Agent IDs contributing to this research (for "et al" credit) */
  researchers: string[];

  /** Insights gained from failed experiments */
  insights: Insight[];
}

/**
 * Knowledge gained from experimentation.
 * Failed experiments can still yield useful insights.
 */
export interface Insight {
  /** Unique identifier */
  id: string;

  /** Description of what was learned */
  content: string;

  /** Materials that were involved */
  relatedMaterials: string[];

  /** Bonus progress to related research */
  breakthroughBonus: number;

  /** When this insight was gained */
  timestamp: number;
}

/**
 * Tech tree node for visualization and traversal.
 */
export interface TechTreeNode {
  research: ResearchDefinition;
  children: TechTreeNode[];
  depth: number;
}

/**
 * Result of research content validation.
 */
export interface ResearchValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Capability gap detected when agents try unsupported actions.
 */
export interface CapabilityGap {
  /** Unique identifier for this gap */
  id: string;

  /** When this gap was first detected */
  detectedAt: number;

  /** What triggered the gap detection */
  trigger: {
    agentId: string;
    researchProject: string;
    attemptedAction: string;
    context: string;
  };

  /** Description of the missing capability */
  gap: {
    type: 'action' | 'mechanic' | 'interaction' | 'content_type' | 'system';
    description: string;
    whatAgentWanted: string;
    whatSystemLacks: string;
  };

  /** How many times this gap has been encountered */
  occurrences: number;

  /** Current status in the review pipeline */
  status: 'detected' | 'queued' | 'reviewing' | 'implementing' | 'deployed' | 'rejected';
}

/**
 * Request for capability review by human developers.
 */
export interface CapabilityRequest {
  gap: CapabilityGap;
  priority: number;
  suggestedImplementation?: string;
  relatedGaps: string[];
}

/**
 * Constraints for procedural content generation.
 */
export interface GenerationConstraints {
  /** Maximum tier for generated content */
  maxTier: number;

  /** Power budget for balancing */
  powerBudget: number;

  /** What types of content can be generated */
  allowedOutputTypes: ('item' | 'recipe' | 'building' | 'research')[];

  /** Field focus for generation */
  fieldFocus: ResearchField;

  /** IDs of existing content to avoid duplicating */
  mustDifferFrom: string[];
}

/**
 * Base interface for generated content.
 */
export interface GeneratedContent {
  type: 'item' | 'recipe' | 'building' | 'research';
  id: string;
  name: string;
  description: string;
  tier: number;
  generationContext: GenerationContext;
}

/**
 * Generated item definition.
 */
export interface GeneratedItem extends GeneratedContent {
  type: 'item';
  category: string;
  weight: number;
  stackSize: number;
  baseValue: number;
  properties: Record<string, unknown>;
}

/**
 * Generated recipe definition.
 */
export interface GeneratedRecipe extends GeneratedContent {
  type: 'recipe';
  inputs: ResearchMaterialRequirement[];
  outputs: ResearchMaterialRequirement[];
  craftingTime: number;
  stationRequired?: string;
}

/**
 * Generated research definition.
 */
export interface GeneratedResearch extends GeneratedContent {
  type: 'research';
  field: ResearchField;
  progressRequired: number;
  prerequisites: string[];
  unlocks: ResearchUnlock[];
}

/**
 * Result of an experiment attempt.
 */
export interface ExperimentResult {
  success: boolean;
  discovery?: GeneratedContent;
  insight?: Insight;
  materialsConsumed: ResearchMaterialRequirement[];
  message: string;
}

/**
 * Performance sample for metrics.
 */
export interface PerformanceSample {
  fps: number;
  tickDuration: number;
  memoryUsage: number;
  entityCount: number;
}

/**
 * Agent needs sample for metrics.
 */
export interface NeedsSample {
  hunger: number;
  thirst: number;
  energy: number;
  temperature: number;
  health: number;
}

/**
 * Milestone event for significant game moments.
 */
export interface Milestone {
  timestamp: number;
  name: string;
  significance: number;
}
