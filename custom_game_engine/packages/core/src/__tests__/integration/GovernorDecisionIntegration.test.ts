/**
 * Governor Decision Integration Tests
 *
 * Tests the complete governor decision execution flow across all tiers:
 * - Province governors requesting aid → resource transfers
 * - Nation governors declaring war → war components created
 * - Empire governors setting policy → vassals affected
 *
 * Per CLAUDE.md: No silent fallbacks - tests verify exceptions are thrown for invalid states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { executeGovernorDecision, type ParsedGovernorDecision } from '../../governance/GovernorDecisionExecutor.js';
import { createGovernorComponent } from '../../components/GovernorComponent.js';
import { createEmpireComponent } from '../../components/EmpireComponent.js';
import { createNationComponent } from '../../components/NationComponent.js';
import { createProvinceGovernanceComponent } from '../../components/ProvinceGovernanceComponent.js';
import { createWarehouseComponent } from '../../components/WarehouseComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('Governor Decision Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: false });
  });

  describe('Province Governor - Resource Aid Requests', () => {
    it('should transfer resources when province governor requests aid', () => {
      // Create province entity with warehouse
      const province = harness.world.createEntity() as EntityImpl;
      const provinceGov = createProvinceGovernanceComponent('Test Province', 'nation_1');
      province.addComponent(provinceGov);

      const provinceWarehouse = createWarehouseComponent(1000);
      provinceWarehouse.stockpile.set('food', 100); // Low on food
      province.addComponent(provinceWarehouse);

      // Create province governor
      const governor = harness.world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('province', province.id, 'governor', 0);
      governor.addComponent(govComp);

      // Create nation entity with warehouse (aid source)
      const nation = harness.world.createEntity() as EntityImpl;
      const nationComp = createNationComponent('Test Nation', 'empire_1', 0);
      nation.addComponent(nationComp);

      const nationWarehouse = createWarehouseComponent(5000);
      nationWarehouse.stockpile.set('food', 2000); // Has surplus
      nation.addComponent(nationWarehouse);

      // Update province to reference nation
      province.updateComponent('province_governance', (pg: any) => ({
        ...pg,
        nationId: nation.id,
      }));

      // Decision: Request aid from nation
      const decision: ParsedGovernorDecision = {
        reasoning: 'Food shortage threatens stability',
        action: {
          type: 'request_aid',
          target: nation.id,
          parameters: {
            resourceType: 'food',
            amount: 500,
          },
        },
      };

      // Execute decision
      const result = executeGovernorDecision(governor, decision, harness.world);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.stateChanges).toContain('Requested 500 food from nation');

      // Verify resources transferred
      const updatedProvince = province.getComponent(CT.Warehouse);
      const updatedNation = nation.getComponent(CT.Warehouse);

      expect(updatedProvince?.stockpile.get('food')).toBe(600); // 100 + 500
      expect(updatedNation?.stockpile.get('food')).toBe(1500); // 2000 - 500
    });

    it('should fail when requesting more resources than available', () => {
      const province = harness.world.createEntity() as EntityImpl;
      const provinceGov = createProvinceGovernanceComponent('Test Province', 'nation_1');
      province.addComponent(provinceGov);
      province.addComponent(createWarehouseComponent(1000));

      const governor = harness.world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('province', province.id, 'governor', 0);
      governor.addComponent(govComp);

      const nation = harness.world.createEntity() as EntityImpl;
      nation.addComponent(createNationComponent('Test Nation', 'empire_1', 0));

      const nationWarehouse = createWarehouseComponent(5000);
      nationWarehouse.stockpile.set('food', 100); // Only 100 available
      nation.addComponent(nationWarehouse);

      province.updateComponent('province_governance', (pg: any) => ({
        ...pg,
        nationId: nation.id,
      }));

      const decision: ParsedGovernorDecision = {
        reasoning: 'Need more food',
        action: {
          type: 'request_aid',
          target: nation.id,
          parameters: {
            resourceType: 'food',
            amount: 500, // More than available
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, harness.world);

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient resources');
    });

    it('should emit event when aid is granted', () => {
      const province = harness.world.createEntity() as EntityImpl;
      province.addComponent(createProvinceGovernanceComponent('Test Province', 'nation_1'));
      province.addComponent(createWarehouseComponent(1000));

      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('province', province.id, 'governor', 0));

      const nation = harness.world.createEntity() as EntityImpl;
      nation.addComponent(createNationComponent('Test Nation', 'empire_1', 0));

      const nationWarehouse = createWarehouseComponent(5000);
      nationWarehouse.stockpile.set('food', 2000);
      nation.addComponent(nationWarehouse);

      province.updateComponent('province_governance', (pg: any) => ({
        ...pg,
        nationId: nation.id,
      }));

      harness.clearEvents();

      const decision: ParsedGovernorDecision = {
        reasoning: 'Request aid',
        action: {
          type: 'request_aid',
          target: nation.id,
          parameters: {
            resourceType: 'food',
            amount: 200,
          },
        },
      };

      executeGovernorDecision(governor, decision, harness.world);

      // Verify event emitted
      harness.assertEventEmitted('province:aid_granted', {
        provinceId: province.id,
        nationId: nation.id,
      });
    });
  });

  describe('Nation Governor - War Declarations', () => {
    it('should create war component when nation governor declares war', () => {
      // Create nation entity
      const nation = harness.world.createEntity() as EntityImpl;
      const nationComp = createNationComponent('Test Nation', 'empire_1', 0);
      nation.addComponent(nationComp);

      // Create nation governor
      const governor = harness.world.createEntity() as EntityImpl;
      const govComp = createGovernorComponent('nation', nation.id, 'sovereign', 0);
      governor.addComponent(govComp);

      // Decision to declare war
      const decision: ParsedGovernorDecision = {
        reasoning: 'Border dispute with rival nation',
        action: {
          type: 'declare_war',
          target: 'enemy_nation_id',
          parameters: {
            warGoals: ['Territorial', 'Subjugation'],
            mobilization: 0.8,
          },
        },
      };

      // Execute decision
      const result = executeGovernorDecision(governor, decision, harness.world);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.stateChanges).toContain('Declared war on enemy_nation_id');
      expect(result.eventsEmitted).toContain('nation:war_declared');

      // Verify nation state changed
      const updatedNation = nation.getComponent(CT.Nation);
      expect(updatedNation).toBeDefined();
      expect(updatedNation!.military.warStatus).toBe('at_war');
      expect(updatedNation!.military.activeWars).toHaveLength(1);
      expect(updatedNation!.military.activeWars[0]!.targetId).toBe('enemy_nation_id');
      expect(updatedNation!.military.activeWars[0]!.warGoals).toEqual(['Territorial', 'Subjugation']);
    });

    it('should not allow declaring war while already at war', () => {
      const nation = harness.world.createEntity() as EntityImpl;
      const nationComp = createNationComponent('Test Nation', 'empire_1', 0);
      nationComp.military.warStatus = 'at_war';
      nationComp.military.activeWars.push({
        targetId: 'existing_enemy',
        warGoals: ['Conquest'],
        startedTick: 0,
        mobilizationLevel: 0.7,
      });
      nation.addComponent(nationComp);

      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('nation', nation.id, 'sovereign', 0));

      const decision: ParsedGovernorDecision = {
        reasoning: 'Expand war',
        action: {
          type: 'declare_war',
          target: 'another_enemy',
          parameters: {
            warGoals: ['Conquest'],
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, harness.world);

      // Should fail - already at war
      expect(result.success).toBe(false);
      expect(result.error).toContain('already at war');
    });

    it('should mobilize military forces when declaring war', () => {
      const nation = harness.world.createEntity() as EntityImpl;
      const nationComp = createNationComponent('Test Nation', 'empire_1', 0);
      nationComp.military.armySize = 1000;
      nationComp.military.readiness = 0.5;
      nation.addComponent(nationComp);

      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('nation', nation.id, 'sovereign', 0));

      const decision: ParsedGovernorDecision = {
        reasoning: 'Declare war',
        action: {
          type: 'declare_war',
          target: 'enemy_id',
          parameters: {
            warGoals: ['Conquest'],
            mobilization: 0.9,
          },
        },
      };

      executeGovernorDecision(governor, decision, harness.world);

      const updatedNation = nation.getComponent(CT.Nation);
      expect(updatedNation!.military.readiness).toBeGreaterThan(0.5);
      expect(updatedNation!.military.mobilizationLevel).toBe(0.9);
    });
  });

  describe('Empire Governor - Policy Changes', () => {
    it('should set empire policy affecting all vassals', () => {
      // Create empire entity
      const empire = harness.world.createEntity() as EntityImpl;
      const empireComp = createEmpireComponent('Test Empire', 0);
      empire.addComponent(empireComp);

      // Create vassal nations
      const vassal1 = harness.world.createEntity() as EntityImpl;
      const nation1 = createNationComponent('Vassal 1', empire.id, 0);
      vassal1.addComponent(nation1);

      const vassal2 = harness.world.createEntity() as EntityImpl;
      const nation2 = createNationComponent('Vassal 2', empire.id, 0);
      vassal2.addComponent(nation2);

      // Create empire governor
      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('empire', empire.id, 'imperial', 0));

      // Decision to set trade policy
      const decision: ParsedGovernorDecision = {
        reasoning: 'Boost imperial economy',
        action: {
          type: 'set_policy',
          target: empire.id,
          parameters: {
            policyType: 'trade',
            value: 'free_trade',
            affectVassals: true,
          },
        },
      };

      executeGovernorDecision(governor, decision, harness.world);

      // Verify empire policy changed
      const updatedEmpire = empire.getComponent(CT.Empire);
      expect(updatedEmpire!.policies.trade).toBe('free_trade');

      // Verify vassals affected
      const updatedVassal1 = vassal1.getComponent(CT.Nation);
      const updatedVassal2 = vassal2.getComponent(CT.Nation);

      expect(updatedVassal1!.economy.tradePolicy).toBe('free_trade');
      expect(updatedVassal2!.economy.tradePolicy).toBe('free_trade');
    });

    it('should allocate resources from imperial treasury', () => {
      const empire = harness.world.createEntity() as EntityImpl;
      const empireComp = createEmpireComponent('Test Empire', 0);
      empireComp.economy.imperialTreasury = 10000;
      empire.addComponent(empireComp);

      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('empire', empire.id, 'imperial', 0));

      const decision: ParsedGovernorDecision = {
        reasoning: 'Fund expansion',
        action: {
          type: 'allocate_resources',
          target: 'nation_1',
          parameters: {
            resourceType: 'military',
            amount: 3000,
          },
        },
      };

      executeGovernorDecision(governor, decision, harness.world);

      const updatedEmpire = empire.getComponent(CT.Empire);
      expect(updatedEmpire!.economy.imperialTreasury).toBe(7000); // 10000 - 3000
    });

    it('should fail to allocate more than treasury balance', () => {
      const empire = harness.world.createEntity() as EntityImpl;
      const empireComp = createEmpireComponent('Test Empire', 0);
      empireComp.economy.imperialTreasury = 1000;
      empire.addComponent(empireComp);

      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('empire', empire.id, 'imperial', 0));

      const decision: ParsedGovernorDecision = {
        reasoning: 'Overspend',
        action: {
          type: 'allocate_resources',
          target: 'nation_1',
          parameters: {
            resourceType: 'military',
            amount: 5000, // More than available
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, harness.world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient treasury');
    });
  });

  describe('Cross-Tier Governor Interactions', () => {
    it('should handle province → nation → empire aid cascade', () => {
      // Create empire
      const empire = harness.world.createEntity() as EntityImpl;
      const empireComp = createEmpireComponent('Test Empire', 0);
      empireComp.economy.imperialTreasury = 100000;
      empire.addComponent(empireComp);

      // Create nation
      const nation = harness.world.createEntity() as EntityImpl;
      const nationComp = createNationComponent('Test Nation', empire.id, 0);
      nation.addComponent(nationComp);

      const nationWarehouse = createWarehouseComponent(10000);
      nationWarehouse.stockpile.set('food', 500); // Low on food
      nation.addComponent(nationWarehouse);

      // Create province
      const province = harness.world.createEntity() as EntityImpl;
      const provinceGov = createProvinceGovernanceComponent('Test Province', nation.id);
      province.addComponent(provinceGov);

      const provinceWarehouse = createWarehouseComponent(1000);
      provinceWarehouse.stockpile.set('food', 50); // Critical shortage
      province.addComponent(provinceWarehouse);

      // Province governor requests aid from nation
      const provinceGovernor = harness.world.createEntity() as EntityImpl;
      provinceGovernor.addComponent(createGovernorComponent('province', province.id, 'governor', 0));

      const provinceDecision: ParsedGovernorDecision = {
        reasoning: 'Critical food shortage',
        action: {
          type: 'request_aid',
          target: nation.id,
          parameters: {
            resourceType: 'food',
            amount: 400,
          },
        },
      };

      // Province request should partially succeed (nation only has 500, gives 400)
      const provinceResult = executeGovernorDecision(provinceGovernor, provinceDecision, harness.world);
      expect(provinceResult.success).toBe(true);

      // Nation now needs aid from empire
      const nationGovernor = harness.world.createEntity() as EntityImpl;
      nationGovernor.addComponent(createGovernorComponent('nation', nation.id, 'sovereign', 0));

      const nationDecision: ParsedGovernorDecision = {
        reasoning: 'Replenish reserves after aid',
        action: {
          type: 'request_imperial_aid',
          target: empire.id,
          parameters: {
            amount: 2000, // Request from imperial treasury
          },
        },
      };

      const nationResult = executeGovernorDecision(nationGovernor, nationDecision, harness.world);
      expect(nationResult.success).toBe(true);

      // Verify cascade completed
      const finalProvince = province.getComponent(CT.Warehouse);
      const finalNation = nation.getComponent(CT.Warehouse);
      const finalEmpire = empire.getComponent(CT.Empire);

      expect(finalProvince?.stockpile.get('food')).toBeGreaterThan(50); // Province received aid
      expect(finalNation?.stockpile.get('food')).toBeLessThan(500); // Nation gave aid
      expect(finalEmpire?.economy.imperialTreasury).toBeLessThan(100000); // Empire funded nation
    });
  });

  describe('Error Handling', () => {
    it('should throw error when governor entity missing governor component', () => {
      const entity = harness.world.createEntity() as EntityImpl;

      const decision: ParsedGovernorDecision = {
        reasoning: 'Test',
        action: {
          type: 'set_policy',
          target: 'test',
          parameters: {},
        },
      };

      expect(() => {
        executeGovernorDecision(entity, decision, harness.world);
      }).toThrow('Missing governor component');
    });

    it('should throw error when target entity does not exist', () => {
      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('province', 'province_1', 'governor', 0));

      const decision: ParsedGovernorDecision = {
        reasoning: 'Test',
        action: {
          type: 'request_aid',
          target: 'nonexistent_entity',
          parameters: {
            resourceType: 'food',
            amount: 100,
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, harness.world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Target entity not found');
    });

    it('should validate decision parameters', () => {
      const governor = harness.world.createEntity() as EntityImpl;
      governor.addComponent(createGovernorComponent('nation', 'nation_1', 'sovereign', 0));

      const nation = harness.world.createEntity() as EntityImpl;
      nation.addComponent(createNationComponent('Test Nation', 'empire_1', 0));

      governor.updateComponent('governor', (g: any) => ({
        ...g,
        jurisdictionEntityId: nation.id,
      }));

      // Invalid decision: missing required parameters
      const decision: ParsedGovernorDecision = {
        reasoning: 'Test',
        action: {
          type: 'declare_war',
          target: 'enemy',
          parameters: {
            // Missing warGoals
          },
        },
      };

      const result = executeGovernorDecision(governor, decision, harness.world);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required parameter');
    });
  });
});
