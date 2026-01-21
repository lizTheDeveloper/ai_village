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
 * Angel Species Definition - Custom naming for a deity's angels
 *
 * When the player creates their first angel, they name what their
 * divine servants are called (Nazgul, fae, seraphim, etc.).
 * This enables lore-appropriate theming.
 */
export interface AngelSpeciesDefinition {
  // Basic naming
  singularName: string;       // e.g., "Seraph", "Nazgul", "Fae"
  pluralName: string;         // e.g., "Seraphim", "Nazgul", "Fae"

  // Tier names (player can customize)
  tierNames: {
    tier1: string;            // e.g., "Angel", "Imp", "Sprite"
    tier2: string;            // e.g., "Greater Angel", "Fiend", "Sylph"
    tier3: string;            // e.g., "Archangel", "Demon", "Dryad"
    tier4: string;            // e.g., "Supreme Angel", "Archfiend", "Nymph"
  };

  // Visual theming
  colorScheme: {
    primary: string;          // Main color (hex or name)
    secondary: string;        // Accent color
    glow?: string;            // Optional glow/aura color
  };

  // Optional base sprite (PixelLab) configuration
  baseSpriteConfig?: {
    characterId?: string;     // PixelLab character ID if generated
    description: string;      // Description for sprite generation
    style: 'ethereal' | 'dark' | 'nature' | 'elemental' | 'mechanical' | 'cosmic';
  };

  // Lore
  description?: string;       // Player-written or generated description
  createdAt: number;          // Tick when species was defined

  // State
  namingCompleted: boolean;   // Has the player finished the naming flow?
}

/**
 * Angel Army State - Tracking all angels for a deity
 */
export interface AngelArmyState {
  // Counts by tier
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;

  // Tier unlocks
  tier2Unlocked: boolean;
  tier3Unlocked: boolean;
  tier4Unlocked: boolean;

  // Angel entity IDs
  angelIds: string[];

