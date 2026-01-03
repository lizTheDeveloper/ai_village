/**
 * Publishing Research Sets
 *
 * Defines N-of-M unlock logic for publishing infrastructure technologies.
 * Papers unlock technologies from Tier 0 (manuscripts) through Tier 6 (biographies).
 */

import { ResearchSet } from './types.js';

/**
 * WRITING SYSTEMS SET
 * Unlocks: Public Libraries (Tier 0a)
 * Papers: manuscript_preservation, library_organization
 * Logic: Need 1 of 2 papers (either preservation OR organization)
 */
export const WRITING_SYSTEMS_SET: ResearchSet = {
  setId: 'writing_systems',
  name: 'Writing and Preservation',
  description:
    'Ancient knowledge of preserving written materials and organizing collections. Enables public libraries where manuscripts can be stored and accessed.',
  field: 'society',

  allPapers: ['manuscript_preservation', 'library_organization'],

  unlocks: [
    {
      technologyId: 'public_libraries',
      papersRequired: 1, // 1 of 2
      mandatoryPapers: [], // Either paper works
      grants: [
        { type: 'building', buildingId: 'public_library' },
        { type: 'ability', abilityId: 'organize_library' },
      ],
    },
  ],
};

/**
 * MANUSCRIPT PRODUCTION SET
 * Unlocks: Scribe Workshops (Tier 0b)
 * Papers: scribe_training, ink_production, manuscript_preservation
 * Logic: Need 2 of 3 papers (any combination with scribe_training mandatory)
 */
export const MANUSCRIPT_PRODUCTION_SET: ResearchSet = {
  setId: 'manuscript_production',
  name: 'Manuscript Production',
  description:
    'The art of training scribes and producing writing materials. Enables professional scribe workshops for manual copying of texts.',
  field: 'society',

  allPapers: ['scribe_training', 'ink_production', 'manuscript_preservation'],

  unlocks: [
    {
      technologyId: 'scribe_workshops',
      papersRequired: 2, // 2 of 3
      mandatoryPapers: ['scribe_training'], // Must have scribe training
      grants: [
        { type: 'building', buildingId: 'scribe_workshop' },
        { type: 'ability', abilityId: 'copy_manuscript' },
        { type: 'recipe', recipeId: 'manuscript_copy' },
      ],
    },
  ],
};

/**
 * BOOKMAKING SET
 * Unlocks: Binder Workshops (Tier 0c)
 * Papers: binding_techniques, paper_production, library_organization
 * Logic: Need 2 of 3 papers (binding_techniques mandatory)
 */
export const BOOKMAKING_SET: ResearchSet = {
  setId: 'bookmaking',
  name: 'Book Binding',
  description:
    'Advanced techniques for binding loose papers into durable books. Enables binder workshops that produce proto-journals.',
  field: 'society',

  allPapers: ['binding_techniques', 'paper_production', 'library_organization'],

  unlocks: [
    {
      technologyId: 'binder_workshops',
      papersRequired: 2, // 2 of 3
      mandatoryPapers: ['binding_techniques'],
      grants: [
        { type: 'building', buildingId: 'binder_workshop' },
        { type: 'ability', abilityId: 'bind_papers' },
        { type: 'recipe', recipeId: 'bound_journal' },
      ],
    },
  ],
};

/**
 * PRINTING TECHNOLOGY SET
 * Unlocks:
 * - Printing Press Device (Tier 0d) - 2 of 4 papers
 * - Advanced Printing (Tier 0d+) - 3 of 4 papers
 * Papers: movable_type, printing_press_mechanics, paper_production, ink_production
 * Logic: Progressive unlocks as more papers are discovered
 */
