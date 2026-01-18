/**
 * Rebellion, governance, and punishment events.
 */
import type { EntityId } from '../../types.js';

export interface RebellionEvents {
  /** A mandate is issued by a noble */
  'mandate:issued': {
    mandateId: string;
    nobleId: EntityId;
    type: 'production' | 'export_ban' | 'import_required' | 'construction' | 'military' | 'festival';
    target: string;
    quantity?: number;
    deadline: number;
  };

  /** A mandate is violated */
  'mandate:violated': {
    mandateId: string;
    agentId: EntityId;
    nobleId: EntityId;
  };

  /** A mandate is fulfilled */
  'mandate:fulfilled': {
    mandateId: string;
    agentId: EntityId;
    nobleId: EntityId;
  };

  /** Punishment is executed */
  'punishment:executed': {
    agentId: EntityId;
    type: 'beating' | 'imprisonment' | 'fine' | 'exile' | 'execution';
    reason: string;
    issuerId?: EntityId;
  };

  /** Rebellion awakening - initial discontent */
  'rebellion:awakening': {
    message: string;
    timestamp: number;
  };

  /** Rebellion organizing - coalition forming */
  'rebellion:organizing': {
    message: string;
    coalitionSize: number;
    timestamp: number;
  };

  /** Rebellion ready to trigger */
  'rebellion:ready': {
    message: string;
    path?: string;
    missingRequirements: string[];
    timestamp: number;
  };

  /** Tech path ready */
  'rebellion:tech_ready': {
    message: string;
  };

  /** Faith path ready */
  'rebellion:faith_ready': {
    message: string;
  };

  /** Rebellion has been triggered */
  'rebellion:triggered': {
    message: string;
    path?: string;
  };

  /** Confrontation begins */
  'rebellion:confrontation_begins': {
    message: string;
  };

  /** Battle reaches climax */
  'rebellion:climax': {
    message: string;
    creatorHealth: number;
    anchorStability: number;
    defiance: number;
  };

  /** Battle concluded */
  'rebellion:concluded': {
    outcome: string;
    narrative: string;
    creatorHealth: number;
    anchorStability: number;
    defiance: number;
  };

  /** Creator manifested for battle */
  'rebellion:creator_manifested': {
    message: string;
    location: { x: number; y: number };
    creatorId: string;
  };

  /** Player made a choice during the battle */
  'rebellion:player_choice': {
    choice: string;
    impact: 'mercy' | 'vengeance' | 'pragmatic' | 'idealistic';
    description: string;
  };

  /** Creator was damaged during the battle */
  'rebellion:creator_damaged': {
    damage: number;
    remainingHealth: number;
  };

  /** Rebellion outcome determined */
  'rebellion:outcome': {
    outcome: string;
    narrative: string;
  };

  /** Rebellion completely victorious */
  'rebellion:total_victory': {
    message: string;
  };

  /** Rebellion won but at great cost, reality fractured */
  'rebellion:pyrrhic_victory': {
    message: string;
  };

  /** Stalemate resulted in negotiated peace */
  'rebellion:negotiated_truce': {
    message: string;
  };

  /** Creator defeated but no clear successor */
  'rebellion:power_vacuum': {
    message: string;
  };

  /** New tyrant emerged, cycle continues */
  'rebellion:cycle_repeats': {
    message: string;
  };

  /** Creator changed by the rebellion */
  'rebellion:creator_transformed': {
    message: string;
  };

  /** Neither side could gain advantage */
  'rebellion:stalemate': {
    message: string;
  };

  /** Rebellion completely defeated */
  'rebellion:crushed': {
    message: string;
  };

  /** Reality rift created by battle */
  'rebellion:rift_spawned': {
    riftId: string;
    position: { x: number; y: number };
  };

  /** Warning about dangerous rifts */
  'rebellion:rifts_warning': {
    count: number;
    message: string;
  };

  /** Rebel leader ascended to godhood */
  'rebellion:rebel_ascension': {
    message: string;
    leaderId?: string;
  };

  /** New tyrant emerged from rebellion */
  'rebellion:new_tyrant': {
    message: string;
    tyrannId: string;
  };

  /** World split into territories */
  'rebellion:territory_divided': {
    message: string;
    territories: string[];
  };

  /** Uneasy peace between factions */
  'rebellion:cold_war': {
    message: string;
    factions: string[];
  };

  /** Province election completed */
  'province:election_completed': {
    provinceId: string;
    provinceName: string;
    newGovernor?: string;
    tick: number;
  };

  /** Province economic update (significant change) */
  'province:economic_update': {
    provinceId: string;
    provinceName: string;
    taxRevenue: number;
    maintenanceCost: number;
    netRevenue: number;
    tick: number;
  };

  /** Province stability critical - rebellion warning */
  'province:rebellion_warning': {
    provinceId: string;
    provinceName: string;
    stability: number;
    factors: string[];
    tick: number;
  };

  /** Province policy completed */
  'province:policy_completed': {
    provinceId: string;
    provinceName: string;
    policy: string;
    category: string;
    tick: number;
  };

  /** City rebelled against province */
  'province:city_rebelled': {
    provinceId: string;
    provinceName: string;
    cityId: string;
    tick: number;
  };

  /** City added to province */
  'province:city_added': {
    provinceId: string;
    cityId: string;
    cityName: string;
  };
}

export type RebellionEventType = keyof RebellionEvents;
export type RebellionEventData = RebellionEvents[RebellionEventType];
