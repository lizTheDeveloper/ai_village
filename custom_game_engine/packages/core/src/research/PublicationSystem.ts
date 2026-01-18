/**
 * Publication System
 *
 * Tracks writing technology progression and enables different publication types.
 * From oral tradition to clay tablets to scrolls to books to digital blogs.
 *
 * "The trouble with writing is that it gives the illusion of permanence.
 * The trouble with oral tradition is that it gives the illusion of truth.
 * The trouble with clay tablets is that they're heavy."
 *   - Anonymous Scribe, shortly before the invention of papyrus
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';

// ============================================================================
// WRITING TECHNOLOGY LEVELS
// ============================================================================

/**
 * Writing technology level determines what publication formats are available.
 */
export enum WritingTechLevel {
  /** No writing - knowledge passed orally */
  OralTradition = 0,
  /** Clay tablets, bone carvings, cave paintings */
  Pictographic = 1,
  /** Scrolls, papyrus, parchment */
  Scrolls = 2,
  /** Bound books, codices */
  Books = 3,
  /** Printing press, mass production */
  Printing = 4,
  /** Digital - blogs, websites, apps */
  Digital = 5,
}

/**
 * Get a descriptive name for a writing tech level
 */
export function getWritingTechName(level: WritingTechLevel): string {
  switch (level) {
    case WritingTechLevel.OralTradition:
      return 'Oral Tradition';
    case WritingTechLevel.Pictographic:
      return 'Pictographic Writing';
    case WritingTechLevel.Scrolls:
      return 'Scroll Writing';
    case WritingTechLevel.Books:
      return 'Bookbinding';
    case WritingTechLevel.Printing:
      return 'Printing Press';
    case WritingTechLevel.Digital:
      return 'Digital Publishing';
  }
}

// ============================================================================
// PUBLICATION TYPES
// ============================================================================

/**
 * Types of publications that can be created
 */
export type PublicationType =
  // Oral tradition level
  | 'song'
  | 'legend'
  | 'folk_tale'
  | 'oral_recipe'
  // Pictographic level
  | 'clay_tablet'
  | 'cave_painting'
  | 'carved_stone'
  | 'recipe_tablet'
  // Scroll level
  | 'scroll'
  | 'treatise'
  | 'recipe_scroll'
  | 'chronicle_scroll'
  | 'botanical_scroll'
  // Book level
  | 'book'
  | 'cookbook'
  | 'bestiary'
  | 'chronicle'
  | 'botanical_codex'
  | 'academic_paper'
  // Printing level
  | 'pamphlet'
  | 'newspaper'
  | 'journal_article'
  | 'printed_cookbook'
  | 'encyclopedia'
  // Digital level
  | 'blog_post'
  | 'food_blog'
  | 'video'
  | 'streaming_show'
  | 'podcast';

/**
 * Get the minimum tech level required for a publication type
 */
export function getRequiredTechLevel(pubType: PublicationType): WritingTechLevel {
  switch (pubType) {
    case 'song':
    case 'legend':
    case 'folk_tale':
    case 'oral_recipe':
      return WritingTechLevel.OralTradition;

    case 'clay_tablet':
    case 'cave_painting':
    case 'carved_stone':
    case 'recipe_tablet':
      return WritingTechLevel.Pictographic;

    case 'scroll':
    case 'treatise':
    case 'recipe_scroll':
    case 'chronicle_scroll':
    case 'botanical_scroll':
      return WritingTechLevel.Scrolls;

    case 'book':
    case 'cookbook':
    case 'bestiary':
    case 'chronicle':
    case 'botanical_codex':
    case 'academic_paper':
      return WritingTechLevel.Books;

    case 'pamphlet':
    case 'newspaper':
    case 'journal_article':
    case 'printed_cookbook':
    case 'encyclopedia':
      return WritingTechLevel.Printing;

    case 'blog_post':
    case 'food_blog':
    case 'video':
    case 'streaming_show':
    case 'podcast':
      return WritingTechLevel.Digital;
  }
}

// ============================================================================
// PUBLICATION INTERFACE
// ============================================================================

/**
 * A publication - any written (or oral) work
 */
