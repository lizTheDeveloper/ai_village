/**
 * Soul-Influenced Dreams - Generate dreams from soul's eternal perspective
 *
 * Adds dream types influenced by the soul:
 * - Past life echoes (fragments of previous incarnations)
 * - Wisdom hints (soul guiding current incarnation)
 * - Cross-incarnation memories (high-wisdom souls)
 * - Plot foreshadowing (The Fates whispering through dreams)
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SoulLinkComponent } from './SoulLinkComponent.js';
import type { SoulIdentityComponent } from './SoulIdentityComponent.js';
import type { SilverThreadComponent } from './SilverThreadComponent.js';
import type { PlotLinesComponent } from '../plot/PlotTypes.js';

/**
 * Soul-influenced dream types
 */
export type SoulDreamType =
  | 'past_life_echo'           // Fragment from previous incarnation
  | 'wisdom_hint'              // Soul guidance
  | 'prophetic_vision'         // Plot foreshadowing
  | 'ancestral_memory'         // Deep soul memory
  | 'lesson_reminder';         // Recalling a lesson learned

/**
 * Soul dream content
 */
export interface SoulDream {
  type: SoulDreamType;
  content: string;
  intensity: number;        // 0-1 (how vivid)
  source_tick?: number;     // Personal tick of source event
  lesson_id?: string;       // If related to a lesson
}

/**
 * Generate soul-influenced dream for an agent
 */
export function generateSoulDream(
  agent: Entity,
  world: World
): SoulDream | null {
  // Check if agent has a soul
  const soulLink = agent.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;
  if (!soulLink) return null;

  // Get soul entity
  const soul = world.getEntity(soulLink.soul_id);
  if (!soul) return null;

  const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
  const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

  if (!identity || !thread) return null;

  // Probability based on soul influence and wisdom
  const dreamProbability = soulLink.soul_influence_strength * (identity.wisdom_level / 100);
  if (Math.random() > dreamProbability) return null;

  // Choose dream type based on wisdom level
  const dreamType = chooseDreamType(identity.wisdom_level, soulLink.incarnation_number);

  // Generate dream content
  switch (dreamType) {
    case 'past_life_echo':
      return generatePastLifeEcho(soul, thread, identity);

    case 'wisdom_hint':
      return generateWisdomHint(soul, identity);

    case 'prophetic_vision':
      return generatePropheticVision(soul, identity);

    case 'ancestral_memory':
      return generateAncestralMemory(soul, thread, identity);

    case 'lesson_reminder':
      return generateLessonReminder(soul, identity);

    default:
      return null;
  }
}

/**
 * Choose dream type based on wisdom level
 */
function chooseDreamType(wisdom: number, incarnationNumber: number): SoulDreamType {
  // First incarnation - mostly wisdom hints
  if (incarnationNumber === 1) {
    return Math.random() < 0.8 ? 'wisdom_hint' : 'lesson_reminder';
  }

  // Low wisdom - occasional past life echoes
  if (wisdom < 25) {
    const roll = Math.random();
    if (roll < 0.6) return 'past_life_echo';
    if (roll < 0.9) return 'wisdom_hint';
    return 'lesson_reminder';
  }

  // Medium wisdom - more wisdom hints, some prophetic visions
  if (wisdom < 50) {
    const roll = Math.random();
    if (roll < 0.4) return 'wisdom_hint';
    if (roll < 0.7) return 'past_life_echo';
    if (roll < 0.9) return 'lesson_reminder';
    return 'prophetic_vision';
  }

  // High wisdom - prophetic and ancestral
  if (wisdom < 75) {
    const roll = Math.random();
    if (roll < 0.3) return 'prophetic_vision';
    if (roll < 0.5) return 'wisdom_hint';
    if (roll < 0.7) return 'ancestral_memory';
    if (roll < 0.9) return 'past_life_echo';
    return 'lesson_reminder';
  }

  // Very high wisdom - mostly prophetic and ancestral
  const roll = Math.random();
  if (roll < 0.5) return 'prophetic_vision';
  if (roll < 0.8) return 'ancestral_memory';
  return 'wisdom_hint';
}

/**
 * Generate past life echo dream
 */