  // Group chat ID for all angels
  groupChatId?: string;
}

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

  // Angel System (Phase 28)
  public angelSpecies?: AngelSpeciesDefinition;
  public angelArmy: AngelArmyState;

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

    // Angel System - starts empty until first angel is created
    this.angelArmy = {
      tier1Count: 0,
      tier2Count: 0,
      tier3Count: 0,
      tier4Count: 0,
      tier2Unlocked: false,
      tier3Unlocked: false,
      tier4Unlocked: false,
      angelIds: [],
    };
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

  // ============================================================================
  // Angel System Methods (Phase 28)
  // ============================================================================

  /**
   * Define the angel species (called when first angel is created)
   */
  defineAngelSpecies(species: AngelSpeciesDefinition): void {
    this.angelSpecies = species;
  }

  /**
   * Check if angel species has been defined
   */
  hasAngelSpecies(): boolean {
    return this.angelSpecies !== undefined && this.angelSpecies.namingCompleted;
  }

  /**
   * Get the name for angels at a given tier
   */
  getAngelTierName(tier: number): string {
    if (!this.angelSpecies) {
      // Default names if species not defined
      const defaults = ['Angel', 'Greater Angel', 'Archangel', 'Supreme Angel'];
      return defaults[tier - 1] || 'Angel';
    }

    switch (tier) {
      case 1: return this.angelSpecies.tierNames.tier1;
      case 2: return this.angelSpecies.tierNames.tier2;
      case 3: return this.angelSpecies.tierNames.tier3;
      case 4: return this.angelSpecies.tierNames.tier4;
      default: return this.angelSpecies.tierNames.tier1;
    }
  }

  /**
   * Add an angel to the army
   */
  addAngel(angelId: string, tier: number): void {
    if (!this.angelArmy.angelIds.includes(angelId)) {
      this.angelArmy.angelIds.push(angelId);
    }

    switch (tier) {
      case 1: this.angelArmy.tier1Count++; break;
      case 2: this.angelArmy.tier2Count++; break;
      case 3: this.angelArmy.tier3Count++; break;
      case 4: this.angelArmy.tier4Count++; break;
    }
  }

  /**
   * Remove an angel from the army
   */
  removeAngel(angelId: string, tier: number): void {
    const index = this.angelArmy.angelIds.indexOf(angelId);
    if (index !== -1) {
      this.angelArmy.angelIds.splice(index, 1);
    }

    switch (tier) {
      case 1: this.angelArmy.tier1Count = Math.max(0, this.angelArmy.tier1Count - 1); break;
      case 2: this.angelArmy.tier2Count = Math.max(0, this.angelArmy.tier2Count - 1); break;
      case 3: this.angelArmy.tier3Count = Math.max(0, this.angelArmy.tier3Count - 1); break;
      case 4: this.angelArmy.tier4Count = Math.max(0, this.angelArmy.tier4Count - 1); break;
    }
  }

  /**
   * Check if a tier can be unlocked
   */
  canUnlockAngelTier(tier: number): { canUnlock: boolean; reason?: string } {
    // Tier 2 requirements
    if (tier === 2) {
      if (this.angelArmy.tier2Unlocked) {
        return { canUnlock: false, reason: 'Tier 2 already unlocked' };
      }
      if (this.angelArmy.tier1Count < 10) {
        return { canUnlock: false, reason: `Need 10 tier-1 angels (have ${this.angelArmy.tier1Count})` };
      }
      if (this.belief.currentBelief < 1000) {
        return { canUnlock: false, reason: `Need 1000 belief (have ${Math.floor(this.belief.currentBelief)})` };
      }
      if (this.belief.totalBeliefEarned < 5000) {
        return { canUnlock: false, reason: `Need 5000 lifetime belief (have ${Math.floor(this.belief.totalBeliefEarned)})` };
      }
      return { canUnlock: true };
    }

    // Tier 3 requirements
    if (tier === 3) {
      if (!this.angelArmy.tier2Unlocked) {
        return { canUnlock: false, reason: 'Must unlock tier 2 first' };
      }
      if (this.angelArmy.tier3Unlocked) {
        return { canUnlock: false, reason: 'Tier 3 already unlocked' };
      }
      if (this.angelArmy.tier2Count < 5) {
        return { canUnlock: false, reason: `Need 5 tier-2 angels (have ${this.angelArmy.tier2Count})` };
      }
      if (this.belief.currentBelief < 3000) {
        return { canUnlock: false, reason: `Need 3000 belief (have ${Math.floor(this.belief.currentBelief)})` };
      }
      if (this.belief.totalBeliefEarned < 15000) {
        return { canUnlock: false, reason: `Need 15000 lifetime belief (have ${Math.floor(this.belief.totalBeliefEarned)})` };
      }
      return { canUnlock: true };
    }

    // Tier 4 requirements
    if (tier === 4) {
      if (!this.angelArmy.tier3Unlocked) {
        return { canUnlock: false, reason: 'Must unlock tier 3 first' };
      }
      if (this.angelArmy.tier4Unlocked) {
        return { canUnlock: false, reason: 'Tier 4 already unlocked' };
      }
      if (this.angelArmy.tier3Count < 3) {
        return { canUnlock: false, reason: `Need 3 tier-3 angels (have ${this.angelArmy.tier3Count})` };
      }
      if (this.belief.currentBelief < 10000) {
        return { canUnlock: false, reason: `Need 10000 belief (have ${Math.floor(this.belief.currentBelief)})` };
      }
      if (this.belief.totalBeliefEarned < 50000) {
        return { canUnlock: false, reason: `Need 50000 lifetime belief (have ${Math.floor(this.belief.totalBeliefEarned)})` };
      }
      return { canUnlock: true };
    }

    return { canUnlock: false, reason: 'Invalid tier' };
  }

  /**
   * Unlock an angel tier (costs belief)
   */
  unlockAngelTier(tier: number): boolean {
    const check = this.canUnlockAngelTier(tier);
    if (!check.canUnlock) {
      return false;
    }

    // Spend belief
    const costs: Record<number, number> = { 2: 1000, 3: 3000, 4: 10000 };
    const cost = costs[tier];
    if (!cost || !this.spendBelief(cost)) {
      return false;
    }

    // Unlock the tier
    switch (tier) {
      case 2: this.angelArmy.tier2Unlocked = true; break;
      case 3: this.angelArmy.tier3Unlocked = true; break;
      case 4: this.angelArmy.tier4Unlocked = true; break;
    }

    return true;
  }

  /**
   * Get total angel count
   */
  getTotalAngelCount(): number {
    return this.angelArmy.tier1Count +
           this.angelArmy.tier2Count +
           this.angelArmy.tier3Count +
           this.angelArmy.tier4Count;
  }

  /**
   * Get highest unlocked tier
   */
  getHighestUnlockedTier(): number {
    if (this.angelArmy.tier4Unlocked) return 4;
    if (this.angelArmy.tier3Unlocked) return 3;
    if (this.angelArmy.tier2Unlocked) return 2;
    return 1;
  }
}