export interface Publication {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Content summary or description */
  summary: string;
  /** Full content (if stored) */
  content?: string;
  /** Type of publication */
  type: PublicationType;
  /** Writing technology used */
  techLevel: WritingTechLevel;
  /** Author entity ID */
  authorId: string;
  /** Author name */
  authorName: string;
  /** Co-authors if any */
  coAuthors?: { id: string; name: string }[];
  /** When created */
  createdAt: number;
  /** Category - cooking, botany, history, etc. */
  category: PublicationCategory;
  /** Number of copies (for printed works) */
  copies?: number;
  /** View/read count */
  readCount: number;
  /** Influence score - how much impact on culture */
  influence: number;
  /** Is this a sequel/volume? */
  seriesInfo?: {
    seriesName: string;
    volume: number;
  };
  /** Keywords/tags */
  tags: string[];
  /** Parent publication if this is a revision */
  revisedFrom?: string;
  /** Quality score (0-100) */
  quality: number;
}

/**
 * Categories of publications
 */
export type PublicationCategory =
  | 'cooking'
  | 'botany'
  | 'history'
  | 'science'
  | 'fiction'
  | 'poetry'
  | 'news'
  | 'technical'
  | 'entertainment'
  | 'religious';

// ============================================================================
// RECIPE PUBLICATION
// ============================================================================

/**
 * A recipe publication with full recipe details
 */
export interface RecipePublication extends Publication {
  category: 'cooking';
  /** Recipe details */
  recipe: {
    ingredients: Array<{ item: string; quantity: string }>;
    steps: string[];
    servings?: number;
    cookingTime?: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'master';
    cuisine?: string;
  };
  /** Flavor notes */
  flavorNotes?: string;
  /** Cook's personal story/commentary */
  personalNote?: string;
}

/**
 * A botanical publication with plant details
 */
export interface BotanicalPublication extends Publication {
  category: 'botany';
  /** Plant discovery details */
  plant: {
    speciesName: string;
    commonName: string;
    biome: string;
    medicinalProperties?: string[];
    description: string;
    cultivation?: string;
  };
  /** Collection notes */
  fieldNotes?: string;
}

/**
 * A historical chronicle publication
 */
