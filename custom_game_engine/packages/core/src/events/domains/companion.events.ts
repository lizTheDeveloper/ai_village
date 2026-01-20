/**
 * Companion-related events.
 * Covers companion evolution, emotions, advice, needs, memories, and milestones.
 */
import type { EntityId } from '../../types.js';

export interface CompanionEvents {
  /** When companion evolves to a new tier */
  'companion:evolved': {
    companionId: EntityId;
    previousTier: number;
    newTier: number;
    triggerMilestone: string;
  };

  /** When companion emotion changes */
  'companion:emotion_changed': {
    companionId: EntityId;
    previousEmotion?: string;
    newEmotion: string;
    reason: string;
  };

  /** When companion offers advice to player */
  'companion:advice': {
    companionId?: EntityId;
    adviceType: 'pattern' | 'contextual' | 'warning' | 'suggestion';
    adviceText?: string;
    text?: string; // Legacy field, use adviceText
    category?: string; // 'defense', 'farming', 'agent_welfare', 'resources', 'general'
    priority: 'low' | 'medium' | 'high' | number; // Can be string or 0-1 number
  };

  /** When a companion need drops below critical threshold */
  'companion:need_critical': {
    companionId: EntityId;
    need: string;
    value: number;
  };

  /** When companion forms an important memory */
  'companion:memory_formed': {
    companionId: EntityId;
    memoryType: 'player' | 'self';
    content: string;
  };

  /** When companion reaches a milestone */
  'companion:milestone': {
    companionId?: EntityId;
    milestone: string;
    description: string;
  };

  // EXOTIC PLOT EVENTS - for Fates Council
  /** When agent encounters a dimensional entity (Ophanim, β-space horror) */
  'companion:dimensional_encounter': {
    agentId: EntityId;
    soulId: string;
    creatureId: string;
    creatureType: 'ophanim' | 'dimensional_horror' | 'reality_eater';
    encounterType: 'summoned' | 'accidental_breach' | 'portal_opened';
    sanityDamage: number;
    tick: number;
  };
}

export type CompanionEventType = keyof CompanionEvents;
export type CompanionEventData = CompanionEvents[CompanionEventType];
