/**
 * Generate Combat Recording
 *
 * Generates a synthetic combat recording by simulating two gladiators
 * moving toward each other and fighting. Outputs JSON compatible with
 * Interdimensional Cable.
 *
 * Usage:
 *   npx tsx demo/generate-combat-recording.ts [--frames=100] [--output=combat.json]
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const args = process.argv.slice(2);
const framesArg = args.find(arg => arg.startsWith('--frames='));
const outputArg = args.find(arg => arg.startsWith('--output='));

const CONFIG = {
  framesToGenerate: framesArg ? parseInt(framesArg.split('=')[1]) : 100,
  outputFile: outputArg ? outputArg.split('=')[1] : 'gladiator-combat-real.json',
  recordingTitle: 'REAL GLADIATOR COMBAT - Procedural Arena Fight',
  recordingDescription: 'Two gladiators approach and battle in a procedurally generated fight',
};

// ============================================================================
// SIMULATION
// ============================================================================

interface Vector2 {
  x: number;
  y: number;
}

interface CombatLogEntry {
  tick: number;
  attacker: string;
  defender: string;
  attackType: string;
  bodyPart: string;
  damage: string;
  result: string;
}

function distance(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Combat log generation (Dwarf Fortress style)
const ATTACK_TYPES = [
  'strikes', 'slashes', 'stabs', 'bashes', 'lunges at', 'charges at',
  'sweeps at', 'thrusts at', 'hacks at', 'cleaves at'
];

const BODY_PARTS = [
  'head', 'neck', 'upper body', 'lower body', 'left arm', 'right arm',
  'left leg', 'right leg', 'left hand', 'right hand', 'chest', 'back'
];

const DAMAGE_LEVELS = [
  'glancing blow',
  'bruising the muscle',
  'bruising the bone',
  'tearing the muscle',
  'fracturing the bone',
  'shattering the bone',
  'severing the artery',
  'mangling the flesh'
];

const RESULTS = [
  'The ${defender} staggers backward!',
  'The ${defender} is knocked off balance!',
  'The ${defender} grimaces in pain!',
  'The ${defender} stumbles!',
  'The ${defender} roars in defiance!',
  'The ${defender} counterattacks!',
  'The ${defender} blocks with their shield!',
  'The ${defender} dodges away!'
];

function generateCombatLogEntry(tick: number, attacker: string, defender: string): CombatLogEntry {
  const attackType = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
  const bodyPart = BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)];
  const damage = DAMAGE_LEVELS[Math.floor(Math.random() * DAMAGE_LEVELS.length)];
  const resultTemplate = RESULTS[Math.floor(Math.random() * RESULTS.length)];
  const result = resultTemplate.replace('${defender}', defender);

  return {
    tick,
    attacker,
    defender,
    attackType,
    bodyPart,
    damage,
    result
  };
}

function generateCombatRecording() {
  const frames = [];
  const combatLog: CombatLogEntry[] = [];

  // Initial positions
  const gladiator1Start = { x: 580, y: 600 };
  const gladiator2Start = { x: 620, y: 600 };
  const arenaCenter = { x: 600, y: 600 };

  // Track positions
  let g1Pos = { ...gladiator1Start };
  let g2Pos = { ...gladiator2Start };

  let phase = 'approach'; // approach, circling, fighting, victory
  let winner: string | null = null;
  let circleAngle = 0;

  // Combat tracking
  let g1Health = 100;
  let g2Health = 100;

  for (let tick = 0; tick < CONFIG.framesToGenerate; tick++) {
    const t = tick / CONFIG.framesToGenerate;

    // Determine phase
    if (phase === 'approach' && distance(g1Pos, g2Pos) < 25) {
      phase = 'circling';
    } else if (phase === 'circling' && tick > 40) {
      phase = 'fighting';
    } else if (phase === 'fighting' && tick > 80) {
      phase = 'victory';
      winner = Math.random() > 0.5 ? 'gladiator_red' : 'gladiator_blue';
    }

    // Update positions based on phase
    if (phase === 'approach') {
      // Move toward center
      g1Pos.x = lerp(g1Pos.x, arenaCenter.x - 10, 0.03);
      g1Pos.y = lerp(g1Pos.y, arenaCenter.y, 0.03);
      g2Pos.x = lerp(g2Pos.x, arenaCenter.x + 10, 0.03);
      g2Pos.y = lerp(g2Pos.y, arenaCenter.y, 0.03);
    } else if (phase === 'circling') {
      // Circle around each other
      circleAngle += 0.05;
      const radius = 15;
      g1Pos.x = arenaCenter.x + Math.cos(circleAngle) * radius - 10;
      g1Pos.y = arenaCenter.y + Math.sin(circleAngle) * radius;
      g2Pos.x = arenaCenter.x - Math.cos(circleAngle) * radius + 10;
      g2Pos.y = arenaCenter.y - Math.sin(circleAngle) * radius;
    } else if (phase === 'fighting') {
      // Chaotic movement during fight
      const chaos = Math.sin(tick * 0.3) * 3;
      g1Pos.x += chaos;
      g1Pos.y += Math.cos(tick * 0.2) * 2;
      g2Pos.x -= chaos;
      g2Pos.y -= Math.cos(tick * 0.2) * 2;

      // Generate combat log entries (every 3-5 ticks)
      if (tick % Math.floor(3 + Math.random() * 3) === 0) {
        const attacker = Math.random() > 0.5 ? 'Gladiator Red' : 'Gladiator Blue';
        const defender = attacker === 'Gladiator Red' ? 'Gladiator Blue' : 'Gladiator Red';
        const logEntry = generateCombatLogEntry(tick, attacker, defender);
        combatLog.push(logEntry);

        // Apply damage
        const damage = Math.floor(5 + Math.random() * 15);
        if (attacker === 'Gladiator Red') {
          g2Health -= damage;
          if (g2Health <= 0) {
            winner = 'gladiator_red';
            phase = 'victory';
          }
        } else {
          g1Health -= damage;
          if (g1Health <= 0) {
            winner = 'gladiator_blue';
            phase = 'victory';
          }
        }
      }
    } else if (phase === 'victory') {
      // Winner stands, loser falls
      if (winner === 'gladiator_red') {
        g2Pos.y += 0.5; // Falling back
      } else {
        g1Pos.y += 0.5;
      }
    }

    // Determine animation states
    let g1AnimState = 'walking';
    let g2AnimState = 'walking';

    if (phase === 'approach') {
      g1AnimState = distance(g1Pos, arenaCenter) > 15 ? 'walking' : 'running';
      g2AnimState = distance(g2Pos, arenaCenter) > 15 ? 'walking' : 'running';
    } else if (phase === 'circling') {
      g1AnimState = 'combat_stance';
      g2AnimState = 'combat_stance';
    } else if (phase === 'fighting') {
      g1AnimState = tick % 10 < 3 ? 'attacking' : 'defending';
      g2AnimState = tick % 10 < 3 ? 'defending' : 'attacking';
    } else if (phase === 'victory') {
      g1AnimState = winner === 'gladiator_red' ? 'victorious' : 'defeated';
      g2AnimState = winner === 'gladiator_blue' ? 'victorious' : 'defeated';
    }

    // Calculate facing angles
    const g1Angle = Math.atan2(g2Pos.y - g1Pos.y, g2Pos.x - g1Pos.x) * (180 / Math.PI);
    const g2Angle = Math.atan2(g1Pos.y - g2Pos.y, g1Pos.x - g2Pos.x) * (180 / Math.PI);

    // Camera follows action
    const cameraX = (g1Pos.x + g2Pos.x) / 2;
    const cameraY = (g1Pos.y + g2Pos.y) / 2;
    const cameraZoom = phase === 'fighting' ? 1.3 : 1.1;

    // Build frame
    frames.push({
      tick,
      cameraX,
      cameraY,
      cameraAngle: 180,
      cameraZoom,
      entities: [
        {
          entityId: 'gladiator_red',
          entityType: 'gladiator',
          x: g1Pos.x,
          y: g1Pos.y,
          facingAngle: g1Angle,
          animation: {
            state: g1AnimState,
            frame: Math.floor(tick / 5) % 8,
          },
          distanceFromCamera: distance(g1Pos, { x: cameraX, y: cameraY }),
        },
        {
          entityId: 'gladiator_blue',
          entityType: 'gladiator',
          x: g2Pos.x,
          y: g2Pos.y,
          facingAngle: g2Angle,
          animation: {
            state: g2AnimState,
            frame: Math.floor(tick / 5) % 8,
          },
          distanceFromCamera: distance(g2Pos, { x: cameraX, y: cameraY }),
        },
      ],
    });
  }

  return { frames, combatLog };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('[CombatGenerator] Generating combat recording...');
  console.log('[CombatGenerator] Config:', CONFIG);

  const { frames, combatLog } = generateCombatRecording();

  const recording = {
    recordingId: `combat_${Date.now()}`,
    title: CONFIG.recordingTitle,
    description: CONFIG.recordingDescription,
    recordedBy: 'Procedural Combat Generator',
    recordedAt: Date.now(),
    duration: CONFIG.framesToGenerate,
    quality: 0.98,
    frames,
    combatLog,
  };

  const outputPath = path.join(import.meta.dirname, 'public', 'mock-recordings', CONFIG.outputFile);
  const json = JSON.stringify(recording, null, 2);
  fs.writeFileSync(outputPath, json, 'utf-8');

  console.log(`[CombatGenerator] ✅ Recording generated!`);
  console.log(`[CombatGenerator] Output: ${outputPath}`);
  console.log(`[CombatGenerator] Frames: ${frames.length}`);
  console.log(`[CombatGenerator] Combat log entries: ${combatLog.length}`);
  console.log(`[CombatGenerator] Duration: ${CONFIG.framesToGenerate} ticks`);

  // Print sample combat log entries
  console.log('\n[CombatGenerator] Sample combat log:');
  combatLog.slice(0, 5).forEach(entry => {
    console.log(`  Tick ${entry.tick}: ${entry.attacker} ${entry.attackType} ${entry.defender} in the ${entry.bodyPart}, ${entry.damage}! ${entry.result}`);
  });
}

main();
