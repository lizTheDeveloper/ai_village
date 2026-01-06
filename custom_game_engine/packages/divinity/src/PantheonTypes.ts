/**
 * PantheonTypes - Pantheon structures, divine relationships, and politics
 *
 * Gods exist in relation to each other. They form pantheons, alliances, rivalries,
 * and complex webs of divine politics. This shapes mortal religion and conflict.
 */

import type { DivineDomain } from './DeityTypes.js';

// ============================================================================
// Pantheon Structures
// ============================================================================

/** Types of pantheon organizational structures */
export type PantheonStructure =
  | 'council'       // Gods meet as equals, vote on decisions
  | 'hierarchical'  // Clear rank ordering with a ruler
  | 'familial'      // Structured by divine family relationships
  | 'adversarial'   // Opposed factions, no unity
  | 'loose'         // Informal association, minimal structure
  | 'dualistic'     // Two primary opposing forces
  | 'henotheistic'  // Many gods, one supreme
  | 'monolatrous';  // Worship one, acknowledge others

/** A pantheon of deities */
export interface Pantheon {
  id: string;

  /** Name of the pantheon */
  name: string;

  /** Organizational structure */
  structure: PantheonStructure;

  /** Deity IDs in this pantheon */
  memberDeityIds: string[];

  /** Ruler deity (if hierarchical/henotheistic) */
  rulerDeityId?: string;

  /** Council members (if council structure) */
  councilDeityIds?: string[];

  /** Founding deity (first to emerge) */
  founderDeityId?: string;

  /** When the pantheon formed */
  formedAt: number;

  /** Shared mythology */
  sharedMythIds: string[];

  /** Dominant domains of this pantheon */
  dominantDomains: DivineDomain[];

  /** Mortal civilizations that worship this pantheon */
  worshippingCivIds: string[];

  /** Total believer count across all members */
  totalBelieverCount: number;

  /** Internal politics state */
  politics: PantheonPolitics;

  /** External relations with other pantheons */
  externalRelations: PantheonRelation[];
}

/** Internal political state of a pantheon */
export interface PantheonPolitics {
  /** How stable is the pantheon? (0-1) */
  stability: number;

  /** Active factions within the pantheon */
  factions: PantheonFaction[];

  /** Pending matters for council/ruler decision */
  pendingMatters: DivineMatter[];

  /** Recent votes (if council) */
  recentVotes: DivineVote[];

  /** Is a succession crisis happening? */
  successionCrisis: boolean;

  /** Is there an active schism threat? */
  schismThreat: boolean;
}

/** A faction within a pantheon */
export interface PantheonFaction {
  id: string;

  /** Faction name */
  name: string;

  /** Leader deity */
  leaderDeityId: string;

  /** Member deities */
  memberDeityIds: string[];

  /** What this faction wants */
  goals: string[];

  /** Opposing faction (if any) */
  opposingFactionId?: string;

  /** Power relative to pantheon (0-1) */
  relativeStrength: number;
}

/** Relationship between pantheons */
export interface PantheonRelation {
  /** Other pantheon */
  targetPantheonId: string;

  /** Overall sentiment */
  sentiment: 'allied' | 'friendly' | 'neutral' | 'hostile' | 'war';

  /** Active treaties */
  treatyIds: string[];

  /** History of conflicts */
  conflictHistory: string[];
}

// ============================================================================
// Divine Relationships
// ============================================================================

/** Relationship between two deities */
export interface DivineRelationship {
  id: string;

  /** First deity */
  deityAId: string;

  /** Second deity */
  deityBId: string;

  /** Relationship type */
  type: DivineRelationshipType;

  /** A's sentiment toward B (-1 to 1) */
  sentimentAtoB: number;

  /** B's sentiment toward A (-1 to 1) */
  sentimentBtoA: number;

  /** A's feelings about B */
  feelingsAtoB: DivineFeeling[];

  /** B's feelings about A */
  feelingsBtoA: DivineFeeling[];

  /** Formal status */
  formalStatus: DivineFormalStatus;

  /** Origin of relationship */
  origin: RelationshipOrigin;

  /** When relationship began */
  establishedAt: number;

  /** Key events in this relationship */
  historyEventIds: string[];

  /** Is this relationship public knowledge to mortals? */
  knownToMortals: boolean;

  /** How mortals perceive this relationship */
  mortalPerception?: string;
}

