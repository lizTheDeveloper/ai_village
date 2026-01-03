/**
 * Research Papers - Knowledge Tree System
 *
 * This module contains all research paper definitions for the knowledge-based research system.
 * Papers must be read before they can be authored, creating a natural education-driven progression.
 *
 * Structure:
 * - Each field (agriculture, metallurgy, alchemy) has its own paper collection
 * - Papers have prerequisite relationships forming a tree structure
 * - Technologies unlock when all required papers are published
 * - Agents must read prerequisites before they can author new papers
 */

// Types
export * from './types.js';

// Paper Collections
export * from './agriculture-papers.js';
export * from './metallurgy-papers.js';
export * from './alchemy-papers.js';
export * from './publishing-papers.js';

// Research Sets (N-of-M unlock logic)
export {
  ALL_RESEARCH_SETS,
  BASIC_AGRICULTURE_SET,
  BASIC_METALLURGY_SET,
  ADVANCED_METALLURGY_SET,
  BASIC_ALCHEMY_SET,
  ADVANCED_ALCHEMY_SET,
  RUNE_MAGIC_SET,
  getResearchSet,
  isTechnologyUnlocked as isTechnologyUnlockedNofM, // Renamed to avoid conflict
  getUnlockedTechnologies,
  getTechnologyProgress
} from './research-sets.js';

// Publishing Research Sets
export {
  ALL_PUBLISHING_SETS,
  WRITING_SYSTEMS_SET,
  MANUSCRIPT_PRODUCTION_SET,
  BOOKMAKING_SET,
  PRINTING_TECHNOLOGY_SET,
  PUBLISHING_INDUSTRY_SET,
  ACADEMIC_PUBLISHING_SET,
  BIOGRAPHY_PUBLISHING_SET,
  getPublishingSet,
  isPublishingTechnologyUnlocked,
  getPublishingTechnologyProgress
} from './publishing-research-sets.js';

// Technologies (legacy)
export * from './technologies.js';

import { AGRICULTURE_PAPERS } from './agriculture-papers.js';
import { METALLURGY_PAPERS } from './metallurgy-papers.js';
import { ALCHEMY_PAPERS } from './alchemy-papers.js';
import { ALL_PUBLISHING_PAPERS } from './publishing-papers.js';
import type { ResearchPaper } from './types.js';

/**
 * Complete collection of all research papers
 */
export const ALL_RESEARCH_PAPERS: ResearchPaper[] = [
  ...AGRICULTURE_PAPERS,
  ...METALLURGY_PAPERS,
  ...ALCHEMY_PAPERS,
  ...ALL_PUBLISHING_PAPERS
];

/**
 * Get a paper by ID
 */
export function getPaper(paperId: string): ResearchPaper | undefined {
  return ALL_RESEARCH_PAPERS.find(paper => paper.paperId === paperId);
}

/**
 * Get all papers in a specific field
 */
export function getPapersByField(field: string): ResearchPaper[] {
  return ALL_RESEARCH_PAPERS.filter(paper => paper.field === field);
}

/**
 * Get all papers of a specific tier
 */
export function getPapersByTier(tier: number): ResearchPaper[] {
  return ALL_RESEARCH_PAPERS.filter(paper => paper.tier === tier);
}

/**
 * Get papers that an agent can read (no prerequisites, or has read all prerequisites)
 */
export function getReadablePapers(readPapers: Set<string>): ResearchPaper[] {
  return ALL_RESEARCH_PAPERS.filter(paper => {
    // Check if all prerequisites have been read
    return paper.prerequisitePapers.every(prereqId => readPapers.has(prereqId));
  });
}

/**
 * Get papers that an agent could author (has read all prerequisites)
 * This is the same as getReadablePapers but semantically different -
 * these are papers the agent could WRITE, not READ
 */
export function getAuthorablePapers(
  readPapers: Set<string>,
  authoredPapers: Set<string>
): ResearchPaper[] {
  return ALL_RESEARCH_PAPERS.filter(paper => {
    // Skip papers already authored
    if (authoredPapers.has(paper.paperId)) return false;

    // Check if all prerequisites have been read
    return paper.prerequisitePapers.every(prereqId => readPapers.has(prereqId));
  });
}

/**
 * Get all papers that depend on a given paper (reverse prerequisite lookup)
 */
export function getPapersDependingOn(paperId: string): ResearchPaper[] {
  return ALL_RESEARCH_PAPERS.filter(paper =>
    paper.prerequisitePapers.includes(paperId)
  );
}

/**
 * Check if a paper's prerequisites are met
 */
export function arePrerequisitesMet(
  paperId: string,
  readPapers: Set<string>
): boolean {
  const paper = getPaper(paperId);
  if (!paper) return false;

  return paper.prerequisitePapers.every(prereqId => readPapers.has(prereqId));
}

/**
 * Get the complete prerequisite chain for a paper (all ancestors)
 */
export function getPrerequisiteChain(paperId: string): string[] {
  const paper = getPaper(paperId);
  if (!paper) return [];

  const chain = new Set<string>();
  const queue = [...paper.prerequisitePapers];

  while (queue.length > 0) {
    const prereqId = queue.shift()!;
    if (chain.has(prereqId)) continue;

    chain.add(prereqId);
    const prereqPaper = getPaper(prereqId);
    if (prereqPaper) {
      queue.push(...prereqPaper.prerequisitePapers);
    }
  }

  return Array.from(chain);
}

/**
 * Statistics about the research paper collection
 */
export const PAPER_STATS = {
  total: ALL_RESEARCH_PAPERS.length,
  byField: {
    agriculture: AGRICULTURE_PAPERS.length,
    metallurgy: METALLURGY_PAPERS.length,
    alchemy: ALCHEMY_PAPERS.length,
    society: ALL_PUBLISHING_PAPERS.length
  },
  byTier: {
    tier1: getPapersByTier(1).length,
    tier2: getPapersByTier(2).length,
    tier3: getPapersByTier(3).length,
    tier4: getPapersByTier(4).length,
    tier5: getPapersByTier(5).length,
    tier6: getPapersByTier(6).length
  },
  rootPapers: ALL_RESEARCH_PAPERS.filter(p => p.prerequisitePapers.length === 0).length
};
