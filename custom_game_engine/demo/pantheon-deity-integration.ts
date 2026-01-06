/**
 * Pantheon-Deity Integration
 *
 * Connects the networked Pantheon of Gods system with the existing
 * deity/belief infrastructure for full game integration.
 *
 * Features:
 * - Gods have DeityComponent with belief tracking
 * - Divine actions cost belief points
 * - Believers generate belief for gods
 * - Gods can answer prayers from the queue
 * - Dynamic power selection based on belief reserves
 * - Personality traits sync with PerceivedPersonality
 */

import type {
  World,
  DeityComponent,
  DivineDomain,
  type PerceivedPersonality,
} from '../packages/core/src/index.js';
import { ComponentType as CT } from '../packages/core/src/index.js';

// ============================================================================
// Belief Cost System
// ============================================================================

/** Belief costs for divine actions */
export const DIVINE_ACTION_COSTS = {
  // Entity spawning
  spawn_agent: 200,          // Creating life is expensive
  spawn_animal: 150,

  // Blessings
  bless_agent: 75,           // Standard prayer answer cost
  bless_building: 100,       // Blessing structures

  // Curses
  curse_agent: 100,          // Curses cost more (morally expensive)

  // Weather
  change_weather: 50,        // Minor environmental control

  // Events
  divine_proclamation: 25,   // Just talking
  divine_intervention: 500,  // Major reality manipulation (Elder only)

  // Prayers
  answer_prayer: 75,         // Standard prayer response
  send_vision: 100,          // Prophetic vision
  minor_miracle: 150,        // Small miracle
} as const;

/** Belief generation rates per believer */
export const BELIEF_GENERATION_RATES = {
  passive_faith: 0.1,        // Base generation per believer per tick
  active_prayer: 2.0,        // When actively praying
  witnessed_miracle: 5.0,    // After seeing divine action
  ritual: 3.0,               // During ceremonies
} as const;

// ============================================================================
// Domain Mapping
// ============================================================================

/** Map pantheon domains to deity system DivineDomain */
export function mapPantheonDomain(pantheonDomain: string): DivineDomain {
  const domainMap: Record<string, DivineDomain> = {
    // Direct mappings
    'harvest': 'harvest',
    'war': 'war',
    'wisdom': 'wisdom',
    'craft': 'craft',
    'nature': 'nature',
    'death': 'death',
    'love': 'love',
    'chaos': 'chaos',
    'order': 'order',
    'fortune': 'fortune',
    'protection': 'protection',
    'healing': 'healing',
    'mystery': 'mystery',
    'time': 'time',
    'sky': 'sky',
    'earth': 'earth',
    'water': 'water',
    'fire': 'fire',
    'storm': 'storm',
    'hunt': 'hunt',
    'home': 'home',
    'travel': 'travel',
    'trade': 'trade',
    'justice': 'justice',
    'vengeance': 'vengeance',
    'dreams': 'dreams',
    'fear': 'fear',
    'beauty': 'beauty',
    'trickery': 'trickery',

    // Extended mappings
    'agriculture': 'harvest',
    'farming': 'harvest',
    'combat': 'war',
    'strength': 'war',
    'knowledge': 'wisdom',
    'forge': 'craft',
    'crafting': 'craft',
    'building': 'craft',
    'forest': 'nature',
    'trees': 'nature',
    'animals': 'nature',
    'social': 'love',
    'relationships': 'love',
    'mischief': 'trickery',
    'pranks': 'trickery',
    'destiny': 'time',
  };

  return domainMap[pantheonDomain.toLowerCase()] || 'mystery';
}

// ============================================================================
// Personality Mapping
// ============================================================================