/** Types of divine relationships */
export type DivineRelationshipType =
  | 'strangers'     // No significant interaction yet
  | 'acquaintances' // Aware of each other
  | 'allies'        // Working together
  | 'rivals'        // Competing
  | 'enemies'       // Active conflict
  | 'friends'       // Genuine affection
  | 'lovers'        // Romantic involvement
  | 'siblings'      // Divine family (mythological)
  | 'parent_child'  // Divine parentage
  | 'consorts'      // Formal divine partnership
  | 'mentor_pupil'  // Teaching relationship
  | 'master_servant'; // Hierarchical subservience

/** Specific feelings one deity has for another */
export type DivineFeeling =
  | 'respect'       // Admires their power/wisdom
  | 'contempt'      // Looks down on them
  | 'fear'          // Afraid of them
  | 'jealousy'      // Envies something they have
  | 'affection'     // Genuinely likes them
  | 'hatred'        // Actively despises them
  | 'curiosity'     // Interested in them
  | 'indifference'  // Doesn't care about them
  | 'gratitude'     // Owes them something
  | 'resentment'    // Holds a grudge
  | 'protectiveness'// Wants to safeguard them
  | 'possessiveness'// Views them as belonging to them
  | 'admiration'    // Looks up to them
  | 'pity'          // Feels sorry for them
  | 'amusement'     // Finds them entertaining
  | 'frustration'   // Annoyed by them
  | 'desire'        // Wants them (power, domain, romantically)
  | 'trust'         // Believes in their reliability
  | 'suspicion';    // Doesn't trust them

/** Formal diplomatic status between deities */
export type DivineFormalStatus =
  | 'none'          // No formal relationship
  | 'recognition'   // Formally acknowledge each other
  | 'non_aggression'// Agree not to fight
  | 'trade_pact'    // Share believers/power
  | 'alliance'      // Formal alliance
  | 'vassalage'     // One submits to the other
  | 'war'           // Formal state of conflict
  | 'eternal_enmity'; // Sworn enemies forever

/** How a relationship originated */
export type RelationshipOrigin =
  | 'mythology'     // Created in shared myths
  | 'emergence'     // Met when one emerged
  | 'conflict'      // Started through conflict
  | 'cooperation'   // Started through working together
  | 'schism'        // Split from same faith
  | 'syncretism'    // Partial merger
  | 'mortal_belief' // Mortals believe they're related
  | 'divine_chat';  // Met through divine communication

// ============================================================================
// Divine Matters and Voting
// ============================================================================

/** A matter requiring divine decision */
export interface DivineMatter {
  id: string;

  /** What the matter concerns */
  type: DivineMatterType;

  /** Description of the matter */
  description: string;

  /** Who raised the matter */
  raisedByDeityId: string;

  /** When it was raised */
  raisedAt: number;

  /** Deadline for resolution (if any) */
  deadline?: number;

  /** Current status */
  status: 'pending' | 'voting' | 'resolved' | 'deadlocked' | 'withdrawn';

  /** Proposed options */
  options: DivineMatterOption[];

  /** Resolution (if resolved) */
  resolution?: {
    chosenOptionId: string;
    resolvedAt: number;
    enforced: boolean;
  };
}

/** Types of matters that come before divine councils */
export type DivineMatterType =
  | 'admission'         // New deity joining pantheon
  | 'expulsion'         // Removing a deity
  | 'war_declaration'   // War against another pantheon/deity
  | 'peace_proposal'    // Ending a conflict
  | 'treaty'            // Formal agreement
  | 'domain_dispute'    // Who controls what domain
  | 'mortal_intervention'// Whether to act in mortal affairs
  | 'rule_change'       // Changing pantheon rules
  | 'succession'        // Who leads the pantheon
  | 'punishment'        // Punishing a deity for transgression
  | 'prophecy'          // What a prophecy means
  | 'creation'          // Whether to create something
  | 'destruction';      // Whether to destroy something

/** An option in a divine matter */
export interface DivineMatterOption {
  id: string;
  description: string;
  proposedByDeityId: string;
  supportingDeityIds: string[];
  opposingDeityIds: string[];
}

/** A vote on a divine matter */
export interface DivineVote {
  matterId: string;

  /** Votes cast by each deity */
  votes: Map<string, string>; // deityId -> optionId

  /** When voting started */
  startedAt: number;

  /** When voting ended */
  endedAt?: number;

  /** Winning option */
  result?: string;

  /** Was it unanimous? */
  unanimous: boolean;

  /** Did anyone abstain? */
  abstentions: string[];
}

// ============================================================================
// Diplomatic Actions
// ============================================================================

/** A diplomatic action between deities */
export interface DiplomaticAction {
  id: string;

  /** Acting deity */
  actorDeityId: string;

