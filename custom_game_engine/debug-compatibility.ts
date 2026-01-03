/**
 * Debug compatibility calculation
 */

import { createWanderingAgent } from './packages/world/src/entities/AgentEntity.js';
import { GameLoop } from './packages/core/src/index.js';
import { ComponentType as CT } from './packages/core/src/types/ComponentType.js';
import { SpeciesComponent } from './packages/core/src/components/SpeciesComponent.js';
import { calculateCompatibility } from './packages/core/src/reproduction/courtship/compatibility.js';

console.log('='.repeat(60));
console.log('DEBUGGING COMPATIBILITY CALCULATION');
console.log('='.repeat(60));

const gameLoop = new GameLoop();
const world = gameLoop.world as any;

// Create Romeo and Juliet
const romeoId = createWanderingAgent(world, 50, 50);
const julietId = createWanderingAgent(world, 51, 50);

const romeo = world.getEntity(romeoId);
const juliet = world.getEntity(julietId);

// Add Species
const romeoSpecies = new SpeciesComponent('human', 'Human', 'humanoid_biped');
const julietSpecies = new SpeciesComponent('human', 'Human', 'humanoid_biped');
(romeo as any).addComponent(romeoSpecies);
(juliet as any).addComponent(julietSpecies);

// Set sexuality
const romeoSexuality = romeo.getComponent(CT.Sexuality) as any;
const julietSexuality = juliet.getComponent(CT.Sexuality) as any;

romeoSexuality.activelySeeking = true;
julietSexuality.activelySeeking = true;

// Set courtship
const romeoCourtship = romeo.getComponent(CT.Courtship) as any;
const julietCourtship = juliet.getComponent(CT.Courtship) as any;

romeoCourtship.romanticInclination = 0.9;
julietCourtship.romanticInclination = 0.9;

// Set personalities
const romeoPersonality = romeo.getComponent(CT.Personality) as any;
const julietPersonality = juliet.getComponent(CT.Personality) as any;

romeoPersonality.openness = 0.8;
romeoPersonality.conscientiousness = 0.7;
romeoPersonality.extraversion = 0.9;
romeoPersonality.agreeableness = 0.8;
romeoPersonality.neuroticism = 0.3;
romeoPersonality.creativity = 0.7;
romeoPersonality.spirituality = 0.6;

julietPersonality.openness = 0.8;
julietPersonality.conscientiousness = 0.7;
julietPersonality.extraversion = 0.8;
julietPersonality.agreeableness = 0.9;
julietPersonality.neuroticism = 0.3;
julietPersonality.creativity = 0.7;
julietPersonality.spirituality = 0.6;

// Set relationship
const romeoRelationship = romeo.getComponent(CT.Relationship) as any;
const julietRelationship = juliet.getComponent(CT.Relationship) as any;

romeoRelationship.relationships.set(julietId, {
  targetId: julietId,
  familiarity: 70,
  affinity: 50,
  trust: 70,
  lastInteraction: 0,
  interactionCount: 5,
  sharedMemories: 3,
  sharedMeals: 2,
  perceivedSkills: [],
});

julietRelationship.relationships.set(romeoId, {
  targetId: romeoId,
  familiarity: 70,
  affinity: 50,
  trust: 70,
  lastInteraction: 0,
  interactionCount: 5,
  sharedMemories: 3,
  sharedMeals: 2,
  perceivedSkills: [],
});

// Now calculate compatibility
console.log('\nCalculating compatibility...');
console.log('Romeo sexuality:', {
  activelySeeking: romeoSexuality.activelySeeking,
  relationshipStyle: romeoSexuality.relationshipStyle,
  attractionCondition: romeoSexuality.attractionCondition,
});

console.log('Juliet sexuality:', {
  activelySeeking: julietSexuality.activelySeeking,
  relationshipStyle: julietSexuality.relationshipStyle,
  attractionCondition: julietSexuality.attractionCondition,
});

const compatibility = calculateCompatibility(romeo, juliet, world);

console.log(`\n🎯 COMPATIBILITY SCORE: ${compatibility.toFixed(4)}`);
console.log(`   Threshold (romanticInclination=0.9): ${(0.5 - 0.9 * 0.3).toFixed(4)}`);
console.log(`   Would trigger courtship: ${compatibility > (0.5 - 0.9 * 0.3) ? 'YES ✓' : 'NO ✗'}`);

console.log('\n' + '='.repeat(60));