export interface ChroniclePublication extends Publication {
  category: 'history';
  /** Time period covered */
  period: {
    from: number;
    to: number;
  };
  /** Events chronicled */
  events: Array<{
    tick: number;
    description: string;
    significance: 'minor' | 'notable' | 'major' | 'legendary';
  }>;
  /** Notable figures mentioned */
  figures: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

// ============================================================================
// HUMOROUS TITLE GENERATORS
// ============================================================================

/**
 * Recipe title templates by tech level (Pratchett/Adams/Gaiman style)
 */
const RECIPE_TITLE_TEMPLATES: Record<WritingTechLevel, string[]> = {
  [WritingTechLevel.OralTradition]: [
    'The Song of {dish}: How Grandmother Made It When The Moon Was Right',
    'What {cook} Does With {ingredient}, A Story In Three Burps',
    'That Thing We Ate That One Time When {event} Happened',
    'The Legend of {dish} and Why We Don\'t Talk About The First Batch',
  ],
  [WritingTechLevel.Pictographic]: [
    '🍖➡️🔥➡️😋: A Pictographic Guide to Not Burning {dish}',
    'How To Make {dish} (With Pictures For Those Who Can\'t Read This)',
    'Recipe For {dish}: Scratched Into Clay By {cook}, Who Is Very Tired',
    '{dish}: A Stone\'s Throw From Edible',
  ],
  [WritingTechLevel.Scrolls]: [
    'A Scroll of Culinary Wisdom: {dish} and Other Questionable Decisions',
    'On The Preparation of {dish}, With Notes On What Went Wrong',
    'The Treatise of {cook} Concerning {dish}: Volume I of Hopefully Only I',
    'Recipes From The Edge of Reasonable: {dish}',
  ],
  [WritingTechLevel.Books]: [
    'The Complete Guide to {dish} (Third Edition, Now With Fewer Errors)',
    '{cook}\'s Compendium of {cuisine} Cooking: Because Someone Had To Write It Down',
    'One Hundred Ways To Ruin {ingredient}, And One Way That Works',
    'The {cuisine} Kitchen: A Memoir of Smoke, Tears, and Eventually, {dish}',
  ],
  [WritingTechLevel.Printing]: [
    '{cook}\'s Weekly Recipe Column: {dish} and the Art of Reasonable Expectations',
    'The Practical Cook\'s Gazette: {dish} For The Chronically Hungry',
    'Modern {cuisine}: {dish} For People With Jobs',
    'The Illustrated {dish}: Now With 30% More Pictures And 50% Less Fire',
  ],
  [WritingTechLevel.Digital]: [
    '{cook}\'s Food Blog: {dish} 🍳 (WAIT TILL THE END!) #blessed #cooking',
    'You Won\'t BELIEVE What {cook} Made! ({dish}) | 15 ads | 3 hour read',
    '{dish}: A 10-Minute Recipe With A 47-Paragraph Backstory',
    'TRYING {dish} FOR THE FIRST TIME *EMOTIONAL* | {cook}Cooks',
  ],
};

/**
 * Chronicle title templates by tech level
 */
const CHRONICLE_TITLE_TEMPLATES: Record<WritingTechLevel, string[]> = {
  [WritingTechLevel.OralTradition]: [
    'The Remembrance of {event}: A Song of How We Got Here',
    'What The Elders Say About {period}',
    'The Tale of {village}, As Best Anyone Can Recall',
  ],
  [WritingTechLevel.Pictographic]: [
    'Marks Upon Stone: {period} In {village}',
    'Pictures of What Happened: {event}',
    'Here Is Recorded {event}, May Someone Remember',
  ],
  [WritingTechLevel.Scrolls]: [
    'A Chronicle of {village}: From {startYear} to Presumably Now',
    'The Annals of {period}, Written By One Who Was There (Mostly)',
    'Histories of {event}, With Commentary On Why It Probably Won\'t Happen Again',
  ],
  [WritingTechLevel.Books]: [
    'The Definitive History of {village} (Until Something Else Happens)',
    '{chronicler}\'s Chronicles: {period}',
    'A Complete Record of {event} and Its Unfortunate Consequences',
  ],
  [WritingTechLevel.Printing]: [
    'The {village} Gazette: A Historical Retrospective',
    'Archives of {period}: Primary Sources and Educated Guesses',
    '{chronicler}\'s History of {village}, Seventh Printing',
  ],
  [WritingTechLevel.Digital]: [
    'Everything You Need to Know About {event} | {village}Wiki',
    'The History of {village}: A Digital Archive (Last Updated 5 Minutes Ago)',
    '#TIL about {event} in {village} history thread 🧵',
  ],
};

/**
 * Generate a publication title based on type and tech level
 */
export function generatePublicationTitle(
  category: PublicationCategory,
  techLevel: WritingTechLevel,
  variables: Record<string, string>
): string {
  let templates: string[];

  if (category === 'cooking') {
    templates = RECIPE_TITLE_TEMPLATES[techLevel] ?? RECIPE_TITLE_TEMPLATES[WritingTechLevel.Books]!;
  } else if (category === 'history') {
    templates = CHRONICLE_TITLE_TEMPLATES[techLevel] ?? CHRONICLE_TITLE_TEMPLATES[WritingTechLevel.Books]!;
  } else {
    // Default templates for other categories
    templates = [
      'On the Subject of {topic}',
      'A Study of {topic}',
      'Concerning {topic}',
      '{author}\'s Notes on {topic}',
    ];
  }

  const template = templates[Math.floor(Math.random() * templates.length)]!;

  let title = template;
  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return title;
}

// ============================================================================
// PUBLICATION MANAGER
// ============================================================================

/**
 * Manages all publications in the game world
 */
export class PublicationManager {
  private publications: Map<string, Publication> = new Map();
  private publicationsByAuthor: Map<string, Set<string>> = new Map();
  private publicationsByCategory: Map<PublicationCategory, Set<string>> = new Map();
  private publicationsByType: Map<PublicationType, Set<string>> = new Map();

  /** Current writing technology level for the village */
  private currentTechLevel: WritingTechLevel = WritingTechLevel.OralTradition;

  /**
   * Set the current writing technology level
   */
  public setTechLevel(level: WritingTechLevel): void {
    this.currentTechLevel = level;
  }

  /**
   * Get the current writing technology level
   */
  public getTechLevel(): WritingTechLevel {
    return this.currentTechLevel;
  }

  /**
   * Check if a publication type is available at current tech level
   */
  public canCreate(pubType: PublicationType): boolean {
    return getRequiredTechLevel(pubType) <= this.currentTechLevel;
  }

