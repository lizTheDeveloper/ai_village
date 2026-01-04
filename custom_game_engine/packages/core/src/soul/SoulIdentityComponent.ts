/**
 * SoulIdentityComponent - Core eternal identity of a soul
 *
 * The soul's unchanging essence created by The Three Fates.
 * Persists across all incarnations and universe forks.
 */

import { ComponentType } from '../types/ComponentType.js';

/**
 * Record of a lesson learned by the soul
 */
export interface LessonRecord {
  lesson_id: string;
  learned_at_personal_tick: number;
  universe_id: string;
  incarnation: number;
  wisdom_gained: number;
  domain: WisdomDomain;
  insight: string;           // The actual lesson text
  plot_source?: string;      // Which plot taught this
}

/**
 * Wisdom domains - areas of soul growth
 */
export type WisdomDomain =
  | 'relationships'    // Love, trust, forgiveness
  | 'systems'          // How the world works
  | 'self'             // Self-knowledge
  | 'transcendence'    // What lies beyond
  | 'power'            // How to wield influence
  | 'mortality';       // How to die well

/**
 * How the soul was created
 */
export type SoulCreationType =
  | 'fates'                  // Standard creation by Three Fates
  | 'divine_intervention'    // Created by a deity
  | 'spontaneous';           // Emerged naturally

/**
 * Soul Identity Component
 *
 * Core identity that never changes across incarnations and universes.
 */
export interface SoulIdentityComponent {
  type: ComponentType.SoulIdentity;

  // Core identity (never changes)
  true_name: string;           // Discovered through Fate ceremony
  created_at: number;          // Multiverse absolute tick
  created_by: SoulCreationType;

  // From the Fates
  purpose: string;             // Weaver's declaration
  core_interests: string[];    // Spinner's gifts
  destiny?: string;            // Cutter's prophecy
  archetype: string;           // wanderer, protector, creator, etc.
  cosmic_alignment: number;    // -1 to 1

  // Cumulative across lives
  incarnation_count: number;
  total_personal_ticks: number;
  wisdom_level: number;        // 0-100+
  lessons_learned: LessonRecord[];
}

/**
 * Create a new SoulIdentityComponent
 */
export function createSoulIdentityComponent(params: {
  true_name: string;
  created_at: number;
  created_by?: SoulCreationType;
  purpose: string;
  core_interests: string[];
  destiny?: string;
  archetype: string;
  cosmic_alignment?: number;
}): SoulIdentityComponent {
  return {
    type: ComponentType.SoulIdentity,
    true_name: params.true_name,
    created_at: params.created_at,
    created_by: params.created_by || 'fates',
    purpose: params.purpose,
    core_interests: params.core_interests,
    destiny: params.destiny,
    archetype: params.archetype,
    cosmic_alignment: params.cosmic_alignment ?? 0,
    incarnation_count: 0,
    total_personal_ticks: 0,
    wisdom_level: 0,
    lessons_learned: [],
  };
}

/**
 * Add a lesson to the soul's permanent record
 */
export function addLessonToSoul(
  soul: SoulIdentityComponent,
  lesson: {
    lesson_id: string;
    personal_tick: number;
    universe_id: string;
    incarnation: number;
    wisdom_gained: number;
    domain: WisdomDomain;
    insight: string;
    plot_source?: string;
  }
): void {
  // Check for duplicates
  const existing = soul.lessons_learned.find(l => l.lesson_id === lesson.lesson_id);
  if (existing) {
    console.warn(`[SoulIdentity] Lesson ${lesson.lesson_id} already learned, skipping`);
    return;
  }

  // Add lesson
  soul.lessons_learned.push({
    lesson_id: lesson.lesson_id,
    learned_at_personal_tick: lesson.personal_tick,
    universe_id: lesson.universe_id,
    incarnation: lesson.incarnation,
    wisdom_gained: lesson.wisdom_gained,
    domain: lesson.domain,
    insight: lesson.insight,
    plot_source: lesson.plot_source,
  });

  // Increase wisdom
  soul.wisdom_level += lesson.wisdom_gained;
}

/**
 * Check if soul has learned a specific lesson
 */
export function hasLearnedLesson(soul: SoulIdentityComponent, lesson_id: string): boolean {
  return soul.lessons_learned.some(l => l.lesson_id === lesson_id);
}

/**
 * Get wisdom in a specific domain
 */
export function getWisdomInDomain(soul: SoulIdentityComponent, domain: WisdomDomain): number {
  return soul.lessons_learned
    .filter(l => l.domain === domain)
    .reduce((sum, l) => sum + l.wisdom_gained, 0);
}
