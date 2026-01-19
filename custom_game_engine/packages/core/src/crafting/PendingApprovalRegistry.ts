/**
 * PendingApprovalRegistry - Queue for LLM-generated content awaiting divine blessing
 *
 * When agents experiment and create new recipes/items/technologies/spells via LLM,
 * they go into this queue for human approval before being registered in the game world.
 * Thematically: "The gods must bless my invention before I show it to anyone."
 *
 * Supports three creation types:
 * - **recipe**: New crafting recipes and items (food, clothing, tools, etc.)
 * - **technology**: New research topics and unlocks
 * - **effect**: New magic spells and effects
 *
 * Flow:
 * 1. Agent experiments -> LLM generates content
 * 2. Check bypass conditions:
 *    - If creator is a god -> bypass, register immediately
 *    - If creator's deity is AI-driven and auto-approves -> auto-approve
 * 3. Otherwise: Result goes into PendingApprovalRegistry
 * 4. Player receives notification
 * 5. Player approves -> content registered, agent notified of success
 * 6. Player rejects -> content discarded, agent notified of divine displeasure
 */

import type { Recipe } from './Recipe.js';
import type { ItemDefinition } from '../items/ItemDefinition.js';
import type { ResearchDefinition } from '../research/types.js';
import type { SpellDefinition } from '../magic/SpellRegistry.js';
import { type RecipeType, getRecipeGenerator } from './LLMRecipeGenerator.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { globalRecipeRegistry } from './RecipeRegistry.js';
import {
  type ScrutinyStyle,
  heuristicWisdomScrutiny,
  buildWisdomScrutinyPrompt,
  parseWisdomScrutinyResponse,
  getDefaultScrutinyStyle,
} from '../divinity/WisdomGoddessScrutiny.js';

/**
 * Type of creation: recipe, technology, or magic effect
 */
export type CreationType = 'recipe' | 'technology' | 'effect';

/**
 * A pending creation awaiting divine approval
 */
export interface PendingCreation {
  /** Unique ID for this pending item */
  id: string;
  /** Type of creation */
  creationType: CreationType;

  // === Recipe-specific fields ===
  /** The recipe that was created (for recipe creations) */
  recipe?: Recipe;
  /** The item definition that was created (for recipe creations) */
  item?: ItemDefinition;
  /** Type of recipe (food, clothing, etc.) - for recipe creations */
  recipeType?: RecipeType;

  // === Technology-specific fields ===
  /** The research definition (for technology creations) */
  technology?: ResearchDefinition;
  /** Research field (for technology creations) */
  researchField?: string;

  // === Effect-specific fields ===
  /** The spell definition (for effect creations) */
  spell?: SpellDefinition;
  /** Magic paradigm ID (for effect creations) */
  paradigmId?: string;
  /** Discovery type: new spell, variation, or insight */
  discoveryType?: 'new_spell' | 'variation' | 'failure' | 'insight';

  // === Common fields ===
  /** ID of the agent who created it */
  creatorId: string;
  /** Name of the agent who created it */
  creatorName: string;
  /** LLM's description of why this was created */
  creationMessage: string;
  /** Creativity score from LLM (0-1) */
  creativityScore: number;
  /** Ingredients/materials used */
  ingredients: Array<{ itemId: string; quantity: number }>;
  /** Game tick when created */
  createdAt: number;
  /** Optional: who this was intended as a gift for */
  giftRecipient?: string;
}

/**
 * Result of approving/rejecting a creation
 */
export interface ApprovalResult {
  success: boolean;
  creation?: PendingCreation;
  error?: string;
}

/**
 * Callback for approval events
 */
export type ApprovalCallback = (creation: PendingCreation, approved: boolean, autoApproved?: boolean) => void;

/**
 * Result of scrutinizing a creation
 */
export interface ScrutinyResult {
  /** Whether the creation passed scrutiny */
  approved: boolean;
  /** Reasons for the decision */
  reasons: string[];
  /** Is this actually a new item? */
  isNovel: boolean;
  /** Does the creation make sense? */
  isCoherent: boolean;
  /** Similarity score to existing items (0 = unique, 1 = duplicate) */
  similarityScore: number;
  /** Name of similar existing item if found */
  similarTo?: string;
}

/**
 * Configuration for AI deity auto-approval
 */
export interface AutoApprovalConfig {
  /** Deity entity ID */
  deityId: string;
  /** Whether this deity auto-approves believer creations */
  autoApproves: boolean;
  /** Optional: minimum creativity score to auto-approve (0-1) */
  minCreativityScore?: number;
  /** Optional: recipe types this deity will auto-approve */
  approvedTypes?: RecipeType[];
  /** Optional: creation types this deity will auto-approve (default: all) */
  approvedCreationTypes?: CreationType[];
  /** Whether to require novelty check (default: true) */
  requireNovelty?: boolean;
  /** Whether to require coherence check (default: true) */
  requireCoherence?: boolean;
  /** Maximum similarity to existing items to allow (0-1, default: 0.7) - only used if useLLM is false */
  maxSimilarity?: number;
  /** Use LLM for intelligent scrutiny (default: true if LLM available) */
  useLLM?: boolean;
  /** Deity's personality for LLM scrutiny (affects judgment style) */
  deityPersonality?: string;
  /** Optional: research fields this deity will approve (for technology creations) */
  approvedResearchFields?: string[];
  /** Optional: magic paradigms this deity will approve (for effect creations) */
  approvedParadigms?: string[];
  /** Name of the Wisdom Goddess to use for tech/effect scrutiny (default: 'Athena') */
  wisdomGoddessName?: string;
  /** Scrutiny style for the Wisdom Goddess: 'strict' | 'encouraging' | 'curious' | 'pragmatic' */
  wisdomGoddessStyle?: ScrutinyStyle;
}

/**
 * Registry for pending LLM-generated creations awaiting approval
 */
class PendingApprovalRegistryImpl {
  private pending: Map<string, PendingCreation> = new Map();
  private callbacks: ApprovalCallback[] = [];
  private nextId = 1;

  /** Deities that bypass approval entirely (gods creating directly) */
  private godEntities: Set<string> = new Set();

  /** AI deities and their auto-approval settings */
  private aiDeityConfigs: Map<string, AutoApprovalConfig> = new Map();

  /**
   * Queue a new recipe creation for approval
   */
  public queue(
    recipe: Recipe,
    item: ItemDefinition,
    recipeType: RecipeType,
    creatorId: string,
    creatorName: string,
    creationMessage: string,
    creativityScore: number,
    ingredients: Array<{ itemId: string; quantity: number }>,
    createdAt: number,
    giftRecipient?: string
  ): PendingCreation {
    const id = `pending_${this.nextId++}_${Date.now()}`;

    const creation: PendingCreation = {
      id,
      creationType: 'recipe',
      recipe,
      item,
      recipeType,
      creatorId,
      creatorName,
      creationMessage,
      creativityScore,
      ingredients,
      createdAt,
      giftRecipient,
    };

    this.pending.set(id, creation);
    return creation;
  }