function generatePastLifeEcho(
  _soul: Entity,
  thread: SilverThreadComponent,
  identity: SoulIdentityComponent
): SoulDream {
  // Pick a random significant event from the past
  const pastEvents = thread.events.filter(e =>
    e.type === 'major_milestone' ||
    e.type === 'meaningful_choice' ||
    e.type === 'first_time_event'
  );

  if (pastEvents.length === 0) {
    return {
      type: 'past_life_echo',
      content: 'You dream of fog and shadows, shapes you almost recognize but cannot quite recall...',
      intensity: 0.3,
    };
  }

  const event = pastEvents[Math.floor(Math.random() * pastEvents.length)];
  if (!event) {
    return {
      type: 'past_life_echo',
      content: 'You dream of fog and shadows, shapes you almost recognize but cannot quite recall...',
      intensity: 0.3,
    };
  }

  return {
    type: 'past_life_echo',
    content: `You dream of a life long past: ${event.details.description || 'a moment of significance'}. The details are hazy, but the feeling lingers...`,
    intensity: 0.5 + (identity.wisdom_level / 200),
    source_tick: event.personal_tick,
  };
}

/**
 * Generate wisdom hint dream
 */
function generateWisdomHint(
  _soul: Entity,
  identity: SoulIdentityComponent
): SoulDream {
  // Pick a random lesson learned
  if (identity.lessons_learned.length === 0) {
    return {
      type: 'wisdom_hint',
      content: 'You dream of a quiet voice offering guidance, but you cannot quite make out the words...',
      intensity: 0.4,
    };
  }

  const lesson = identity.lessons_learned[Math.floor(Math.random() * identity.lessons_learned.length)];
  if (!lesson) {
    return {
      type: 'wisdom_hint',
      content: 'You dream of a quiet voice offering guidance, but you cannot quite make out the words...',
      intensity: 0.4,
    };
  }

  return {
    type: 'wisdom_hint',
    content: `In your dream, you hear a familiar voice whispering: "${lesson.insight}"`,
    intensity: 0.6,
    lesson_id: lesson.lesson_id,
  };
}

/**
 * Generate prophetic vision dream (plot foreshadowing)
 */
function generatePropheticVision(
  soul: Entity,
  identity: SoulIdentityComponent
): SoulDream {
  const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;

  if (!plotLines || plotLines.active.length === 0) {
    return {
      type: 'prophetic_vision',
      content: 'You dream of paths not yet taken, choices that lie ahead in the mist...',
      intensity: 0.7,
    };
  }

  // Pick a random active plot
  const plot = plotLines.active[Math.floor(Math.random() * plotLines.active.length)];
  if (!plot) {
    return {
      type: 'prophetic_vision',
      content: 'You dream of paths not yet taken, choices that lie ahead in the mist...',
      intensity: 0.7,
    };
  }

  return {
    type: 'prophetic_vision',
    content: `You see visions of what may come to pass - a journey of ${plot.template_id}, fraught with meaning...`,
    intensity: 0.7 + (identity.wisdom_level / 300),
  };
}

/**
 * Generate ancestral memory dream (deep soul history)
 */
function generateAncestralMemory(
  _soul: Entity,
  thread: SilverThreadComponent,
  identity: SoulIdentityComponent
): SoulDream {
  return {
    type: 'ancestral_memory',
    content: `You dream of lives upon lives, a silver thread stretching back through ${thread.totals.incarnations} incarnations. You remember your true name: ${identity.true_name}.`,
    intensity: 0.8,
  };
}

/**
 * Generate lesson reminder dream
 */
function generateLessonReminder(
  _soul: Entity,
  identity: SoulIdentityComponent
): SoulDream {
  if (identity.lessons_learned.length === 0) {
    return {
      type: 'lesson_reminder',
      content: 'You dream of lessons yet to be learned, knowledge waiting to be discovered...',
      intensity: 0.5,
    };
  }

  // Pick most recent lesson
  const lesson = identity.lessons_learned[identity.lessons_learned.length - 1];
  if (!lesson) {
    return {
      type: 'lesson_reminder',
      content: 'You dream of lessons yet to be learned, knowledge waiting to be discovered...',
      intensity: 0.5,
    };
  }

  return {
    type: 'lesson_reminder',
    content: `Your recent insight echoes in your dreams: "${lesson.insight}" - gained through ${lesson.domain}.`,
    intensity: 0.6,
    lesson_id: lesson.lesson_id,
  };
}

/**
 * Check if agent should receive a soul dream this sleep cycle
 */
export function shouldReceiveSoulDream(
  agent: Entity,
  world: World
): boolean {
  const soulLink = agent.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;
  if (!soulLink) return false;

  const soul = world.getEntity(soulLink.soul_id);
  if (!soul) return false;

  const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
  if (!identity) return false;

  // Base probability: soul influence * wisdom factor
  const baseProbability = soulLink.soul_influence_strength * (identity.wisdom_level / 100);

  return Math.random() < baseProbability;
}
