import { ComponentBase } from '../ecs/Component.js';

/**
 * Categories of topics for organization and filtering.
 */
export type TopicCategory =
  | 'craft'       // Skills and making things
  | 'nature'      // Natural world
  | 'philosophy'  // Deep questions
  | 'social'      // People and relationships
  | 'practical'   // Daily life
  | 'story';      // Narratives and history

/**
 * Specific topics an agent can have interest in.
 * Maps to skills, experiences, and personality traits.
 */
export type TopicId =
  // Craft topics (from skills)
  | 'woodworking'
  | 'stonecraft'
  | 'farming'
  | 'cooking'
  | 'building'
  | 'foraging'
  | 'hunting'
  | 'craftsmanship'

  // Nature topics
  | 'trees_and_forests'
  | 'weather'
  | 'animals'
  | 'plants'
  | 'seasons'
  | 'landscape'

  // Philosophy topics (personality-driven)
  | 'afterlife'
  | 'meaning_of_life'
  | 'mortality'
  | 'dreams'
  | 'the_gods'
  | 'fate_and_destiny'
  | 'right_and_wrong'

  // Social topics
  | 'family'
  | 'friendship'
  | 'village_gossip'
  | 'romance'
  | 'conflict'

  // Practical topics
  | 'food'
  | 'shelter'
  | 'work'
  | 'health'

  // Story topics
  | 'myths_and_legends'
  | 'village_history'
  | 'personal_stories'
  | 'adventures';

/**
 * How an interest was acquired.
 */
export type InterestSource =
  | 'innate'      // Born with it (high openness → curiosity topics)
  | 'skill'       // Developed through skill practice
  | 'childhood'   // Childhood experience
  | 'experience'  // Life event (witnessing death → afterlife)
  | 'learned'     // Learned from conversation
  | 'question';   // Child's natural curiosity

/**
 * A single interest an agent has.
 */
export interface Interest {
  /** The topic of interest */
  topic: TopicId;

  /** Category for grouping */
  category: TopicCategory;

  /**
   * How intensely they care about this topic.
   * 0.0 = mild interest
   * 0.5 = moderate interest
   * 1.0 = passionate about this
   */
  intensity: number;

  /** How the interest was acquired */
  source: InterestSource;

  /**
   * Last game tick when this topic was discussed satisfactorily.
   * null if never discussed.
   */
  lastDiscussed: number | null;

  /**
   * Accumulated desire to discuss this topic.
   * Grows over time since lastDiscussed, modified by intensity.
   * 0.0 = just discussed, satisfied
   * 1.0 = strongly want to discuss this
   */
  discussionHunger: number;

  /**
   * Who they've had good conversations about this topic with.
   * EntityIds of agents who share or appreciate this interest.
   * Limited to 5 entries (FIFO).
   */
  knownEnthusiasts: string[];

  /**
   * For 'question' type interests (children).
   * The specific question they want answered.
   */
  question?: string;
}

/**
 * Serialized form of InterestsComponent for persistence.
 */
export interface InterestsComponentData {
  interests: Interest[];
  depthHunger: number;
  avoidTopics: TopicId[];
  maxInterests: number;
}

/**
 * Tracks all of an agent's interests and topic-related desires.
 *
 * Interests drive what agents want to talk about, who they seek out
 * for conversation, and how satisfied they feel after discussions.
 */
export class InterestsComponent extends ComponentBase {
  public readonly type = 'interests';

  /** All interests this agent has. Typically 3-8 interests per agent. */
  public interests: Interest[] = [];

  /**
   * Overall desire for deep/meaningful conversation.
   * Accumulates when agent only has shallow interactions.
   * 0.0 = recently had meaningful conversation
   * 1.0 = starving for depth
   */
  public depthHunger: number = 0.0;

  /** Topics this agent actively dislikes discussing. */
  public avoidTopics: TopicId[] = [];

  /** Maximum interests to maintain (prevent bloat). */
  public maxInterests: number = 10;