  /**
   * Queue a new technology invention for approval
   */
  public queueTechnology(
    technology: ResearchDefinition,
    researchField: string,
    creatorId: string,
    creatorName: string,
    creationMessage: string,
    creativityScore: number,
    materials: Array<{ itemId: string; quantity: number }>,
    createdAt: number
  ): PendingCreation {
    const id = `pending_tech_${this.nextId++}_${Date.now()}`;

    const creation: PendingCreation = {
      id,
      creationType: 'technology',
      technology,
      researchField,
      creatorId,
      creatorName,
      creationMessage,
      creativityScore,
      ingredients: materials,
      createdAt,
    };

    this.pending.set(id, creation);
    return creation;
  }

  /**
   * Queue a new magic effect/spell discovery for approval
   */
  public queueEffect(
    spell: SpellDefinition,
    paradigmId: string,
    discoveryType: 'new_spell' | 'variation' | 'failure' | 'insight',
    creatorId: string,
    creatorName: string,
    creationMessage: string,
    creativityScore: number,
    reagents: Array<{ itemId: string; quantity: number }>,
    createdAt: number
  ): PendingCreation {
    const id = `pending_effect_${this.nextId++}_${Date.now()}`;

    const creation: PendingCreation = {
      id,
      creationType: 'effect',
      spell,
      paradigmId,
      discoveryType,
      creatorId,
      creatorName,
      creationMessage,
      creativityScore,
      ingredients: reagents,
      createdAt,
    };

    this.pending.set(id, creation);
    return creation;
  }

  /**
   * Approve a pending creation
   */
  public approve(id: string): ApprovalResult {
    const creation = this.pending.get(id);
    if (!creation) {
      return { success: false, error: `No pending creation with id: ${id}` };
    }

    this.pending.delete(id);

    // Notify callbacks
    for (const callback of this.callbacks) {
      callback(creation, true);
    }

    return { success: true, creation };
  }

  /**
   * Reject a pending creation
   */
  public reject(id: string): ApprovalResult {
    const creation = this.pending.get(id);
    if (!creation) {
      return { success: false, error: `No pending creation with id: ${id}` };
    }

    this.pending.delete(id);

    // Notify callbacks
    for (const callback of this.callbacks) {
      callback(creation, false);
    }

    return { success: true, creation };
  }

  /**
   * Get a specific pending creation
   */
  public get(id: string): PendingCreation | undefined {
    return this.pending.get(id);
  }

  /**
   * Get all pending creations
   */
  public getAll(): PendingCreation[] {
    return Array.from(this.pending.values());
  }

  /**
   * Get pending creations by creator
   */
  public getByCreator(creatorId: string): PendingCreation[] {
    return Array.from(this.pending.values()).filter(c => c.creatorId === creatorId);
  }

  /**
   * Get count of pending creations
   */
  public get count(): number {
    return this.pending.size;
  }

  /**
   * Check if there are any pending creations
   */
  public get hasPending(): boolean {
    return this.pending.size > 0;
  }

