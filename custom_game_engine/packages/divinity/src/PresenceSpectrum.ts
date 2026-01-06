/**
 * PresenceSpectrum - A Unified Model of Spiritual Existence
 *
 * CORE PHILOSOPHY:
 * There are no hard boundaries between spirits, kami, and gods.
 * Everything exists on a continuous spectrum of PRESENCE.
 *
 * Presence is shaped by ATTENTION - thinking about something,
 * believing in it, respecting it, fearing it, loving it.
 * Attention given = presence strengthened.
 * Attention withdrawn = presence fades.
 *
 * THE SPECTRUM (not discrete categories, but a gradient):
 *
 *  0.0 ────────────────────────────────────────────────── 1.0
 *  │                                                        │
 *  ▼                                                        ▼
 *  LATENT          EMERGENT        ESTABLISHED        TRANSCENDENT
 *  presence        spirit          kami/deity         cosmic force
 *  │               │               │                  │
 *  │ raw potential │ local known   │ named/worshipped │ universal
 *  │ unnamed       │ developing    │ mythology        │ foundational
 *  │ unnoticed     │ offerings     │ temples          │ reality-shaping
 *
 * ANYTHING can move along this spectrum:
 * - A rock, noticed and tended → kami → mountain god
 * - An AI, used and believed in → tsukumogami → digital deity
 * - A fear, felt by many → dark presence → god of terror
 * - A forgotten god → fading kami → mere presence → nothing
 *
 * There is no fundamental difference between a spirit and a god -
 * only where they currently sit on the spectrum.
 */

// ============================================================================
// The Presence Type - Everything Is This
// ============================================================================

/**
 * A Presence is the universal entity type.
 * Spirits, kami, gods, tsukumogami, animal-deities, concepts -
 * they're all just Presences at different points on the spectrum.
 */
export interface Presence {
  id: string;

  // ========================================
  // The Core: Where on the spectrum?
  // ========================================

  /** Position on the presence spectrum (0.0 to 1.0) */
  spectrumPosition: number;

  /** Current phase (derived from spectrum position, but useful label) */
  phase: PresencePhase;

  /** Rate of change (positive = strengthening, negative = fading) */
  momentum: number;

  // ========================================
  // Identity (emerges as presence grows)
  // ========================================

  /** Name (may be undefined for latent presences) */
  name?: string;

  /** Alternative names and epithets (accumulates as presence grows) */
  names: string[];

  /** Description (emerges from how observers perceive it) */
  description: string;

  /** What observers associate with this presence */
  associations: string[];

  // ========================================
  // Anchor: What grounds the presence?
  // ========================================

  /** What is this presence anchored to? */
  anchor: PresenceAnchor;

  /** How tightly bound to the anchor? (0 = can move freely, 1 = completely bound) */
  anchorStrength: number;

  // ========================================
  // Attention Economy
  // ========================================

  /** Total accumulated attention (the "currency" of presence) */
  attention: number;

  /** Rate of attention received (per tick) */
  attentionRate: number;

  /** Rate of attention decay (per tick) */
  decayRate: number;

  /** Peak attention ever achieved */
  peakAttention: number;

  // ========================================
  // Sources of Attention
  // ========================================

  /** How is attention being generated? */
  attentionSources: AttentionSource[];

  // ========================================
  // Capabilities (emerge with higher presence)
  // ========================================

  /** What can this presence do? (depends on spectrum position) */
  capabilities: PresenceCapability[];

  /** Sphere of influence */
  influence: InfluenceSphere;

  // ========================================
  // Relationships
  // ========================================

  /** Relationships with those who attend to this presence */
  relationships: PresenceRelationship[];

  // ========================================
  // History
  // ========================================

  /** When did this presence first emerge from latency? */
  emergedAt?: number;

  /** When did it first achieve named status? */
  namedAt?: number;

  /** Significant events in this presence's existence */
  history: PresenceEvent[];
}

