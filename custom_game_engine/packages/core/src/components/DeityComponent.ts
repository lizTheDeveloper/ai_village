import { ComponentBase } from '../ecs/Component.js';

/**
 * Belief activity types - how agents generate belief
 */
export type BeliefActivity =
  | 'passive_faith'       // Just existing as a believer (lowest)
  | 'prayer'              // Active prayer
  | 'meditation'          // Deep communion
  | 'ritual'              // Formal ceremony
  | 'sacrifice'           // Giving up something valuable
  | 'pilgrimage'          // Journey to sacred site
  | 'proselytizing'       // Converting others
  | 'creation'            // Creating religious art/texts
  | 'miracle_witness';    // Witnessing divine action (highest)

/**
 * Divine domains - what the deity controls
 */
export type DivineDomain =
  | 'harvest'      // Crops, fertility
  | 'war'          // Conflict, strength
  | 'wisdom'       // Knowledge, guidance
  | 'craft'        // Creation, building
  | 'nature'       // Animals, plants, weather
  | 'death'        // Afterlife, endings
  | 'love'         // Relationships, bonds
  | 'chaos'        // Change, unpredictability
  | 'order'        // Law, stability
  | 'fortune'      // Luck, prosperity
  | 'protection'   // Safety, defense
  | 'healing'      // Health, restoration
  | 'mystery'      // Unknown, magic
  | 'time'         // Seasons, cycles
  | 'sky'          // Weather, celestial
  | 'earth'        // Stone, mountains
  | 'water'        // Seas, rain
  | 'fire'         // Flames, heat
  | 'storm'        // Thunder, lightning
  | 'hunt'         // Tracking, predation
  | 'home'         // Hearth, family
  | 'travel'       // Journeys, roads
  | 'trade'        // Commerce, exchange
  | 'justice'      // Law, fairness
  | 'vengeance'    // Retribution, punishment
  | 'dreams'       // Sleep, visions
  | 'fear'         // Terror, phobias
  | 'beauty'       // Aesthetics, art
  | 'trickery';    // Deception, cunning

/**
 * How believers perceive the deity's personality
 */
export interface PerceivedPersonality {
  benevolence: number;      // -1 (cruel) to 1 (kind)
  interventionism: number;  // -1 (distant) to 1 (involved)
  wrathfulness: number;     // 0 (patient) to 1 (quick to anger)
  mysteriousness: number;   // 0 (clear) to 1 (inscrutable)
  generosity: number;       // 0 (demanding) to 1 (giving)
  consistency: number;      // 0 (capricious) to 1 (reliable)
}

/**
 * Moral alignment as perceived by believers
 */
export type MoralAlignment =
  | 'benevolent'    // Perceived as good
  | 'malevolent'    // Perceived as evil
  | 'neutral'       // Perceived as beyond morality
  | 'dualistic'     // Perceived as both good and evil
  | 'unknown';      // Not enough data

/**
 * Identity of a deity - emergent, not pre-defined
 */
export interface DeityIdentity {
  // Name
  primaryName: string;
  epithets: string[];

  // Domain
  domain?: DivineDomain;
  secondaryDomains: DivineDomain[];

  // Personality as perceived by believers
  perceivedPersonality: PerceivedPersonality;
  perceivedAlignment: MoralAlignment;

  // Appearance (as imagined by believers)
  describedForm?: string;
  symbols: string[];
  colors: string[];
  sacredAnimals: string[];

  // Confidence in each trait (0-1)
  traitConfidence: Map<string, number>;
}

/**
 * Belief state - the divine economy
 */
export interface DeityBeliefState {
  // Current reserves
  currentBelief: number;

  // Income tracking
  beliefPerTick: number;        // Current generation rate
  peakBeliefRate: number;       // Historical maximum

  // Historical
  totalBeliefEarned: number;    // Lifetime accumulation
  totalBeliefSpent: number;     // Lifetime expenditure

  // Decay
  decayRate: number;            // Belief lost per tick without activity
  lastActivityTick: number;     // Last time belief was generated
}

/**
 * DeityComponent - Tracks a deity's identity, belief, and power
 *
 * Phase 1 implementation focuses on belief generation and storage.
 * Future phases will add:
 * - Myth generation
 * - Divine powers
 * - Avatar manifestation
 * - Angels/servants
 */
export class DeityComponent extends ComponentBase {
  public readonly type = 'deity';

  // Identity (starts blank, filled by believers)
  public identity: DeityIdentity;

  // Belief & Power
  public belief: DeityBeliefState;

  // Relationships
  public believers: Set<string>;         // Agent IDs who believe
  public sacredSites: Set<string>;       // Building IDs of temples

  // Prayer Queue (unanswered prayers)
  public prayerQueue: Array<{ agentId: string; prayerId: string; timestamp: number }>;

  // Vision Tracking
  public sentVisions: Array<{
    visionId: string;
    targetId: string;
    targetName: string;
    content: string;
    powerType: string;
    cost: number;
    timestamp: number;
    wasReceived: boolean;
    interpretation?: string;
  }>;

  // Prayer Statistics
  public totalAnsweredPrayers: number;