  /** Target deity */
  targetDeityId: string;

  /** Type of action */
  type: DiplomaticActionType;

  /** When it occurred */
  timestamp: number;

  /** Was it accepted/rejected? */
  response?: 'accepted' | 'rejected' | 'ignored' | 'countered';

  /** Terms offered */
  terms?: DiplomaticTerms;

  /** Resulting relationship change */
  relationshipChange?: {
    sentimentDelta: number;
    newFormalStatus?: DivineFormalStatus;
  };
}

/** Types of diplomatic actions */
export type DiplomaticActionType =
  | 'greeting'          // Initial contact
  | 'compliment'        // Praise
  | 'insult'            // Offense
  | 'threat'            // Warning of consequences
  | 'gift'              // Offering (belief, artifacts)
  | 'proposal'          // Formal proposal (alliance, treaty)
  | 'demand'            // Requiring something
  | 'apology'           // Seeking forgiveness
  | 'challenge'         // Formal challenge
  | 'submission'        // Accepting subordination
  | 'declaration_war'   // War declaration
  | 'peace_offer'       // Seeking peace
  | 'betrayal'          // Breaking an agreement
  | 'invitation';       // Inviting to something

/** Terms in a diplomatic agreement */
export interface DiplomaticTerms {
  /** What actor offers */
  actorOffers: DiplomaticOffer[];

  /** What actor requests */
  actorRequests: DiplomaticOffer[];

  /** Duration of agreement (game hours, -1 for permanent) */
  duration: number;

  /** Penalties for breaking */
  breakingPenalties?: string[];
}

/** Something offered in diplomacy */
export interface DiplomaticOffer {
  type: 'belief' | 'believers' | 'territory' | 'artifact' | 'support' | 'domain_access' | 'myth_acknowledgment' | 'non_interference';
  amount?: number;
  description: string;
}

// ============================================================================
// Treaties
// ============================================================================

/** A formal treaty between deities */
export interface DivineTreaty {
  id: string;

  /** Treaty name */
  name: string;

  /** Participating deities */
  signatoryDeityIds: string[];

  /** Type of treaty */
  type: TreatyType;

  /** When signed */
  signedAt: number;

  /** When it expires (-1 for permanent) */
  expiresAt: number;

  /** Specific terms */
  terms: TreatyTerm[];

  /** Is it still in effect? */
  active: boolean;

  /** If ended, how? */
  endReason?: 'expired' | 'mutual_termination' | 'violated' | 'superseded';

  /** Who violated it (if applicable) */
  violatorDeityId?: string;
}

/** Types of treaties */
export type TreatyType =
  | 'non_aggression'    // No fighting
  | 'alliance'          // Mutual support
  | 'trade'             // Sharing resources
  | 'domain_boundary'   // Territory agreement
  | 'protection'        // One protects another
  | 'non_interference'  // Stay out of each other's affairs
  | 'peace'             // Ending a war
  | 'vassalage'         // Submission terms
  | 'marriage';         // Divine union

/** A specific term in a treaty */
export interface TreatyTerm {
  description: string;
  obligatedDeityIds: string[];
  verifiable: boolean;
  violationDetected: boolean;
}

// ============================================================================
// Divine Conflicts
// ============================================================================

/** A conflict between deities */
export interface DivineConflict {
  id: string;

  /** Name of the conflict */
  name: string;

  /** Type of conflict */
  type: ConflictType;

  /** Parties involved (factions) */
  sides: ConflictSide[];

  /** When it started */
  startedAt: number;

  /** When it ended (if over) */
  endedAt?: number;

  /** Current phase */
  phase: ConflictPhase;

  /** What started it */
  casus_belli: string;

  /** Major events in the conflict */
  eventIds: string[];

  /** Impact on mortals */
  mortalImpact: MortalImpact;

  /** How it ended (if over) */
  resolution?: ConflictResolution;
}

/** Types of divine conflicts */
export type ConflictType =
  | 'theological_dispute'   // Disagreement over doctrine
  | 'domain_war'            // Fighting over a domain
  | 'believer_war'          // Fighting over worshippers
  | 'personal_feud'         // Personal animosity
  | 'succession_war'        // Fighting for leadership
  | 'cosmic_war'            // Large-scale divine war
  | 'honor_duel'            // Formal one-on-one
  | 'proxy_war';            // Fighting through mortals

/** A side in a conflict */
export interface ConflictSide {
  name: string;
  leaderDeityId: string;
  memberDeityIds: string[];
  goals: string[];
  currentStrength: number;
}

