import type { Entity } from '@ai-village/core';
import type { World } from '@ai-village/core';
import {
  type SkillsComponent,
  type SkillId,
  type SkillLevel,
  type IdentityComponent,
} from '@ai-village/core';
import type { BuildingComponent } from '@ai-village/core';

/**
 * Builds village information sections for agent prompts.
 * Includes village status, resources (skilled agents), and buildings.
 */
export class VillageInfoBuilder {
  /**
   * Build village status section - provides coordination context.
   */
  buildVillageStatus(world: World, currentAgentId: string): string {
    if (!world || typeof world.query !== 'function') {
      return '';
    }

    let status = '\nVillage Status:\n';

    // Get all agents
    const allAgents = world.query().with('agent').with('identity').executeEntities();
    const otherAgents = allAgents.filter((a: Entity) => a.id !== currentAgentId);

    if (otherAgents.length > 0) {
      status += `- ${otherAgents.length} other villager${otherAgents.length > 1 ? 's are' : ' is'} in the village\n`;

      const names = otherAgents.slice(0, 3).map((a: Entity) => {
        const identity = a.components.get('identity') as IdentityComponent | undefined;
        return identity?.name || 'Unknown';
      });

      if (names.length > 0) {
        status += `- Villagers present: ${names.join(', ')}`;
        if (otherAgents.length > 3) {
          status += ` and ${otherAgents.length - 3} more`;
        }
        status += '\n';
      }
    }

    // Check for critical buildings
    const allBuildings = world.query().with('building').executeEntities();
    const buildingTypes = new Set<string>();
    const incomplete: string[] = [];

    for (const b of allBuildings) {
      const building = b.components.get('building') as BuildingComponent | undefined;
      if (building) {
        if (building.isComplete) {
          buildingTypes.add(building.buildingType);
        } else {
          incomplete.push(building.buildingType);
        }
      }
    }

    const criticalMissing: string[] = [];
    if (!buildingTypes.has('campfire')) criticalMissing.push('campfire (warmth)');
    if (!buildingTypes.has('storage-chest') && !buildingTypes.has('storage-box')) {
      criticalMissing.push('storage (items)');
    }
    if (!buildingTypes.has('tent') && !buildingTypes.has('bed')) {
      criticalMissing.push('shelter (sleep)');
    }

    if (criticalMissing.length > 0) {
      status += `- MISSING critical buildings: ${criticalMissing.join(', ')}\n`;
    }

    if (incomplete.length > 0) {
      status += `- Under construction (resources COMMITTED): ${incomplete.join(', ')} - materials are already allocated, don't gather more!\n`;
    }

    return status;
  }

  /**
   * Get village resources including skilled agents as affordances.
   */
  getVillageResources(world: World, entity?: Entity): string | null {
    if (!world || !entity) {
      return null;
    }

    const observerSkills = entity.components.get('skills') as SkillsComponent | undefined;
    const socialSkill = (observerSkills?.levels.social ?? 0) as SkillLevel;

    const allAgents = world.query()?.with?.('agent')?.executeEntities?.() ?? [];
    const resources: string[] = [];

    for (const agent of allAgents) {
      if (agent.id === entity.id) {
        continue;
      }

      const skills = agent.components.get('skills') as SkillsComponent | undefined;
      const identity = agent.components.get('identity') as IdentityComponent | undefined;

      if (!identity?.name || !skills) {
        continue;
      }

      let highestSkill: SkillId | null = null;
      let highestLevel: SkillLevel = 0;
      for (const [skillId, level] of Object.entries(skills.levels)) {
        const levelNum = level as SkillLevel;
        if (levelNum >= 2 && levelNum > highestLevel) {
          highestLevel = levelNum;
          highestSkill = skillId as SkillId;
        }
      }

      if (!highestSkill || highestLevel < 2) {
        continue;
      }

      const name = identity.name;
      if (socialSkill === 0) {
        continue;
      } else if (socialSkill === 1) {
        const impression = this.getSkillImpression(highestSkill);
        resources.push(`${name} - ${impression}`);
      } else if (socialSkill === 2) {
        const skillName = highestSkill.replace(/_/g, ' ');
        resources.push(`${name} - skilled at ${skillName}`);
      } else {
        const skillName = highestSkill.replace(/_/g, ' ');
        const examples = this.getSkillExamples(highestSkill);
        resources.push(`${name} - ${skillName} expert (level ${highestLevel})${examples ? `: ${examples}` : ''}`);
      }
    }

    if (resources.length === 0) {
      return null;
    }

    return `VILLAGE RESOURCES:\n${resources.map(r => `- ${r}`).join('\n')}`;
  }