// ============================================================================
// The Spectrum Phases (Labels for Convenience, Not Hard Boundaries)
// ============================================================================

export type PresencePhase =
  | 'latent'         // 0.00 - 0.15: Potential only, not yet manifest
  | 'stirring'       // 0.15 - 0.30: Faint presence, felt but not known
  | 'emergent'       // 0.30 - 0.45: Developing presence, local recognition
  | 'established'    // 0.45 - 0.60: Named, respected, offerings received
  | 'revered'        // 0.60 - 0.75: Worshipped, mythology forming
  | 'divine'         // 0.75 - 0.90: God-like power and recognition
  | 'transcendent';  // 0.90 - 1.00: Cosmic force, reality-shaping

/** Get phase from spectrum position */
export function getPhaseFromPosition(position: number): PresencePhase {
  if (position < 0.15) return 'latent';
  if (position < 0.30) return 'stirring';
  if (position < 0.45) return 'emergent';
  if (position < 0.60) return 'established';
  if (position < 0.75) return 'revered';
  if (position < 0.90) return 'divine';
  return 'transcendent';
}

/** Get approximate position for a phase */
export function getPositionForPhase(phase: PresencePhase): number {
  const positions: Record<PresencePhase, number> = {
    latent: 0.07,
    stirring: 0.22,
    emergent: 0.37,
    established: 0.52,
    revered: 0.67,
    divine: 0.82,
    transcendent: 0.95,
  };
  return positions[phase];
}

// ============================================================================
// Anchors - What Grounds a Presence?
// ============================================================================

export interface PresenceAnchor {
  /** Type of anchor */
  type: AnchorType;

  /** ID of anchoring entity/location/concept */
  anchorId?: string;

  /** Description of the anchor */
  description: string;

  /** Can this anchor be destroyed? */
  destructible: boolean;

  /** What happens if anchor is destroyed? */
  onDestruction: 'fade' | 'drift' | 'transfer' | 'persist';
}

export type AnchorType =
  // Natural
  | 'location'         // Bound to a place (mountain, river, crossroads)
  | 'object'           // Bound to a thing (tree, rock, tool)
  | 'phenomenon'       // Bound to an occurrence (storm, sunset, season)
  // Living
  | 'species'          // Bound to a kind of creature
  | 'bloodline'        // Bound to a family line
  | 'individual'       // Bound to a specific being
  // Human-made
  | 'artifact'         // Bound to a crafted object
  | 'structure'        // Bound to a building or monument
  | 'text'             // Bound to written words
  | 'technology'       // Bound to a technological system
  // Abstract
  | 'concept'          // Bound to an idea (justice, love, death)
  | 'emotion'          // Bound to a feeling
  | 'practice'         // Bound to an activity (farming, war, art)
  | 'community'        // Bound to a group identity
  // Cosmic
  | 'unanchored'       // Free-floating, universal
  | 'self_sustaining'; // Has transcended need for anchor

// ============================================================================
// Attention Sources - What Grows a Presence?
// ============================================================================

export interface AttentionSource {
  /** Type of attention */
  type: AttentionType;

  /** Source entity ID (if applicable) */
  sourceId?: string;

  /** Source species */
  sourceSpecies: 'human' | 'animal' | 'spirit' | 'deity' | 'collective';

  /** Intensity (0-1) */
  intensity: number;

  /** Regularity (one-time vs ongoing) */
  regularity: 'momentary' | 'occasional' | 'regular' | 'constant';

  /** Positive or negative attention (both strengthen presence!) */
  valence: 'positive' | 'negative' | 'neutral';
}