/** Map pantheon god tier to perceived personality */
export function createPersonalityFromTier(
  tier: 'elder' | 'lesser' | 'trickster' | 'spirit',
  customPersonality?: string
): PerceivedPersonality {
  const basePersonalities: Record<string, Partial<PerceivedPersonality>> = {
    elder: {
      mysteriousness: 0.8,      // Very mysterious
      interventionism: 0.3,     // Selective intervention
      wrathfulness: 0.2,        // Patient
      consistency: 0.9,         // Very reliable
      benevolence: 0.5,         // Neutral to kind
      generosity: 0.6,          // Somewhat giving
      seriousness: 0.9,         // Very stern
      compassion: 0.7,          // Caring
    },
    lesser: {
      mysteriousness: 0.4,      // Fairly clear
      interventionism: 0.7,     // Very active
      wrathfulness: 0.5,        // Moderate temper
      consistency: 0.7,         // Reliable
      benevolence: 0.6,         // Generally kind
      generosity: 0.7,          // Giving
      seriousness: 0.6,         // Moderately stern
      compassion: 0.8,          // Very caring
    },
    trickster: {
      mysteriousness: 0.9,      // Very inscrutable
      interventionism: 0.9,     // Constantly meddling
      wrathfulness: 0.3,        // Playful, not wrathful
      consistency: 0.1,         // Very capricious
      benevolence: 0.0,         // Neutral (chaotic)
      generosity: 0.5,          // Unpredictable
      seriousness: 0.1,         // Very playful
      compassion: 0.4,          // Somewhat indifferent
    },
    spirit: {
      mysteriousness: 0.6,      // Moderately mysterious
      interventionism: 0.9,     // Always present
      wrathfulness: 0.1,        // Very patient
      consistency: 0.8,         // Reliable
      benevolence: 0.8,         // Very kind
      generosity: 0.8,          // Very giving
      seriousness: 0.3,         // Gentle
      compassion: 0.9,          // Deeply caring
    },
  };

  const base = basePersonalities[tier] || {};

  // Apply personality modifiers from custom description
  const modifiers = parsePersonalityModifiers(customPersonality || '');

  return {
    benevolence: base.benevolence! + (modifiers.benevolence || 0),
    interventionism: base.interventionism! + (modifiers.interventionism || 0),
    wrathfulness: base.wrathfulness! + (modifiers.wrathfulness || 0),
    mysteriousness: base.mysteriousness! + (modifiers.mysteriousness || 0),
    generosity: base.generosity! + (modifiers.generosity || 0),
    consistency: base.consistency! + (modifiers.consistency || 0),
    seriousness: base.seriousness! + (modifiers.seriousness || 0),
    compassion: base.compassion! + (modifiers.compassion || 0),
  };
}

/** Parse personality modifiers from description text */
function parsePersonalityModifiers(description: string): Partial<PerceivedPersonality> {
  const mods: Partial<PerceivedPersonality> = {};
  const lower = description.toLowerCase();

  // Benevolence
  if (lower.includes('kind') || lower.includes('nurturing')) mods.benevolence = 0.2;
  if (lower.includes('cruel') || lower.includes('harsh')) mods.benevolence = -0.3;
  if (lower.includes('fierce') || lower.includes('aggressive')) mods.benevolence = -0.1;

  // Interventionism
  if (lower.includes('involved') || lower.includes('active')) mods.interventionism = 0.2;
  if (lower.includes('distant') || lower.includes('aloof')) mods.interventionism = -0.3;

  // Wrathfulness
  if (lower.includes('patient') || lower.includes('gentle')) mods.wrathfulness = -0.2;
  if (lower.includes('wrathful') || lower.includes('angry')) mods.wrathfulness = 0.3;

  // Mysteriousness
  if (lower.includes('mysterious') || lower.includes('cryptic')) mods.mysteriousness = 0.3;
  if (lower.includes('direct') || lower.includes('clear')) mods.mysteriousness = -0.2;

  // Playfulness
  if (lower.includes('playful') || lower.includes('mischievous')) {
    mods.seriousness = -0.3;
    mods.consistency = -0.2;
  }
  if (lower.includes('stern') || lower.includes('serious')) mods.seriousness = 0.3;

  return mods;
}

// ============================================================================
// Deity Entity Creation
// ============================================================================

/**
 * Create or update a deity entity for a pantheon god
 */
export function createDeityEntity(
  world: World,
  godName: string,
  tier: 'elder' | 'lesser' | 'trickster' | 'spirit',
  domains: string[],
  personalityDesc: string,
  existingDeityId?: string
): string {
  // Find or create deity entity
  let deityEntity;

  if (existingDeityId) {
    deityEntity = world.getEntity(existingDeityId);
  }

  if (!deityEntity) {
    // Create new deity entity
    deityEntity = (world as any).createEntity();

    // Add deity component
    const primaryDomain = mapPantheonDomain(domains[0] || 'mystery');
    const personality = createPersonalityFromTier(tier, personalityDesc);

    const deityComp = new DeityComponent(godName, 'ai');

    // Set identity
    deityComp.identity.domain = primaryDomain;
    deityComp.identity.secondaryDomains = domains.slice(1).map(mapPantheonDomain);
    deityComp.identity.perceivedPersonality = personality;

    // Set initial belief (gods start with power based on tier)
    const initialBelief = {
      'elder': 1000,
      'lesser': 500,
      'trickster': 300,
      'spirit': 100,
    }[tier];

    deityComp.belief.currentBelief = initialBelief;

    (deityEntity as any).addComponent(deityComp);
  }

  return deityEntity.id;
}

// ============================================================================
// Action Execution with Belief Costs
// ============================================================================

/**
 * Check if deity has enough belief for an action
 */
