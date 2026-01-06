/**
 * Summonable Entities - Type Definitions
 *
 * Core interfaces and types for the summoning system.
 */

/** A summonable entity with personality and demands */
export interface SummonableEntity {
  id: string;
  name: string;
  title?: string;
  category: EntityCategory;
  rank: EntityRank;
  description: string;
  personality: EntityPersonality;
  demands: EntityDemand[];
  negotiationStyle: NegotiationStyle;
  services: EntityService[];
  contractTypes: ContractType[];
  appearance: EntityAppearance;
  quirks: string[];
  breachConsequences: BreachConsequence[];
  summoningRequirements: SummoningRequirement[];
  powerLevel: number;
}

/** Categories of summonable entities */
export type EntityCategory =
  | 'demon'
  | 'devil'
  | 'angel'
  | 'spirit'
  | 'fey'
  | 'djinn'
  | 'psychopomp'
  | 'outsider'
  | 'servitor';

/** Power rankings */
export type EntityRank =
  | 'lesser'
  | 'common'
  | 'greater'
  | 'noble'
  | 'prince'
  | 'archetype';

/** Entity personality profile */
export interface EntityPersonality {
  mortalAttitude: 'contemptuous' | 'curious' | 'predatory' | 'protective' | 'indifferent' | 'envious';
  honesty: 'truthful' | 'misleading' | 'deceptive' | 'literalist' | 'compulsive_liar';
  patience: 'eternal' | 'patient' | 'impatient' | 'volatile';
  humor: 'cruel' | 'dark' | 'whimsical' | 'dry' | 'none' | 'inappropriate';
  motivation: 'power' | 'knowledge' | 'chaos' | 'order' | 'entertainment' | 'freedom' | 'revenge' | 'duty';
  voice: 'formal' | 'casual' | 'archaic' | 'cryptic' | 'verbose' | 'laconic' | 'poetic';
}

/** What entities demand in exchange */
export interface EntityDemand {
  type: DemandType;
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  description: string;
  negotiable: boolean;
}

export type DemandType =
  | 'tribute'
  | 'sacrifice'
  | 'service'
  | 'information'
  | 'entertainment'
  | 'worship'
  | 'freedom'
  | 'vengeance'
  | 'knowledge'
  | 'souls'
  | 'emotions'
  | 'time'
  | 'memories'
  | 'names'
  | 'favors'
  | 'artistic_creation';

/** How entities negotiate */
export interface NegotiationStyle {
  openingMove: 'demand' | 'offer' | 'threat' | 'bargain' | 'question' | 'riddle';
  flexibility: 'rigid' | 'pragmatic' | 'creative' | 'chaotic';
  walkAwayThreshold: number;
  counterOfferPatterns: string[];
  dealbreakers: string[];
}

/** Services entities can provide */
export interface EntityService {
  id: string;
  name: string;
  description: string;
  cost: string;
  duration: string;
  limitations: string[];
  sideEffects: string[];
}

export interface ServiceTemplate {
  category: EntityCategory[];
  services: Omit<EntityService, 'id'>[];
}

/** Contract types */
export interface ContractType {
  id: string;
  name: string;
  duration: string;
  bindingStrength: 'weak' | 'strong' | 'absolute';
  escapeClauses: string[];
  penaltyForBreach: string;
}

/** What happens when contracts are breached */
export interface BreachConsequence {
  type: 'curse' | 'possession' | 'debt' | 'hunt' | 'transformation' | 'binding';
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  description: string;
}

/** Entity appearance details */
export interface EntityAppearance {
  baseForm: string;
  variations: string[];
  manifestationEffects: string[];
  concealmentOptions: string[];
}

export interface AppearancePattern {
  baseForms: string[];
  variations: string[];
  manifestationEffects: string[];
  concealmentOptions: string[];
}

/** Summoning requirements */
export interface SummoningRequirement {
  type: 'material' | 'location' | 'timing' | 'sacrifice' | 'ritual' | 'knowledge';
  description: string;
  optional: boolean;
  substitutes?: string[];
}

/** Demand pattern for generation */
export interface DemandPattern {
  category: EntityCategory[];
  rank: EntityRank[];
  demands: Omit<EntityDemand, 'description'>[];
  descriptionTemplates: string[];
}

/** Summoning negotiation state */
export interface SummoningNegotiation {
  entityId: string;
  summonerId: string;
  state: 'initial' | 'negotiating' | 'agreed' | 'rejected' | 'bound';
  currentOffer: NegotiationOffer | null;
  counterOffers: NegotiationOffer[];
  turnsRemaining: number;
  entityPatience: number;
  trustLevel: number;
}

export interface NegotiationOffer {
  services: string[];
  demands: EntityDemand[];
  duration: string;
  additionalTerms: string[];
}

export interface ActiveContract {
  id: string;
  entityId: string;
  summonerId: string;
  services: string[];
  demands: EntityDemand[];
  startTime: number;
  endTime: number;
  bindingStrength: 'weak' | 'strong' | 'absolute';
  breached: boolean;
}