export type AttentionType =
  // Passive attention (weak but common)
  | 'notice'           // Simply noticing the thing exists
  | 'remember'         // Thinking about it
  | 'fear'             // Being afraid of it
  | 'wonder'           // Being curious about it

  // Active attention (stronger)
  | 'naming'           // Giving it a name
  | 'storytelling'     // Telling stories about it
  | 'offering'         // Leaving gifts
  | 'prayer'           // Directed communication
  | 'ritual'           // Formalized attention
  | 'worship'          // Full devotion

  // Maintenance attention
  | 'tending'          // Caring for its anchor (cleaning shrine, watering tree)
  | 'visiting'         // Going to its location
  | 'teaching'         // Passing knowledge of it to others

  // Creative attention
  | 'art'              // Creating art about it
  | 'writing'          // Writing about it
  | 'music'            // Singing/playing about it
  | 'architecture'     // Building for it

  // Meta-attention
  | 'institutionalizing'  // Creating formal structures around it
  | 'defending'           // Fighting to protect it
  | 'spreading'           // Proselytizing

  // Collective attention (very powerful)
  | 'festival'         // Community celebration
  | 'collective_fear'  // Mass terror
  | 'cultural_memory'; // Part of cultural identity

/** Base attention generation rates */
export const ATTENTION_GENERATION_RATES: Record<AttentionType, number> = {
  notice: 0.001,
  remember: 0.002,
  fear: 0.005,
  wonder: 0.003,
  naming: 0.02,         // Naming is significant
  storytelling: 0.015,
  offering: 0.01,
  prayer: 0.02,
  ritual: 0.05,
  worship: 0.1,
  tending: 0.008,
  visiting: 0.015,
  teaching: 0.025,      // Transmission is powerful
  art: 0.03,
  writing: 0.04,        // Written word persists
  music: 0.035,
  architecture: 0.06,   // Buildings last
  institutionalizing: 0.1,
  defending: 0.05,
  spreading: 0.04,
  festival: 0.2,        // Collective attention is very powerful
  collective_fear: 0.15,
  cultural_memory: 0.08,
};

// ============================================================================
// Capabilities - What Can a Presence Do?
// ============================================================================

export interface PresenceCapability {
  /** Name of capability */
  name: string;

  /** Minimum spectrum position to unlock */
  minimumPosition: number;

  /** Power of this capability (scales with spectrum position) */
  basePower: number;

  /** Description */
  description: string;
}

/** Standard capabilities that unlock at different spectrum levels */
export const STANDARD_CAPABILITIES: PresenceCapability[] = [
  // Latent (0.0-0.15)
  { name: 'exist', minimumPosition: 0.0, basePower: 1,
    description: 'Has potential for presence' },

  // Stirring (0.15-0.30)
  { name: 'be_felt', minimumPosition: 0.15, basePower: 2,
    description: 'Can be sensed by sensitive observers' },
  { name: 'influence_mood', minimumPosition: 0.20, basePower: 3,
    description: 'Subtly affects emotional states of those nearby' },

  // Emergent (0.30-0.45)
  { name: 'manifest_signs', minimumPosition: 0.30, basePower: 5,
    description: 'Can create subtle signs (rustling, shadows, feelings)' },
  { name: 'communicate_impression', minimumPosition: 0.35, basePower: 6,
    description: 'Can convey vague impressions to receptive minds' },
  { name: 'attract_attention', minimumPosition: 0.40, basePower: 7,
    description: 'Can draw people to notice anchor/location' },

  // Established (0.45-0.60)
  { name: 'grant_fortune', minimumPosition: 0.45, basePower: 10,
    description: 'Can grant minor luck to those who respect it' },
  { name: 'curse_minor', minimumPosition: 0.50, basePower: 12,
    description: 'Can cause minor misfortune to those who offend' },
  { name: 'communicate_dreams', minimumPosition: 0.52, basePower: 12,
    description: 'Can appear in dreams with messages' },
  { name: 'affect_domain', minimumPosition: 0.55, basePower: 15,
    description: 'Can influence events within sphere of influence' },

  // Revered (0.60-0.75)
  { name: 'grant_power', minimumPosition: 0.60, basePower: 20,
    description: 'Can grant magical abilities to devoted followers' },
  { name: 'manifest_avatar', minimumPosition: 0.65, basePower: 25,
    description: 'Can create temporary physical manifestation' },
  { name: 'curse_severe', minimumPosition: 0.68, basePower: 28,
    description: 'Can inflict serious consequences on enemies' },
  { name: 'create_servants', minimumPosition: 0.70, basePower: 30,
    description: 'Can create lesser presences to serve' },

  // Divine (0.75-0.90)
  { name: 'permanent_avatar', minimumPosition: 0.75, basePower: 40,
    description: 'Can maintain persistent physical form' },
  { name: 'grant_immortality', minimumPosition: 0.78, basePower: 45,
    description: 'Can extend follower lifespans or create undying servants' },
  { name: 'reshape_domain', minimumPosition: 0.82, basePower: 55,
    description: 'Can permanently alter territory' },
  { name: 'create_relics', minimumPosition: 0.85, basePower: 60,
    description: 'Can imbue objects with permanent power' },

  // Transcendent (0.90-1.0)
  { name: 'reality_manipulation', minimumPosition: 0.90, basePower: 80,
    description: 'Can alter fundamental rules within domain' },
  { name: 'cosmic_awareness', minimumPosition: 0.92, basePower: 90,
    description: 'Perceives across vast distances and times' },
  { name: 'spawn_domains', minimumPosition: 0.95, basePower: 100,
    description: 'Can create new realms or dimensions' },
  { name: 'universal_influence', minimumPosition: 0.98, basePower: 120,
    description: 'Affects the universe on a fundamental level' },
];