export function canAffordAction(
  deity: DeityComponent,
  actionType: keyof typeof DIVINE_ACTION_COSTS
): boolean {
  const cost = DIVINE_ACTION_COSTS[actionType];
  return deity.belief.currentBelief >= cost;
}

/**
 * Spend belief on an action
 */
export function spendBeliefForAction(
  deity: DeityComponent,
  actionType: keyof typeof DIVINE_ACTION_COSTS
): boolean {
  const cost = DIVINE_ACTION_COSTS[actionType];
  return deity.spendBelief(cost);
}

/**
 * Get recommended action based on belief reserves and priorities
 */
export function selectActionByBelief(
  deity: DeityComponent,
  availableActions: Array<keyof typeof DIVINE_ACTION_COSTS>
): keyof typeof DIVINE_ACTION_COSTS | null {
  // Filter to affordable actions
  const affordable = availableActions.filter(action =>
    canAffordAction(deity, action)
  );

  if (affordable.length === 0) {
    return null;
  }

  // Priority order (high to low)
  const priorities: Array<keyof typeof DIVINE_ACTION_COSTS> = [
    'answer_prayer',          // Always prioritize believers
    'send_vision',
    'bless_agent',
    'minor_miracle',
    'bless_building',
    'change_weather',
    'spawn_agent',
    'curse_agent',
    'divine_proclamation',
    'divine_intervention',
  ];

  // Return highest priority affordable action
  for (const priority of priorities) {
    if (affordable.includes(priority)) {
      return priority;
    }
  }

  // Fallback to first affordable
  return affordable[0];
}

// ============================================================================
// Believer Management
// ============================================================================

/**
 * Add belief from believers
 */
export function generateBeliefFromBelievers(
  world: World,
  deity: DeityComponent,
  currentTick: number
): void {
  // Query for agents who believe in this deity
  const believers = Array.from(world.query()
    .with(CT.Agent)
    .with(CT.Spiritual)
    .executeEntities());

  let totalBelief = 0;
  let activeCount = 0;

  for (const believer of believers) {
    const spiritual = believer.getComponent(CT.Spiritual) as any;

    // Check if they believe in this deity (by name)
    if (spiritual?.believedDeity === deity.identity.primaryName) {
      // Base belief generation
      const baseRate = BELIEF_GENERATION_RATES.passive_faith;

      // Bonus for high faith
      const faithBonus = (spiritual.faith || 0.5) * baseRate;

      const generated = baseRate + faithBonus;
      totalBelief += generated;
      activeCount++;

      // Add believer to deity's set
      deity.addBeliever(believer.id);
    }
  }

  // Add accumulated belief
  if (totalBelief > 0) {
    deity.addBelief(totalBelief, currentTick);
    deity.updateBeliefRate(totalBelief);
  }
}

// ============================================================================
// Prayer System Integration
// ============================================================================

/**
 * Answer prayers from the queue
 */
export function processPrayerQueue(
  world: World,
  deity: DeityComponent
): number {
  let answered = 0;

  // Process up to 3 prayers per action
  while (deity.prayerQueue.length > 0 && answered < 3) {
    const prayer = deity.getNextPrayer();
    if (!prayer) break;

    // Check if we can afford to answer
    if (canAffordAction(deity, 'answer_prayer')) {
      const success = deity.answerPrayer(prayer.prayerId);

      if (success) {
        answered++;

        // Emit event
        world.eventBus?.emit({
          type: 'prayer:answered',
          payload: {
            deityId: deity.identity.primaryName,
            agentId: prayer.agentId,
            prayerId: prayer.prayerId,
            timestamp: Date.now(),
          }
        });
      }
    } else {
      // Not enough belief - stop processing
      break;
    }
  }

  return answered;
}

// ============================================================================
// Power Selection Helper
// ============================================================================

/**
 * Get available divine powers based on belief and tier
 */
export function getAvailablePowers(
  deity: DeityComponent,
  tier: 'elder' | 'lesser' | 'trickster' | 'spirit'
): Array<keyof typeof DIVINE_ACTION_COSTS> {
  const allPowers: Array<keyof typeof DIVINE_ACTION_COSTS> = [
    'answer_prayer',
    'send_vision',
    'bless_agent',
    'bless_building',
    'change_weather',
    'spawn_agent',
    'curse_agent',
    'minor_miracle',
    'divine_proclamation',
    'divine_intervention',
  ];

  // Filter by tier permissions
  const tierPermissions: Record<string, Set<keyof typeof DIVINE_ACTION_COSTS>> = {
    elder: new Set(allPowers),
    lesser: new Set([
      'answer_prayer',
      'send_vision',
      'bless_agent',
      'bless_building',
      'change_weather',
      'spawn_agent',
      'minor_miracle',
      'divine_proclamation',
    ]),
    trickster: new Set([
      'answer_prayer',
      'send_vision',
      'bless_agent',
      'curse_agent',
      'minor_miracle',
      'divine_proclamation',
    ]),
    spirit: new Set([
      'answer_prayer',
      'bless_agent',
      'divine_proclamation',
    ]),
  };

  const permitted = allPowers.filter(power =>
    tierPermissions[tier]?.has(power)
  );

  // Filter to affordable
  return permitted.filter(power => canAffordAction(deity, power));
}

