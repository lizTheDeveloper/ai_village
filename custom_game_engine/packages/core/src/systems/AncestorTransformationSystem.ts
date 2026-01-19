/**
 * AncestorTransformationSystem - Transforms qualifying souls into Ancestor Kami
 *
 * Souls that meet the criteria (high peace, maintained coherence, living descendants)
 * can become Ancestor Kami - protective spirits that can bless or curse their descendants.
 *
 * Transformation requirements:
 * - peace > 0.8 (accepted death)
 * - coherence > 0.5 (maintained identity)
 * - tether > 0.3 (still connected to mortal world)
 * - descendants.length > 0 (has living family)
 *
 * On transformation:
 * - Generates blessings based on skills/personality from life
 * - Generates curses (opposite of blessings)
 * - Sets preferred offerings based on memories
 * - Sets taboos based on personality
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { AfterlifeComponent } from '../components/AfterlifeComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';

// Skill to blessing mapping
const SKILL_BLESSINGS: Record<string, string> = {
  'farming': 'crop_growth',
  'gathering': 'foraging_luck',
  'building': 'construction_speed',
  'crafting': 'crafting_quality',
  'cooking': 'food_preservation',
  'combat': 'battle_prowess',
  'hunting': 'hunting_luck',
  'fishing': 'fishing_luck',
  'mining': 'ore_finding',
  'herbalism': 'herb_potency',
  'medicine': 'healing_speed',
  'leadership': 'morale_boost',
  'diplomacy': 'negotiation_success',
  'trading': 'merchant_luck',
};

// Skill to curse mapping (when neglected)
const SKILL_CURSES: Record<string, string> = {
  'farming': 'crop_blight',
  'gathering': 'empty_hands',
  'building': 'construction_delay',
  'crafting': 'tool_breaking',
  'cooking': 'food_spoilage',
  'combat': 'battle_hesitation',
  'hunting': 'prey_escapes',
  'fishing': 'empty_nets',
  'mining': 'tunnel_collapse_risk',
  'herbalism': 'herb_withering',
  'medicine': 'slow_recovery',
  'leadership': 'morale_drain',
  'diplomacy': 'misunderstandings',
  'trading': 'bad_deals',
};

// Common offerings all ancestors appreciate
const COMMON_OFFERINGS = ['incense', 'flowers', 'water', 'rice'];

// Taboos based on cause of death
const DEATH_TABOOS: Record<string, string[]> = {
  'murder': ['violence_against_family', 'betrayal'],
  'starvation': ['wasting_food', 'hoarding'],
  'combat': ['cowardice', 'dishonorable_fighting'],
  'accident': ['recklessness', 'ignoring_warnings'],
  'disease': ['neglecting_hygiene', 'ignoring_illness'],
  'old_age': ['disrespecting_elders', 'impatience'],
  'sacrifice': ['refusing_duty', 'selfishness'],
  'exposure': ['abandoning_travelers', 'refusing_shelter'],
};

export class AncestorTransformationSystem extends BaseSystem {
  readonly id: SystemId = 'ancestor_transformation';
  readonly priority: number = 115;  // After AfterlifeNeedsSystem
  readonly requiredComponents: ReadonlyArray<ComponentType> = ['afterlife', 'realm_location'];
  // Only run when afterlife components exist (O(1) activation check)
  readonly activationComponents = ['afterlife'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const afterlife = entity.getComponent<AfterlifeComponent>('afterlife');

      if (!afterlife) continue;

      // Skip if already transformed or is a shade
      if (afterlife.isAncestorKami || afterlife.isShade || afterlife.hasPassedOn) continue;

      // Check transformation criteria
      const qualifies =
        afterlife.peace > 0.8 &&
        afterlife.coherence > 0.5 &&
        afterlife.tether > 0.3 &&
        afterlife.descendants.length > 0;

      if (!qualifies) continue;

      // Transform into Ancestor Kami
      this.transformToAncestorKami(ctx.world, entity, afterlife);
    }
  }

  private transformToAncestorKami(
    world: World,
    entity: EntityImpl,
    afterlife: AfterlifeComponent
  ): void {
    // Mark as ancestor kami
    afterlife.isAncestorKami = true;

    // Determine rank based on descendants and remembrance
    if (afterlife.descendants.length >= 10 || afterlife.timesRemembered >= 100) {
      afterlife.kamiRank = 'regional';
    } else if (afterlife.descendants.length >= 5 || afterlife.timesRemembered >= 50) {
      afterlife.kamiRank = 'local';
    } else {
      afterlife.kamiRank = 'minor';
    }

    // Generate blessings and curses from skills
    const skills = entity.getComponent<SkillsComponent>('skills');
    const blessings: string[] = ['family_luck', 'wisdom_dreams', 'protection_from_spirits'];
    const curses: string[] = ['misfortune', 'guilt_dreams', 'ancestral_disappointment'];

    if (skills && skills.levels) {
      // Add skill-based blessings for top skills
      const skillEntries = Object.entries(skills.levels)
        .filter(([_, level]) => typeof level === 'number' && level > 0)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3);

      for (const [skillName] of skillEntries) {
        if (SKILL_BLESSINGS[skillName]) {
          blessings.push(SKILL_BLESSINGS[skillName]);
        }
        if (SKILL_CURSES[skillName]) {
          curses.push(SKILL_CURSES[skillName]);
        }
      }
    }

    afterlife.availableBlessings = blessings;
    afterlife.availableCurses = curses;

    // Set preferred offerings
    const offerings = [...COMMON_OFFERINGS];
    // Note: Could add favorite foods from preferences if implemented
    afterlife.preferredOfferings = offerings;

    // Set taboos based on death and personality
    const taboos = ['neglecting_family', 'dishonoring_name', 'forgetting_ancestors'];
    const deathTaboos = DEATH_TABOOS[afterlife.causeOfDeath];
    if (deathTaboos) {
      taboos.push(...deathTaboos);
    }
    afterlife.taboos = taboos;

    // Emit transformation event
    world.eventBus.emit({
      type: 'soul:became_ancestor_kami',
      source: entity.id,
      data: {
        entityId: entity.id,
        kamiRank: afterlife.kamiRank,
        blessings: afterlife.availableBlessings,
        curses: afterlife.availableCurses,
        descendants: afterlife.descendants,
        familyName: afterlife.familyName,
      },
    });
  }
}