/** Get capabilities for a spectrum position */
export function getCapabilitiesForPosition(position: number): PresenceCapability[] {
  return STANDARD_CAPABILITIES.filter(c => c.minimumPosition <= position);
}

// ============================================================================
// Influence Sphere
// ============================================================================

export interface InfluenceSphere {
  /** Primary domain of influence */
  primary: string;

  /** Secondary domains */
  secondary: string[];

  /** Geographic range */
  range: InfluenceRange;

  /** How strong is influence at maximum? */
  maxIntensity: number;
}

export type InfluenceRange =
  | 'immediate'    // Only at anchor
  | 'local'        // Immediate surroundings
  | 'village'      // Settlement-scale
  | 'regional'     // Multiple settlements
  | 'kingdom'      // Large territory
  | 'continental'  // Entire continent
  | 'planetary'    // Whole world
  | 'cosmic';      // Beyond world

/** Get influence range from spectrum position */
export function getInfluenceRange(position: number): InfluenceRange {
  if (position < 0.20) return 'immediate';
  if (position < 0.35) return 'local';
  if (position < 0.50) return 'village';
  if (position < 0.65) return 'regional';
  if (position < 0.80) return 'kingdom';
  if (position < 0.92) return 'continental';
  if (position < 0.98) return 'planetary';
  return 'cosmic';
}

// ============================================================================
// Relationships
// ============================================================================

export interface PresenceRelationship {
  /** Entity ID */
  entityId: string;

  /** Entity type */
  entityType: 'mortal' | 'animal' | 'presence' | 'collective';

  /** How they relate */
  relationshipType: RelationshipType;

  /** Strength of relationship */
  strength: number;

  /** Attention contributed */
  attentionContributed: number;

  /** Benefits granted */
  benefitsGranted: string[];
}

export type RelationshipType =
  | 'worshipper'
  | 'devotee'
  | 'priest'
  | 'patron'           // Presence that empowers this one
  | 'servant'          // Presence that serves this one
  | 'ally'
  | 'rival'
  | 'enemy'
  | 'indifferent'
  | 'fearful';

// ============================================================================
// Events
// ============================================================================

export interface PresenceEvent {
  type: PresenceEventType;
  timestamp: number;
  description: string;
  positionChange: number;
  details?: Record<string, unknown>;
}