/** Phases of a conflict */
export type ConflictPhase =
  | 'brewing'       // Tensions rising
  | 'declared'      // Formally at war
  | 'active'        // Fighting happening
  | 'stalemate'     // Neither winning
  | 'one_sided'     // Clear winner emerging
  | 'negotiating'   // Peace talks
  | 'resolved';     // Over

/** Impact of divine conflict on mortals */
export interface MortalImpact {
  /** How aware are mortals? */
  awareness: 'oblivious' | 'rumors' | 'aware' | 'involved';

  /** Deaths caused */
  mortalCasualties: number;

  /** Religious conflicts sparked */
  religiousConflicts: string[];

  /** Natural disasters caused */
  naturalDisasters: string[];
}

/** How a conflict was resolved */
export interface ConflictResolution {
  type: 'victory' | 'defeat' | 'draw' | 'treaty' | 'extinction' | 'merger';
  victorSideIndex?: number;
  treatyId?: string;
  description: string;
}

// ============================================================================
// Divine Meetings
// ============================================================================

/** A meeting between deities */
export interface DivineMeeting {
  id: string;

  /** Who called the meeting */
  callerDeityId: string;

  /** Attendees */
  attendeeDeityIds: string[];

  /** Who declined */
  declinedDeityIds: string[];

  /** Location (symbolic/mythological) */
  location: string;

  /** When it occurred */
  timestamp: number;

  /** Topics discussed */
  topics: string[];

  /** Outcomes */
  outcomes: MeetingOutcome[];

  /** Transcript (for divine chat) */
  transcript?: DivineChatMessage[];
}

/** Outcome of a divine meeting */
export interface MeetingOutcome {
  type: 'agreement' | 'disagreement' | 'postponed' | 'new_proposal' | 'relationship_change';
  description: string;
  affectedDeityIds: string[];
}

// ============================================================================
// Divine Chat Message (referenced here, detailed in DivineChatTypes)
// ============================================================================

/** A message in divine chat (basic type, extended in DivineChatTypes) */
export interface DivineChatMessage {
  id: string;
  senderDeityId: string;
  content: string;
  timestamp: number;
  type: 'message' | 'emote' | 'announcement';
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a new divine relationship */
export function createRelationship(
  deityAId: string,
  deityBId: string,
  origin: RelationshipOrigin = 'emergence'
): DivineRelationship {
  return {
    id: `rel_${deityAId}_${deityBId}`,
    deityAId,
    deityBId,
    type: 'strangers',
    sentimentAtoB: 0,
    sentimentBtoA: 0,
    feelingsAtoB: ['curiosity'],
    feelingsBtoA: ['curiosity'],
    formalStatus: 'none',
    origin,
    establishedAt: Date.now(),
    historyEventIds: [],
    knownToMortals: false,
  };
}

/** Create a new pantheon */
export function createPantheon(
  name: string,
  structure: PantheonStructure,
  founderDeityId: string
): Pantheon {
  return {
    id: `pantheon_${Date.now()}`,
    name,
    structure,
    memberDeityIds: [founderDeityId],
    founderDeityId,
    formedAt: Date.now(),
    sharedMythIds: [],
    dominantDomains: [],
    worshippingCivIds: [],
    totalBelieverCount: 0,
    politics: {
      stability: 1.0,
      factions: [],
      pendingMatters: [],
      recentVotes: [],
      successionCrisis: false,
      schismThreat: false,
    },
    externalRelations: [],
  };
}

/** Calculate relationship strength from sentiment and feelings */
export function calculateRelationshipStrength(
  sentiment: number,
  feelings: DivineFeeling[]
): number {
  let strength = Math.abs(sentiment);

  // Positive feelings add to positive relationships
  const positiveFeeling = ['respect', 'affection', 'gratitude', 'admiration', 'trust'];
  const negativeFeeling = ['contempt', 'hatred', 'resentment', 'suspicion'];

  const posCount = feelings.filter(f => positiveFeeling.includes(f)).length;
  const negCount = feelings.filter(f => negativeFeeling.includes(f)).length;

  strength += posCount * 0.1;
  strength -= negCount * 0.1;

  return Math.max(-1, Math.min(1, strength));
}

/** Get relationship summary */
export function getRelationshipSummary(rel: DivineRelationship): string {
  const avgSentiment = (rel.sentimentAtoB + rel.sentimentBtoA) / 2;

  if (avgSentiment > 0.7) return 'close allies';
  if (avgSentiment > 0.3) return 'friendly';
  if (avgSentiment > -0.3) return 'neutral';
  if (avgSentiment > -0.7) return 'hostile';
  return 'bitter enemies';
}