  /** Maximum known enthusiasts per interest. */
  private static readonly MAX_ENTHUSIASTS = 5;

  /**
   * Add an interest, replacing lowest intensity if at capacity.
   * @throws If intensity or discussionHunger is out of range
   */
  addInterest(interest: Interest): void {
    // Validate ranges
    if (interest.intensity < 0 || interest.intensity > 1) {
      throw new Error(`intensity must be in range 0-1, got ${interest.intensity}`);
    }
    if (interest.discussionHunger < 0 || interest.discussionHunger > 1) {
      throw new Error(`discussionHunger must be in range 0-1, got ${interest.discussionHunger}`);
    }

    // Check for duplicate topic
    const existing = this.interests.findIndex(i => i.topic === interest.topic);
    if (existing >= 0) {
      // Update existing
      this.interests[existing] = { ...interest };
      return;
    }

    // At capacity - remove lowest intensity
    if (this.interests.length >= this.maxInterests) {
      this.interests.sort((a, b) => a.intensity - b.intensity);
      this.interests.shift();
    }

    this.interests.push({ ...interest });
  }

  /**
   * Get an interest by topic.
   */
  getInterest(topic: TopicId): Interest | undefined {
    return this.interests.find(i => i.topic === topic);
  }

  /**
   * Check if agent has a specific interest.
   */
  hasInterest(topic: TopicId): boolean {
    return this.interests.some(i => i.topic === topic);
  }

  /**
   * Get all interests in a category.
   */
  getInterestsByCategory(category: TopicCategory): Interest[] {
    return this.interests.filter(i => i.category === category);
  }

  /**
   * Get interests with discussion hunger above threshold, sorted by hunger.
   */
  getHungryInterests(threshold: number = 0.5): Interest[] {
    return this.interests
      .filter(i => i.discussionHunger >= threshold)
      .sort((a, b) => b.discussionHunger - a.discussionHunger);
  }

  /**
   * Get top N interests by intensity.
   */
  getTopInterests(n: number): Interest[] {
    return [...this.interests]
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, n);
  }

  /**
   * Get all question-type interests (for children).
   */
  getQuestions(): Interest[] {
    return this.interests.filter(i => i.source === 'question');
  }

  /**
   * Update discussion hunger for a topic.
   * @throws If topic not found
   */
  updateDiscussionHunger(topic: TopicId, hunger: number): void {
    const interest = this.getInterest(topic);
    if (!interest) {
      throw new Error(`Interest not found: ${topic}`);
    }
    interest.discussionHunger = Math.max(0, Math.min(1, hunger));
  }

  /**
   * Mark a topic as discussed, reducing hunger and recording tick.
   */
  satisfyTopic(topic: TopicId, tick: number, satisfactionAmount: number): void {
    const interest = this.getInterest(topic);
    if (!interest) {
      throw new Error(`Interest not found: ${topic}`);
    }
    interest.lastDiscussed = tick;
    interest.discussionHunger = Math.max(0, interest.discussionHunger - satisfactionAmount);
  }

  /**
   * Add someone as a known enthusiast for a topic.
   */
  addKnownEnthusiast(topic: TopicId, entityId: string): void {
    const interest = this.getInterest(topic);
    if (!interest) {
      throw new Error(`Interest not found: ${topic}`);
    }

    // Don't duplicate
    if (interest.knownEnthusiasts.includes(entityId)) {
      return;
    }

    // FIFO if at capacity
    if (interest.knownEnthusiasts.length >= InterestsComponent.MAX_ENTHUSIASTS) {
      interest.knownEnthusiasts.shift();
    }

    interest.knownEnthusiasts.push(entityId);
  }

  /**
   * Update the overall depth hunger.
   */
  updateDepthHunger(hunger: number): void {
    this.depthHunger = Math.max(0, Math.min(1, hunger));
  }

  /**
   * Reduce depth hunger by satisfaction amount.
   */
  satisfyDepthHunger(amount: number): void {
    this.depthHunger = Math.max(0, this.depthHunger - amount);
  }

  /**
   * Add a topic to avoid.
   */
  addAvoidTopic(topic: TopicId): void {
    if (!this.avoidTopics.includes(topic)) {
      this.avoidTopics.push(topic);
    }
  }

  /**
   * Remove a topic from avoid list.
   */
  removeAvoidTopic(topic: TopicId): void {
    const index = this.avoidTopics.indexOf(topic);
    if (index >= 0) {
      this.avoidTopics.splice(index, 1);
    }
  }

  /**
   * Check if a topic is avoided.
   */
  isAvoidedTopic(topic: TopicId): boolean {
    return this.avoidTopics.includes(topic);
  }

  /**
   * Remove an interest by topic.
   * @throws If topic not found
   */
  removeInterest(topic: TopicId): void {
    const index = this.interests.findIndex(i => i.topic === topic);
    if (index < 0) {
      throw new Error(`Interest not found: ${topic}`);
    }
    this.interests.splice(index, 1);
  }

  /**
   * Prune interests to keep only top N by intensity.
   */
  pruneToCount(count: number): void {
    if (this.interests.length <= count) return;

    this.interests.sort((a, b) => b.intensity - a.intensity);
    this.interests = this.interests.slice(0, count);
  }

  /**
   * Serialize to JSON for persistence.
   */
  toJSON(): InterestsComponentData {
    return {
      interests: this.interests.map(i => ({ ...i })),
      depthHunger: this.depthHunger,
      avoidTopics: [...this.avoidTopics],
      maxInterests: this.maxInterests,
    };
  }

  /**
   * Restore from JSON.
   */
  fromJSON(data: InterestsComponentData): void {
    this.interests = data.interests.map(i => ({ ...i }));
    this.depthHunger = data.depthHunger;
    this.avoidTopics = [...data.avoidTopics];
    this.maxInterests = data.maxInterests;
  }
}

