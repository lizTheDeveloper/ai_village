/**
 * Research, technology, and experimentation events.
 */
import type { EntityId } from '../../types.js';

export interface ResearchEvents {
  'research:unlocked': {
    researchId: string;
    type?: 'recipe' | 'building' | 'item' | 'research' | 'ability' | 'crop' | 'knowledge' | 'generated';
    contentId?: string;
    agentId?: EntityId;
  };
  'research:started': {
    researchId: string;
    agentId: EntityId;
    researchers: EntityId[];
  };
  'research:progress': {
    researchId: string;
    progress: number;
    progressRequired: number;
    agentId?: EntityId;
    // Paper-based progress fields (Phase 13.1)
    papersPublished?: number;
    papersRequired?: number;
    progressTowardNextPaper?: number;
    paperPublished?: {
      id: string;
      title: string;
      authors: string[];
      isBreakthrough: boolean;
    };
  };
  'research:completed': {
    researchId: string;
    researchName?: string;
    researchers: EntityId[];
    unlocks: Array<{ type: string; id: string }>;
    tick: number;
    // Paper bibliography (Phase 13.1)
    bibliography?: {
      paperCount: number;
      papers: Array<{
        id: string;
        title: string;
        authors: string[];
        citations: number;
        citedBy: number;
        isBreakthrough: boolean;
      }>;
      leadResearcherId?: string;
      contributorIds: string[];
    };
  };
  'research:failed': {
    researchId: string;
    agentId: EntityId;
    reason: string;
  };
  'research:insight_gained': {
    researchId: string;
    agentId: EntityId;
    insightId: string;
    content: string;
    breakthroughBonus: number;
  };
  /** LLM-generated technology was approved */
  'research:discovered': {
    technologyId: string;
    name: string;
    field?: string;
    discoverer: string;
    message: string;
  };
  /** Research paper published (triggers technology unlock checks) */
  'research:paper_published': {
    paperId: string;
    authorId: EntityId;
    authorName?: string;
    field: string;
    title?: string;
    citationCount?: number;
  };
  'discovery:created': {
    discoveryType: 'item' | 'recipe' | 'building' | 'research';
    discoveryId: string;
    name: string;
    tier: number;
    generatedBy: EntityId;
    researchContext?: string;
  };
  'capability_gap:detected': {
    gapId: string;
    agentId: EntityId;
    attemptedAction: string;
    description: string;
  };
  'university:research_started': {
    universityId: EntityId;
    projectId: string;
    title: string;
    principalInvestigator: EntityId;
    researchers: EntityId[];
    tick: number;
  };
  /** Research project completed */
  'university:research_completed': {
    universityId: EntityId;
    projectId: string;
    paperId: string;
    title: string;
    researchers: EntityId[];
    quality: number;
    novelty: number;
    tick: number;
    researchComplete: boolean; // Did this complete the overall research?
  };
  /** University statistics */
  'university:stats': {
    universityId: EntityId;
    employeeCount: number;
    activeProjects: number;
    completedProjects: number;
    totalPublications: number;
    researchMultiplier: number;
    tick: number;
  };
  /** Building type unlocked globally */
  'technology:building_unlocked': {
    buildingType: string;
    cityId: string;
    tick: number;
  };
  'experiment:requested': {
    agentId: EntityId;
    ingredients: Array<{ itemId: string; quantity: number }>;
    recipeType: string;
    giftRecipient?: string;
  };
  'experiment:success': {
    recipeId: string;
    itemId: string;
    displayName: string;
    message: string;
    creativityScore: number;
    autoApproved?: boolean;
  };
  'experiment:failed': {
    reason: string;
    message: string;
    creativityScore?: number;
  };
  'experiment:pending_approval': {
    pendingId: string;
    itemId: string;
    displayName: string;
    message: string;
    creativityScore: number;
  };
  'experiment:rejected': {
    itemId: string;
    displayName: string;
    message: string;
  };
  'recipe:discovered': {
    recipeId: string;
    discoverer: string;
    recipeType: string;
  };
}
export type ResearchEventType = keyof ResearchEvents;
export type ResearchEventData = ResearchEvents[ResearchEventType];
