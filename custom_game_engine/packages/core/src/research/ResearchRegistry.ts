/**
 * ResearchRegistry - Central registry for research definitions
 *
 * Manages the tech tree structure and research project definitions.
 * Supports both predefined research (loaded at startup) and
 * procedurally generated research (created by agents during gameplay).
 *
 * Part of Phase 13: Research & Discovery
 */

import type {
  ResearchDefinition,
  ResearchField,
  TechTreeNode,
  ResearchValidationResult,
} from './types.js';

/**
 * Error thrown when attempting to register a research with duplicate ID.
 */
export class DuplicateResearchError extends Error {
  constructor(researchId: string) {
    super(`Research with ID '${researchId}' is already registered`);
    this.name = 'DuplicateResearchError';
  }
}

/**
 * Error thrown when a research ID is not found.
 */
export class ResearchNotFoundError extends Error {
  constructor(researchId: string) {
    super(`Research with ID '${researchId}' not found`);
    this.name = 'ResearchNotFoundError';
  }
}

/**
 * Error thrown when research has invalid prerequisites.
 */
export class InvalidPrerequisiteError extends Error {
  constructor(researchId: string, prereqId: string) {
    super(`Research '${researchId}' has invalid prerequisite '${prereqId}'`);
    this.name = 'InvalidPrerequisiteError';
  }
}

/**
 * Error thrown when generated research fails validation.
 */
export class InvalidGeneratedResearchError extends Error {
  constructor(researchId: string, errors: string[]) {
    super(`Generated research '${researchId}' failed validation: ${errors.join(', ')}`);
    this.name = 'InvalidGeneratedResearchError';
  }
}

/**
 * Central registry for all research definitions.
 * Singleton pattern matching ItemRegistry.
 */
export class ResearchRegistry {
  private static instance: ResearchRegistry | null = null;
  private research: Map<string, ResearchDefinition> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  static getInstance(): ResearchRegistry {
    if (!ResearchRegistry.instance) {
      ResearchRegistry.instance = new ResearchRegistry();
    }
    return ResearchRegistry.instance;
  }

  /**
   * Reset the registry (for testing).
   */
  static resetInstance(): void {
    ResearchRegistry.instance = null;
  }

  /**
   * Register a research definition.
   * @throws DuplicateResearchError if ID already exists
   */
  register(definition: ResearchDefinition): void {
    if (this.research.has(definition.id)) {
      throw new DuplicateResearchError(definition.id);
    }
    this.research.set(definition.id, definition);
  }

  /**
   * Register multiple research definitions.
   * @throws DuplicateResearchError if any ID already exists
   */
  registerAll(definitions: ResearchDefinition[]): void {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  /**
   * Register a procedurally generated research after validation.
   * @throws InvalidGeneratedResearchError if validation fails
   */
  registerGenerated(definition: ResearchDefinition, validation: ResearchValidationResult): void {
    if (!validation.valid) {
      throw new InvalidGeneratedResearchError(definition.id, validation.errors);
    }
    this.register(definition);
  }

  /**
   * Get a research definition by ID.
   * @throws ResearchNotFoundError if not found
   */
  get(id: string): ResearchDefinition {
    const research = this.research.get(id);
    if (!research) {
      throw new ResearchNotFoundError(id);
    }
    return research;
  }

  /**
   * Try to get a research definition, returning undefined if not found.
   */
  tryGet(id: string): ResearchDefinition | undefined {
    return this.research.get(id);
  }

  /**
   * Check if a research ID exists.
   */
  has(id: string): boolean {
    return this.research.has(id);
  }

  /**
   * Get all research in a specific field.
   */
  getByField(field: ResearchField): ResearchDefinition[] {
    return Array.from(this.research.values()).filter((r) => r.field === field);
  }

  /**
   * Get all research at a specific tier.
   */
  getByTier(tier: number): ResearchDefinition[] {
    return Array.from(this.research.values()).filter((r) => r.tier === tier);
  }

  /**
   * Get all research of a specific type.
   */
  getByType(type: 'predefined' | 'generated' | 'experimental'): ResearchDefinition[] {
    return Array.from(this.research.values()).filter((r) => r.type === type);
  }

  /**
   * Get prerequisites for a research project.
   * @throws ResearchNotFoundError if research or any prerequisite not found
   */
  getPrerequisitesFor(id: string): ResearchDefinition[] {
    const research = this.get(id);
    return research.prerequisites.map((prereqId) => this.get(prereqId));
  }

  /**
   * Get all research that directly depends on the given research.
   */
  getDependentsOf(id: string): ResearchDefinition[] {
    return Array.from(this.research.values()).filter((r) =>
      r.prerequisites.includes(id)
    );
  }

  /**
   * Validate that all prerequisites exist (for integrity checking).
   * @throws InvalidPrerequisiteError if any prerequisite is missing
   */
  validatePrerequisites(): void {
    for (const research of this.research.values()) {
      for (const prereqId of research.prerequisites) {
        if (!this.research.has(prereqId)) {
          throw new InvalidPrerequisiteError(research.id, prereqId);
        }
      }
    }
  }

  /**
   * Get research that becomes available when given set is completed.
   * Returns research where all prerequisites are in completedResearch.
   */
  getNextAvailable(completedResearch: Set<string>): ResearchDefinition[] {
    return Array.from(this.research.values()).filter((research) => {
      // Skip already completed
      if (completedResearch.has(research.id)) {
        return false;
      }
      // All prerequisites must be completed
      return research.prerequisites.every((prereqId) =>
        completedResearch.has(prereqId)
      );
    });
  }

  /**
   * Build the tech tree structure for visualization.
   * Returns root nodes (research with no prerequisites).
   */
  getTechTree(): TechTreeNode[] {
    const roots = Array.from(this.research.values()).filter(
      (r) => r.prerequisites.length === 0
    );

    const buildNode = (research: ResearchDefinition, depth: number): TechTreeNode => {
      const dependents = this.getDependentsOf(research.id);
      return {
        research,
        children: dependents.map((dep) => buildNode(dep, depth + 1)),
        depth,
      };
    };

    return roots.map((r) => buildNode(r, 0));
  }

  /**
   * Get all registered research definitions.
   */
  getAll(): ResearchDefinition[] {
    return Array.from(this.research.values());
  }

  /**
   * Get count of registered research.
   */
  get size(): number {
    return this.research.size;
  }

  /**
   * Check if a research can be started given completed research.
   */
  canStart(researchId: string, completedResearch: Set<string>): boolean {
    const research = this.tryGet(researchId);
    if (!research) {
      return false;
    }
    return research.prerequisites.every((prereqId) =>
      completedResearch.has(prereqId)
    );
  }
}
