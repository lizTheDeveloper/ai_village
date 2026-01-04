/**
 * Weird Combat Recording Generator
 *
 * Generates bizarre combat scenarios like:
 * - Transcendent fae vs angels
 * - Tentacle book monsters vs Bambi with machete
 * - And more chaos!
 *
 * Usage:
 *   npx tsx demo/generate-weird-combat.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// COMBAT SCENARIOS
// ============================================================================

const WEIRD_COMBATS = [
  {
    name: 'fae-vs-angels',
    title: 'TRANSCENDENT FAE VS CELESTIAL ANGELS - Ethereal Duel',
    description: 'Reality-warping fae creatures battle divine angelic beings',
    background: {
      type: 'ethereal',
      name: 'Dimensional Nexus',
      prompt: 'swirling dimensional void, reality fractures, cosmic aurora, stars bleeding into rainbow light, ethereal mist, otherworldly plane, pixel art background, tileable',
      color: '#1a0533',
    },
    combatant1: {
      name: 'Luminara the Transcendent',
      type: 'transcendent_fae',
      color: 'iridescent',
      weapons: [
        { name: 'prismatic reality shard', type: 'magic', color: 'rainbow' },
        { name: 'crystalline moonbeam', type: 'energy', color: 'silver' },
        { name: 'fractal dream weaver', type: 'psychic', color: 'purple' },
      ],
    },
    combatant2: {
      name: 'Seraphiel the Radiant',
      type: 'celestial_angel',
      color: 'golden',
      weapons: [
        { name: 'holy flame sword', type: 'divine', color: 'white-gold' },
        { name: 'divine judgment staff', type: 'holy', color: 'platinum' },
        { name: 'celestial light spear', type: 'radiant', color: 'pure-white' },
      ],
    },
  },
  {
    name: 'book-tentacle-vs-bambi',
    title: 'TENTACLE BOOK HORROR VS BAMBI WITH MACHETE - Forbidden Knowledge',
    description: 'Eldritch tome-beast faces off against weaponized woodland creature',
    background: {
      type: 'eldritch',
      name: 'Forbidden Library Ruins',
      prompt: 'ruined ancient library, floating books, ink dripping from shadows, eldritch symbols glowing on walls, torn pages floating, cursed tomes, dark academia horror, pixel art background, tileable',
      color: '#0d1117',
    },
    combatant1: {
      name: 'The Necronomicon Amalgam',
      type: 'tentacle_book_monster',
      color: 'parchment-black',
      weapons: [
        { name: 'writhing page tentacles', type: 'appendage', color: 'ink-black' },
        { name: 'forbidden knowledge beam', type: 'psychic', color: 'dark-purple' },
        { name: 'reality-rending bookmark', type: 'dimensional', color: 'void-black' },
      ],
    },
    combatant2: {
      name: 'Bambi the Unhinged',
      type: 'weaponized_deer',
      color: 'brown-red',
      weapons: [
        { name: 'rusty machete', type: 'blade', color: 'rust-red' },
        { name: 'sharpened antlers', type: 'natural', color: 'bone-white' },
        { name: 'vengeful hooves', type: 'bludgeon', color: 'dirt-brown' },
      ],
    },
  },
];

// Attack types for each combat style
const ATTACK_STYLES = {
  transcendent_fae: ['phase-shifts through', 'reality-warps around', 'enchants the air to strike', 'transmutes spacetime against'],
  celestial_angel: ['smites', 'consecrates wrath upon', 'channels divine fury at', 'purifies violently'],
  tentacle_book_monster: ['lashes tentacle-pages at', 'inscribes pain upon', 'devours knowledge from', 'annotates suffering onto'],
  weaponized_deer: ['slashes wildly at', 'gouges', 'tramples savagely', 'eviscerates'],
};

const BODY_PARTS = {
  transcendent_fae: ['ethereal essence', 'reality anchor', 'dream core', 'shimmer wing', 'fae heart'],
  celestial_angel: ['wing span', 'halo', 'divine core', 'holy aura', 'celestial form'],
  tentacle_book_monster: ['spine tentacle', 'cover plates', 'page cluster', 'ink sac', 'binding core'],
  weaponized_deer: ['flank', 'neck', 'foreleg', 'antlers', 'chest'],
};

const DAMAGE_TYPES = {
  transcendent_fae: [
    'fragmenting the reality matrix',
    'corrupting the dimensional anchor',
    'shattering the dream essence',
    'unweaving existence',
  ],
  celestial_angel: [
    'scorching with holy fire',
    'purging the divine essence',
    'searing with radiance',
    'casting out into void',
  ],
  tentacle_book_monster: [
    'inscribing forbidden runes',
    'corrupting with dark knowledge',
    'absorbing life-text',
    'rewriting biological scripture',
  ],
  weaponized_deer: [
    'tearing through fur and flesh',
    'crushing bone and cartilage',
    'rending muscle fibers',
    'severing vital arteries',
  ],
};

// ============================================================================
// GENERATOR
// ============================================================================

function generateWeirdCombat(scenario: typeof WEIRD_COMBATS[0], frames: number = 100) {
  const combatLog: any[] = [];
  const frameData: any[] = [];

  const { combatant1, combatant2, background } = scenario;
  let c1Health = 100;
  let c2Health = 100;
  let phase = 'approach';
  let winner: string | null = null;

  // Positions - start further apart to have a dramatic approach
  let c1Pos = { x: 500, y: 600 };
  let c2Pos = { x: 700, y: 600 };
  const center = { x: 600, y: 600 };

  for (let tick = 0; tick < frames; tick++) {
    // Phase transitions - use <= 40 so they actually enter combat
    const distance = Math.sqrt(Math.pow(c1Pos.x - c2Pos.x, 2) + Math.pow(c1Pos.y - c2Pos.y, 2));
    if (phase === 'approach' && distance <= 40) {
      phase = 'combat';
      console.log(`    [tick ${tick}] Entering combat phase! Distance: ${distance.toFixed(1)}`);
    } else if (phase === 'combat' && tick > 70) {
      phase = 'finisher';
    }

    // Movement
    if (phase === 'approach') {
      // Move faster toward center with slight offset (converge to 30 apart)
      c1Pos.x += (center.x - 15 - c1Pos.x) * 0.12;
      c1Pos.y += (center.y - c1Pos.y) * 0.12;
      c2Pos.x += (center.x + 15 - c2Pos.x) * 0.12;
      c2Pos.y += (center.y - c2Pos.y) * 0.12;
    } else if (phase === 'combat') {
      // Chaotic movement
      const angle = tick * 0.1;
      c1Pos.x = center.x - 20 + Math.cos(angle) * 15;
      c1Pos.y = center.y + Math.sin(angle) * 15;
      c2Pos.x = center.x + 20 - Math.cos(angle) * 15;
      c2Pos.y = center.y - Math.sin(angle) * 15;

      // Generate combat events
      if (tick % 4 === 0) {
        const attacker = Math.random() > 0.5 ? combatant1 : combatant2;
        const defender = attacker === combatant1 ? combatant2 : combatant1;

        const weapon = attacker.weapons[Math.floor(Math.random() * attacker.weapons.length)];
        const attackStyle = ATTACK_STYLES[attacker.type as keyof typeof ATTACK_STYLES];
        const action = attackStyle[Math.floor(Math.random() * attackStyle.length)];

        const bodyParts = BODY_PARTS[defender.type as keyof typeof BODY_PARTS];
        const bodyPart = bodyParts[Math.floor(Math.random() * bodyParts.length)];

        const damageTypes = DAMAGE_TYPES[defender.type as keyof typeof DAMAGE_TYPES];
        const damage = damageTypes[Math.floor(Math.random() * damageTypes.length)];

        const dmgAmount = 10 + Math.floor(Math.random() * 20);
        if (attacker === combatant1) {
          c2Health -= dmgAmount;
        } else {
          c1Health -= dmgAmount;
        }

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
            action: action,
            weapon: weapon.name,
            target: `${defender.name}'s ${bodyPart}`,
            spritePrompt: `${attacker.type.replace(/_/g, ' ')} ${action} with ${weapon.name}, ${attacker.color} coloring, attacking motion, pixel art, 48x48, high top-down view, combat animation`,
          },
        });

        if (c1Health <= 0) {
          winner = combatant2.name;
          phase = 'defeated';
        } else if (c2Health <= 0) {
          winner = combatant1.name;
          phase = 'defeated';
        }
      }
    } else if (phase === 'defeated') {
      // Winner celebrates, loser falls
      if (winner === combatant1.name) {
        c2Pos.y += 0.5;
      } else {
        c1Pos.y += 0.5;
      }
    }

    // Build frame
    const cameraX = (c1Pos.x + c2Pos.x) / 2;
    const cameraY = (c1Pos.y + c2Pos.y) / 2;

    frameData.push({
      tick,
      cameraX,
      cameraY,
      cameraAngle: 180,
      cameraZoom: phase === 'combat' ? 1.3 : 1.1,
      entities: [
        {
          entityId: `${combatant1.type}_1`,
          entityType: combatant1.type,
          x: c1Pos.x,
          y: c1Pos.y,
          facingAngle: Math.atan2(c2Pos.y - c1Pos.y, c2Pos.x - c1Pos.x) * (180 / Math.PI),
          animation: { state: phase, frame: Math.floor(tick / 5) % 8 },
          distanceFromCamera: Math.sqrt(Math.pow(c1Pos.x - cameraX, 2) + Math.pow(c1Pos.y - cameraY, 2)),
        },
        {
          entityId: `${combatant2.type}_1`,
          entityType: combatant2.type,
          x: c2Pos.x,
          y: c2Pos.y,
          facingAngle: Math.atan2(c1Pos.y - c2Pos.y, c1Pos.x - c2Pos.x) * (180 / Math.PI),
          animation: { state: phase, frame: Math.floor(tick / 5) % 8 },
          distanceFromCamera: Math.sqrt(Math.pow(c2Pos.x - cameraX, 2) + Math.pow(c2Pos.y - cameraY, 2)),
        },
      ],
    });
  }

  return {
    recordingId: `weird_combat_${scenario.name}_${Date.now()}`,
    title: scenario.title,
    description: scenario.description,
    recordedBy: 'Chaos Combat Generator',
    recordedAt: Date.now(),
    duration: frames,
    quality: 0.95,
    frames: frameData,
    combatLog,
    combatants: [combatant1, combatant2],
    background: background || {
      type: 'default',
      name: 'Arena',
      prompt: 'gladiatorial arena, sand floor, stone walls, crowd in shadows, pixel art background, tileable',
      color: '#2a1f14',
    },
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('[WeirdCombat] Generating bizarre combat recordings...\n');

  for (const scenario of WEIRD_COMBATS) {
    console.log(`[WeirdCombat] Generating: ${scenario.title}`);

    const recording = generateWeirdCombat(scenario);
    const outputPath = path.join(
      import.meta.dirname,
      'public',
      'mock-recordings',
      `${scenario.name}.json`
    );

    fs.writeFileSync(outputPath, JSON.stringify(recording, null, 2), 'utf-8');

    console.log(`  ✅ Saved to: ${scenario.name}.json`);
    console.log(`  📊 Combat log entries: ${recording.combatLog.length}`);
    console.log(`  🎬 Frames: ${recording.frames.length}`);
    console.log(`  🖼️  Background: ${recording.background.name} (${recording.background.type})`);

    // Print sample combat log
    if (recording.combatLog.length > 0) {
      console.log('\n  Sample combat actions:');
      recording.combatLog.slice(0, 3).forEach((entry: any) => {
        console.log(`    • ${entry.attacker} ${entry.action} ${entry.defender} with ${entry.weapon}`);
        console.log(`      targeting ${entry.bodyPart}, ${entry.damage}`);
      });
    }
    console.log('');
  }

  console.log('[WeirdCombat] ✨ All recordings generated!');
}

main();