  /**
   * Get the best publication type for a category at current tech level
   */
  public getBestPublicationType(category: PublicationCategory): PublicationType {
    switch (category) {
      case 'cooking':
        if (this.currentTechLevel >= WritingTechLevel.Digital) return 'food_blog';
        if (this.currentTechLevel >= WritingTechLevel.Printing) return 'printed_cookbook';
        if (this.currentTechLevel >= WritingTechLevel.Books) return 'cookbook';
        if (this.currentTechLevel >= WritingTechLevel.Scrolls) return 'recipe_scroll';
        if (this.currentTechLevel >= WritingTechLevel.Pictographic) return 'recipe_tablet';
        return 'oral_recipe';

      case 'botany':
        if (this.currentTechLevel >= WritingTechLevel.Printing) return 'journal_article';
        if (this.currentTechLevel >= WritingTechLevel.Books) return 'botanical_codex';
        if (this.currentTechLevel >= WritingTechLevel.Scrolls) return 'botanical_scroll';
        if (this.currentTechLevel >= WritingTechLevel.Pictographic) return 'carved_stone';
        return 'legend';

      case 'history':
        if (this.currentTechLevel >= WritingTechLevel.Digital) return 'blog_post';
        if (this.currentTechLevel >= WritingTechLevel.Printing) return 'newspaper';
        if (this.currentTechLevel >= WritingTechLevel.Books) return 'chronicle';
        if (this.currentTechLevel >= WritingTechLevel.Scrolls) return 'chronicle_scroll';
        if (this.currentTechLevel >= WritingTechLevel.Pictographic) return 'cave_painting';
        return 'legend';

      case 'science':
        if (this.currentTechLevel >= WritingTechLevel.Books) return 'academic_paper';
        if (this.currentTechLevel >= WritingTechLevel.Scrolls) return 'treatise';
        if (this.currentTechLevel >= WritingTechLevel.Pictographic) return 'clay_tablet';
        return 'legend';

      default:
        if (this.currentTechLevel >= WritingTechLevel.Books) return 'book';
        if (this.currentTechLevel >= WritingTechLevel.Scrolls) return 'scroll';
        if (this.currentTechLevel >= WritingTechLevel.Pictographic) return 'clay_tablet';
        return 'folk_tale';
    }
  }

