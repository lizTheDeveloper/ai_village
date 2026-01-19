/**
 * Test script to verify frightened state detection in AutonomicSystem
 */

import { AutonomicSystem } from './packages/core/src/decision/AutonomicSystem.js';
import { EntityImpl } from './packages/core/src/ecs/Entity.js';
import { ComponentType } from './packages/core/src/types/ComponentType.js';

// Create mock entity
const entity = new EntityImpl('test-agent');

// Add required components
entity.addComponent({
  type: ComponentType.Needs,
  version: 1,
  hunger: 0.8,
  energy: 0.8,
  health: 0.5,
});

entity.addComponent({
  type: ComponentType.Agent,
  version: 1,
  currentBehavior: 'idle',
  assignedBed: 'bed-123',
  homePreferences: {
    returnWhenHurt: true,
    returnWhenFrightened: true,
  },
});

// Test Case 1: Terrified mood state
console.log('\n=== Test Case 1: Terrified Mood State ===');
entity.addComponent({
  type: ComponentType.Mood,
  version: 1,
  currentMood: -80,
  baselineMood: 0,
  emotionalState: 'terrified',
  factors: {
    physical: -50,
    foodSatisfaction: 0,
    foodVariety: 0,
    social: -30,
    comfort: 0,
    rest: 0,
    achievement: 0,
    environment: -40,
  },
  moodHistory: [],
  recentMeals: [],
  favorites: [],
  comfortFoods: [],
  lastUpdate: 0,
});

const autonomic = new AutonomicSystem();
const result1 = autonomic.check(entity);
console.log('Result:', result1);
console.log('Expected: flee_to_home behavior with terrified reason');

// Test Case 2: Critical threat
console.log('\n=== Test Case 2: Critical Threat ===');
entity.updateComponent(ComponentType.Mood, (m: any) => ({
  ...m,
  emotionalState: 'anxious',
}));

entity.addComponent({
  type: ComponentType.ThreatDetection,
  version: 1,
  threats: [
    {
      threatId: 'enemy-1',
      type: 'hostile_agent',
      attackType: 'melee',
      powerLevel: 90, // Much stronger than agent
      distance: 10,
      direction: { x: 1, y: 0 },
      detectedAt: 0,
    },
  ],
  ownPowerLevel: 30, // Agent is much weaker
  lastScanTime: 0,
  scanInterval: 10,
});

const result2 = autonomic.check(entity);
console.log('Result:', result2);
console.log('Expected: flee_to_home behavior with critical threat reason');

// Test Case 3: Multiple threats (outnumbered)
console.log('\n=== Test Case 3: Outnumbered by Multiple Threats ===');
entity.updateComponent(ComponentType.ThreatDetection, (td: any) => ({
  ...td,
  threats: [
    {
      threatId: 'enemy-1',
      type: 'hostile_agent',
      attackType: 'melee',
      powerLevel: 40,
      distance: 8,
      direction: { x: 1, y: 0 },
      detectedAt: 0,
    },
    {
      threatId: 'enemy-2',
      type: 'hostile_agent',
      attackType: 'melee',
      powerLevel: 40,
      distance: 9,
      direction: { x: 0, y: 1 },
      detectedAt: 0,
    },
    {
      threatId: 'enemy-3',
      type: 'wild_animal',
      attackType: 'melee',
      powerLevel: 35,
      distance: 7,
      direction: { x: -1, y: 0 },
      detectedAt: 0,
    },
  ],
  ownPowerLevel: 50,
}));

const result3 = autonomic.check(entity);
console.log('Result:', result3);
console.log('Expected: flee_to_home behavior with outnumbered reason');

// Test Case 4: Panic attack breakdown
console.log('\n=== Test Case 4: Panic Attack Breakdown ===');
entity.updateComponent(ComponentType.ThreatDetection, (td: any) => ({
  ...td,
  threats: [],
}));

entity.updateComponent(ComponentType.Mood, (m: any) => ({
  ...m,
  stress: {
    level: 85,
    breakdownThreshold: 70,
    recentTraumas: [],
    copingMechanisms: ['socializing', 'sleeping'],
    inBreakdown: true,
    breakdownType: 'panic_attack',
    breakdownStartedAt: 0,
    totalBreakdowns: 1,
    lastCopingTick: 0,
  },
}));

const result4 = autonomic.check(entity);
console.log('Result:', result4);
console.log('Expected: flee_to_home behavior with panic attack reason');

// Test Case 5: No frightened state (should prioritize injury)
console.log('\n=== Test Case 5: No Frightened State (Normal Operation) ===');
entity.updateComponent(ComponentType.Needs, (n: any) => ({
  ...n,
  health: 0.25, // Low health
}));

entity.updateComponent(ComponentType.Mood, (m: any) => ({
  ...m,
  emotionalState: 'content',
  stress: undefined,
}));

const result5 = autonomic.check(entity);
console.log('Result:', result5);
console.log('Expected: flee_to_home behavior with injured reason');

console.log('\n=== All Tests Complete ===');