  // Mythology
  public myths: Array<{
    id: string;
    title: string;
    category: 'origin' | 'miracle' | 'moral' | 'prophecy' | 'parable' | 'heroic_deed' | 'cosmic_event' | 'political' | 'disaster';
    content: string;
    believerCount: number;
    variants: number;
    createdAt: number;
  }>;

  // Control
  public controller: 'player' | 'ai' | 'dormant';

  // Emergence tracking
  public emergenceTick?: number;  // Tick when deity first gained a believer

  constructor(
    primaryName: string = 'The Nameless',
    controller: 'player' | 'ai' | 'dormant' = 'dormant'
  ) {
    super();

    // Start with blank identity
    this.identity = {
      primaryName,
      epithets: [],
      secondaryDomains: [],
      perceivedPersonality: {
        benevolence: 0,
        interventionism: 0,
        wrathfulness: 0.5,
        mysteriousness: 0.5,
        generosity: 0.5,
        consistency: 0.5,
      },
      perceivedAlignment: 'unknown',
      symbols: [],
      colors: [],
      sacredAnimals: [],
      traitConfidence: new Map(),
    };

    // Start with zero belief
    this.belief = {
      currentBelief: 0,
      beliefPerTick: 0,
      peakBeliefRate: 0,
      totalBeliefEarned: 0,
      totalBeliefSpent: 0,
      decayRate: 0.001, // 0.1% per tick without activity
      lastActivityTick: 0,
    };

    this.believers = new Set();
    this.sacredSites = new Set();
    this.prayerQueue = [];
    this.sentVisions = [];
    this.myths = [];
    this.controller = controller;
    this.totalAnsweredPrayers = 0;
  }

  /**
   * Add belief from a believer
   */
  addBelief(amount: number, currentTick: number): void {
    if (amount < 0) {
      throw new Error('Belief amount must be non-negative');
    }

    this.belief.currentBelief += amount;
    this.belief.totalBeliefEarned += amount;
    this.belief.lastActivityTick = currentTick;
  }

  /**
   * Spend belief on divine action
   */
  spendBelief(amount: number): boolean {
    if (amount < 0) {
      throw new Error('Belief amount must be non-negative');
    }

    if (this.belief.currentBelief < amount) {
      return false; // Not enough belief
    }

    this.belief.currentBelief -= amount;
    this.belief.totalBeliefSpent += amount;
    return true;
  }

  /**
   * Apply belief decay
   * @param currentTick - Current game tick
   * @param configMultiplier - Optional multiplier from universe divine config (default 1.0)
   */
  applyDecay(currentTick: number, configMultiplier: number = 1.0): void {
    const ticksSinceActivity = currentTick - this.belief.lastActivityTick;

    // Accelerated decay if no activity
    let decay = this.belief.decayRate;
    if (ticksSinceActivity > 2400) { // ~2 game hours at 20 TPS
      decay *= 5; // Accelerated decay
    }

    // Apply universe config multiplier
    decay *= configMultiplier;

    const decayAmount = this.belief.currentBelief * decay;
    this.belief.currentBelief = Math.max(0, this.belief.currentBelief - decayAmount);
  }

  /**
   * Update belief generation rate
   */
  updateBeliefRate(rate: number): void {
    this.belief.beliefPerTick = rate;
    this.belief.peakBeliefRate = Math.max(this.belief.peakBeliefRate, rate);
  }

  /**
   * Add a believer
   * @param agentId - Agent entity ID
   * @param currentTick - Current game tick (sets emergenceTick on first believer)
   */
  addBeliever(agentId: string, currentTick?: number): void {
    // Track emergence tick when first believer is added
    if (this.believers.size === 0 && currentTick !== undefined && this.emergenceTick === undefined) {
      this.emergenceTick = currentTick;
    }
    this.believers.add(agentId);
  }

  /**
   * Remove a believer
   */
  removeBeliever(agentId: string): void {
    this.believers.delete(agentId);
  }

  /**
   * Check if agent believes in this deity
   */
  hasBeliever(agentId: string): boolean {
    return this.believers.has(agentId);
  }

  /**
   * Add a prayer to the queue
   */
  addPrayer(agentId: string, prayerId: string, timestamp: number): void {
    this.prayerQueue.push({ agentId, prayerId, timestamp });

    // Keep queue size reasonable (max 100 prayers)
    if (this.prayerQueue.length > 100) {
      this.prayerQueue.shift();
    }
  }

  /**
   * Remove a prayer from the queue (when answered)
   */
  removePrayer(prayerId: string): void {
    const index = this.prayerQueue.findIndex(p => p.prayerId === prayerId);
    if (index !== -1) {
      this.prayerQueue.splice(index, 1);
    }
  }

  /**
   * Answer a prayer (costs belief)
   * Returns true if successful, false if not enough belief
   */
  answerPrayer(prayerId: string, cost: number = 75): boolean {
    // Check if we have enough belief
    if (!this.spendBelief(cost)) {
      return false;
    }

    // Remove from queue
    this.removePrayer(prayerId);

    // Increment total answered prayers
    this.totalAnsweredPrayers++;

    return true;
  }

  /**
   * Get the next unanswered prayer (highest urgency first)
   */
  getNextPrayer(): { agentId: string; prayerId: string; timestamp: number } | undefined {
    // For now, just return the oldest prayer
    // In the future, could prioritize by urgency
    return this.prayerQueue[0];
  }
}
