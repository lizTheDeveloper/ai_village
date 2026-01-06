/**
 * Serializer for CombatStatsComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { CombatStatsComponent } from '@ai-village/core';
import { createCombatStatsComponent } from '@ai-village/core';

export class CombatStatsSerializer extends BaseComponentSerializer<CombatStatsComponent> {
  constructor() {
    super('combat_stats', 1);
  }

  protected serializeData(component: CombatStatsComponent): Record<string, unknown> {
    return {
      combatSkill: component.combatSkill,
      huntingSkill: component.huntingSkill,
      stealthSkill: component.stealthSkill,
      displaySkill: component.displaySkill,
      resourceHolding: component.resourceHolding,
      craftingSkill: component.craftingSkill,
      socialSkill: component.socialSkill,
      weapon: component.weapon,
      armor: component.armor,
    };
  }

  protected deserializeData(data: unknown): CombatStatsComponent {
    const d = data as any;
    return createCombatStatsComponent({
      combatSkill: d.combatSkill,
      huntingSkill: d.huntingSkill,
      stealthSkill: d.stealthSkill,
      displaySkill: d.displaySkill,
      resourceHolding: d.resourceHolding,
      craftingSkill: d.craftingSkill,
      socialSkill: d.socialSkill,
      weapon: d.weapon,
      armor: d.armor,
    });
  }

  validate(data: unknown): data is CombatStatsComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('CombatStatsComponent data must be object');
    }
    const d = data as any;
    if (d.combatSkill === undefined) {
      throw new Error('CombatStatsComponent missing required combatSkill');
    }
    return true;
  }
}
