/**
 * GovernorDecisionExecutor Integration Tests
 *
 * Tests that governor decisions actually modify game state correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { EventBus } from '../../events/EventBus.js';
import { EntityImpl } from '../../ecs/Entity.js';
import { executeGovernorDecision, type ParsedGovernorDecision } from '../GovernorDecisionExecutor.js';
import { createGovernorComponent } from '../../components/GovernorComponent.js';
import { createEmpireComponent } from '../../components/EmpireComponent.js';
import { createNationComponent } from '../../components/NationComponent.js';
import { createProvinceGovernanceComponent } from '../../components/ProvinceGovernanceComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('GovernorDecisionExecutor', () => {
  let world: World;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    world = new World(eventBus);
  });

  describe('Empire Tier Decisions', () => {
    it('should execute declare_war and create war state', () => {
      // Create empire entity
      const empireEntity = world.createEntity() as EntityImpl;
      const empire = createEmpireComponent('Test Empire', 0);
      empireEntity.addComponent(empire);

      // Create governor entity
      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('empire', empireEntity.id, 'imperial', 0);
      governor.addComponent(govComp);

      // Decision to declare war
      const decision: ParsedGovernorDecision = {
        reasoning: 'Territory dispute',
        action: {
          type: 'declare_war',
          target: 'enemy_empire_id',
          parameters: {
            warGoals: ['Conquest', 'Subjugation'],
          },
        },
      };

      // Execute decision
      const result = executeGovernorDecision(governor, decision, world);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.stateChanges).toContain('Declared war on enemy_empire_id');
      expect(result.eventsEmitted).toContain('empire:war_declared');

      // Verify empire state changed
      const updatedEmpire = empireEntity.getComponent(CT.Empire);
      expect(updatedEmpire).toBeDefined();
      expect(updatedEmpire!.military.warStatus).toBe('at_war');
      expect(updatedEmpire!.military.activeWars.length).toBe(1);
      expect(updatedEmpire!.military.activeWars[0]!.warGoals).toEqual(['Conquest', 'Subjugation']);
    });

    it('should execute allocate_resources and deduct from treasury', () => {
      const empireEntity = world.createEntity() as EntityImpl;
      const empire = createEmpireComponent('Test Empire', 0);
      empire.economy.imperialTreasury = 10000;
      empireEntity.addComponent(empire);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('empire', empireEntity.id, 'imperial', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Support nation development',
        action: {
          type: 'allocate_resources',
          target: 'nation_id_1',
          parameters: {
            resourceType: 'military',
            amount: 2000,
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.stateChanges).toContain('Allocated 2000 military to nation_id_1');

      const updatedEmpire = empireEntity.getComponent(CT.Empire);
      expect(updatedEmpire!.economy.imperialTreasury).toBe(8000);
    });
  });

  describe('Nation Tier Decisions', () => {
    it('should execute set_tax_rate and update economy', () => {
      const nationEntity = world.createEntity() as EntityImpl;
      const nation = createNationComponent('Test Nation', 0);
      nation.economy.taxPolicy = 'low';
      nationEntity.addComponent(nation);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('nation', nationEntity.id, 'democracy', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Need more revenue',
        action: {
          type: 'set_tax_rate',
          parameters: {
            taxRate: 0.25,
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.eventsEmitted).toContain('nation:tax_rate_changed');

      const updatedNation = nationEntity.getComponent(CT.Nation);
      expect(updatedNation!.economy.taxPolicy).toBe('high');
    });

    it('should execute declare_war and create war state', () => {
      const nationEntity = world.createEntity() as EntityImpl;
      const nation = createNationComponent('Test Nation', 0);
      nationEntity.addComponent(nation);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('nation', nationEntity.id, 'monarchy', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Border dispute',
        action: {
          type: 'declare_war',
          target: 'enemy_nation',
          parameters: {
            warGoals: ['Territorial dispute'],
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.eventsEmitted).toContain('nation:war_declared');

      const updatedNation = nationEntity.getComponent(CT.Nation);
      expect(updatedNation!.military.warStatus).toBe('at_war');
      expect(updatedNation!.military.activeWars.length).toBe(1);
    });

    it('should execute enact_policy and add to policies list', () => {
      const nationEntity = world.createEntity() as EntityImpl;
      const nation = createNationComponent('Test Nation', 0);
      nationEntity.addComponent(nation);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('nation', nationEntity.id, 'republic', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Boost military strength',
        action: {
          type: 'enact_policy',
          parameters: {
            policyName: 'Military Expansion',
            category: 'military',
            budgetAllocation: 0.15,
            description: 'Increase military size and readiness',
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.eventsEmitted).toContain('nation:policy_enacted');

      const updatedNation = nationEntity.getComponent(CT.Nation);
      expect(updatedNation!.policies.length).toBe(1);
      expect(updatedNation!.policies[0]!.name).toBe('Military Expansion');
      expect(updatedNation!.policies[0]!.category).toBe('military');
    });
  });

  describe('Province Tier Decisions', () => {
    it('should execute set_priorities and create policies', () => {
      const provinceEntity = world.createEntity() as EntityImpl;
      const province = createProvinceGovernanceComponent('Test Province', 0);
      provinceEntity.addComponent(province);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('province', provinceEntity.id, 'democracy', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Focus on growth',
        action: {
          type: 'set_priorities',
          parameters: {
            priorities: ['Agriculture', 'Trade', 'Infrastructure'],
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.eventsEmitted).toContain('province:priorities_set');

      const updatedProvince = provinceEntity.getComponent(CT.ProvinceGovernance);
      expect(updatedProvince!.policies.length).toBe(3);
      expect(updatedProvince!.policies.map(p => p.name)).toEqual(['Agriculture', 'Trade', 'Infrastructure']);
    });

    it('should execute request_aid and emit event', () => {
      const provinceEntity = world.createEntity() as EntityImpl;
      const province = createProvinceGovernanceComponent('Test Province', 0);
      province.parentNationId = 'parent_nation';
      provinceEntity.addComponent(province);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('province', provinceEntity.id, 'appointed', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Famine situation',
        action: {
          type: 'request_aid',
          parameters: {
            resourceType: 'food',
            amount: 5000,
            urgency: 'critical',
          },
        },
      };

      // Listen for event
      let eventEmitted = false;
      eventBus.on('province:aid_requested', () => {
        eventEmitted = true;
      });

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.eventsEmitted).toContain('province:aid_requested');
      expect(eventEmitted).toBe(true);
    });

    it('should execute rebellion_response and update city loyalty', () => {
      const provinceEntity = world.createEntity() as EntityImpl;
      const province = createProvinceGovernanceComponent('Test Province', 0);
      province.cities = [{
        cityId: 'rebel_city',
        cityName: 'Rebel City',
        population: 10000,
        economicOutput: 1000,
        militaryStrength: 500,
        loyaltyToProvince: 0.3,
        lastUpdateTick: 0,
      }];
      provinceEntity.addComponent(province);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('province', provinceEntity.id, 'appointed', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Peaceful resolution preferred',
        action: {
          type: 'rebellion_response',
          target: 'rebel_city',
          parameters: {
            responseType: 'negotiate',
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(true);
      expect(result.eventsEmitted).toContain('province:rebellion_response');

      const updatedProvince = provinceEntity.getComponent(CT.ProvinceGovernance);
      const city = updatedProvince!.cities.find(c => c.cityId === 'rebel_city');
      expect(city!.loyaltyToProvince).toBeGreaterThan(0.3);
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully with invalid tier', () => {
      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('village', 'invalid_jurisdiction', 'council', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Test',
        action: { type: 'invalid_action' },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when jurisdiction entity not found', () => {
      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('empire', 'nonexistent_empire', 'imperial', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Test',
        action: { type: 'declare_war', target: 'enemy' },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Jurisdiction entity not found');
    });

    it('should fail when required parameters missing', () => {
      const nationEntity = world.createEntity() as EntityImpl;
      const nation = createNationComponent('Test Nation', 0);
      nationEntity.addComponent(nation);

      const governor = world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('nation', nationEntity.id, 'democracy', 0);
      governor.addComponent(govComp);

      const decision: ParsedGovernorDecision = {
        reasoning: 'Test',
        action: {
          type: 'set_tax_rate',
          parameters: {}, // Missing taxRate
        },
      };

      const result = executeGovernorDecision(governor, decision, world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires valid taxRate parameter');
    });
  });
});