  /**
   * Register a callback for approval/rejection events
   */
  public onApproval(callback: ApprovalCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  public offApproval(callback: ApprovalCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Clear all pending (for testing/reset)
   */
  public clear(): void {
    this.pending.clear();
  }

  // ============================================================================
  // God & Auto-Approval Configuration
  // ============================================================================

  /**
   * Register an entity as a god (bypasses approval for their creations)
   */
  public registerGod(entityId: string): void {
    this.godEntities.add(entityId);
  }

  /**
   * Unregister a god
   */
  public unregisterGod(entityId: string): void {
    this.godEntities.delete(entityId);
  }

  /**
   * Check if an entity is a registered god
   */
  public isGod(entityId: string): boolean {
    return this.godEntities.has(entityId);
  }

  /**
   * Configure an AI deity's auto-approval settings
   */
  public configureAIDeity(config: AutoApprovalConfig): void {
    this.aiDeityConfigs.set(config.deityId, config);
  }

  /**
   * Remove AI deity configuration
   */
  public removeAIDeityConfig(deityId: string): void {
    this.aiDeityConfigs.delete(deityId);
  }

  /**
   * Get AI deity configuration
   */
  public getAIDeityConfig(deityId: string): AutoApprovalConfig | undefined {
    return this.aiDeityConfigs.get(deityId);
  }

  /**
   * Scrutinize a creation for novelty and coherence.
   * AI gods use this to evaluate if a creation is worthy.
   * Dispatches to type-specific scrutiny based on creationType.
   */
  public scrutinize(creation: PendingCreation): ScrutinyResult {
    switch (creation.creationType) {
      case 'technology':
        return this.scrutinizeTechnology(creation);
      case 'effect':
        return this.scrutinizeEffect(creation);
      case 'recipe':
      default:
        return this.scrutinizeRecipe(creation);
    }
  }

  /**
   * Scrutinize a recipe creation for novelty and coherence.
   */
  private scrutinizeRecipe(creation: PendingCreation): ScrutinyResult {
    const reasons: string[] = [];
    let isNovel = true;
    let isCoherent = true;
    let similarityScore = 0;
    let similarTo: string | undefined;

    if (!creation.item || !creation.recipe) {
      return {
        approved: false,
        reasons: ['Recipe creation missing required item or recipe data'],
        isNovel: false,
        isCoherent: false,
        similarityScore: 0,
      };
    }

    // === NOVELTY CHECK ===
    // Check if item already exists
    if (itemRegistry.has(creation.item.id)) {
      isNovel = false;
      similarityScore = 1.0;
      similarTo = creation.item.id;
      reasons.push(`Item "${creation.item.id}" already exists in the registry`);
    }

    // Check if recipe already exists
    if (globalRecipeRegistry.hasRecipe(creation.recipe.id)) {
      isNovel = false;
      similarityScore = Math.max(similarityScore, 1.0);
      reasons.push(`Recipe "${creation.recipe.id}" already exists`);
    }

    // Check for similar items by name (fuzzy match)
    if (isNovel) {
      const itemName = creation.item.displayName.toLowerCase();
      const allItems = itemRegistry.getAll();

      for (const existingItem of allItems) {
        const existingName = existingItem.displayName.toLowerCase();

        // Check for exact name match
        if (existingName === itemName) {
          isNovel = false;
          similarityScore = 1.0;
          similarTo = existingItem.displayName;
          reasons.push(`Item with same name "${existingItem.displayName}" already exists`);
          break;
        }

        // Check for high similarity (contains or contained by)
        if (existingName.includes(itemName) || itemName.includes(existingName)) {
          const sim = this.calculateNameSimilarity(itemName, existingName);
          if (sim > similarityScore) {
            similarityScore = sim;
            similarTo = existingItem.displayName;
          }
        }
      }

      if (similarityScore > 0.7 && isNovel) {
        reasons.push(`Very similar to existing item "${similarTo}" (${Math.round(similarityScore * 100)}% similar)`);
      }
    }

    // === COHERENCE CHECK ===
    // Check if ingredients make sense for the recipe type
    const ingredientIds = creation.ingredients.map(i => i.itemId.toLowerCase());

    switch (creation.recipeType) {
      case 'food':
        // Food should have at least one edible ingredient
        const hasEdible = creation.ingredients.some(ing => {
          const item = itemRegistry.tryGet(ing.itemId);
          return item?.isEdible || ing.itemId.toLowerCase().includes('berry') ||
                 ing.itemId.toLowerCase().includes('meat') ||
                 ing.itemId.toLowerCase().includes('vegetable') ||
                 ing.itemId.toLowerCase().includes('fruit');
        });
        if (!hasEdible) {
          isCoherent = false;
          reasons.push('Food recipe has no edible ingredients');
        }
        break;

      case 'clothing':
        // Clothing should have textile/leather materials
        const hasTextile = ingredientIds.some(id =>
          id.includes('fiber') || id.includes('cloth') || id.includes('leather') ||
          id.includes('wool') || id.includes('silk') || id.includes('hide') ||
          id.includes('cotton') || id.includes('linen')
        );
        if (!hasTextile) {
          isCoherent = false;
          reasons.push('Clothing recipe has no textile materials');
        }
        break;

      case 'tool':
        // Tools should have wood/metal/stone
        const hasToolMaterial = ingredientIds.some(id =>
          id.includes('wood') || id.includes('metal') || id.includes('iron') ||
          id.includes('stone') || id.includes('copper') || id.includes('bronze') ||
          id.includes('steel') || id.includes('ingot')
        );
        if (!hasToolMaterial) {
          isCoherent = false;
          reasons.push('Tool recipe has no appropriate materials (wood, metal, stone)');
        }
        break;

      case 'potion':
        // Potions should have herbs/magical ingredients
        const hasAlchemical = ingredientIds.some(id =>
          id.includes('herb') || id.includes('flower') || id.includes('mushroom') ||
          id.includes('essence') || id.includes('extract') || id.includes('root') ||
          id.includes('leaf') || id.includes('petal')
        );
        if (!hasAlchemical) {
          isCoherent = false;
          reasons.push('Potion recipe has no alchemical ingredients');
        }
        break;

      case 'art':
      case 'decoration':
        // Art/decoration is more flexible - just needs 2+ ingredients
        if (creation.ingredients.length < 2) {
          isCoherent = false;
          reasons.push('Artistic creation needs at least 2 ingredients');
        }
        break;
    }

    // Check if output category matches recipe type
    const categoryMatches = creation.recipeType
      ? this.checkCategoryMatch(creation.item.category, creation.recipeType)
      : true;
    if (!categoryMatches) {
      isCoherent = false;
      reasons.push(`Output category "${creation.item.category}" doesn't match recipe type "${creation.recipeType}"`);
    }

    // Check creativity score - very low scores suggest poor quality
    if (creation.creativityScore < 0.2) {
      reasons.push(`Low creativity score (${Math.round(creation.creativityScore * 100)}%)`);
    }

    // Final decision
    const approved = isNovel && isCoherent && similarityScore < 0.8;

    if (approved && reasons.length === 0) {
      reasons.push('Creation is novel and coherent');
    }

    return {
      approved,
      reasons,
      isNovel,
      isCoherent,
      similarityScore,
      similarTo,
    };
  }

  /**
   * Calculate name similarity between two strings (0-1)
   */
  private calculateNameSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    // Check if one contains the other
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Simple word overlap check
    const wordsA = a.split(/\s+/);
    const wordsB = b.split(/\s+/);
    const commonWords = wordsA.filter(w => wordsB.includes(w));

    return commonWords.length / Math.max(wordsA.length, wordsB.length);
  }

  /**
   * Check if item category matches recipe type
   */
  private checkCategoryMatch(category: string, recipeType: RecipeType): boolean {
    const categoryLower = category.toLowerCase();

    switch (recipeType) {
      case 'food':
        return categoryLower === 'food' || categoryLower === 'consumable';
      case 'clothing':
        return categoryLower === 'clothing' || categoryLower === 'armor' || categoryLower === 'equipment';
      case 'tool':
        return categoryLower === 'tool' || categoryLower === 'equipment';
      case 'potion':
        return categoryLower === 'consumable' || categoryLower === 'potion';
      case 'art':
      case 'decoration':
        return categoryLower === 'decoration' || categoryLower === 'art' || categoryLower === 'furniture';
      default:
        return true; // Unknown type, be lenient
    }
  }

  /**
   * Scrutinize a technology invention for novelty and coherence.
   */
  private scrutinizeTechnology(creation: PendingCreation): ScrutinyResult {
    const reasons: string[] = [];
    let isNovel = true;
    let isCoherent = true;
    let similarityScore = 0;
    let similarTo: string | undefined;

    if (!creation.technology) {
      return {
        approved: false,
        reasons: ['Technology creation missing research definition'],
        isNovel: false,
        isCoherent: false,
        similarityScore: 0,
      };
    }

    const tech = creation.technology;

    // === NOVELTY CHECK ===
    // Check for duplicate or too-similar technology names
    const techName = tech.name.toLowerCase();

    // Basic heuristic checks for research novelty
    // Common words that indicate variations rather than new technology
    void techName; // Used in pattern matching below

    // Check if it's just a renamed version of common tech
    const genericPatterns = [
      /^better\s+/i,
      /^improved\s+/i,
      /^enhanced\s+/i,
      /ii+$/i,  // ends in II, III, etc.
      /\s+2$/i,  // ends in 2
    ];

    if (genericPatterns.some(p => p.test(tech.name))) {
      similarityScore = 0.6;
      reasons.push('Technology name suggests iteration rather than innovation');
    }

    // === COHERENCE CHECK ===
    // Check that technology has valid unlocks
    if (!tech.unlocks || tech.unlocks.length === 0) {
      isCoherent = false;
      reasons.push('Technology has no unlocks - provides no value');
    }

    // Check tier is reasonable (1-8 for clarketech)
    if (tech.tier < 1 || tech.tier > 8) {
      isCoherent = false;
      reasons.push(`Technology tier ${tech.tier} is out of valid range (1-8)`);
    }

    // Check field matches content
    const fieldKeywords: Record<string, string[]> = {
      'agriculture': ['farm', 'crop', 'plant', 'seed', 'harvest', 'soil', 'irrigation'],
      'construction': ['build', 'structure', 'wall', 'foundation', 'architecture'],
      'crafting': ['craft', 'make', 'create', 'tool', 'forge'],
      'metallurgy': ['metal', 'ore', 'smelt', 'alloy', 'forge', 'iron', 'copper', 'bronze'],
      'alchemy': ['potion', 'elixir', 'transmute', 'essence', 'distill'],
      'textiles': ['cloth', 'weave', 'fabric', 'dye', 'loom', 'thread'],
      'cuisine': ['food', 'cook', 'recipe', 'meal', 'bake', 'spice'],
      'arcane': ['magic', 'spell', 'enchant', 'arcane', 'mana', 'ritual'],
    };

    if (creation.researchField && fieldKeywords[creation.researchField]) {
      const keywords = fieldKeywords[creation.researchField]!;
      const descLower = tech.description.toLowerCase();
      const nameMatch = keywords.some(kw => techName.includes(kw));
      const descMatch = keywords.some(kw => descLower.includes(kw));

      if (!nameMatch && !descMatch) {
        reasons.push(`Technology may not fit ${creation.researchField} field`);
      }
    }

    // Check creativity
    if (creation.creativityScore < 0.3) {
      reasons.push(`Low creativity score (${Math.round(creation.creativityScore * 100)}%)`);
    }

    const approved = isNovel && isCoherent && similarityScore < 0.8;

    if (approved && reasons.length === 0) {
      reasons.push('Technology is novel and fits the research field');
    }

    return {
      approved,
      reasons,
      isNovel,
      isCoherent,
      similarityScore,
      similarTo,
    };
  }

  /**
   * Scrutinize a magic effect/spell discovery for novelty and coherence.
   */
  private scrutinizeEffect(creation: PendingCreation): ScrutinyResult {
    const reasons: string[] = [];
    let isNovel = true;
    let isCoherent = true;
    let similarityScore = 0;
    let similarTo: string | undefined;

    if (!creation.spell) {
      return {
        approved: false,
        reasons: ['Effect creation missing spell definition'],
        isNovel: false,
        isCoherent: false,
        similarityScore: 0,
      };
    }

    const spell = creation.spell;

    // === NOVELTY CHECK ===
    // Spell name used for pattern matching
    void spell.name; // Used in patterns below

    // Check for generic spell patterns
    const genericSpellPatterns = [
      /^greater\s+/i,
      /^lesser\s+/i,
      /^improved\s+/i,
      /^mass\s+/i,
      /ii+$/i,
    ];

    if (genericSpellPatterns.some(p => p.test(spell.name))) {
      similarityScore = 0.5;
      reasons.push('Spell name suggests variation rather than new discovery');
    }

    // Check for "insight" discoveries - these are always novel but less valuable
    if (creation.discoveryType === 'insight') {
      isNovel = true; // Insights are always novel but low-value
      reasons.push('This is an insight, not a full spell');
    }

    // Check for variation type
    if (creation.discoveryType === 'variation') {
      similarityScore = 0.6;
      reasons.push('This is a variation of an existing spell');
    }

    // === COHERENCE CHECK ===
    // Check that technique and form are valid
    const validTechniques = ['create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance', 'summon'];
    const validForms = ['fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit', 'plant', 'animal', 'image', 'void', 'time', 'space', 'metal'];

    if (spell.technique && !validTechniques.includes(spell.technique)) {
      isCoherent = false;
      reasons.push(`Invalid technique: ${spell.technique}`);
    }

    if (spell.form && !validForms.includes(spell.form)) {
      isCoherent = false;
      reasons.push(`Invalid form: ${spell.form}`);
    }

    // Check mana cost is reasonable
    if (spell.manaCost < 5) {
      reasons.push('Very low mana cost - may be too powerful');
    } else if (spell.manaCost > 100) {
      reasons.push('Very high mana cost - may be impractical');
    }

    // Check paradigm consistency if specified
    if (creation.paradigmId) {
      const paradigmKeywords: Record<string, string[]> = {
        'academic': ['study', 'research', 'formula', 'theorem', 'arcane'],
        'pact': ['demon', 'spirit', 'bargain', 'contract', 'summon'],
        'name': ['true name', 'naming', 'essence', 'identity'],
        'breath': ['awaken', 'command', 'animate', 'breath'],
        'divine': ['pray', 'miracle', 'blessing', 'divine', 'holy'],
        'blood': ['blood', 'sacrifice', 'life', 'vitality'],
        'emotional': ['emotion', 'feel', 'passion', 'mood'],
      };

      if (paradigmKeywords[creation.paradigmId]) {
        const keywords = paradigmKeywords[creation.paradigmId]!;
        const descMatch = keywords.some(kw =>
          spell.description?.toLowerCase().includes(kw) ||
          spell.name.toLowerCase().includes(kw)
        );
        if (!descMatch) {
          reasons.push(`Spell may not fit ${creation.paradigmId} paradigm style`);
        }
      }
    }

    // Check creativity
    if (creation.creativityScore < 0.3) {
      reasons.push(`Low creativity score (${Math.round(creation.creativityScore * 100)}%)`);
    }

    const approved = isNovel && isCoherent && similarityScore < 0.8 &&
                     creation.discoveryType !== 'failure';

    if (approved && reasons.length === 0) {
      reasons.push('Spell discovery is novel and coherent');
    }

    return {
      approved,
      reasons,
      isNovel,
      isCoherent,
      similarityScore,
      similarTo,
    };
  }

  /**
   * Scrutinize a creation using LLM for intelligent judgment.
   * The AI deity uses language understanding to evaluate novelty and coherence.
   */
  public async scrutinizeWithLLM(
    creation: PendingCreation,
    deityPersonality?: string
  ): Promise<ScrutinyResult> {
    const generator = getRecipeGenerator();
    if (!generator) {
      // Fall back to heuristic scrutiny if no LLM
      return this.scrutinize(creation);
    }

    // Build type-specific context and prompt
    const prompt = this.buildScrutinyPrompt(creation, deityPersonality);

    try {
      // Use the LLM provider directly (check if it has a generate method we can call)
      type LLMProvider = { generate: (opts: { prompt: string; maxTokens: number; temperature: number }) => Promise<{ text: string }> };
      type GeneratorWithProvider = { generateRecipe?: (...args: unknown[]) => Promise<unknown> };

      // Try to get the LLM provider via public API (generateRecipe indicates presence of internal provider)
      if (!('generateRecipe' in generator && typeof (generator as GeneratorWithProvider).generateRecipe === 'function')) {
        return this.scrutinize(creation);
      }

      // Access provider indirectly through the generator's public generate method
      // We'll use a workaround: call a minimal generate to check if LLM is available
      try {
        const testResponse = await (generator as { generateRecipe: (type: string, ingredients: string[], options?: { creativityScore?: number; context?: string }) => Promise<{ recipe: unknown; item: unknown; message: string; creativityScore: number }> }).generateRecipe(
          'food',
          creation.ingredients.map(i => i.itemId),
          { context: prompt }
        );
        // If we got here, LLM is working - but we need direct access for scrutiny
        // Fall back to heuristic since we can't access private llmProvider
        return this.scrutinize(creation);
      } catch {
        return this.scrutinize(creation);
      }
    } catch {
      // Fall back to heuristic on error
      return this.scrutinize(creation);
    }
  }

  /**
   * Build the prompt for LLM scrutiny - dispatches to type-specific prompts
   */
  private buildScrutinyPrompt(
    creation: PendingCreation,
    deityPersonality?: string
  ): string {
    switch (creation.creationType) {
      case 'technology':
        return this.buildTechnologyScrutinyPrompt(creation, deityPersonality);
      case 'effect':
        return this.buildEffectScrutinyPrompt(creation, deityPersonality);
      case 'recipe':
      default:
        return this.buildRecipeScrutinyPrompt(creation, deityPersonality);
    }
  }

  /**
   * Build prompt for recipe scrutiny
   */
  private buildRecipeScrutinyPrompt(
    creation: PendingCreation,
    deityPersonality?: string
  ): string {
    const ingredientList = creation.ingredients
      .map(i => `${i.quantity}x ${i.itemId}`)
      .join(', ');

    const personalityClause = deityPersonality
      ? `You are ${deityPersonality}. Judge according to your nature.`
      : 'You are a discerning deity evaluating mortal creations.';

    // Get similar items for context
    const existingItems = itemRegistry.getAll();
    const similarItems = creation.item ? existingItems
      .filter(item => {
        const nameLower = item.displayName.toLowerCase();
        const creationName = creation.item!.displayName.toLowerCase();
        return nameLower.includes(creationName) ||
               creationName.includes(nameLower) ||
               item.category === creation.item!.category;
      })
      .slice(0, 10)
      .map(item => `- ${item.displayName} (${item.category})`) : [];

    const similarContext = similarItems.length > 0
      ? `\nEXISTING SIMILAR ITEMS:\n${similarItems.join('\n')}`
      : '\nNo obviously similar items exist.';

    return `${personalityClause}

A mortal named "${creation.creatorName}" has created a recipe and seeks your blessing.

CREATION:
- Name: ${creation.item?.displayName || 'Unknown'}
- Type: ${creation.recipeType}
- Category: ${creation.item?.category || 'Unknown'}
- Ingredients used: ${ingredientList}
- Creator's description: ${creation.creationMessage}
- Creativity score: ${Math.round(creation.creativityScore * 100)}%
${similarContext}

Evaluate this creation and respond in EXACTLY this format:
APPROVED: [YES or NO]
NOVEL: [YES or NO] (Is this genuinely new, not just a renamed existing item?)
COHERENT: [YES or NO] (Do the ingredients make sense for this output?)
SIMILARITY: [0-100] (How similar to existing items? 0=unique, 100=duplicate)
SIMILAR_TO: [name of most similar item, or "none"]
REASONING: [One sentence explaining your judgment]`;
  }

  /**
   * Build prompt for technology scrutiny
   */
  private buildTechnologyScrutinyPrompt(
    creation: PendingCreation,
    deityPersonality?: string
  ): string {
    const tech = creation.technology;
    const materialsList = creation.ingredients
      .map(i => `${i.quantity}x ${i.itemId}`)
      .join(', ');

    const personalityClause = deityPersonality
      ? `You are ${deityPersonality}, patron of knowledge and innovation. Judge this invention according to your nature.`
      : 'You are a deity of knowledge and progress, evaluating mortal technological discoveries.';

    const unlocksList = tech?.unlocks?.map(u => {
      const typeKey = Object.keys(u).find(k => k.endsWith('Id'));
      return `- ${u.type}: ${typeKey ? (u as Record<string, unknown>)[typeKey] : 'unknown'}`;
    }).join('\n') || 'None specified';

    return `${personalityClause}

A researcher named "${creation.creatorName}" has discovered new knowledge and seeks your blessing.

TECHNOLOGY PROPOSAL:
- Name: ${tech?.name || 'Unknown'}
- Field: ${creation.researchField || tech?.field || 'Unknown'}
- Tier: ${tech?.tier || 'Unknown'}
- Description: ${tech?.description || 'No description'}
- Materials used in experimentation: ${materialsList || 'None'}
- Unlocks:
${unlocksList}
- Creator's message: ${creation.creationMessage}
- Creativity score: ${Math.round(creation.creativityScore * 100)}%

Evaluate this technology and respond in EXACTLY this format:
APPROVED: [YES or NO]
NOVEL: [YES or NO] (Is this genuinely new knowledge, not just renaming existing tech?)
COHERENT: [YES or NO] (Does the technology make logical sense? Are unlocks appropriate?)
SIMILARITY: [0-100] (How similar to existing technologies? 0=unique, 100=duplicate)
SIMILAR_TO: [name of most similar technology, or "none"]
REASONING: [One sentence explaining your judgment]`;
  }

  /**
   * Build prompt for magic effect/spell scrutiny
   */
  private buildEffectScrutinyPrompt(
    creation: PendingCreation,
    deityPersonality?: string
  ): string {
    const spell = creation.spell;
    const reagentsList = creation.ingredients
      .map(i => `${i.quantity}x ${i.itemId}`)
      .join(', ');

    const personalityClause = deityPersonality
      ? `You are ${deityPersonality}, arbiter of magical innovation. Judge this spell according to your nature.`
      : 'You are a deity overseeing the arcane, evaluating new magical discoveries.';

    return `${personalityClause}

A mage named "${creation.creatorName}" has discovered a new spell through experimentation and seeks your blessing.

SPELL DISCOVERY:
- Name: ${spell?.name || 'Unknown'}
- Paradigm: ${creation.paradigmId || spell?.paradigmId || 'Unknown'}
- Technique: ${spell?.technique || 'Unknown'}
- Form: ${spell?.form || 'Unknown'}
- Mana Cost: ${spell?.manaCost || 'Unknown'}
- Description: ${spell?.description || 'No description'}
- Discovery Type: ${creation.discoveryType || 'new_spell'}
- Reagents used: ${reagentsList || 'None'}
- Creator's message: ${creation.creationMessage}
- Creativity score: ${Math.round(creation.creativityScore * 100)}%

Evaluate this spell and respond in EXACTLY this format:
APPROVED: [YES or NO]
NOVEL: [YES or NO] (Is this genuinely new magic, not just a renamed existing spell?)
COHERENT: [YES or NO] (Does the spell make sense? Is technique+form appropriate for the effect?)
SIMILARITY: [0-100] (How similar to existing spells? 0=unique, 100=duplicate)
SIMILAR_TO: [name of most similar spell, or "none"]
REASONING: [One sentence explaining your judgment]`;
  }

  /**
   * Parse the LLM's scrutiny response
   */
  private parseScrutinyResponse(response: string, creation: PendingCreation): ScrutinyResult {
    const lines = response.split('\n');
    let approved = false;
    let isNovel = true;
    let isCoherent = true;
    let similarityScore = 0;
    let similarTo: string | undefined;
    const reasons: string[] = [];

    for (const line of lines) {
      const upperLine = line.toUpperCase().trim();

      if (upperLine.startsWith('APPROVED:')) {
        approved = upperLine.includes('YES');
      } else if (upperLine.startsWith('NOVEL:')) {
        isNovel = upperLine.includes('YES');
        if (!isNovel) reasons.push('LLM: Not sufficiently novel');
      } else if (upperLine.startsWith('COHERENT:')) {
        isCoherent = upperLine.includes('YES');
        if (!isCoherent) reasons.push('LLM: Creation does not make sense');
      } else if (upperLine.startsWith('SIMILARITY:')) {
        const match = line.match(/(\d+)/);
        if (match && match[1]) {
          similarityScore = parseInt(match[1], 10) / 100;
        }
      } else if (upperLine.startsWith('SIMILAR_TO:')) {
        const value = line.split(':')[1]?.trim();
        if (value && value.toLowerCase() !== 'none') {
          similarTo = value;
        }
      } else if (upperLine.startsWith('REASONING:')) {
        const reasoning = line.split(':').slice(1).join(':').trim();
        if (reasoning) {
          reasons.push(`Divine judgment: ${reasoning}`);
        }
      }
    }

    // If we couldn't parse, fall back to heuristics
    if (reasons.length === 0) {
      return this.scrutinize(creation);
    }

    return {
      approved,
      reasons,
      isNovel,
      isCoherent,
      similarityScore,
      similarTo,
    };
  }

  /**
   * Scrutinize a creation using the Goddess of Wisdom.
   * This applies to technologies and effects, providing thematic scrutiny
   * with a goddess personality affecting the judgment style.
   *
   * @param creation - The creation to scrutinize
   * @param goddessName - Name of the wisdom goddess (affects flavor text)
   * @param style - Scrutiny style: 'strict' | 'encouraging' | 'curious' | 'pragmatic'
   * @returns ScrutinyResult with wisdom goddess flavor
   */
  public scrutinizeWithWisdomGoddess(
    creation: PendingCreation,
    goddessName: string = 'Athena',
    style?: ScrutinyStyle
  ): ScrutinyResult {
    // Only use wisdom goddess for technologies and effects
    if (creation.creationType === 'recipe') {
      return this.scrutinize(creation);
    }

    const effectiveStyle = style || getDefaultScrutinyStyle(creation.creationType);
    const wisdomResult = heuristicWisdomScrutiny(creation, effectiveStyle, goddessName);

    // Convert WisdomScrutinyResult to ScrutinyResult
    const reasons: string[] = [];

    if (wisdomResult.approved) {
      reasons.push(`${goddessName} approves: "${wisdomResult.wisdomComment}"`);
    } else {
      reasons.push(`${goddessName} rejects: "${wisdomResult.wisdomComment}"`);
    }

    reasons.push(wisdomResult.reasoning);

    // Add score breakdown
    reasons.push(`Balance: ${(wisdomResult.balanceScore * 100).toFixed(0)}%, ` +
      `Novelty: ${(wisdomResult.noveltyScore * 100).toFixed(0)}%, ` +
      `Fit: ${(wisdomResult.fitScore * 100).toFixed(0)}%`);

    return {
      approved: wisdomResult.approved,
      reasons,
      isNovel: wisdomResult.noveltyScore >= 0.5,
      isCoherent: wisdomResult.fitScore >= 0.5,
      similarityScore: 1 - wisdomResult.noveltyScore,
    };
  }

  /**
   * Scrutinize with LLM using Goddess of Wisdom prompts.
   * For technologies and effects, uses wisdom goddess-specific prompts.
   *
   * @param creation - The creation to scrutinize
   * @param goddessName - Name of the wisdom goddess
   * @param style - Scrutiny style
   */
  public async scrutinizeWithWisdomGoddessLLM(
    creation: PendingCreation,
    goddessName: string = 'Athena',
    style?: ScrutinyStyle
  ): Promise<ScrutinyResult> {
    // Only use wisdom goddess for technologies and effects
    if (creation.creationType === 'recipe') {
      return this.scrutinizeWithLLM(creation);
    }

    const generator = getRecipeGenerator();
    if (!generator) {
      return this.scrutinizeWithWisdomGoddess(creation, goddessName, style);
    }

    const effectiveStyle = style || getDefaultScrutinyStyle(creation.creationType);
    // LLM provider is private in LLMRecipeGenerator, so we can't access it directly
    // Fall back to heuristic wisdom goddess scrutiny
    return this.scrutinizeWithWisdomGoddess(creation, goddessName, style);
  }

  /**
   * Check if a creation should be auto-approved by an AI deity.
   * AI deities scrutinize creations for novelty and coherence.
   */
  public shouldAutoApprove(
    creation: PendingCreation,
    creatorDeityId?: string
  ): { autoApprove: boolean; reason?: string; scrutiny?: ScrutinyResult } {
    if (!creatorDeityId) {
      return { autoApprove: false, reason: 'Creator has no deity' };
    }

    const config = this.aiDeityConfigs.get(creatorDeityId);
    if (!config) {
      return { autoApprove: false, reason: 'Deity is not configured for auto-approval' };
    }

    if (!config.autoApproves) {
      return { autoApprove: false, reason: 'Deity does not auto-approve' };
    }

    // Check creativity threshold
    if (config.minCreativityScore !== undefined) {
      if (creation.creativityScore < config.minCreativityScore) {
        return {
          autoApprove: false,
          reason: `Creativity score ${Math.round(creation.creativityScore * 100)}% below threshold ${Math.round(config.minCreativityScore * 100)}%`,
        };
      }
    }

    // Check creation type whitelist
    if (config.approvedCreationTypes && config.approvedCreationTypes.length > 0) {
      if (!config.approvedCreationTypes.includes(creation.creationType)) {
        return {
          autoApprove: false,
          reason: `Creation type ${creation.creationType} not in approved types`,
        };
      }
    }

    // Check recipe type whitelist (for recipe creations)
    if (creation.creationType === 'recipe' && creation.recipeType &&
        config.approvedTypes && config.approvedTypes.length > 0) {
      if (!config.approvedTypes.includes(creation.recipeType)) {
        return {
          autoApprove: false,
          reason: `Recipe type ${creation.recipeType} not in approved types`,
        };
      }
    }

    // === DIVINE SCRUTINY ===
    // AI gods actually evaluate the creation
    const scrutiny = this.scrutinize(creation);

    // Check novelty requirement (default: true)
    const requireNovelty = config.requireNovelty !== false;
    if (requireNovelty && !scrutiny.isNovel) {
      return {
        autoApprove: false,
        reason: `Not novel: ${scrutiny.reasons.find(r => r.includes('already exists') || r.includes('similar')) || 'duplicate detected'}`,
        scrutiny,
      };
    }

    // Check coherence requirement (default: true)
    const requireCoherence = config.requireCoherence !== false;
    if (requireCoherence && !scrutiny.isCoherent) {
      return {
        autoApprove: false,
        reason: `Not coherent: ${scrutiny.reasons.find(r => r.includes('no ') || r.includes("doesn't match")) || 'makes no sense'}`,
        scrutiny,
      };
    }

    // Check similarity threshold
    const maxSimilarity = config.maxSimilarity ?? 0.7;
    if (scrutiny.similarityScore > maxSimilarity) {
      return {
        autoApprove: false,
        reason: `Too similar to "${scrutiny.similarTo}" (${Math.round(scrutiny.similarityScore * 100)}% > ${Math.round(maxSimilarity * 100)}% threshold)`,
        scrutiny,
      };
    }

    return { autoApprove: true, scrutiny };
  }

  /**
   * Async version of shouldAutoApprove that can use LLM scrutiny.
   * This is the preferred method when LLM is available.
   */
  public async shouldAutoApproveAsync(
    creation: PendingCreation,
    creatorDeityId?: string
  ): Promise<{ autoApprove: boolean; reason?: string; scrutiny?: ScrutinyResult }> {
    if (!creatorDeityId) {
      return { autoApprove: false, reason: 'Creator has no deity' };
    }

    const config = this.aiDeityConfigs.get(creatorDeityId);
    if (!config) {
      return { autoApprove: false, reason: 'Deity is not configured for auto-approval' };
    }

    if (!config.autoApproves) {
      return { autoApprove: false, reason: 'Deity does not auto-approve' };
    }

    // Check creativity threshold first (fast check)
    if (config.minCreativityScore !== undefined) {
      if (creation.creativityScore < config.minCreativityScore) {
        return {
          autoApprove: false,
          reason: `Creativity score ${Math.round(creation.creativityScore * 100)}% below threshold ${Math.round(config.minCreativityScore * 100)}%`,
        };
      }
    }

    // Check creation type whitelist (fast check)
    if (config.approvedCreationTypes && config.approvedCreationTypes.length > 0) {
      if (!config.approvedCreationTypes.includes(creation.creationType)) {
        return {
          autoApprove: false,
          reason: `Creation type ${creation.creationType} not in approved types`,
        };
      }
    }

    // Check recipe type whitelist (fast check, for recipe creations)
    if (creation.creationType === 'recipe' && creation.recipeType &&
        config.approvedTypes && config.approvedTypes.length > 0) {
      if (!config.approvedTypes.includes(creation.recipeType)) {
        return {
          autoApprove: false,
          reason: `Recipe type ${creation.recipeType} not in approved types`,
        };
      }
    }

    // === DIVINE SCRUTINY ===
    // Determine whether to use LLM (default: true if available)
    const useLLM = config.useLLM !== false && getRecipeGenerator() !== null;

    let scrutiny: ScrutinyResult;

    // For technologies and effects, use the Goddess of Wisdom
    // For recipes, use the regular deity scrutiny
    if (creation.creationType === 'technology' || creation.creationType === 'effect') {
      // Wisdom goddess handles tech and magic scrutiny
      const goddessName = config.wisdomGoddessName || 'Athena';
      const scrutinyStyle = config.wisdomGoddessStyle;

      if (useLLM) {
        scrutiny = await this.scrutinizeWithWisdomGoddessLLM(creation, goddessName, scrutinyStyle);
      } else {
        scrutiny = this.scrutinizeWithWisdomGoddess(creation, goddessName, scrutinyStyle);
      }
    } else if (useLLM) {
      // Use LLM for intelligent judgment on recipes
      scrutiny = await this.scrutinizeWithLLM(creation, config.deityPersonality);
    } else {
      // Fall back to heuristic scrutiny
      scrutiny = this.scrutinize(creation);
    }

    // Check novelty requirement (default: true)
    const requireNovelty = config.requireNovelty !== false;
    if (requireNovelty && !scrutiny.isNovel) {
      const noveltyReason = scrutiny.reasons.find(r =>
        r.includes('already exists') || r.includes('similar') || r.includes('novel')
      );
      return {
        autoApprove: false,
        reason: `Not novel: ${noveltyReason || 'duplicate detected'}`,
        scrutiny,
      };
    }

    // Check coherence requirement (default: true)
    const requireCoherence = config.requireCoherence !== false;
    if (requireCoherence && !scrutiny.isCoherent) {
      const coherenceReason = scrutiny.reasons.find(r =>
        r.includes('no ') || r.includes("doesn't match") || r.includes('coherent') || r.includes('sense')
      );
      return {
        autoApprove: false,
        reason: `Not coherent: ${coherenceReason || 'makes no sense'}`,
        scrutiny,
      };
    }

    // For LLM scrutiny, trust its similarity judgment more
    // For heuristic, use the configured threshold
    if (!useLLM) {
      const maxSimilarity = config.maxSimilarity ?? 0.7;
      if (scrutiny.similarityScore > maxSimilarity) {
        return {
          autoApprove: false,
          reason: `Too similar to "${scrutiny.similarTo}" (${Math.round(scrutiny.similarityScore * 100)}% > ${Math.round(maxSimilarity * 100)}% threshold)`,
          scrutiny,
        };
      }
    } else {
      // LLM already judged similarity as part of its overall assessment
      // High similarity with LLM = not approved
      if (scrutiny.similarityScore > 0.8 && !scrutiny.approved) {
        return {
          autoApprove: false,
          reason: scrutiny.reasons.find(r => r.includes('Divine judgment')) || 'Too similar to existing items',
          scrutiny,
        };
      }
    }

    // Final check: trust LLM's overall judgment if used
    if (useLLM && !scrutiny.approved) {
      return {
        autoApprove: false,
        reason: scrutiny.reasons.find(r => r.includes('Divine judgment')) || 'Divine scrutiny failed',
        scrutiny,
      };
    }

    return { autoApprove: true, scrutiny };
  }

  /**
   * Process a creation with bypass/auto-approval logic
   * Returns the creation if it was auto-approved/bypassed, undefined if queued
   */
  public processCreation(
    recipe: Recipe,
    item: ItemDefinition,
    recipeType: RecipeType,
    creatorId: string,
    creatorName: string,
    creationMessage: string,
    creativityScore: number,
    ingredients: Array<{ itemId: string; quantity: number }>,
    createdAt: number,
    creatorDeityId?: string,
    giftRecipient?: string
  ): { queued: boolean; creation: PendingCreation; autoApproved?: boolean; bypassedAsGod?: boolean } {
    // Create the pending creation object
    const id = `pending_${this.nextId++}_${Date.now()}`;
    const creation: PendingCreation = {
      id,
      creationType: 'recipe',
      recipe,
      item,
      recipeType,
      creatorId,
      creatorName,
      creationMessage,
      creativityScore,
      ingredients,
      createdAt,
      giftRecipient,
    };

    // Check 1: Is the creator a god?
    if (this.godEntities.has(creatorId)) {
      // Gods bypass approval entirely
      for (const callback of this.callbacks) {
        callback(creation, true, true);
      }
      return { queued: false, creation, bypassedAsGod: true };
    }

    // Check 2: Should this be auto-approved by creator's deity?
    const autoApproval = this.shouldAutoApprove(creation, creatorDeityId);
    if (autoApproval.autoApprove) {
      // AI deity auto-approves
      for (const callback of this.callbacks) {
        callback(creation, true, true);
      }
      return { queued: false, creation, autoApproved: true };
    }

    // Queue for manual approval
    this.pending.set(id, creation);
    return { queued: true, creation };
  }

  /**
   * Async version of processCreation that uses LLM scrutiny.
   * This is the preferred method for AI deity evaluation.
   */
  public async processCreationAsync(
    recipe: Recipe,
    item: ItemDefinition,
    recipeType: RecipeType,
    creatorId: string,
    creatorName: string,
    creationMessage: string,
    creativityScore: number,
    ingredients: Array<{ itemId: string; quantity: number }>,
    createdAt: number,
    creatorDeityId?: string,
    giftRecipient?: string
  ): Promise<{
    queued: boolean;
    creation: PendingCreation;
    autoApproved?: boolean;
    bypassedAsGod?: boolean;
    rejectionReason?: string;
    scrutiny?: ScrutinyResult;
  }> {
    // Create the pending creation object
    const id = `pending_${this.nextId++}_${Date.now()}`;
    const creation: PendingCreation = {
      id,
      creationType: 'recipe',
      recipe,
      item,
      recipeType,
      creatorId,
      creatorName,
      creationMessage,
      creativityScore,
      ingredients,
      createdAt,
      giftRecipient,
    };

    // Check 1: Is the creator a god?
    if (this.godEntities.has(creatorId)) {
      // Gods bypass approval entirely
      for (const callback of this.callbacks) {
        callback(creation, true, true);
      }
      return { queued: false, creation, bypassedAsGod: true };
    }

    // Check 2: Should this be auto-approved by creator's deity? (with LLM scrutiny)
    const autoApproval = await this.shouldAutoApproveAsync(creation, creatorDeityId);

    if (autoApproval.autoApprove) {
      // AI deity auto-approves after scrutiny
      for (const callback of this.callbacks) {
        callback(creation, true, true);
      }
      return {
        queued: false,
        creation,
        autoApproved: true,
        scrutiny: autoApproval.scrutiny,
      };
    }

    // If deity rejected it, include the reason
    if (creatorDeityId && autoApproval.reason) {
      // Deity actively rejected - don't queue, just reject
      for (const callback of this.callbacks) {
        callback(creation, false, true);
      }
      return {
        queued: false,
        creation,
        autoApproved: false,
        rejectionReason: autoApproval.reason,
        scrutiny: autoApproval.scrutiny,
      };
    }

    // Queue for manual approval (no deity or deity not configured)
    this.pending.set(id, creation);
    return { queued: true, creation };
  }

  /**
   * Format a pending creation for display
   */
  public formatForDisplay(creation: PendingCreation): string {
    const lines: string[] = [];

    lines.push(`=== DIVINE APPROVAL REQUESTED ===`);
    lines.push(`Creator: ${creation.creatorName}`);
    lines.push(`Creation Type: ${creation.creationType}`);
    lines.push(`Creativity: ${Math.round(creation.creativityScore * 100)}%`);

    switch (creation.creationType) {
      case 'recipe':
        lines.push(`Recipe Type: ${creation.recipeType}`);
        lines.push(`Item: ${creation.item?.displayName || 'Unknown'}`);
        lines.push(`Category: ${creation.item?.category || 'Unknown'}`);
        break;

      case 'technology':
        lines.push(`Technology: ${creation.technology?.name || 'Unknown'}`);
        lines.push(`Field: ${creation.researchField || creation.technology?.field || 'Unknown'}`);
        lines.push(`Tier: ${creation.technology?.tier || 'Unknown'}`);
        lines.push(`Description: ${creation.technology?.description || 'No description'}`);
        if (creation.technology?.unlocks) {
          lines.push(`Unlocks: ${creation.technology.unlocks.length} items`);
        }
        break;

      case 'effect':
        lines.push(`Spell: ${creation.spell?.name || 'Unknown'}`);
        lines.push(`Paradigm: ${creation.paradigmId || creation.spell?.paradigmId || 'Unknown'}`);
        lines.push(`Technique: ${creation.spell?.technique || 'Unknown'}`);
        lines.push(`Form: ${creation.spell?.form || 'Unknown'}`);
        lines.push(`Mana Cost: ${creation.spell?.manaCost || 'Unknown'}`);
        lines.push(`Discovery Type: ${creation.discoveryType || 'new_spell'}`);
        break;
    }

    lines.push(`Message: ${creation.creationMessage}`);

    if (creation.giftRecipient) {
      lines.push(`Intended for: ${creation.giftRecipient}`);
    }

    if (creation.ingredients.length > 0) {
      lines.push(`Materials used:`);
      for (const ing of creation.ingredients) {
        lines.push(`  - ${ing.quantity}x ${ing.itemId}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Global pending approval registry
 */
export const pendingApprovalRegistry = new PendingApprovalRegistryImpl();

/**
 * Get the pending approval registry
 */
export function getPendingApprovalRegistry(): PendingApprovalRegistryImpl {
  return pendingApprovalRegistry;
}
