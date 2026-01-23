/**
 * 30-Minute Autonomous Playtest
 *
 * Observes agents running autonomously without angel intervention.
 * Tracks: resource gathering, building construction, skill learning, agent behavior.
 *
 * Answers:
 * - Can agents gather resources on their own?
 * - Can agents build buildings?
 * - Can agents learn skills?
 * - Does the settlement progress naturally?
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { HeadlessGameLoop } from './headless.js';
import type { Entity } from '@ai-village/core';

interface PlaytestMetrics {
  resourcesGathered: Map<string, number>;
  buildingsConstructed: string[];
  skillsLearned: Map<string, number>;  // agentName -> skillCount
  agentBehaviors: Map<string, string[]>;  // agentName -> [behaviors over time]
  deaths: number;
  births: number;
}

async function main() {
  console.log('=== 30-MINUTE AUTONOMOUS PLAYTEST ===\n');
  console.log('Observing agents for 30 minutes to assess autonomous gameplay.\n');

  const metrics: PlaytestMetrics = {
    resourcesGathered: new Map(),
    buildingsConstructed: [],
    skillsLearned: new Map(),
    agentBehaviors: new Map(),
    deaths: 0,
    births: 0,
  };

  const gameLoop = new HeadlessGameLoop();
  await gameLoop.start();

  // Hook into events
  const events = gameLoop.world.eventBus;

  events.on('resource:gathered', (event: any) => {
    const { resourceType, quantity } = event.data;
    const current = metrics.resourcesGathered.get(resourceType) || 0;
    metrics.resourcesGathered.set(resourceType, current + quantity);
  });

  events.on('building:constructed', (event: any) => {
    const { buildingType } = event.data;
    metrics.buildingsConstructed.push(buildingType);
  });

  events.on('skill:learned', (event: any) => {
    const { agentName, skillName } = event.data;
    const current = metrics.skillsLearned.get(agentName) || 0;
    metrics.skillsLearned.set(agentName, current + 1);
  });

  events.on('agent:died', () => {
    metrics.deaths++;
  });

  events.on('agent:born', () => {
    metrics.births++;
  });

  // Track behavior changes
  events.on('behavior:changed', (event: any) => {
    const { agentName, newBehavior } = event.data;
    const behaviors = metrics.agentBehaviors.get(agentName) || [];
    behaviors.push(newBehavior);
    metrics.agentBehaviors.set(agentName, behaviors);
  });

  // Run for 30 minutes
  console.log('Game started. Running for 30 minutes...\n');
  const startTime = Date.now();
  const duration = 30 * 60 * 1000; // 30 minutes
  const reportInterval = 5 * 60 * 1000; // Report every 5 minutes

  let lastReport = startTime;
  let tickCount = 0;

  while (Date.now() - startTime < duration) {
    await gameLoop.tick(0.05);
    tickCount++;

    // Report progress every 5 minutes
    if (Date.now() - lastReport >= reportInterval) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
      console.log(`\n[${elapsed}min] Progress Report:`);
      console.log(`  Ticks: ${tickCount}`);
      console.log(`  Resources gathered: ${Array.from(metrics.resourcesGathered.entries()).map(([type, qty]) => `${type}:${qty}`).join(', ') || 'none'}`);
      console.log(`  Buildings constructed: ${metrics.buildingsConstructed.length}`);
      console.log(`  Skills learned: ${Array.from(metrics.skillsLearned.values()).reduce((sum, count) => sum + count, 0)}`);
      console.log(`  Deaths: ${metrics.deaths}, Births: ${metrics.births}`);

      // Agent status
      const agents = gameLoop.world.query().with('agent').executeEntities();
      console.log(`  Active agents: ${agents.length}`);

      lastReport = Date.now();
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Final report
  console.log('\n\n=== FINAL PLAYTEST REPORT (30 MINUTES) ===\n');

  console.log('## Resource Gathering');
  if (metrics.resourcesGathered.size > 0) {
    for (const [type, qty] of metrics.resourcesGathered.entries()) {
      console.log(`  ${type}: ${qty}`);
    }
  } else {
    console.log('  ⚠ NO resources gathered - agents may not be able to find/gather resources');
  }

  console.log('\n## Buildings Constructed');
  if (metrics.buildingsConstructed.length > 0) {
    const byType = new Map<string, number>();
    for (const type of metrics.buildingsConstructed) {
      byType.set(type, (byType.get(type) || 0) + 1);
    }
    for (const [type, count] of byType.entries()) {
      console.log(`  ${type}: ${count}`);
    }
  } else {
    console.log('  ⚠ NO buildings constructed - agents may lack resources or initiative');
  }

  console.log('\n## Skills Learned');
  if (metrics.skillsLearned.size > 0) {
    for (const [agent, count] of metrics.skillsLearned.entries()) {
      console.log(`  ${agent}: ${count} skills`);
    }
  } else {
    console.log('  ⚠ NO skills learned - skill progression may be broken');
  }

  console.log('\n## Agent Behaviors');
  for (const [agent, behaviors] of metrics.agentBehaviors.entries()) {
    const uniqueBehaviors = new Set(behaviors);
    console.log(`  ${agent}: ${uniqueBehaviors.size} unique behaviors (${Array.from(uniqueBehaviors).join(', ')})`);
  }

  console.log('\n## Population');
  console.log(`  Deaths: ${metrics.deaths}`);
  console.log(`  Births: ${metrics.births}`);
  console.log(`  Net change: ${metrics.births - metrics.deaths}`);

  // Final agent count
  const finalAgents = gameLoop.world.query().with('agent').executeEntities();
  console.log(`  Final count: ${finalAgents.length}`);

  // Assessment
  console.log('\n\n=== ASSESSMENT ===\n');

  const resourceGatheringWorks = metrics.resourcesGathered.size > 0;
  const buildingWorks = metrics.buildingsConstructed.length > 0;
  const skillsWork = metrics.skillsLearned.size > 0;
  const agentsActive = metrics.agentBehaviors.size > 0;

  console.log('**Is this game fun?**');
  if (agentsActive && resourceGatheringWorks) {
    console.log('  YES - Agents are actively doing things and progressing');
  } else {
    console.log('  UNCLEAR - Agents exist but may not be progressing meaningfully');
  }

  console.log('\n**Does it work?**');
  if (resourceGatheringWorks && agentsActive) {
    console.log('  YES - Core gameplay loop functions (agents gather resources, change behaviors)');
  } else {
    console.log('  PARTIALLY - Some systems work but others may be broken');
  }

  console.log('\n**Can agents build buildings on their own?**');
  if (buildingWorks) {
    console.log(`  YES - ${metrics.buildingsConstructed.length} buildings constructed autonomously`);
  } else if (resourceGatheringWorks) {
    console.log('  NO - Resources available but no buildings constructed (may need AI direction)');
  } else {
    console.log('  NO - Cannot gather resources, so cannot build');
  }

  console.log('\n**Can agents learn skills on their own?**');
  if (skillsWork) {
    console.log(`  YES - ${Array.from(metrics.skillsLearned.values()).reduce((sum, count) => sum + count, 0)} skills learned`);
  } else {
    console.log('  NO - Skill learning may require explicit actions or be broken');
  }

  console.log('\n**What\'s not working?**');
  const issues = [];
  if (!resourceGatheringWorks) issues.push('Resource gathering broken or not triggered');
  if (!buildingWorks) issues.push('Building construction not happening autonomously');
  if (!skillsWork) issues.push('Skill learning not happening');
  if (!agentsActive) issues.push('Agents not changing behaviors (stuck/idle)');

  if (issues.length > 0) {
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
  } else {
    console.log('  Everything appears to be working!');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
