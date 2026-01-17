/**
 * Cook Influencer System
 *
 * Cooks publish recipes using whatever writing technology is available.
 * From oral tradition ("my grandmother's recipe...") to food blogs ("WAIT TILL THE END!").
 *
 * "The first cook who wrote down a recipe had no idea what they were starting.
 * Neither did the first food blogger, but they should have."
 *   - The Unwritten History of Culinary Documentation
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import {
  getPublicationSystem,
  type PublicationSystem,
  type RecipePublication,
  WritingTechLevel,
  getWritingTechName,
} from './PublicationSystem.js';

// ============================================================================
// COOK PUBLICATION COMPONENT
// ============================================================================

/**
 * Component tracking a cook's publication career
 */
export interface CookPublicationComponent {
  type: 'cook_publication';
  version: number;
  /** Total publications */
  publicationCount: number;
  /** Publication IDs */
  publications: string[];
  /** Follower count (for digital age) */
  followers: number;
  /** Influence score */
  culinaryInfluence: number;
  /** Signature dish */
  signatureDish?: string;
  /** Cooking style/cuisine specialization */
  cuisine?: string;
  /** Whether they have a regular publication */
  hasColumn?: boolean;
  columnName?: string;
  /** Blog name (digital age) */
  blogName?: string;
}

// ============================================================================
// HUMOROUS RECIPE CONTENT GENERATORS
// ============================================================================

/**
 * Humorous personal notes for recipe publications (Pratchett/Adams/Gaiman style)
 */
const PERSONAL_NOTE_TEMPLATES: string[] = [
  // Pratchett style
  'I learned this recipe from my grandmother, who learned it from hers, who may have invented it or may have stolen it from a rival. We don\'t talk about that.',
  'The secret ingredient is love. And a disturbing amount of butter. Mostly butter.',
  'This recipe has been in my family for generations. Some of us have even survived making it.',
  'I\'ve simplified this from the original, which required three days, a full moon, and ingredients I cannot legally name.',
  'The original recipe called for "cooking until it smells right." I\'ve attempted to be more specific, against my better judgment.',

  // Adams style
  'If you\'re reading this, you\'ve already committed to making {dish}. There\'s no backing out now. Don\'t panic.',
  'This recipe serves four, if four people share it. If one person eats it alone at 2 AM, it serves one. No judgment.',
  'The probability of this turning out exactly right is roughly one in a googolplex. It\'s still worth trying.',
  'I discovered this recipe while lost in a foreign kitchen. The instructions made no sense until they did.',
  'The total cooking time is forty-two minutes, give or take the age of the universe.',

  // Gaiman style
  'Every dish remembers the first time it was made. Make it remember something good.',
  'This recipe works best when you\'re not quite paying attention. Watch too closely and it gets shy.',
  'In the old stories, food made with love had power. The stories were right.',
  'Some recipes are inherited. Some are discovered. This one walked out of a dream and demanded to exist.',
  'Cook this in the quiet hours, when the kitchen belongs to you and whatever else is listening.',
];

/**
 * Humorous flavor notes
 */
const FLAVOR_NOTES: string[] = [
  'Tastes like victory, if victory had a slightly burnt edge.',
  'Surprisingly good for something that looked like that halfway through.',
  'Your ancestors would either approve or disown you. Worth the risk.',
  'Contains notes of triumph over adversity and whatever was in the pantry.',
  'Pairs well with regret about starting this at 11 PM.',
  'The kind of comfort food that asks no questions about your life choices.',
  'Scientifically proven to taste better when eaten standing over the sink.',
  'Has that "I made this myself" quality that masks any minor imperfections.',
];

/**
 * Recipe step humor additions
 */
const STEP_COMMENTARY: string[] = [
  'This is the point of no return.',
  'If it doesn\'t look like the picture, the picture was lying.',
  'Your smoke detector may disagree with this step. It is wrong.',
  'The recipe says "until golden." Your definition of golden is valid.',
  'Don\'t skip this step. I tried. It matters.',
  'Optional, but are you really going to skip it?',
  'At this point, taste it. Adjust seasonings. Taste again. This is cooking now.',
];

/**
 * Generate a personal note for a recipe publication
 */
function generatePersonalNote(dishName: string): string {
  const template = PERSONAL_NOTE_TEMPLATES[
    Math.floor(Math.random() * PERSONAL_NOTE_TEMPLATES.length)
  ]!;
  return template.replace(/{dish}/g, dishName);
}

