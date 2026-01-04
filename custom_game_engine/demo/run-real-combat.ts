/**
 * Real Combat Recorder
 *
 * Runs actual ECS combat simulations with AgentCombatSystem and records
 * the results for Interdimensional Cable playback.
 *
 * Usage:
 *   npx tsx demo/run-real-combat.ts
 */

import * as fs from 'fs';
import * as path from 'path';
// Use the test helper World which provides convenience methods
import { World } from '../packages/core/src/World.ts';
import { AgentCombatSystem } from '../packages/core/src/systems/AgentCombatSystem.ts';
import type { ConflictComponent } from '../packages/core/src/components/ConflictComponent.ts';

// ============================================================================
// CREATURE DEFINITIONS
// ============================================================================

interface CreatureTemplate {
  name: string;
  type: string;
  combatSkill: number;
  weapon: string;
  armor: string;
  color: string;
  attackStyles: string[];
  bodyParts: string[];
  damageTypes: string[];
  weapons: Array<{ name: string; type: string; color: string }>;
}

const CREATURES: Record<string, CreatureTemplate> = {
  transcendent_fae: {
    name: 'Luminara the Transcendent',
    type: 'transcendent_fae',
    combatSkill: 8,
    weapon: 'magic',
    armor: 'ethereal',
    color: 'iridescent',
    attackStyles: ['phase-shifts through', 'reality-warps around', 'enchants the air to strike', 'transmutes spacetime against'],
    bodyParts: ['ethereal essence', 'reality anchor', 'dream core', 'shimmer wing', 'fae heart'],
    damageTypes: ['fragmenting the reality matrix', 'corrupting the dimensional anchor', 'shattering the dream essence', 'unweaving existence'],
    weapons: [
      { name: 'prismatic reality shard', type: 'magic', color: 'rainbow' },
      { name: 'crystalline moonbeam', type: 'energy', color: 'silver' },
      { name: 'fractal dream weaver', type: 'psychic', color: 'purple' },
    ],
  },
  celestial_angel: {
    name: 'Seraphiel the Radiant',
    type: 'celestial_angel',
    combatSkill: 9,
    weapon: 'divine',
    armor: 'holy',
    color: 'golden',
    attackStyles: ['smites', 'consecrates wrath upon', 'channels divine fury at', 'purifies violently'],
    bodyParts: ['wing span', 'halo', 'divine core', 'holy aura', 'celestial form'],
    damageTypes: ['scorching with holy fire', 'purging the divine essence', 'searing with radiance', 'casting out into void'],
    weapons: [
      { name: 'holy flame sword', type: 'divine', color: 'white-gold' },
      { name: 'divine judgment staff', type: 'holy', color: 'platinum' },
      { name: 'celestial light spear', type: 'radiant', color: 'pure-white' },
    ],
  },
  tentacle_book_monster: {
    name: 'The Necronomicon Amalgam',
    type: 'tentacle_book_monster',
    combatSkill: 7,
    weapon: 'appendage',
    armor: 'leather', // Bound in leather
    color: 'parchment-black',
    attackStyles: ['lashes tentacle-pages at', 'inscribes pain upon', 'devours knowledge from', 'annotates suffering onto'],
    bodyParts: ['spine tentacle', 'cover plates', 'page cluster', 'ink sac', 'binding core'],
    damageTypes: ['inscribing forbidden runes', 'corrupting with dark knowledge', 'absorbing life-text', 'rewriting biological scripture'],
    weapons: [
      { name: 'writhing page tentacles', type: 'appendage', color: 'ink-black' },
      { name: 'forbidden knowledge beam', type: 'psychic', color: 'dark-purple' },
      { name: 'reality-rending bookmark', type: 'dimensional', color: 'void-black' },
    ],
  },
  weaponized_deer: {
    name: 'Bambi the Unhinged',
    type: 'weaponized_deer',
    combatSkill: 6,
    weapon: 'blade',
    armor: 'none',
    color: 'brown-red',
    attackStyles: ['slashes wildly at', 'gouges', 'tramples savagely', 'eviscerates'],
    bodyParts: ['flank', 'neck', 'foreleg', 'antlers', 'chest'],
    damageTypes: ['tearing through fur and flesh', 'crushing bone and cartilage', 'rending muscle fibers', 'severing vital arteries'],
    weapons: [
      { name: 'rusty machete', type: 'blade', color: 'rust-red' },
      { name: 'sharpened antlers', type: 'natural', color: 'bone-white' },
      { name: 'vengeful hooves', type: 'bludgeon', color: 'dirt-brown' },
    ],
  },
  gladiator_red: {
    name: 'Gladiator Red',
    type: 'gladiator',
    combatSkill: 7,
    weapon: 'sword',
    armor: 'chainmail',
    color: 'red',
    attackStyles: ['strikes', 'slashes', 'stabs', 'bashes', 'lunges at'],
    bodyParts: ['head', 'neck', 'upper body', 'lower body', 'left arm', 'right arm'],
    damageTypes: ['glancing blow', 'bruising the muscle', 'tearing the muscle', 'fracturing the bone'],
    weapons: [
      { name: 'crimson sword', type: 'sword', color: 'red' },
      { name: 'ruby axe', type: 'axe', color: 'red' },
      { name: 'scarlet spear', type: 'spear', color: 'red' },
    ],
  },
  gladiator_blue: {
    name: 'Gladiator Blue',
    type: 'gladiator',
    combatSkill: 6,
    weapon: 'spear',
    armor: 'leather',
    color: 'blue',
    attackStyles: ['strikes', 'thrusts', 'sweeps', 'charges at', 'cleaves at'],
    bodyParts: ['head', 'neck', 'upper body', 'lower body', 'left arm', 'right arm'],
    damageTypes: ['glancing blow', 'bruising the bone', 'mangling the flesh', 'shattering the bone'],
    weapons: [
      { name: 'sapphire sword', type: 'sword', color: 'blue' },
      { name: 'azure mace', type: 'mace', color: 'blue' },
      { name: 'cobalt trident', type: 'trident', color: 'blue' },
    ],
  },
};