export const PRINTING_TECHNOLOGY_SET: ResearchSet = {
  setId: 'printing_technology',
  name: 'Printing Technology',
  description:
    'Revolutionary mechanical reproduction of text through movable type and press mechanics. Enables mass production of written materials.',
  field: 'society',

  allPapers: [
    'movable_type',
    'printing_press_mechanics',
    'paper_production',
    'ink_production',
  ],

  unlocks: [
    {
      technologyId: 'printing_press',
      papersRequired: 2, // 2 of 4
      mandatoryPapers: ['movable_type', 'printing_press_mechanics'],
      grants: [
        { type: 'building', buildingId: 'printing_press' },
        { type: 'ability', abilityId: 'operate_press' },
        { type: 'recipe', recipeId: 'printed_page' },
      ],
    },
    {
      technologyId: 'advanced_printing',
      papersRequired: 3, // 3 of 4
      mandatoryPapers: [
        'movable_type',
        'printing_press_mechanics',
        'paper_production',
      ],
      grants: [
        { type: 'ability', abilityId: 'mass_produce_books' },
        { type: 'recipe', recipeId: 'printed_book' },
      ],
    },
  ],
};

/**
 * PUBLISHING INDUSTRY SET
 * Unlocks:
 * - Printing Companies (Tier 0e) - 3 of 5 papers
 * - Bookstores (Tier 0e+) - 4 of 5 papers
 * Papers: mass_production_theory, publishing_business, bookstore_economics,
 *         printing_press_mechanics, binding_techniques
 * Logic: Business and economics of publishing
 */
export const PUBLISHING_INDUSTRY_SET: ResearchSet = {
  setId: 'publishing_industry',
  name: 'Publishing Industry',
  description:
    'The commercial organization of book production and distribution. Enables printing companies and bookstores.',
  field: 'society',

  allPapers: [
    'mass_production_theory',
    'publishing_business',
    'bookstore_economics',
    'printing_press_mechanics',
    'binding_techniques',
  ],

  unlocks: [
    {
      technologyId: 'printing_companies',
      papersRequired: 3, // 3 of 5
      mandatoryPapers: ['mass_production_theory', 'publishing_business'],
      grants: [
        { type: 'building', buildingId: 'printing_company' },
        { type: 'ability', abilityId: 'manage_publishing_business' },
      ],
    },
    {
      technologyId: 'bookstores',
      papersRequired: 4, // 4 of 5
      mandatoryPapers: [
        'mass_production_theory',
        'publishing_business',
        'bookstore_economics',
      ],
      grants: [
        { type: 'building', buildingId: 'bookstore' },
        { type: 'ability', abilityId: 'retail_books' },
      ],
    },
  ],
};

/**
 * ACADEMIC PUBLISHING SET
 * Unlocks:
 * - Academic Journals (Tier 0f) - 2 of 4 papers
 * - University Libraries (Tier 0f+) - 3 of 4 papers
 * Papers: peer_review_system, academic_publishing, journal_distribution,
 *         library_organization
 * Logic: Scholarly communication infrastructure
 */
export const ACADEMIC_PUBLISHING_SET: ResearchSet = {
  setId: 'academic_publishing',
  name: 'Academic Publishing',
  description:
    'Formal systems for scholarly communication, peer review, and knowledge distribution. Enables academic journals and university libraries.',
  field: 'society',

  allPapers: [
    'peer_review_system',
    'academic_publishing',
    'journal_distribution',
    'library_organization',
  ],

  unlocks: [
    {
      technologyId: 'academic_journals',
      papersRequired: 2, // 2 of 4
      mandatoryPapers: ['peer_review_system', 'academic_publishing'],
      grants: [
        { type: 'building', buildingId: 'journal_publisher' },
        { type: 'ability', abilityId: 'publish_journal' },
        { type: 'ability', abilityId: 'peer_review' },
      ],
    },
    {
      technologyId: 'university_libraries',
      papersRequired: 3, // 3 of 4
      mandatoryPapers: [
        'peer_review_system',
        'academic_publishing',
        'library_organization',
      ],
      grants: [
        { type: 'building', buildingId: 'university_library' },
        { type: 'ability', abilityId: 'manage_journal_subscriptions' },
      ],
    },
  ],
};

