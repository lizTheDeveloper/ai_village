/**
 * Integration tests for Empire Dynasty Succession
 *
 * Tests:
 * - Heir selection algorithms (primogeniture, election, meritocracy, divine right)
 * - Legitimacy calculation
 * - Succession crisis detection
 * - Ruler death triggers succession
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { createDynastyComponent } from '../../components/DynastyComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { selectHeir, type HeirCandidate } from '../EmpireDynastyManager.js';

describe('EmpireDynastyManager', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Heir Selection - Primogeniture', () => {
    it('should select eldest child of direct line', () => {
      // Create dynasty members
      const elder = world.createEntity();
      elder.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'spare', 1, 0));
      elder.addComponent(createAgentComponent('Elder', 0, 0));
      elder.getComponent<any>(CT.Agent)!.age = 35;

      const younger = world.createEntity();
      younger.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'spare', 1, 0));
      younger.addComponent(createAgentComponent('Younger', 0, 0));
      younger.getComponent<any>(CT.Agent)!.age = 30;

      // Select heir
      const result = selectHeir(world, 'dynasty1', 'current_ruler', 'primogeniture', 100);

      expect(result.heir).toBeDefined();
      expect(result.heir?.agentName).toBe('Elder');
      expect(result.crisis).toBe(false);
    });

    it('should prefer closer lineage over age', () => {
      // Direct child (lineage distance 1)
      const directChild = world.createEntity();
      directChild.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'spare', 1, 0));
      directChild.addComponent(createAgentComponent('DirectChild', 0, 0));
      directChild.getComponent<any>(CT.Agent)!.age = 25;

      // Grandchild (lineage distance 2, but older)
      const grandchild = world.createEntity();
      grandchild.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'spare', 2, 0));
      grandchild.addComponent(createAgentComponent('Grandchild', 0, 0));
      grandchild.getComponent<any>(CT.Agent)!.age = 40;

      const result = selectHeir(world, 'dynasty1', 'current_ruler', 'primogeniture', 100);

      expect(result.heir?.agentName).toBe('DirectChild');
    });
  });

  describe('Heir Selection - Meritocracy', () => {
    it('should select candidate with highest skills', () => {
      // Low skill candidate
      const lowSkill = world.createEntity();
      lowSkill.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'spare', 1, 0));
      lowSkill.addComponent(createAgentComponent('LowSkill', 0, 0));
      lowSkill.addComponent({
        type: 'skills' as any,
        version: 1,
        skills: new Map([['governance', 3], ['diplomacy', 2], ['military', 1]]),
      });

      // High skill candidate
      const highSkill = world.createEntity();
      highSkill.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'spare', 1, 0));
      highSkill.addComponent(createAgentComponent('HighSkill', 0, 0));
      highSkill.addComponent({
        type: 'skills' as any,
        version: 1,
        skills: new Map([['governance', 10], ['diplomacy', 9], ['military', 8]]),
      });

      const result = selectHeir(world, 'dynasty1', 'current_ruler', 'meritocracy', 100);

      expect(result.heir?.agentName).toBe('HighSkill');
    });
  });

  describe('Succession Crisis', () => {
    it('should detect crisis when no eligible heirs exist', () => {
      // No candidates at all
      const result = selectHeir(world, 'dynasty1', 'current_ruler', 'primogeniture', 100);

      expect(result.heir).toBeNull();
      expect(result.crisis).toBe(true);
      expect(result.crisisReason).toBe('no_eligible_heirs');
    });

    it('should detect crisis when heir has low legitimacy', () => {
      // Create weak candidate (bastard, distant lineage)
      const weakCandidate = world.createEntity();
      weakCandidate.addComponent(createDynastyComponent('dynasty1', 'TestDynasty', 'bastard', 5, 0));
      weakCandidate.addComponent(createAgentComponent('WeakCandidate', 0, 0));
      weakCandidate.getComponent<any>(CT.Agent)!.age = 15; // Too young

      const result = selectHeir(world, 'dynasty1', 'current_ruler', 'primogeniture', 100);

      expect(result.heir).toBeDefined();
      expect(result.crisis).toBe(true); // Low legitimacy triggers crisis
      expect(result.crisisReason).toBe('low_legitimacy');
    });
  });

  describe('Legitimacy Calculation', () => {
    it('should calculate higher legitimacy for direct descendants in primogeniture', () => {
      const directHeir = world.createEntity();
      const dynasty = createDynastyComponent('dynasty1', 'TestDynasty', 'heir', 1, 0);
      dynasty.legitimacyFactors.bloodlineCloseness = 1.0; // Direct descendant
      directHeir.addComponent(dynasty);
      directHeir.addComponent(createAgentComponent('DirectHeir', 0, 0));

      const result = selectHeir(world, 'dynasty1', 'current_ruler', 'primogeniture', 100);

      expect(result.heir?.legitimacy).toBeGreaterThan(0.5);
    });
  });
});