// ============================================================================
// COMBAT SCENARIOS
// ============================================================================

interface CombatScenario {
  name: string;
  title: string;
  description: string;
  creature1: string;
  creature2: string;
  background: {
    type: string;
    name: string;
    prompt: string;
    color: string;
  };
}

const SCENARIOS: CombatScenario[] = [
  {
    name: 'fae-vs-angels',
    title: 'TRANSCENDENT FAE VS CELESTIAL ANGELS - Ethereal Duel',
    description: 'Reality-warping fae creatures battle divine angelic beings',
    creature1: 'transcendent_fae',
    creature2: 'celestial_angel',
    background: {
      type: 'ethereal',
      name: 'Dimensional Nexus',
      prompt: 'swirling dimensional void, reality fractures, cosmic aurora, stars bleeding into rainbow light, ethereal mist, otherworldly plane, pixel art background, tileable',
      color: '#1a0533',
    },
  },
  {
    name: 'book-tentacle-vs-bambi',
    title: 'TENTACLE BOOK HORROR VS BAMBI WITH MACHETE - Forbidden Knowledge',
    description: 'Eldritch tome-beast faces off against weaponized woodland creature',
    creature1: 'tentacle_book_monster',
    creature2: 'weaponized_deer',
    background: {
      type: 'eldritch',
      name: 'Forbidden Library Ruins',
      prompt: 'ruined ancient library, floating books, ink dripping from shadows, eldritch symbols glowing on walls, torn pages floating, cursed tomes, dark academia horror, pixel art background, tileable',
      color: '#0d1117',
    },
  },
  {
    name: 'gladiator-combat-real',
    title: 'REAL GLADIATOR COMBAT - AI Arena Fight',
    description: 'Two gladiators battle to the death using real ECS combat',
    creature1: 'gladiator_red',
    creature2: 'gladiator_blue',
    background: {
      type: 'arena',
      name: 'Gladiatorial Arena',
      prompt: 'roman gladiatorial arena, sand floor, stone walls with arches, crowd silhouettes in stands, dramatic torchlight, blood stains on sand, pixel art background, tileable',
      color: '#3d2817',
    },
  },
];