/**
 * Get a human-readable description of an agent's interests.
 */
export function getInterestsDescription(interests: InterestsComponent): string {
  if (!interests || interests.interests.length === 0) {
    return 'no particular interests';
  }

  const topInterests = interests.getTopInterests(3);
  const descriptions = topInterests.map(interest => {
    const intensityDesc =
      interest.intensity > 0.7 ? 'passionate about' :
      interest.intensity > 0.4 ? 'interested in' : 'curious about';
    return `${intensityDesc} ${formatTopicName(interest.topic)}`;
  });

  return descriptions.join(', ');
}

/**
 * Format a topic ID to human-readable name.
 */
export function formatTopicName(topic: TopicId): string {
  return topic.replace(/_/g, ' ');
}

/**
 * Get the category for a topic.
 */
export function getTopicCategory(topic: TopicId): TopicCategory {
  const categoryMap: Record<TopicId, TopicCategory> = {
    // Craft
    woodworking: 'craft',
    stonecraft: 'craft',
    farming: 'craft',
    cooking: 'craft',
    building: 'craft',
    foraging: 'craft',
    hunting: 'craft',
    craftsmanship: 'craft',

    // Nature
    trees_and_forests: 'nature',
    weather: 'nature',
    animals: 'nature',
    plants: 'nature',
    seasons: 'nature',
    landscape: 'nature',

    // Philosophy
    afterlife: 'philosophy',
    meaning_of_life: 'philosophy',
    mortality: 'philosophy',
    dreams: 'philosophy',
    the_gods: 'philosophy',
    fate_and_destiny: 'philosophy',
    right_and_wrong: 'philosophy',

    // Social
    family: 'social',
    friendship: 'social',
    village_gossip: 'social',
    romance: 'social',
    conflict: 'social',

    // Practical
    food: 'practical',
    shelter: 'practical',
    work: 'practical',
    health: 'practical',

    // Story
    myths_and_legends: 'story',
    village_history: 'story',
    personal_stories: 'story',
    adventures: 'story',
  };

  return categoryMap[topic] || 'practical';
}