/**
 * Generate flavor notes
 */
function generateFlavorNotes(): string {
  return FLAVOR_NOTES[Math.floor(Math.random() * FLAVOR_NOTES.length)]!;
}

// ============================================================================
// COOK INFLUENCER SYSTEM
// ============================================================================

/**
 * Cook Influencer System
 * Manages cook publications based on available writing technology
 */
export class CookInfluencerSystem implements System {
  public readonly id: SystemId = 'cook_influencer';
  public readonly priority: number = 176; // After research, before general updates
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus | null = null;
  private events!: SystemEventManager;
  private publicationSystem: PublicationSystem | null = null;

  // Tick throttling
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 100; // Every 5 seconds at 20 TPS

  // Track published recipes to avoid duplicates
  private publishedRecipes: Set<string> = new Set();

  // Pending publications (recipes waiting to be written up)
  private pendingPublications: Array<{
    cookId: string;
    cookName: string;
    recipeId: string;
    recipeName: string;
    ingredients: Array<{ item: string; quantity: string }>;
    discoveredAt: number;
  }> = [];

  public setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.events = new SystemEventManager(eventBus, this.id);
  }

  /**
   * Initialize the publication system
   */
  private ensurePublicationSystem(): PublicationSystem {
    if (!this.publicationSystem) {
      this.publicationSystem = getPublicationSystem();
    }
    return this.publicationSystem;
  }

  /**
   * Called when a cook discovers a new recipe
   */
  public onRecipeDiscovered(
    world: World,
    cookEntity: Entity,
    recipeId: string,
    recipeName: string,
    ingredients: Array<{ item: string; quantity: string }>
  ): void {
    // Check if already published
    if (this.publishedRecipes.has(recipeId)) {
      return;
    }

    const agentComp = cookEntity.getComponent<AgentComponent>(ComponentType.Agent) as any;
    if (!agentComp) return;

    // Queue for publication
    this.pendingPublications.push({
      cookId: cookEntity.id,
      cookName: agentComp.name ?? 'Anonymous Cook',
      recipeId,
      recipeName,
      ingredients,
      discoveredAt: world.tick,
    });

    // Emit discovery event
    this.events.emitGeneric('recipe:discovered', {
      cookId: cookEntity.id,
      cookName: agentComp.name,
      recipeId,
      recipeName,
    });
  }

  /**
   * Publish a recipe using current writing technology
   */
  public publishRecipe(
    pendingPub: {
      cookId: string;
      cookName: string;
      recipeId: string;
      recipeName: string;
      ingredients: Array<{ item: string; quantity: string }>;
    }
  ): RecipePublication | null {
    if (this.publishedRecipes.has(pendingPub.recipeId)) {
      return null;
    }

    const pubSystem = this.ensurePublicationSystem();
    const techLevel = pubSystem.getManager().getTechLevel();

    // Generate recipe steps based on tech level
    const steps = this.generateRecipeSteps(pendingPub.recipeName, pendingPub.ingredients, techLevel);

    // Publish through the publication system
    const publication = pubSystem.publishRecipe(
      { id: pendingPub.cookId, name: pendingPub.cookName },
      pendingPub.recipeName,
      pendingPub.ingredients,
      steps,
      {
        difficulty: this.estimateDifficulty(pendingPub.ingredients.length),
        personalNote: generatePersonalNote(pendingPub.recipeName),
      }
    );

    // Mark as published
    this.publishedRecipes.add(pendingPub.recipeId);

    // Emit publication event
    this.events.emitGeneric('publication:created', {
      publicationId: publication.id,
      type: publication.type,
      category: 'cooking',
      authorId: pendingPub.cookId,
      authorName: pendingPub.cookName,
      title: publication.title,
      recipeId: pendingPub.recipeId,
      recipeName: pendingPub.recipeName,
      techLevel: getWritingTechName(techLevel),
    });

    return publication;
  }

  /**
   * Generate recipe steps with appropriate humor based on tech level
   */
  private generateRecipeSteps(
    recipeName: string,
    ingredients: Array<{ item: string; quantity: string }>,
    techLevel: WritingTechLevel
  ): string[] {
    const steps: string[] = [];

    // Gather ingredients step
    if (techLevel === WritingTechLevel.OralTradition) {
      steps.push('First, gather what you need. You know what I mean.');
    } else if (techLevel === WritingTechLevel.Pictographic) {
      steps.push(`🥕 ➡️ 🏠 (Gather: ${ingredients.map(i => i.item).join(', ')})`);
    } else {
      steps.push(`Gather your ingredients: ${ingredients.map(i => `${i.quantity} ${i.item}`).join(', ')}.`);
    }

    // Prep step
    if (techLevel >= WritingTechLevel.Scrolls) {
      steps.push('Prepare your workspace. Clear minds make clear meals.');
    }

    // Combine step
    if (techLevel === WritingTechLevel.OralTradition) {
      steps.push('Mix them together. You\'ll know when it\'s right.');
    } else if (techLevel === WritingTechLevel.Pictographic) {
      steps.push('🥣 + 🥄 = 👍');
    } else {
      steps.push('Combine ingredients in appropriate vessel. ' +
        (Math.random() > 0.5 ? STEP_COMMENTARY[Math.floor(Math.random() * STEP_COMMENTARY.length)] : ''));
    }

    // Cook step
    if (techLevel === WritingTechLevel.OralTradition) {
      steps.push('Cook until done. Trust your senses.');
    } else if (techLevel === WritingTechLevel.Pictographic) {
      steps.push('🔥 + ⏰ = 🍳');
    } else if (techLevel >= WritingTechLevel.Books) {
      const cookMethod = Math.random() > 0.5 ? 'Apply heat' : 'Cook over flame';
      const time = Math.floor(Math.random() * 20 + 10);
      steps.push(`${cookMethod} for approximately ${time} minutes, or until ${recipeName} reaches desired consistency.`);
    } else {
      steps.push('Cook over fire until the ancestors approve.');
    }

    // Finish step
    if (techLevel >= WritingTechLevel.Books) {
      steps.push(`Plate and serve. ${generateFlavorNotes()}`);
    } else if (techLevel >= WritingTechLevel.Scrolls) {
      steps.push('Present with appropriate ceremony.');
    } else {
      steps.push('Eat. Share if feeling generous.');
    }

    return steps;
  }

  /**
   * Estimate difficulty based on ingredient count
   */
  private estimateDifficulty(ingredientCount: number): 'easy' | 'medium' | 'hard' | 'master' {
    if (ingredientCount <= 2) return 'easy';
    if (ingredientCount <= 4) return 'medium';
    if (ingredientCount <= 6) return 'hard';
    return 'master';
  }

  /**
   * Main update loop
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Throttle updates
    if (world.tick - this.lastUpdateTick < CookInfluencerSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = world.tick;

    // Process pending publications
    // Cooks take time to write up their recipes
    const readyForPublication = this.pendingPublications.filter(
      (p) => world.tick - p.discoveredAt > 300 // ~15 seconds delay
    );

    for (const pending of readyForPublication) {
      this.publishRecipe(pending);
    }

    // Clean up published ones
    this.pendingPublications = this.pendingPublications.filter(
      (p) => !this.publishedRecipes.has(p.recipeId)
    );
  }

  /**
   * Get a cook's influence score
   */
  public getCookInfluence(cookId: string): number {
    const pubSystem = this.ensurePublicationSystem();
    const publications = pubSystem.getManager().getPublicationsByAuthor(cookId);
    return publications.reduce((sum, p) => sum + p.influence, 0);
  }

  /**
   * Get top food publications
   */
  public getTopRecipes(limit: number = 10): RecipePublication[] {
    const pubSystem = this.ensurePublicationSystem();
    const cookingPubs = pubSystem.getManager().getPublicationsByCategory('cooking');
    return cookingPubs
      .sort((a, b) => b.influence - a.influence)
      .slice(0, limit) as RecipePublication[];
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.events.cleanup();
  }
}

// Singleton instance
let cookInfluencerSystemInstance: CookInfluencerSystem | null = null;

/**
 * Get the singleton CookInfluencerSystem instance
 */
export function getCookInfluencerSystem(): CookInfluencerSystem {
  if (!cookInfluencerSystemInstance) {
    cookInfluencerSystemInstance = new CookInfluencerSystem();
  }
  return cookInfluencerSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetCookInfluencerSystem(): void {
  cookInfluencerSystemInstance = null;
}