  /**
   * Get village buildings with ownership information.
   */
  getVillageBuildings(world: World, entity?: Entity): string | null {
    if (!world || !entity) {
      return null;
    }

    const allBuildings = world.query()?.with?.('building')?.executeEntities?.() ?? [];
    const completeBuildings = allBuildings.filter((b: Entity) => {
      const building = b.components.get('building') as BuildingComponent | undefined;
      return building?.isComplete;
    });

    if (completeBuildings.length === 0) {
      return null;
    }

    const buildingCounts: Record<string, number> = {};
    for (const buildingEntity of completeBuildings) {
      const building = buildingEntity.components.get('building') as BuildingComponent | undefined;
      if (!building) continue;

      const buildingType = building.buildingType || 'unknown';
      buildingCounts[buildingType] = (buildingCounts[buildingType] || 0) + 1;
    }

    const buildingDescriptions: string[] = [];

    for (const [buildingType, count] of Object.entries(buildingCounts)) {
      let description = buildingType;

      if (count > 1) {
        description += ` x${count}`;
      }

      const ownership = 'communal';
      description += ` (${ownership})`;

      const purpose = this.getBuildingPurpose(buildingType);
      if (purpose) {
        description += ` - ${purpose}`;
      }

      buildingDescriptions.push(description);
    }

    if (buildingDescriptions.length === 0) {
      return null;
    }

    return `VILLAGE BUILDINGS:\n${buildingDescriptions.map(d => `- ${d}`).join('\n')}`;
  }

  /**
   * Get the purpose/function of a building type.
   */
  getBuildingPurpose(buildingType: string): string {
    const purposes: Record<string, string> = {
      'campfire': 'warmth, cooking',
      'storage-chest': 'item storage (20 slots)',
      'storage-box': 'item storage (10 slots)',
      'workbench': 'basic crafting',
      'tent': 'shelter, sleeping',
      'bed': 'sleeping (best quality)',
      'bedroll': 'portable sleeping',
      'lean-to': 'basic shelter',
      'well': 'water source',
      'garden_fence': 'decoration',
      'forge': 'metalworking',
      'farm_shed': 'farming storage',
      'market_stall': 'trading',
      'windmill': 'grain processing',
      'library': 'research',
      'warehouse': 'large storage',
      'town_hall': 'governance',
      'census_bureau': 'demographics',
      'weather_station': 'weather monitoring',
      'health_clinic': 'medical care',
      'meeting_hall': 'social gatherings',
      'watchtower': 'threat detection',
      'labor_guild': 'workforce management',
      'archive': 'historical records',
    };
    return purposes[buildingType] || '';
  }

  /**
   * Get vague impression of a skill for social skill level 1.
   */
  getSkillImpression(skillId: SkillId): string {
    const impressions: Record<SkillId, string> = {
      building: 'seems handy with tools',
      architecture: 'seems attuned to the energy of spaces',
      cooking: 'seems interested in food',
      farming: 'seems to like working with plants',
      crafting: 'seems good at making things',
      gathering: 'seems to know where to find resources',
      social: 'seems friendly and talkative',
      exploration: 'seems adventurous',
      combat: 'seems capable in a fight',
      hunting: 'seems experienced with tracking prey',
      stealth: 'seems to move quietly and carefully',
      animal_handling: 'seems good with animals',
      medicine: 'seems knowledgeable about healing',
      research: 'seems curious and thoughtful',
    };
    return impressions[skillId] || 'seems skilled at something';
  }

  /**
   * Get examples of what a skilled agent can do.
   */
  getSkillExamples(skillId: SkillId): string {
    const examples: Record<SkillId, string> = {
      building: 'can construct complex buildings',
      architecture: 'can design harmonious spaces with good chi flow',
      cooking: 'can prepare preserved food',
      farming: 'can grow high-quality crops',
      crafting: 'can create advanced items',
      gathering: 'knows where to find rare resources',
      social: 'can coordinate village efforts',
      exploration: 'can scout distant areas',
      combat: 'can defend the village',
      hunting: 'can track and hunt dangerous prey',
      stealth: 'can move undetected through dangerous areas',
      animal_handling: 'can tame and care for animals',
      medicine: 'can treat injuries and illnesses',
      research: 'can advance technology and discover new knowledge',
    };
    return examples[skillId] || '';
  }
}