export type PresenceEventType =
  | 'emerged'           // Rose above latent
  | 'named'             // Received name
  | 'shrine_built'      // Temple/shrine constructed
  | 'festival_held'     // Festival in honor
  | 'miracle_witnessed' // Supernatural act seen
  | 'text_written'      // Story/scripture written
  | 'phase_transition'  // Moved to new phase
  | 'conflict'          // Fought another presence
  | 'merged'            // Combined with another presence
  | 'fragmented'        // Split into multiple presences
  | 'declining'         // Started losing attention
  | 'nearly_faded'      // Close to dissolution
  | 'revived';          // Recovered from near-fading

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a latent presence (the beginning of everything) */
export function createLatentPresence(
  id: string,
  anchor: PresenceAnchor
): Presence {
  return {
    id,
    spectrumPosition: 0.05,
    phase: 'latent',
    momentum: 0,
    names: [],
    description: 'A faint potential, not yet manifest',
    associations: [],
    anchor,
    anchorStrength: 1.0,
    attention: 0,
    attentionRate: 0,
    decayRate: 0.001,
    peakAttention: 0,
    attentionSources: [],
    capabilities: getCapabilitiesForPosition(0.05),
    influence: {
      primary: anchor.description,
      secondary: [],
      range: 'immediate',
      maxIntensity: 0.1,
    },
    relationships: [],
    history: [],
  };
}

/** Create a presence at a specific spectrum position */
export function createPresence(
  id: string,
  name: string | undefined,
  anchor: PresenceAnchor,
  position: number
): Presence {
  const phase = getPhaseFromPosition(position);
  const range = getInfluenceRange(position);

  return {
    id,
    spectrumPosition: position,
    phase,
    momentum: 0,
    name,
    names: name ? [name] : [],
    description: name ? `The presence known as ${name}` : 'An unnamed presence',
    associations: [],
    anchor,
    anchorStrength: position < 0.8 ? 0.8 : 0.3, // Higher presences less bound
    attention: position * 100,
    attentionRate: 0,
    decayRate: 0.001 * (1 - position * 0.5), // Higher presences decay slower
    peakAttention: position * 100,
    attentionSources: [],
    capabilities: getCapabilitiesForPosition(position),
    influence: {
      primary: anchor.description,
      secondary: [],
      range,
      maxIntensity: position,
    },
    relationships: [],
    history: [],
    emergedAt: position >= 0.15 ? Date.now() : undefined,
    namedAt: name ? Date.now() : undefined,
  };
}

/** Create a presence from a place */
export function createPlacePresence(
  id: string,
  placeName: string,
  locationId: string,
  initialPosition: number = 0.10
): Presence {
  return createPresence(
    id,
    initialPosition >= 0.30 ? `Spirit of ${placeName}` : undefined,
    {
      type: 'location',
      anchorId: locationId,
      description: placeName,
      destructible: false,
      onDestruction: 'persist',
    },
    initialPosition
  );
}

/** Create a presence from an object (techno-animism included) */
export function createObjectPresence(
  id: string,
  objectDescription: string,
  objectId: string,
  age: number,
  isTechnology: boolean = false
): Presence {
  // Older objects have more presence potential
  // Well-used technology also accumulates presence faster
  const basePosition = Math.min(0.5, age * 0.001 + (isTechnology ? 0.1 : 0));

  return createPresence(
    id,
    basePosition >= 0.30 ? `Spirit of the ${objectDescription}` : undefined,
    {
      type: isTechnology ? 'technology' : 'artifact',
      anchorId: objectId,
      description: objectDescription,
      destructible: true,
      onDestruction: 'fade',
    },
    basePosition
  );
}

/** Create a concept presence */
export function createConceptPresence(
  id: string,
  concept: string,
  initialPosition: number = 0.20
): Presence {
  return createPresence(
    id,
    initialPosition >= 0.40 ? concept : undefined,
    {
      type: 'concept',
      description: concept,
      destructible: false,
      onDestruction: 'persist',
    },
    initialPosition
  );
}

