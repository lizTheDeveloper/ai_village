import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for Decision Module
 *
 * Tests decision processing in realistic scenarios with the full entity/world context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { createInventoryComponent } from '../../components/InventoryComponent.js';
import { DecisionProcessor, AutonomicSystem } from '../index.js';

describe('Decision Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });
  });

  describe('AutonomicSystem with Entity', () => {
    it('detects critical exhaustion and triggers forced_sleep', () => {
      const autonomic = new AutonomicSystem();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0;
      agent.addComponent(needs);
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'ExhaustedAgent',
        behavior: 'gather',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      harness.world.addEntity(agent);

      const result = autonomic.check(agent);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('forced_sleep');
      expect(result!.priority).toBe(100);
    });

    it('prioritizes sleep over food when energy is critical', () => {
      const autonomic = new AutonomicSystem();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0.2; // Low energy (below 0.3 threshold)
      needs.hunger = 0.05; // Critical hunger (below 0.1 threshold)
      agent.addComponent(needs);
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'TiredHungryAgent',
        behavior: 'wander',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      harness.world.addEntity(agent);

      const result = autonomic.check(agent);

      // Energy takes priority over hunger
      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_sleep');
    });

    it('respects circadian sleepDrive for sleep decisions', () => {
      const autonomic = new AutonomicSystem();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0.50; // Healthy energy
      needs.hunger = 0.80; // Not hungry
      agent.addComponent(needs);
      const circadian = createCircadianComponent();
      circadian.sleepDrive = 90; // Above 85 threshold triggers forced_sleep
      agent.addComponent(circadian);
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'SleepyAgent',
        behavior: 'wander',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      harness.world.addEntity(agent);

      const result = autonomic.check(agent);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('forced_sleep'); // sleepDrive > 85 triggers forced_sleep
    });
  });

  describe('DecisionProcessor Orchestration', () => {
    it('processes autonomic override first', () => {
      const processor = new DecisionProcessor();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0; // Critical
      agent.addComponent(needs);
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'TestAgent',
        behavior: 'gather',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      harness.world.addEntity(agent);

      const agentComp = agent.getComponent(ComponentType.Agent) as any;
      const result = processor.process(
        agent,
        harness.world,
        agentComp,
        () => []
      );

      expect(result.changed).toBe(true);
      expect(result.behavior).toBe('forced_sleep');
      expect(result.source).toBe('autonomic');
    });

    it('falls through to scripted when no autonomic override', () => {
      const processor = new DecisionProcessor();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0.80;
      needs.hunger = 0.80; // Full
      agent.addComponent(needs);
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'HealthyAgent',
        behavior: 'wander',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      // Add inventory to trigger resource gathering check
      const inventory = createInventoryComponent(10);
      agent.addComponent(inventory);
      harness.world.addEntity(agent);

      const agentComp = agent.getComponent(ComponentType.Agent) as any;
      const result = processor.process(
        agent,
        harness.world,
        agentComp,
        () => []
      );

      // May or may not change based on random checks in scripted processor
      expect(result.source).toMatch(/scripted|none/);
    });
  });

  describe('Autonomic Priority Overrides', () => {
    it('seek_warmth has high priority when dangerously cold', () => {
      const autonomic = new AutonomicSystem();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needs.energy = 0.80;
      needs.hunger = 0.80;
      agent.addComponent(needs);
      agent.addComponent({
        type: ComponentType.Temperature,
        currentTemp: -10,
        comfortMin: 15,
        comfortMax: 25,
        state: 'dangerously_cold',
      });
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'ColdAgent',
        behavior: 'gather',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      harness.world.addEntity(agent);

      const result = autonomic.check(agent);

      expect(result).not.toBeNull();
      expect(result!.behavior).toBe('seek_warmth');
      expect(result!.priority).toBe(90);
    });

    it('hunger priority depends on severity', () => {
      const autonomic = new AutonomicSystem();

      // Critical hunger
      const agentCritical = new EntityImpl(createEntityId(), 0);
      const needsCritical = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needsCritical.energy = 0.50;
      needsCritical.hunger = 0.05; // Critical hunger (< 0.1 threshold)
      agentCritical.addComponent(needsCritical);

      const resultCritical = autonomic.check(agentCritical);
      expect(resultCritical!.priority).toBe(80);

      // Moderate hunger
      const agentModerate = new EntityImpl(createEntityId(), 0);
      const needsModerate = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      needsModerate.energy = 0.50;
      needsModerate.hunger = 0.40; // Moderate hunger (< 0.6 threshold)
      agentModerate.addComponent(needsModerate);

      const resultModerate = autonomic.check(agentModerate);
      expect(resultModerate!.priority).toBe(40);
    });
  });

  describe('Decision Flow with Multiple Agents', () => {
    it('processes decisions independently for each agent', () => {
      const processor = new DecisionProcessor();

      // Exhausted agent
      const exhaustedAgent = new EntityImpl(createEntityId(), 0);
      exhaustedAgent.addComponent(createPositionComponent(50, 50));
      const exhaustedNeeds = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      exhaustedNeeds.energy = 0;
      exhaustedAgent.addComponent(exhaustedNeeds);
      exhaustedAgent.addComponent({
        type: ComponentType.Agent,
        name: 'ExhaustedAgent',
        behavior: 'wander',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      (harness.world as any)._addEntity(exhaustedAgent);

      // Healthy agent
      const healthyAgent = new EntityImpl(createEntityId(), 0);
      healthyAgent.addComponent(createPositionComponent(100, 100));
      const healthyNeeds = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
  });
      healthyNeeds.energy = 100;
      healthyNeeds.hunger = 100;
      healthyAgent.addComponent(healthyNeeds);
      healthyAgent.addComponent({
        type: ComponentType.Agent,
        name: 'HealthyAgent',
        behavior: 'wander',
        behaviorState: {},
        useLLM: false,
        llmCooldown: 0,
      });
      (harness.world as any)._addEntity(healthyAgent);

      const exhaustedComp = exhaustedAgent.getComponent(ComponentType.Agent) as any;
      const healthyComp = healthyAgent.getComponent(ComponentType.Agent) as any;

      const resultExhausted = processor.process(
        exhaustedAgent,
        harness.world,
        exhaustedComp,
        () => []
      );
      const resultHealthy = processor.process(
        healthyAgent,
        harness.world,
        healthyComp,
        () => []
      );

      expect(resultExhausted.changed).toBe(true);
      expect(resultExhausted.behavior).toBe('forced_sleep');

      // Healthy agent has no autonomic override
      expect(resultHealthy.source).not.toBe('autonomic');
    });
  });
});