/**
 * BIOGRAPHY PUBLISHING SET
 * Unlocks: Biography Books (Tier 0e+)
 * Papers: biographical_writing, career_documentation, publishing_business
 * Logic: Need 2 of 3 papers (biographical_writing mandatory)
 */
export const BIOGRAPHY_PUBLISHING_SET: ResearchSet = {
  setId: 'biography_publishing',
  name: 'Biographical Writing',
  description:
    'The art of documenting lives and careers for educational purposes. Enables biography books that inspire career paths.',
  field: 'society',

  allPapers: [
    'biographical_writing',
    'career_documentation',
    'publishing_business',
  ],

  unlocks: [
    {
      technologyId: 'biography_books',
      papersRequired: 2, // 2 of 3
      mandatoryPapers: ['biographical_writing'],
      grants: [
        { type: 'ability', abilityId: 'write_biography' },
        { type: 'recipe', recipeId: 'biography_book' },
      ],
    },
  ],
};

/**
 * ALL PUBLISHING SETS
 * Export array for convenient iteration
 */
export const ALL_PUBLISHING_SETS: ResearchSet[] = [
  WRITING_SYSTEMS_SET,
  MANUSCRIPT_PRODUCTION_SET,
  BOOKMAKING_SET,
  PRINTING_TECHNOLOGY_SET,
  PUBLISHING_INDUSTRY_SET,
  ACADEMIC_PUBLISHING_SET,
  BIOGRAPHY_PUBLISHING_SET,
];

/**
 * Helper function to get a research set by ID
 */
export function getPublishingSet(setId: string): ResearchSet | undefined {
  return ALL_PUBLISHING_SETS.find((set) => set.setId === setId);
}

/**
 * Helper function to check if a technology is unlocked
 * @param technologyId The technology to check
 * @param publishedPapers Set of paper IDs that have been published
 * @returns true if the technology is unlocked
 */
export function isPublishingTechnologyUnlocked(
  technologyId: string,
  publishedPapers: Set<string>
): boolean {
  // Find all sets that unlock this technology
  const relevantSets = ALL_PUBLISHING_SETS.filter((set) =>
    set.unlocks.some((unlock) => unlock.technologyId === technologyId)
  );

  // Check if any set has unlocked this technology
  return relevantSets.some((set) => {
    const unlock = set.unlocks.find((u) => u.technologyId === technologyId);
    if (!unlock) return false;

    // Count how many papers from this set have been published
    const publishedFromSet = set.allPapers.filter((paperId) =>
      publishedPapers.has(paperId)
    ).length;

    // Check if all mandatory papers are present
    const hasMandatory = unlock.mandatoryPapers
      ? unlock.mandatoryPapers.every((paperId) => publishedPapers.has(paperId))
      : true;

    // N-of-M logic: need at least N papers AND all mandatory papers
    return publishedFromSet >= unlock.papersRequired && hasMandatory;
  });
}

/**
 * Helper function to get progress toward a technology unlock
 * @param technologyId The technology to check
 * @param publishedPapers Set of paper IDs that have been published
 * @returns Progress as a fraction 0.0 to 1.0, or 0 if not found
 */
export function getPublishingTechnologyProgress(
  technologyId: string,
  publishedPapers: Set<string>
): number {
  // Find the first set that unlocks this technology
  const set = ALL_PUBLISHING_SETS.find((s) =>
    s.unlocks.some((u) => u.technologyId === technologyId)
  );
  if (!set) return 0;

  const unlock = set.unlocks.find((u) => u.technologyId === technologyId);
  if (!unlock) return 0;

  // Count papers from this set
  const publishedFromSet = set.allPapers.filter((paperId) =>
    publishedPapers.has(paperId)
  ).length;

  // Progress is published / required, capped at 1.0
  return Math.min(1.0, publishedFromSet / unlock.papersRequired);
}