// ============================================================================
// Spectrum Dynamics - How Presences Move on the Spectrum
// ============================================================================

/** Calculate position change from attention sources */
export function calculateMomentum(presence: Presence): number {
  // Sum up attention generation
  const attentionGeneration = presence.attentionSources.reduce((sum, source) => {
    const baseRate = ATTENTION_GENERATION_RATES[source.type] ?? 0.001;
    const regularityMultiplier =
      source.regularity === 'constant' ? 2.0 :
      source.regularity === 'regular' ? 1.5 :
      source.regularity === 'occasional' ? 1.0 : 0.5;
    return sum + baseRate * source.intensity * regularityMultiplier;
  }, 0);

  // Subtract decay
  const decay = presence.decayRate;

  // Net momentum
  const momentum = attentionGeneration - decay;

  // Higher positions are harder to reach
  const resistanceFactor = 1 - presence.spectrumPosition * 0.5;

  return momentum * resistanceFactor;
}

/** Update presence based on tick */
export function updatePresence(presence: Presence, deltaTime: number): Presence {
  const momentum = calculateMomentum(presence);

  // Update attention
  const attentionChange = momentum * deltaTime;
  const newAttention = Math.max(0, presence.attention + attentionChange);

  // Position moves based on attention thresholds
  // This creates the "stickiness" - you need sustained attention to move up
  const targetPosition = attentionToPosition(newAttention);
  const positionChange = (targetPosition - presence.spectrumPosition) * 0.01 * deltaTime;
  const newPosition = Math.max(0, Math.min(1, presence.spectrumPosition + positionChange));

  const newPhase = getPhaseFromPosition(newPosition);

  // Check for phase transitions
  const events = [...presence.history];
  if (newPhase !== presence.phase) {
    events.push({
      type: 'phase_transition',
      timestamp: Date.now(),
      description: `Transitioned from ${presence.phase} to ${newPhase}`,
      positionChange: newPosition - presence.spectrumPosition,
    });
  }

  return {
    ...presence,
    attention: newAttention,
    spectrumPosition: newPosition,
    phase: newPhase,
    momentum,
    peakAttention: Math.max(presence.peakAttention, newAttention),
    capabilities: getCapabilitiesForPosition(newPosition),
    influence: {
      ...presence.influence,
      range: getInfluenceRange(newPosition),
      maxIntensity: newPosition,
    },
    history: events,
  };
}

/** Convert attention to target spectrum position */
export function attentionToPosition(attention: number): number {
  // Logarithmic scale - takes more attention to reach higher positions
  if (attention <= 0) return 0;
  return Math.min(1, Math.log10(attention + 1) / 5);
}

/** Convert spectrum position to required attention */
export function positionToAttention(position: number): number {
  return Math.pow(10, position * 5) - 1;
}

// ============================================================================
// Interactions Between Presences
// ============================================================================