/**
 * Get deity's belief status for UI display
 */
export function getBeliefStatus(deity: DeityComponent): {
  current: number;
  rate: number;
  total: number;
  spent: number;
  believers: number;
} {
  return {
    current: Math.floor(deity.belief.currentBelief),
    rate: deity.belief.beliefPerTick,
    total: Math.floor(deity.belief.totalBeliefEarned),
    spent: Math.floor(deity.belief.totalBeliefSpent),
    believers: deity.believers.size,
  };
}

// ============================================================================
// Myth Attribution Event Handling
// ============================================================================

/**
 * Handle myth attribution changes (theological conflicts)
 *
 * When a myth's attribution changes from one deity to another:
 * - The new deity gains belief and potential believers
 * - The original deity loses some influence
 * - This can trigger divine rivalry in multi-deity pantheons
 */
export function handleMythAttributionChanged(
  world: World,
  event: {
    mythId: string;
    mythTitle: string;
    originalDeityId: string;
    newDeityId: string;
    timestamp: number;
  }
): void {
  // Find the deity entities
  const deities = Array.from(world.query()
    .with(CT.Deity)
    .executeEntities());

  const originalDeity = deities.find(d => d.id === event.originalDeityId);
  const newDeity = deities.find(d => d.id === event.newDeityId);

  if (!originalDeity || !newDeity) {
    console.warn(`[Attribution] Could not find deities for attribution change: ${event.originalDeityId} -> ${event.newDeityId}`);
    return;
  }

  const originalDeityComp = originalDeity.getComponent(CT.Deity) as DeityComponent;
  const newDeityComp = newDeity.getComponent(CT.Deity) as DeityComponent;

  if (!originalDeityComp || !newDeityComp) {
    return;
  }

  console.log(`[Attribution] Myth "${event.mythTitle}" re-attributed: ${originalDeityComp.identity.primaryName} → ${newDeityComp.identity.primaryName}`);

  // Calculate belief transfer (10% of original deity's current belief)
  const beliefTransfer = Math.floor(originalDeityComp.belief.currentBelief * 0.1);

  if (beliefTransfer > 0) {
    // Transfer belief
    originalDeityComp.spendBelief(beliefTransfer);
    newDeityComp.addBelief(beliefTransfer, event.timestamp);

    console.log(`[Attribution] Transferred ${beliefTransfer} belief to ${newDeityComp.identity.primaryName}`);
  }

  // Find believers who might convert
  const believers = Array.from(world.query()
    .with(CT.Agent)
    .with(CT.Spiritual)
    .executeEntities());

  let convertedCount = 0;

  for (const believer of believers) {
    const spiritual = believer.getComponent(CT.Spiritual) as any;

    // If they believe in the original deity, they might convert
    if (spiritual?.believedDeity === originalDeityComp.identity.primaryName) {
      // 20% chance to convert to the new deity
      if (Math.random() < 0.2) {
        spiritual.believedDeity = newDeityComp.identity.primaryName;

        // Update deity believer sets
        originalDeityComp.removeBeliever(believer.id);
        newDeityComp.addBeliever(believer.id);

        convertedCount++;
      }
    }
  }

  if (convertedCount > 0) {
    console.log(`[Attribution] ${convertedCount} believers converted from ${originalDeityComp.identity.primaryName} to ${newDeityComp.identity.primaryName}`);
  }

  // Emit a theological conflict event for pantheon systems to react
  world.eventBus?.emit({
    type: 'theology:conflict',
    payload: {
      type: 'myth_attribution',
      mythId: event.mythId,
      mythTitle: event.mythTitle,
      originalDeity: originalDeityComp.identity.primaryName,
      newDeity: newDeityComp.identity.primaryName,
      beliefTransferred: beliefTransfer,
      believersConverted: convertedCount,
      timestamp: event.timestamp,
    }
  });
}

/**
 * Subscribe to myth attribution events for a world
 */
export function subscribeToAttributionEvents(world: World): void {
  world.eventBus?.subscribe('myth:attribution_changed', (event: any) => {
    handleMythAttributionChanged(world, event.data);
  });

  console.log('[PantheonIntegration] Subscribed to myth attribution events');
}