// ============================================================================
// COMBAT SIMULATION
// ============================================================================

interface CombatLogEntry {
  tick: number;
  attacker: string;
  defender: string;
  action: string;
  weapon: string;
  bodyPart: string;
  damage: string;
  renderableOperation: {
    actor: string;
    actorType: string;
    action: string;
    weapon: string;
    target: string;
    spritePrompt: string;
  };
}

interface FrameEntity {
  entityId: string;
  entityType: string;
  x: number;
  y: number;
  facingAngle: number;
  animation: { state: string; frame: number };
  distanceFromCamera: number;
}

interface Frame {
  tick: number;
  cameraX: number;
  cameraY: number;
  cameraAngle: number;
  cameraZoom: number;
  entities: FrameEntity[];
}

function runRealCombat(scenario: CombatScenario): {
  combatLog: CombatLogEntry[];
  frames: Frame[];
  winner: string | null;
  outcome: string;
} {
  const c1Template = CREATURES[scenario.creature1]!;
  const c2Template = CREATURES[scenario.creature2]!;

  console.log(`\n  [Combat] ${c1Template.name} vs ${c2Template.name}`);

  // Create ECS world
  const world = new World();
  const system = new AgentCombatSystem();

  // Create creature 1
  const creature1 = world.createEntity();
  creature1.addComponent('position', { x: 500, y: 600, z: 0, facingAngle: 0 });
  creature1.addComponent('agent', { name: c1Template.name });
  creature1.addComponent('combat_stats', {
    combatSkill: c1Template.combatSkill,
    huntingSkill: 5,
    stealthSkill: 5,
    weapon: c1Template.weapon,
    armor: c1Template.armor,
  });
  creature1.addComponent('relationship', { relationships: {} });
  // Note: renderable not needed for ECS combat simulation

  // Create creature 2
  const creature2 = world.createEntity();
  creature2.addComponent('position', { x: 700, y: 600, z: 0, facingAngle: 180 });
  creature2.addComponent('agent', { name: c2Template.name });
  creature2.addComponent('combat_stats', {
    combatSkill: c2Template.combatSkill,
    huntingSkill: 5,
    stealthSkill: 5,
    weapon: c2Template.weapon,
    armor: c2Template.armor,
  });
  creature2.addComponent('relationship', { relationships: {} });

  // Initiate combat - creature1 attacks creature2
  creature1.addComponent('conflict', {
    conflictType: 'agent_combat',
    target: creature2.id,
    cause: 'honor_duel',
    state: 'initiated',
    startTime: 0,
    lethal: true,
  });

  const combatLog: CombatLogEntry[] = [];
  const frames: Frame[] = [];

  // Simulation state
  let c1Pos = { x: 500, y: 600 };
  let c2Pos = { x: 700, y: 600 };
  const center = { x: 600, y: 600 };
  let phase = 'approach';
  let combatTick = 0;

  // Run simulation for enough ticks to resolve combat
  // Combat durations: MIN=300, BASE=500, EXTENDED=700, LETHAL=900 ticks
  const maxTicks = 1000;
  const frameCaptureInterval = 5; // Capture every 5th tick for reasonable file size
  const maxFrames = 200; // Limit output frames

  for (let tick = 0; tick < maxTicks; tick++) {
    // Run ECS combat system
    const entities = Array.from(world.entities.values());
    system.update(world, entities, 0.05); // 20 TPS

    // Check conflict state
    const conflict = world.getComponent<ConflictComponent>(creature1.id, 'conflict');

    // Update phase based on ECS state
    if (conflict?.state === 'fighting') {
      phase = 'combat';
      combatTick++;
    } else if (conflict?.state === 'resolved') {
      phase = 'resolved';
    }

    // Position updates
    const dist = Math.sqrt(Math.pow(c1Pos.x - c2Pos.x, 2) + Math.pow(c1Pos.y - c2Pos.y, 2));

    if (phase === 'approach' && dist > 40) {
      // Move toward each other
      c1Pos.x += (center.x - 15 - c1Pos.x) * 0.12;
      c1Pos.y += (center.y - c1Pos.y) * 0.12;
      c2Pos.x += (center.x + 15 - c2Pos.x) * 0.12;
      c2Pos.y += (center.y - c2Pos.y) * 0.12;
    } else if (phase === 'combat') {
      // Chaotic combat movement
      const angle = tick * 0.1;
      c1Pos.x = center.x - 20 + Math.cos(angle) * 15;
      c1Pos.y = center.y + Math.sin(angle) * 15;
      c2Pos.x = center.x + 20 - Math.cos(angle) * 15;
      c2Pos.y = center.y - Math.sin(angle) * 15;

      // Generate combat log entries during fighting (every ~20 ticks = ~1 second)
      if (combatTick % 20 === 0 && combatTick > 0) {
        const isC1Attack = Math.random() > 0.5;
        const attacker = isC1Attack ? c1Template : c2Template;
        const defender = isC1Attack ? c2Template : c1Template;

        const action = attacker.attackStyles[Math.floor(Math.random() * attacker.attackStyles.length)]!;
        const weapon = attacker.weapons[Math.floor(Math.random() * attacker.weapons.length)]!;
        const bodyPart = defender.bodyParts[Math.floor(Math.random() * defender.bodyParts.length)]!;
        const damage = defender.damageTypes[Math.floor(Math.random() * defender.damageTypes.length)]!;

        combatLog.push({
          tick,
          attacker: attacker.name,
          defender: defender.name,
          action,
          weapon: weapon.name,
          bodyPart,
          damage,
          renderableOperation: {
            actor: attacker.name,
            actorType: attacker.type,
            action,
            weapon: weapon.name,
            target: `${defender.name}'s ${bodyPart}`,
            spritePrompt: `${attacker.type.replace(/_/g, ' ')} ${action} with ${weapon.name}, ${attacker.color} coloring, attacking motion, pixel art, 48x48, high top-down view, combat animation`,
          },
        });
      }
    } else if (phase === 'resolved') {
      // Winner celebrates, loser falls
      if (conflict?.outcome === 'attacker_victory') {
        c2Pos.y += 0.5;
      } else if (conflict?.outcome === 'defender_victory') {
        c1Pos.y += 0.5;
      }
    }

    // Capture frame at interval (to keep file size reasonable)
    if (tick % frameCaptureInterval === 0 && frames.length < maxFrames) {
      const cameraX = (c1Pos.x + c2Pos.x) / 2;
      const cameraY = (c1Pos.y + c2Pos.y) / 2;

      let animState = 'walking';
      if (phase === 'approach') animState = 'walking';
      else if (phase === 'combat') animState = tick % 10 < 3 ? 'attacking' : 'defending';
      else if (phase === 'resolved') animState = conflict?.outcome === 'attacker_victory' ? 'victorious' : 'defeated';

      frames.push({
        tick,
        cameraX,
        cameraY,
        cameraAngle: 180,
        cameraZoom: phase === 'combat' ? 1.3 : 1.1,
        entities: [
          {
            entityId: c1Template.type + '_1',
            entityType: c1Template.type,
            x: c1Pos.x,
            y: c1Pos.y,
            facingAngle: Math.atan2(c2Pos.y - c1Pos.y, c2Pos.x - c1Pos.x) * (180 / Math.PI),
            animation: { state: animState, frame: Math.floor(tick / 5) % 8 },
            distanceFromCamera: Math.sqrt(Math.pow(c1Pos.x - cameraX, 2) + Math.pow(c1Pos.y - cameraY, 2)),
          },
          {
            entityId: c2Template.type + '_1',
            entityType: c2Template.type,
            x: c2Pos.x,
            y: c2Pos.y,
            facingAngle: Math.atan2(c1Pos.y - c2Pos.y, c1Pos.x - c2Pos.x) * (180 / Math.PI),
            animation: { state: animState, frame: Math.floor(tick / 5) % 8 },
            distanceFromCamera: Math.sqrt(Math.pow(c2Pos.x - cameraX, 2) + Math.pow(c2Pos.y - cameraY, 2)),
          },
        ],
      });
    }

    // Stop early if combat resolved and we have some post-combat frames
    if (phase === 'resolved' && frames.length > 10) {
      // Capture a few more frames for resolution animation then stop
      if (tick > 20) break;
    }
  }

  // Determine winner from ECS
  const finalConflict = world.getComponent<ConflictComponent>(creature1.id, 'conflict');
  let winner: string | null = null;
  let outcome = finalConflict?.outcome || 'stalemate';

  if (finalConflict?.outcome === 'attacker_victory') {
    winner = c1Template.name;
  } else if (finalConflict?.outcome === 'defender_victory') {
    winner = c2Template.name;
  } else if (finalConflict?.outcome === 'mutual_injury') {
    winner = null;
    outcome = 'mutual_injury';
  }

  console.log(`  [Combat] State: ${finalConflict?.state || 'unknown'}`);
  console.log(`  [Combat] Outcome: ${outcome}`);
  console.log(`  [Combat] Winner: ${winner || 'None (draw)'}`);
  console.log(`  [Combat] Attacker Power: ${finalConflict?.attackerPower || 'N/A'}`);
  console.log(`  [Combat] Defender Power: ${finalConflict?.defenderPower || 'N/A'}`);

  return { combatLog, frames, winner, outcome };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('[RealCombat] Running ECS-based combat simulations...');

  for (const scenario of SCENARIOS) {
    console.log(`\n[RealCombat] Scenario: ${scenario.title}`);

    const { combatLog, frames, winner, outcome } = runRealCombat(scenario);

    const c1 = CREATURES[scenario.creature1]!;
    const c2 = CREATURES[scenario.creature2]!;

    const recording = {
      recordingId: `real_combat_${scenario.name}_${Date.now()}`,
      title: scenario.title,
      description: scenario.description,
      recordedBy: 'ECS Combat System',
      recordedAt: Date.now(),
      duration: frames.length,
      quality: 0.98,
      frames,
      combatLog,
      combatants: [
        {
          name: c1.name,
          type: c1.type,
          color: c1.color,
          weapons: c1.weapons,
        },
        {
          name: c2.name,
          type: c2.type,
          color: c2.color,
          weapons: c2.weapons,
        },
      ],
      background: scenario.background,
      ecsMetadata: {
        winner,
        outcome,
        usedRealCombatSystem: true,
      },
    };

    const outputPath = path.join(
      import.meta.dirname,
      'public',
      'mock-recordings',
      `${scenario.name}.json`
    );
    fs.writeFileSync(outputPath, JSON.stringify(recording, null, 2), 'utf-8');

    console.log(`  ✅ Saved: ${scenario.name}.json`);
    console.log(`  📊 Combat log entries: ${combatLog.length}`);
    console.log(`  🎬 Frames: ${frames.length}`);
    console.log(`  🏆 Winner: ${winner || 'Draw'}`);
    console.log(`  🖼️  Background: ${scenario.background.name}`);

    // Sample combat actions
    if (combatLog.length > 0) {
      console.log('\n  Sample combat actions:');
      combatLog.slice(0, 3).forEach((entry) => {
        console.log(`    • ${entry.attacker} ${entry.action} ${entry.defender} with ${entry.weapon}`);
        console.log(`      targeting ${entry.bodyPart}, ${entry.damage}`);
      });
    }
  }

  console.log('\n[RealCombat] ✨ All real combat simulations complete!');
}

main();