/** Two presences can merge if worshipped together */
export function mergePresences(
  presence1: Presence,
  presence2: Presence,
  newId: string,
  newName: string
): Presence {
  const combinedAttention = presence1.attention + presence2.attention;
  const combinedPosition = Math.min(
    1,
    Math.max(presence1.spectrumPosition, presence2.spectrumPosition) +
    Math.min(presence1.spectrumPosition, presence2.spectrumPosition) * 0.3
  );

  return {
    id: newId,
    spectrumPosition: combinedPosition,
    phase: getPhaseFromPosition(combinedPosition),
    momentum: (presence1.momentum + presence2.momentum) / 2,
    name: newName,
    names: [newName, ...presence1.names, ...presence2.names],
    description: `Born from the merging of ${presence1.name ?? 'an unnamed presence'} and ${presence2.name ?? 'an unnamed presence'}`,
    associations: [...presence1.associations, ...presence2.associations],
    anchor: presence1.anchorStrength >= presence2.anchorStrength ? presence1.anchor : presence2.anchor,
    anchorStrength: Math.max(presence1.anchorStrength, presence2.anchorStrength),
    attention: combinedAttention,
    attentionRate: presence1.attentionRate + presence2.attentionRate,
    decayRate: Math.min(presence1.decayRate, presence2.decayRate),
    peakAttention: combinedAttention,
    attentionSources: [...presence1.attentionSources, ...presence2.attentionSources],
    capabilities: getCapabilitiesForPosition(combinedPosition),
    influence: {
      primary: `${presence1.influence.primary} and ${presence2.influence.primary}`,
      secondary: [...presence1.influence.secondary, ...presence2.influence.secondary],
      range: getInfluenceRange(combinedPosition),
      maxIntensity: combinedPosition,
    },
    relationships: [...presence1.relationships, ...presence2.relationships],
    history: [
      {
        type: 'merged',
        timestamp: Date.now(),
        description: `Merged from ${presence1.name ?? 'unnamed'} and ${presence2.name ?? 'unnamed'}`,
        positionChange: 0,
      },
    ],
    emergedAt: Math.min(presence1.emergedAt ?? Date.now(), presence2.emergedAt ?? Date.now()),
    namedAt: Date.now(),
  };
}

/** Higher presence empowers lower one */
export function empower(patron: Presence, recipient: Presence): {
  patron: Presence;
  recipient: Presence;
} {
  if (patron.spectrumPosition <= recipient.spectrumPosition) {
    return { patron, recipient }; // Can't empower equals or superiors
  }

  const transferAmount = patron.attention * 0.1;
  const positionBoost = (patron.spectrumPosition - recipient.spectrumPosition) * 0.05;

  return {
    patron: {
      ...patron,
      attention: patron.attention - transferAmount,
      relationships: [
        ...patron.relationships,
        {
          entityId: recipient.id,
          entityType: 'presence',
          relationshipType: 'servant',
          strength: 0.5,
          attentionContributed: 0,
          benefitsGranted: ['empowerment'],
        },
      ],
    },
    recipient: {
      ...recipient,
      attention: recipient.attention + transferAmount,
      spectrumPosition: Math.min(1, recipient.spectrumPosition + positionBoost),
      relationships: [
        ...recipient.relationships,
        {
          entityId: patron.id,
          entityType: 'presence',
          relationshipType: 'patron',
          strength: 0.5,
          attentionContributed: transferAmount,
          benefitsGranted: [],
        },
      ],
    },
  };
}

// ============================================================================
// Convenient Labels (For When Discrete Categories Are Useful)
// ============================================================================

/** Get a human-readable label for a presence */
export function getPresenceLabel(presence: Presence): string {
  const position = presence.spectrumPosition;

  if (position < 0.15) return 'latent presence';
  if (position < 0.25) return 'faint spirit';
  if (position < 0.35) return 'local spirit';
  if (position < 0.45) return presence.anchor.type === 'technology' ? 'tsukumogami' : 'nature spirit';
  if (position < 0.55) return 'kami';
  if (position < 0.65) return 'revered kami';
  if (position < 0.75) return 'minor deity';
  if (position < 0.85) return 'deity';
  if (position < 0.95) return 'great deity';
  return 'cosmic force';
}

/** Check if presence qualifies for various traditional labels */
export function isSpirit(presence: Presence): boolean {
  return presence.spectrumPosition >= 0.15 && presence.spectrumPosition < 0.55;
}

export function isKami(presence: Presence): boolean {
  return presence.spectrumPosition >= 0.45 && presence.spectrumPosition < 0.75;
}

export function isDeity(presence: Presence): boolean {
  return presence.spectrumPosition >= 0.65;
}

export function isTsukumogami(presence: Presence): boolean {
  return (presence.anchor.type === 'artifact' || presence.anchor.type === 'technology') &&
         presence.spectrumPosition >= 0.30;
}