  /**
   * Create and register a publication
   */
  public createPublication<T extends Publication>(
    data: Omit<T, 'id' | 'createdAt' | 'readCount' | 'influence'>
  ): T {
    const id = `pub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const publication = {
      ...data,
      id,
      createdAt: Date.now(),
      readCount: 0,
      influence: 0,
    } as T;

    this.publications.set(id, publication);

    // Index by author
    if (!this.publicationsByAuthor.has(data.authorId)) {
      this.publicationsByAuthor.set(data.authorId, new Set());
    }
    this.publicationsByAuthor.get(data.authorId)!.add(id);

    // Index by category
    if (!this.publicationsByCategory.has(data.category)) {
      this.publicationsByCategory.set(data.category, new Set());
    }
    this.publicationsByCategory.get(data.category)!.add(id);

    // Index by type
    if (!this.publicationsByType.has(data.type)) {
      this.publicationsByType.set(data.type, new Set());
    }
    this.publicationsByType.get(data.type)!.add(id);

    return publication;
  }

  /**
   * Get a publication by ID
   */
  public getPublication(id: string): Publication | undefined {
    return this.publications.get(id);
  }

  /**
   * Get all publications by an author
   */
  public getPublicationsByAuthor(authorId: string): Publication[] {
    const ids = this.publicationsByAuthor.get(authorId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.publications.get(id))
      .filter((p): p is Publication => p !== undefined);
  }

  /**
   * Get all publications in a category
   */
  public getPublicationsByCategory(category: PublicationCategory): Publication[] {
    const ids = this.publicationsByCategory.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.publications.get(id))
      .filter((p): p is Publication => p !== undefined);
  }

  /**
   * Increment read count for a publication
   */
  public recordRead(publicationId: string): void {
    const pub = this.publications.get(publicationId);
    if (pub) {
      pub.readCount++;
      // Influence grows with reads but with diminishing returns
      pub.influence = Math.log10(pub.readCount + 1) * pub.quality;
    }
  }

  /**
   * Get top publications by influence
   */
  public getTopPublications(limit: number = 10): Publication[] {
    return Array.from(this.publications.values())
      .sort((a, b) => b.influence - a.influence)
      .slice(0, limit);
  }

  /**
   * Get all publications
   */
  public getAllPublications(): Publication[] {
    return Array.from(this.publications.values());
  }

  /**
   * Get publication count
   */
  public getPublicationCount(): number {
    return this.publications.size;
  }
}

// ============================================================================
// PUBLICATION SYSTEM
// ============================================================================

/**
 * Publication System - Manages writing technology and publication creation
 */
export class PublicationSystem extends BaseSystem {
  public readonly id: SystemId = 'publication';
  public readonly priority: number = 180;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 200; // Every 10 seconds at 20 TPS

  private manager: PublicationManager;

  constructor() {
    super();
    this.manager = new PublicationManager();
  }

  /**
   * Get the publication manager
   */
  public getManager(): PublicationManager {
    return this.manager;
  }

  /**
   * Update tech level based on completed research
   */
  public updateTechLevelFromResearch(completedResearch: Set<string>): void {
    // Check for writing-related research
    if (completedResearch.has('digital_networks')) {
      this.manager.setTechLevel(WritingTechLevel.Digital);
    } else if (completedResearch.has('printing_press')) {
      this.manager.setTechLevel(WritingTechLevel.Printing);
    } else if (completedResearch.has('bookbinding')) {
      this.manager.setTechLevel(WritingTechLevel.Books);
    } else if (completedResearch.has('scrolls_and_ink')) {
      this.manager.setTechLevel(WritingTechLevel.Scrolls);
    } else if (completedResearch.has('pictographic_writing')) {
      this.manager.setTechLevel(WritingTechLevel.Pictographic);
    }
    // Otherwise stay at OralTradition
  }

  /**
   * Create a recipe publication
   */
  public publishRecipe(
    author: { id: string; name: string },
    recipeName: string,
    ingredients: Array<{ item: string; quantity: string }>,
    steps: string[],
    options: {
      cuisine?: string;
      difficulty?: 'easy' | 'medium' | 'hard' | 'master';
      personalNote?: string;
    } = {}
  ): RecipePublication {
    const techLevel = this.manager.getTechLevel();
    const pubType = this.manager.getBestPublicationType('cooking');

    const title = generatePublicationTitle('cooking', techLevel, {
      dish: recipeName,
      cook: author.name,
      ingredient: ingredients[0]?.item ?? 'something',
      cuisine: options.cuisine ?? 'village',
    });

    const publication = this.manager.createPublication<RecipePublication>({
      title,
      summary: `A ${options.difficulty ?? 'simple'} recipe for ${recipeName} by ${author.name}.`,
      type: pubType,
      techLevel,
      authorId: author.id,
      authorName: author.name,
      category: 'cooking',
      tags: ['recipe', recipeName.toLowerCase(), options.cuisine ?? 'local'].filter(Boolean),
      quality: 50 + Math.floor(Math.random() * 50),
      recipe: {
        ingredients,
        steps,
        difficulty: options.difficulty ?? 'medium',
        cuisine: options.cuisine,
      },
      personalNote: options.personalNote,
    });

    // Emit event
    this.events.emitGeneric('publication:created', {
      publicationId: publication.id,
      type: publication.type,
      category: 'cooking',
      authorId: author.id,
      authorName: author.name,
      title: publication.title,
      techLevel,
    });

    return publication;
  }

  /**
   * Create a chronicle/history publication
   */
  public publishChronicle(
    author: { id: string; name: string },
    period: { from: number; to: number },
    events: Array<{
      tick: number;
      description: string;
      significance: 'minor' | 'notable' | 'major' | 'legendary';
    }>,
    figures: Array<{ id: string; name: string; role: string }>,
    options: { villageName?: string } = {}
  ): ChroniclePublication {
    const techLevel = this.manager.getTechLevel();
    const pubType = this.manager.getBestPublicationType('history');

    const title = generatePublicationTitle('history', techLevel, {
      event: events[0]?.description ?? 'various happenings',
      period: 'recent times',
      village: options.villageName ?? 'the village',
      chronicler: author.name,
      startYear: String(Math.floor(period.from / 20 / 60)), // Convert ticks to approx hours
    });

    const publication = this.manager.createPublication<ChroniclePublication>({
      title,
      summary: `A chronicle of ${events.length} events by ${author.name}.`,
      type: pubType,
      techLevel,
      authorId: author.id,
      authorName: author.name,
      category: 'history',
      tags: ['history', 'chronicle', options.villageName ?? 'local'].filter(Boolean),
      quality: 50 + Math.floor(Math.random() * 50),
      period,
      events,
      figures,
    });

    // Emit event
    this.events.emitGeneric('publication:created', {
      publicationId: publication.id,
      type: publication.type,
      category: 'history',
      authorId: author.id,
      authorName: author.name,
      title: publication.title,
      techLevel,
    });

    return publication;
  }

  /**
   * Main update loop
   */
  protected onUpdate(ctx: SystemContext): void {
    // Could do periodic things here like:
    // - Spread influence of popular publications
    // - Age out old publications
    // - Track reading habits
  }

  /**
   * Cleanup subscriptions
   */
  protected onCleanup(): void {
    // Base class handles events.cleanup()
  }
}

// Singleton instance
let publicationSystemInstance: PublicationSystem | null = null;

/**
 * Get the singleton PublicationSystem instance
 */
export function getPublicationSystem(): PublicationSystem {
  if (!publicationSystemInstance) {
    publicationSystemInstance = new PublicationSystem();
  }
  return publicationSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetPublicationSystem(): void {
  publicationSystemInstance = null;
}
