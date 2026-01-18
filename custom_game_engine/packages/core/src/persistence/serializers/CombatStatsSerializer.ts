/**
 * Serializer for CombatStatsComponent
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import type { CombatStatsComponent } from '../../components/CombatStatsComponent.js';
import { createCombatStatsComponent } from '../../components/CombatStatsComponent.js';

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
    if (typeof data !== 'object' || data === null) {
      throw new Error('CombatStatsComponent data must be object');
    }

    const d = data as Record<string, unknown>;

    if (typeof d.combatSkill !== 'number') {
      throw new Error('CombatStatsComponent.combatSkill must be number');
    }

    return createCombatStatsComponent({
      combatSkill: d.combatSkill,
      huntingSkill: typeof d.huntingSkill === 'number' ? d.huntingSkill : undefined,
      stealthSkill: typeof d.stealthSkill === 'number' ? d.stealthSkill : undefined,
      displaySkill: typeof d.displaySkill === 'number' ? d.displaySkill : undefined,
      resourceHolding: typeof d.resourceHolding === 'number' ? d.resourceHolding : undefined,
      craftingSkill: typeof d.craftingSkill === 'number' ? d.craftingSkill : undefined,
      socialSkill: typeof d.socialSkill === 'number' ? d.socialSkill : undefined,
      weapon: typeof d.weapon === 'string' ? d.weapon : undefined,
      armor: typeof d.armor === 'string' ? d.armor : undefined,
    });
  }

  validate(data: unknown): data is CombatStatsComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('CombatStatsComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (typeof d.combatSkill !== 'number') {
      throw new Error('CombatStatsComponent missing required combatSkill');
    }
    return true;
  }
}
