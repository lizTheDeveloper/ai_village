# Tactical AI Combat System Design

> **Philosophy**: Combat should be a chess match, not a coin flip. Every decision matters: positioning, weapon choice, timing, and tactics.

## Core Principles

1. **Spatial Tactics Matter**: Cover, flanking, high ground, and range create meaningful choices
2. **Skills Create Asymmetry**: A master swordsman fights differently than a novice archer
3. **Weapons Define Playstyles**: Each weapon type has strengths, weaknesses, and optimal tactics
4. **AI Shows Intelligence**: Agents use real tactics, not random behavior
5. **Readability**: Players understand why combat outcomes happen

---

## 1. Combat Skills System

### Skill Hierarchy

```typescript
interface CombatSkillsComponent {
  type: 'combat_skills';
  version: number;

  // General combat skills
  general: {
    awareness: number;      // Threat detection, initiative
    tactics: number;        // Decision quality, positioning
    movement: number;       // Dodge, reposition speed
    resilience: number;     // Pain tolerance, stamina
  };

  // Weapon-specific skills (0-10 scale)
  weapons: {
    // Melee
    swords: number;         // Slashing weapons
    axes: number;           // Heavy chopping weapons
    spears: number;         // Polearms, reach weapons
    daggers: number;        // Light, fast weapons
    blunt: number;          // Clubs, maces, hammers

    // Ranged
    bows: number;           // Bows, crossbows
    firearms: number;       // Guns, rifles
    throwing: number;       // Javelins, knives, grenades

    // Specialized
    shields: number;        // Blocking, defense
    dualWield: number;      // Two-weapon fighting
    unarmed: number;        // Fists, grappling
  };

  // Tactical skills
  tactics_specialized: {
    ambush: number;         // Surprise attacks, stealth kills
    dueling: number;        // 1v1 combat
    groupFighting: number;  // Coordinating with allies
    defensiveFighting: number; // Turtling, survive mode
    aggressiveFighting: number; // All-out offense
  };
}
```

### Skill Impact

**Weapon Skill Effects** (per level 0-10):
- **Accuracy**: `baseAccuracy + (weaponSkill × 5%)`
- **Damage**: `baseDamage × (1 + weaponSkill × 0.1)`
- **Speed**: Attack cooldown reduced by `weaponSkill × 3%`
- **Crit Chance**: `weaponSkill × 2%` chance for critical hits
- **Special Moves**: Unlock at skill thresholds (3, 5, 7, 9)

**General Skill Effects**:
- **Awareness**: Detection range `+10%` per level, initiative `+5%`
- **Tactics**: Better AI decisions, unlock advanced maneuvers
- **Movement**: Dodge chance `+3%` per level, move speed `+5%`
- **Resilience**: Reduce stamina drain `+10%`, resist pain penalties `+5%`

---

## 2. Weapon System Overhaul

### Weapon Archetype Design

Each weapon type has distinct tactical profile:

```typescript
interface WeaponProfile {
  // Core stats
  damage: { min: number; max: number };
  range: { optimal: number; max: number }; // In tiles
  attackSpeed: number;                      // Attacks per second
  stamina: number;                          // Stamina per attack

  // Tactical properties
  archetype: 'melee' | 'ranged' | 'reach' | 'thrown';
  damageType: 'slash' | 'pierce' | 'blunt' | 'projectile';

  // Range bands (different accuracy/damage at different distances)
  rangeBands: {
    closeRange: { distance: number; accuracyMod: number; damageMod: number };
    optimalRange: { distance: number; accuracyMod: number; damageMod: number };
    longRange: { distance: number; accuracyMod: number; damageMod: number };
  };

  // Tactical modifiers
  canFlank: boolean;           // Effective when flanking
  canCounter: boolean;         // Can counter-attack
  requiresSetup: boolean;      // Needs positioning (bows, crossbows)
  coverPenetration: number;    // Reduce cover effectiveness (0-1)
  staggerChance: number;       // Chance to interrupt enemy

  // Special properties
  specialMoves: WeaponSpecialMove[];
}
```

### Example Weapon Profiles

**Sword** (Balanced Melee):
```typescript
{
  damage: { min: 10, max: 15 },
  range: { optimal: 1, max: 1 },
  attackSpeed: 1.2, // 1.2 attacks/sec
  archetype: 'melee',
  damageType: 'slash',
  canFlank: true,
  canCounter: true,
  staggerChance: 0.15,
  specialMoves: [
    { name: 'Riposte', skillRequired: 5, effect: 'counter_bonus' },
    { name: 'Whirlwind', skillRequired: 8, effect: 'aoe_attack' }
  ]
}
```

**Spear** (Reach Weapon):
```typescript
{
  damage: { min: 12, max: 18 },
  range: { optimal: 2, max: 3 }, // Can attack 2-3 tiles away
  attackSpeed: 0.9,
  archetype: 'reach',
  damageType: 'pierce',
  canCounter: true, // Excellent for stopping charges
  staggerChance: 0.25, // High interrupt chance
  specialMoves: [
    { name: 'Phalanx', skillRequired: 6, effect: 'defensive_stance' },
    { name: 'Charge', skillRequired: 7, effect: 'momentum_attack' }
  ]
}
```

**Bow** (Ranged):
```typescript
{
  damage: { min: 15, max: 25 },
  range: { optimal: 10, max: 20 },
  attackSpeed: 0.7,
  archetype: 'ranged',
  damageType: 'projectile',
  requiresSetup: true, // Need to aim
  rangeBands: {
    closeRange: { distance: 5, accuracyMod: -0.3, damageMod: 1.0 },
    optimalRange: { distance: 10, accuracyMod: 0.0, damageMod: 1.2 },
    longRange: { distance: 20, accuracyMod: -0.4, damageMod: 0.8 }
  },
  specialMoves: [
    { name: 'Quick Shot', skillRequired: 4, effect: 'fast_attack' },
    { name: 'Power Shot', skillRequired: 7, effect: 'armor_pierce' }
  ]
}
```

**Dagger** (Fast, Flanking):
```typescript
{
  damage: { min: 6, max: 10 },
  range: { optimal: 1, max: 1 },
  attackSpeed: 2.0, // Very fast
  archetype: 'melee',
  damageType: 'pierce',
  canFlank: true,
  stealthBonus: 0.5, // +50% damage from stealth
  backstabMultiplier: 3.0, // Triple damage from behind
  specialMoves: [
    { name: 'Backstab', skillRequired: 5, effect: 'stealth_crit' },
    { name: 'Bleed', skillRequired: 6, effect: 'dot_effect' }
  ]
}
```

---

## 3. Tactical Positioning System

### Position States

```typescript
interface TacticalPositionComponent {
  type: 'tactical_position';
  version: number;

  // Current position state
  inCover: boolean;
  coverQuality: 'none' | 'partial' | 'full'; // 0%, 50%, 80% damage reduction
  coverDirection: { x: number; y: number } | null; // Which direction is covered

  // Positional advantages
  hasHighGround: boolean;       // +20% accuracy, +15% damage
  isFlanking: string[];         // Array of entity IDs being flanked
  isFlanked: boolean;           // Being flanked (vulnerable)

  // Range status
  rangeBand: 'melee' | 'close' | 'optimal' | 'long' | 'extreme';
  distanceToTarget: number;

  // Movement state
  isMoving: boolean;
  movementPenalty: number;      // Accuracy penalty while moving
  canRetreat: boolean;          // Can move back without attack of opportunity

  // Tactical awareness
  exposedDirections: string[];  // Directions vulnerable to attack
  nearbyAllies: string[];       // Allied entities within 5 tiles
  nearbyEnemies: string[];      // Enemy entities within vision
}
```

### Cover System

**Cover Mechanics**:
1. **Cover Sources**: Buildings, trees, rocks, terrain features, other agents
2. **Cover Quality**:
   - **Partial Cover** (fences, low walls): 50% damage reduction, blocks some attacks
   - **Full Cover** (buildings, thick trees): 80% damage reduction, blocks most attacks
3. **Directional**: Cover only protects from attacks from covered direction
4. **Cover Break**: High cover penetration weapons (firearms) reduce effectiveness
5. **Dynamic**: Cover can be destroyed, moved around

```typescript
interface CoverPoint {
  position: { x: number; y: number };
  quality: 'partial' | 'full';
  protectedDirections: number[]; // Angles (0-360) protected
  maxOccupants: number;           // How many can use this cover
  currentOccupants: string[];     // Entity IDs using cover
  destructible: boolean;
  health?: number;                // For destructible cover
}
```

### Flanking System

**Flanking Conditions**:
- Attacker is behind target (120° cone behind target facing)
- **OR** attacker and ally on opposite sides of target
- Target not in full cover

**Flanking Bonuses**:
- +30% accuracy
- +25% damage
- Ignore partial cover
- +50% crit chance

---

## 4. Combat Action System

### Action Economy

```typescript
interface CombatActionComponent {
  type: 'combat_action';
  version: number;

  // Current action state
  currentAction: CombatAction | null;
  actionQueue: CombatAction[];      // Queued actions

  // Resource management
  stamina: number;                  // 0-100
  staminaRegen: number;             // Per second

  // Cooldowns (in seconds)
  attackCooldown: number;           // Until next attack
  moveCooldown: number;             // Until can move again
  specialCooldowns: Map<string, number>; // Special move cooldowns

  // State flags
  isStaggered: boolean;             // Interrupted, can't act
  isPreparing: boolean;             // Preparing attack (bows, etc)
  isBlocking: boolean;              // Active defense
}

interface CombatAction {
  type: 'attack' | 'move' | 'special' | 'defend' | 'retreat' | 'aim' | 'reload';
  targetId?: string;
  targetPosition?: { x: number; y: number };
  duration: number;                 // Time to execute (seconds)
  staminaCost: number;
  interruptible: boolean;
}
```

### Action Types

**Attack**:
- Roll accuracy check
- Apply damage if hit
- Trigger on-hit effects
- Start attack cooldown

**Move**:
- Reposition to tactical location
- May trigger attacks of opportunity
- Incurs movement penalty to accuracy

**Defend**:
- Reduce incoming damage 40%
- Enable counter-attacks
- Cannot attack while defending

**Aim** (ranged weapons):
- Spend 1 second aiming
- Next shot gets +30% accuracy
- Lose aim if moved or hit

**Special Moves**:
- Weapon-specific abilities
- High stamina cost
- Powerful effects

---

## 5. AI Tactical Decision System

### Utility-Based AI

Each possible action gets scored based on current situation:

```typescript
interface TacticalAI {
  // Evaluate all possible actions
  evaluateAction(action: CombatAction, context: CombatContext): number;

  // Choose best action
  selectBestAction(): CombatAction;
}

interface CombatContext {
  self: Entity;
  target: Entity | null;
  allies: Entity[];
  enemies: Entity[];
  environment: EnvironmentData;
  skills: CombatSkillsComponent;
  position: TacticalPositionComponent;
}
```

### Utility Scoring Examples

**"Attack Target" Action**:
```typescript
function scoreAttackAction(context: CombatContext): number {
  let score = 50; // Base score

  // Weapon effectiveness at current range
  const weaponBonus = getWeaponEffectiveness(context.weapon, context.distanceToTarget);
  score += weaponBonus; // -30 to +30

  // Skill confidence
  const skillLevel = context.skills.weapons[context.weapon.type];
  score += skillLevel * 3; // 0 to +30

  // Tactical advantage
  if (context.position.isFlanking.includes(context.target.id)) {
    score += 25; // Flanking is great!
  }
  if (context.position.hasHighGround) {
    score += 15;
  }
  if (context.position.inCover && context.weapon.archetype === 'ranged') {
    score += 20; // Shooting from cover is smart
  }

  // Power differential
  const powerDiff = context.self.power - context.target.power;
  score += powerDiff * 0.5; // -50 to +50

  // Health consideration
  const healthPercent = context.self.health / context.self.maxHealth;
  if (healthPercent < 0.3) {
    score -= 30; // Low health = risky to attack
  }

  // Stamina check
  if (context.self.stamina < 20) {
    score -= 40; // Too tired to fight well
  }

  return score;
}
```

**"Seek Cover" Action**:
```typescript
function scoreSeekCoverAction(context: CombatContext): number {
  let score = 30; // Base score

  // Already in cover? Don't move
  if (context.position.coverQuality === 'full') {
    return 0;
  }

  // Ranged weapon users love cover
  if (context.weapon.archetype === 'ranged') {
    score += 40;
  }

  // Under fire from ranged?
  const facingRangedThreat = context.enemies.some(e =>
    e.weapon.archetype === 'ranged'
  );
  if (facingRangedThreat) {
    score += 50; // Critical to get cover!
  }

  // Low health = need cover
  const healthPercent = context.self.health / context.self.maxHealth;
  if (healthPercent < 0.5) {
    score += (1 - healthPercent) * 40; // 0 to +40
  }

  // Outnumbered?
  if (context.enemies.length > context.allies.length + 1) {
    score += 30;
  }

  // Personality: courage affects cover seeking
  const courage = 1 - context.personality.neuroticism;
  score -= courage * 20; // Brave agents less likely to seek cover

  return score;
}
```

**"Flank Target" Action**:
```typescript
function scoreFlankAction(context: CombatContext): number {
  let score = 40; // Base score

  // Already flanking? No need
  if (context.position.isFlanking.includes(context.target.id)) {
    return 0;
  }

  // Melee weapons benefit most from flanking
  if (context.weapon.archetype === 'melee') {
    score += 30;
  }

  // Daggers especially love backstabs
  if (context.weapon.type === 'dagger') {
    score += 40;
  }

  // Tactics skill affects awareness of flanking opportunities
  const tacticsSkill = context.skills.general.tactics;
  score += tacticsSkill * 5; // 0 to +50

  // Target in cover? Flanking bypasses it
  if (context.target.position.inCover) {
    score += 35;
  }

  // Ally on opposite side? Coordinated flank!
  const allyOnOppositeSide = checkAllyOpposite(context);
  if (allyOnOppositeSide) {
    score += 45; // Pincer movement
  }

  // Movement cost consideration
  const movementDistance = getFlankRouteDistance(context);
  score -= movementDistance * 2; // Penalize long flanking routes

  return score;
}
```

### AI Behavior Archetypes

Different combat styles based on skills + personality:

**Berserker** (High aggression, low caution):
```typescript
{
  preferredActions: ['attack', 'charge', 'aggressive_special'],
  avoidActions: ['defend', 'retreat', 'seek_cover'],
  combatRange: 'close',
  riskTolerance: 'high',
  utilityModifiers: {
    attack: +30,
    retreat: -50,
    defend: -20
  }
}
```

**Sniper** (High awareness + bow skill):
```typescript
{
  preferredActions: ['aim', 'attack_from_cover', 'reposition'],
  avoidActions: ['melee_attack', 'charge'],
  combatRange: 'optimal', // Stay at weapon's optimal range
  riskTolerance: 'low',
  utilityModifiers: {
    seek_cover: +40,
    maintain_range: +30,
    aim: +20
  }
}
```

**Tactician** (High tactics skill):
```typescript
{
  preferredActions: ['flank', 'coordinate', 'exploit_advantage'],
  combatRange: 'adaptive',
  riskTolerance: 'calculated',
  utilityModifiers: {
    flank: +35,
    high_ground: +25,
    power_differential: 1.5 // Weight power calculation higher
  }
}
```

**Tank** (High resilience + shield skill):
```typescript
{
  preferredActions: ['defend', 'block', 'protect_allies'],
  combatRange: 'close',
  riskTolerance: 'medium',
  utilityModifiers: {
    defend: +40,
    protect_ally: +30,
    absorb_damage: +25
  }
}
```

---

## 6. Combat Resolution

### Attack Resolution Flow

```typescript
function resolveAttack(attacker: Entity, defender: Entity): AttackResult {
  // 1. Calculate base accuracy
  const weaponSkill = attacker.combatSkills.weapons[attacker.weapon.type];
  const baseAccuracy = 0.6 + (weaponSkill * 0.04); // 60% to 100%

  // 2. Apply positional modifiers
  let accuracy = baseAccuracy;

  // Range band modifier
  const rangeMod = getRangeBandModifier(attacker.weapon, attacker.position.distanceToTarget);
  accuracy += rangeMod;

  // Cover penalty for attacker
  if (defender.position.coverQuality === 'partial') {
    accuracy -= 0.3;
  } else if (defender.position.coverQuality === 'full') {
    accuracy -= 0.5;
  }

  // Flanking bonus
  if (attacker.position.isFlanking.includes(defender.id)) {
    accuracy += 0.3;
  }

  // High ground bonus
  if (attacker.position.hasHighGround) {
    accuracy += 0.2;
  }

  // Movement penalty
  if (attacker.position.isMoving) {
    accuracy -= attacker.position.movementPenalty;
  }

  // Defender dodge (movement skill)
  const dodgeChance = defender.combatSkills.general.movement * 0.03;
  accuracy -= dodgeChance;

  // 3. Roll to hit
  const roll = Math.random();
  if (roll > accuracy) {
    return { hit: false, damage: 0, critical: false };
  }

  // 4. Calculate damage
  const baseDamage = rollDamage(attacker.weapon.damage);

  // Weapon skill damage bonus
  const skillDamageBonus = 1 + (weaponSkill * 0.1);
  let damage = baseDamage * skillDamageBonus;

  // Flanking damage bonus
  if (attacker.position.isFlanking.includes(defender.id)) {
    damage *= 1.25;
  }

  // High ground damage bonus
  if (attacker.position.hasHighGround) {
    damage *= 1.15;
  }

  // Critical hit check
  const critChance = 0.1 + (weaponSkill * 0.02); // 10% to 30%
  const isCritical = Math.random() < critChance;
  if (isCritical) {
    damage *= 2.0;

    // Backstab with dagger?
    if (attacker.weapon.type === 'dagger' && attacker.position.isFlanking.includes(defender.id)) {
      damage *= 1.5; // 3x total (2x crit × 1.5x backstab)
    }
  }

  // 5. Apply cover damage reduction
  if (defender.position.inCover) {
    const coverReduction = defender.position.coverQuality === 'full' ? 0.8 : 0.5;
    const coverPenetration = attacker.weapon.coverPenetration || 0;
    damage *= (1 - coverReduction * (1 - coverPenetration));
  }

  // 6. Apply armor
  const armorReduction = calculateArmorReduction(defender.equipment, attacker.weapon.damageType);
  damage *= (1 - armorReduction);

  // 7. Stagger check
  const staggered = Math.random() < attacker.weapon.staggerChance;

  return {
    hit: true,
    damage: Math.floor(damage),
    critical: isCritical,
    staggered,
    effects: getOnHitEffects(attacker.weapon)
  };
}
```

---

## 7. System Architecture

### New Components

```typescript
// Core combat components
ComponentType.CombatSkills
ComponentType.TacticalPosition
ComponentType.CombatAction
ComponentType.WeaponProficiency

// Tactical state
ComponentType.CoverPoint      // Attached to buildings/terrain
ComponentType.CombatStance    // Current fighting stance
ComponentType.TargetPriority  // Who to attack first
```

### New Systems

```typescript
// System execution order (20 TPS)
class TacticalAwarenessSystem implements System {
  priority = 100; // Very early
  // - Scan for enemies, allies, cover points
  // - Update TacticalPositionComponent
  // - Calculate flanking, high ground, etc.
}

class CombatAISystem implements System {
  priority = 110;
  // - Evaluate possible actions via utility scores
  // - Select best action
  // - Queue action in CombatActionComponent
}

class CombatActionExecutor implements System {
  priority = 120;
  // - Execute queued actions
  // - Handle cooldowns, stamina costs
  // - Resolve attacks, moves, specials
}

class WeaponSkillSystem implements System {
  priority = 5; // Late, after combat
  // - Award XP for weapon use
  // - Level up weapon skills
  // - Unlock special moves
}

class CoverSystem implements System {
  priority = 95; // Before tactical awareness
  // - Manage cover points
  // - Track cover occupancy
  // - Handle cover destruction
}
```

---

## 8. Skill Progression

### Weapon Skill Leveling

```typescript
interface WeaponXP {
  currentXP: number;
  xpToNextLevel: number;

  // XP sources
  xpPerHit: 10;
  xpPerKill: 100;
  xpPerCritical: 25;
  xpPerSpecialMove: 50;
}

// Unlock special moves at thresholds
const specialMoveUnlocks = {
  3: 'Basic special move',
  5: 'Advanced technique',
  7: 'Master technique',
  9: 'Legendary technique'
};
```

### Tactical Skill Learning

```typescript
// Tactics skill improves through:
- Successful flanks: +5 XP
- Effective use of cover: +3 XP
- Winning outnumbered: +20 XP
- Using terrain advantage: +5 XP
- Coordinated attacks with allies: +10 XP
```

---

## 9. Performance Optimizations

### Spatial Partitioning

```typescript
class CombatGrid {
  // Divide world into 10×10 tile sectors
  // Only check combat in active sectors
  // Cache tactical positions per sector
}
```

### Cached Calculations

```typescript
// Cache expensive calculations
interface TacticalCache {
  coverPoints: Map<string, CoverPoint>;     // Recalc every 2 seconds
  flankingAngles: Map<string, number[]>;    // Recalc on position change
  rangeOptimal: Map<string, boolean>;       // Recalc on move
}
```

### Update Throttling

```typescript
// Not every agent needs to recalculate every tick
- TacticalAwarenessSystem: Update every 5 ticks (0.25s)
- CombatAISystem: Update every 3 ticks (0.15s)
- CombatActionExecutor: Update every tick (critical path)
```

---

## 10. Emergent Tactical Scenarios

This system enables rich emergent gameplay:

### Scenario: Archer vs Swordsman

**Archer Strategy**:
1. Maintain optimal range (10 tiles)
2. Seek cover when swordsman charges
3. Use "Quick Shot" if enemy gets close
4. Reposition to keep distance

**Swordsman Strategy**:
1. Use terrain for cover while closing distance
2. Sprint to close gap quickly
3. Flank if possible
4. Use "Charge" ability to close final distance

**Outcome**: Depends on terrain, skill levels, and decision quality

### Scenario: 2v1 Tactical Coordination

**Attackers**:
1. Coordinate flanking positions (high tactics skill)
2. One distracts while other backstabs
3. Use pincer movement to deny retreat

**Defender**:
1. Seek cover to limit flanking angles
2. Use defensive stance to reduce damage
3. Focus fire on weaker attacker
4. Look for retreat opportunity

### Scenario: Sniper Duel

**Both players**:
1. Find optimal cover positions
2. Aim for accuracy bonus
3. Take shots when enemy exposed
4. Reposition to avoid counter-fire
5. Use terrain and timing

---

## 10.5. Individual Variance & Emergent Coordination

### The Problem: Agents Are Individuals, Not Chess Pieces

Agents should feel **human** (or alien, or hive-minded), not like RTS units:

- ❌ Perfect simultaneous flanking maneuvers
- ❌ Instant battlefield awareness of all allies
- ❌ Frame-perfect coordinated attacks
- ✅ Messy, imperfect, but improving coordination
- ✅ Emergence of formations through training
- ✅ Communication breakdowns and fog of war
- ✅ Individual personalities affecting group tactics

---

### Individual Decision Variance

```typescript
interface CombatPersonalityComponent {
  type: 'combat_personality';
  version: number;

  // Individual decision-making quirks
  decisionNoise: number;        // 0.0-1.0, how "messy" their decisions are
  hesitation: number;           // Delay before acting (0-2 seconds)
  overconfidence: number;       // Overestimate own power by this %
  panicThreshold: number;       // Health % when rational thought breaks down

  // Learning modifiers
  learningRate: number;         // How fast they improve tactics (0.5-2.0)
  forgetfulness: number;        // How fast they forget unused skills
  adaptability: number;         // How quickly they adjust to new situations

  // Combat quirks (randomly assigned)
  quirks: CombatQuirk[];
}

type CombatQuirk =
  | 'tunnel_vision'      // Focuses on one target, ignores others
  | 'hesitant_shooter'   // Takes extra time to aim (±accuracy)
  | 'aggressive_rusher'  // Charges in without thinking
  | 'cover_hugger'       // Never leaves cover even when should
  | 'flanking_obsessed'  // Always tries to flank, even suboptimally
  | 'spray_and_pray'     // Fires rapidly with low accuracy
  | 'careful_aimer'      // Slow but accurate
  | 'panic_shooter'      // Accuracy tanks when health low
  | 'berserker_rage'     // Damage up, defense down when wounded
  | 'defensive_turtle'   // Overuses defend action;
```

### Decision Noise Application

```typescript
function selectActionWithNoise(context: CombatContext): CombatAction {
  // Calculate utility scores for all actions
  const scores = evaluateAllActions(context);

  // Sort by score
  const sorted = scores.sort((a, b) => b.score - a.score);

  // Apply decision noise (personality-driven imperfection)
  const noise = context.personality.decisionNoise;

  if (noise === 0) {
    // Perfect decision maker - always picks optimal
    return sorted[0].action;
  }

  // Add random variance to scores
  const noisyScores = sorted.map(s => ({
    ...s,
    noisyScore: s.score + (Math.random() - 0.5) * noise * 100
  }));

  // Re-sort with noise applied
  const noisySorted = noisyScores.sort((a, b) => b.noisyScore - a.noisyScore);

  // Sometimes pick suboptimal action
  // Higher noise = more likely to pick bad option
  const pickIndex = Math.floor(Math.random() * Math.min(3, noisySorted.length));

  return noisySorted[pickIndex].action;
}
```

**Result**: Agents make **realistic mistakes**:
- Novice (noise: 0.8) might charge when should retreat
- Average (noise: 0.4) occasionally picks suboptimal cover
- Expert (noise: 0.1) almost always optimal, rare mistakes
- Master (noise: 0.0) perfect decision making

---

## 10.6. Communication & Coordination Systems

### Communication Component

```typescript
interface CommunicationComponent {
  type: 'communication';
  version: number;

  // Communication capability
  commTech: 'none' | 'verbal' | 'hand_signals' | 'radio' | 'telepathy' | 'hive_link';
  commRange: number;            // Tiles (verbal: 10, radio: 500, hive: infinite)
  commClarity: number;          // 0-1, how clearly messages transmit

  // Current communication state
  canHearAllies: string[];      // Allied entity IDs in range
  receivedMessages: CombatMessage[];
  sentMessages: CombatMessage[];

  // Communication skills
  leadershipSkill: number;      // 0-10, how well they coordinate others
  followingSkill: number;       // 0-10, how well they follow orders
  signalRecognition: number;    // 0-10, understand tactical signals

  // Group coordination
  formationTraining: number;    // 0-10, trained in formation fighting
  squadId?: string;             // If part of a trained squad
}

interface CombatMessage {
  sender: string;
  recipients: string[];
  type: 'enemy_spotted' | 'request_support' | 'flanking_maneuver' | 'retreat_order' | 'cover_fire';
  data: any;
  timestamp: number;
  received: boolean;            // Did recipient actually get it?
  understood: boolean;          // Did they understand it?
}
```

### Message Transmission with Failure

```typescript
function transmitMessage(
  sender: Entity,
  recipient: Entity,
  message: CombatMessage,
  world: World
): boolean {
  const senderComm = sender.getComponent<CommunicationComponent>(CT.Communication);
  const recipientComm = recipient.getComponent<CommunicationComponent>(CT.Communication);

  // Check range
  const distance = getDistance(sender, recipient);
  if (distance > senderComm.commRange) {
    return false; // Out of range
  }

  // Check line of sight for verbal communication
  if (senderComm.commTech === 'verbal' || senderComm.commTech === 'hand_signals') {
    if (!hasLineOfSight(sender, recipient, world)) {
      return false; // Can't see/hear through walls
    }
  }

  // Transmission clarity check
  const transmitRoll = Math.random();
  if (transmitRoll > senderComm.commClarity) {
    // Message garbled or lost
    return false;
  }

  // Recipient understanding check
  const understandRoll = Math.random();
  const understandChance = recipientComm.signalRecognition / 10;

  if (understandRoll > understandChance) {
    // Message received but misunderstood
    message.received = true;
    message.understood = false;
    return false;
  }

  // Success!
  message.received = true;
  message.understood = true;
  recipientComm.receivedMessages.push(message);

  return true;
}
```

### Communication Technology Progression

```typescript
const commTechLevels = {
  none: {
    range: 0,
    clarity: 0,
    description: 'No communication - pure visual coordination'
  },

  verbal: {
    range: 10,             // 10 tiles
    clarity: 0.7,          // 70% chance message gets through
    requiresLOS: true,
    description: 'Shouting orders - unreliable in chaos of battle'
  },

  hand_signals: {
    range: 15,
    clarity: 0.85,         // More reliable than shouting
    requiresLOS: true,
    requiresVisibility: true, // Need to see the signals
    description: 'Military hand signals - effective if you can see them'
  },

  radio: {
    range: 500,
    clarity: 0.95,
    requiresLOS: false,
    description: 'Radio communication - reliable, long range'
  },

  telepathy: {
    range: 100,
    clarity: 0.99,
    requiresLOS: false,
    instantaneous: true,
    description: 'Mental communication - near-perfect coordination'
  },

  hive_link: {
    range: Infinity,
    clarity: 1.0,
    requiresLOS: false,
    instantaneous: true,
    sharedAwareness: true,  // See through all hive member eyes
    description: 'Hive mind connection - perfect coordination'
  }
};
```

---

## 10.7. Emergent Formation Fighting

### Formation Training System

```typescript
interface FormationTrainingComponent {
  type: 'formation_training';
  version: number;

  // Trained formations
  knownFormations: FormationPattern[];

  // Training level per formation
  formationProficiency: Map<string, number>; // 0-10 skill

  // Squad cohesion
  squadId?: string;
  squadMembers: string[];       // Who they trained with
  cohesion: number;             // 0-1, how well squad works together

  // Practice time
  hoursTrainedTogether: number; // More training = better coordination
  combatExperience: number;     // Real combat improves cohesion faster
}

interface FormationPattern {
  name: string;                 // 'shield_wall', 'wedge', 'skirmish_line', etc.
  roles: FormationRole[];
  spacing: number;              // Tiles between members
  facingDirection: number;      // Formation orientation
}

interface FormationRole {
  position: { x: number; y: number }; // Relative to formation center
  role: 'front_line' | 'second_line' | 'ranged' | 'flanker' | 'support';
  weaponRequirement?: string;   // 'shield', 'spear', 'bow', etc.
}
```

### Formation Emergence (Not Hard-Coded!)

Formations **emerge** from individual decisions influenced by training:

```typescript
class FormationCoordinationSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>): void {
    // For each squad in combat
    for (const squad of this.getSquadsInCombat(world)) {
      const members = this.getSquadMembers(squad, world);

      // Each member makes INDIVIDUAL decision
      for (const member of members) {
        const idealPosition = this.calculateIdealFormationPosition(
          member,
          squad,
          world
        );

        // But they don't teleport to ideal position!
        // They just get a "formation_suggestion" that influences their utility AI

        const formationSkill = member.formationTraining.formationProficiency.get(squad.currentFormation);

        // Low skill (0-2): Barely aware of formation, mostly ignore it
        // Medium skill (3-6): Try to maintain formation, but imperfectly
        // High skill (7-10): Strong formation discipline

        const formationWeight = formationSkill / 10;

        // Utility AI considers formation position
        member.utilityModifiers.set('maintain_formation', 50 * formationWeight);
      }
    }
  }

  private calculateIdealFormationPosition(
    member: Entity,
    squad: Squad,
    world: World
  ): Position {
    // Based on:
    // - Squad leader position (if have leader)
    // - Member's assigned role in formation
    // - Current facing direction
    // - Terrain constraints

    // But individual might deviate due to:
    // - Low formation skill
    // - Personal combat decisions (e.g., see better target elsewhere)
    // - Panic, injury, or other conditions
    // - Communication breakdown (can't see/hear squad)
  }
}
```

### Formation Quality Degradation

Formations **break down** under stress:

```typescript
function getFormationCohesion(squad: Squad, world: World): number {
  let cohesion = squad.baseCoherence; // 0-1

  // Reduce cohesion for each issue:

  // 1. Communication breakdown
  const avgCommReliability = calculateAvgCommReliability(squad);
  cohesion *= avgCommReliability;

  // 2. Squad members wounded
  const woundedPercent = getWoundedPercent(squad);
  cohesion *= (1 - woundedPercent * 0.5);

  // 3. Under heavy fire
  const underFire = isSquadUnderHeavyFire(squad, world);
  if (underFire) {
    cohesion *= 0.7; // -30% cohesion when taking fire
  }

  // 4. Leader down
  if (squad.leader && isIncapacitated(squad.leader)) {
    cohesion *= 0.5; // Halved without leader
  }

  // 5. Terrain obstacles
  const terrainDisruption = getTerrainDisruption(squad, world);
  cohesion *= (1 - terrainDisruption);

  // 6. New members (didn't train together)
  const avgTrainingTime = getAvgTrainingTime(squad);
  const trainingBonus = Math.min(1.0, avgTrainingTime / 100); // Cap at 100 hours
  cohesion *= trainingBonus;

  return Math.max(0, Math.min(1, cohesion));
}
```

**Result**: Formations **naturally degrade** in combat:
- Perfect formation at start (if well-trained)
- Breaks down as members take fire, lose comms, get wounded
- Reforms during lulls in combat
- Veteran squads maintain formation better under stress

---

## 10.8. Hive Mind Combat

### Hive Mind Component

```typescript
interface HiveMindComponent {
  type: 'hive_mind';
  version: number;

  hiveId: string;               // Which hive this belongs to
  role: 'queen' | 'warrior' | 'worker' | 'scout';

  // Perfect coordination
  sharedAwareness: boolean;     // See what any hive member sees
  sharedMemory: boolean;        // Know what any member knows
  instantComms: boolean;        // Zero-latency communication

  // Hive directives
  currentDirective: HiveDirective;
  autonomy: number;             // 0-1, how much individual decision-making allowed

  // Hive link strength
  linkStrength: number;         // 0-1, can be disrupted by magic/tech
  maxLinkDistance: number;      // Distance from queen before autonomy increases
}

type HiveDirective =
  | { type: 'swarm'; target: string }           // All attack target
  | { type: 'defend'; position: Position }      // All defend area
  | { type: 'encircle'; target: string }        // Surround target
  | { type: 'formation'; pattern: string }      // Move in formation
  | { type: 'scatter'; threat: string }         // Disperse from threat
  | { type: 'autonomous'; }                     // Act independently;
```

### Hive Mind Combat Advantages

```typescript
class HiveMindCombatSystem implements System {
  update(world: World, entities: ReadonlyArray<Entity>): void {
    for (const hive of this.getActiveHives(world)) {
      // Hive sees through ALL member eyes simultaneously
      const sharedVision = this.aggregateVision(hive.members);

      // Hive makes ONE tactical decision for entire swarm
      const directive = this.calculateOptimalHiveDirective(
        hive,
        sharedVision,
        world
      );

      // Distribute directive to all members
      for (const member of hive.members) {
        const memberHive = member.getComponent<HiveMindComponent>(CT.HiveMind);

        // Check link strength
        if (memberHive.linkStrength < 0.3) {
          // Weak link - member acts autonomously
          memberHive.currentDirective = { type: 'autonomous' };
          continue;
        }

        // Strong link - follow hive directive
        memberHive.currentDirective = directive;

        // Apply directive with perfect coordination
        this.executeHiveDirective(member, directive, hive);
      }
    }
  }

  private executeHiveDirective(
    member: Entity,
    directive: HiveDirective,
    hive: Hive
  ): void {
    switch (directive.type) {
      case 'swarm':
        // All members attack same target in coordinated pattern
        // NO individual decision variance - perfectly coordinated
        const attackPosition = this.calculateSwarmPosition(member, hive);
        this.commandMove(member, attackPosition);
        this.commandAttack(member, directive.target);
        break;

      case 'encircle':
        // Form perfect circle around target
        const circlePosition = this.calculateEncirclePosition(
          member,
          hive.members.length,
          directive.target
        );
        this.commandMove(member, circlePosition);
        break;

      case 'formation':
        // Perfect formation - no variance, no mistakes
        const formationPos = this.calculatePerfectFormationPosition(
          member,
          hive,
          directive.pattern
        );
        this.commandMove(member, formationPos);
        break;
    }
  }
}
```

### Hive Mind vs Individual Combat

| Aspect | Individual Agents | Hive Mind |
|--------|------------------|-----------|
| **Communication** | Unreliable, range-limited | Instant, perfect |
| **Coordination** | Emerges from training | Hardcoded, perfect |
| **Decision Noise** | High (0.2-0.8) | Zero (0.0) |
| **Formation Quality** | Degrades under stress | Maintains perfectly |
| **Flanking** | Opportunistic, imperfect | Coordinated, surgical |
| **Reaction Time** | Delayed by comms | Instant response |
| **Vulnerability** | Kill individuals | Disrupt hive link |
| **Adaptation** | Individual learning | Hive learns as one |

### Disrupting Hive Minds

```typescript
// Anti-hive tactics
interface HiveLinkDisruption {
  // Physical distance
  maxRange: number;             // Hive members too far from queen = autonomous

  // Magical disruption
  psionicJamming: boolean;      // Magic that blocks telepathy

  // Kill the queen
  queenDead: boolean;           // Hive fragments, members panic

  // Individual override
  mindControl: boolean;         // Magic to take control of hive member
}

// When hive link disrupted
function onHiveLinkBroken(member: Entity): void {
  const hiveMind = member.getComponent<HiveMindComponent>(CT.HiveMind);

  // Switch to autonomous mode
  hiveMind.currentDirective = { type: 'autonomous' };

  // Add decision noise (they're not used to independent thought!)
  const personality = member.getComponent<CombatPersonalityComponent>(CT.CombatPersonality);
  personality.decisionNoise = 0.8; // High noise - very confused without hive

  // Panic threshold increases
  personality.panicThreshold = 0.5; // Panic easier without hive support
}
```

---

## 10.9. Training & Coordination Progression

### Squad Training System

Squads get better over time through training and combat experience:

```typescript
interface SquadProgressionComponent {
  type: 'squad_progression';
  version: number;

  squadId: string;
  members: string[];

  // Training hours together
  formationDrills: number;      // Hours spent drilling formations
  combatExercises: number;      // Hours in training combat
  tacticalStudy: number;        // Hours studying tactics

  // Real combat experience
  combatsShared: number;        // Battles fought together
  victoriesTogether: number;    // Wins together
  membersLost: number;          // Members who died (reduces cohesion)

  // Derived stats
  cohesion: number;             // 0-1, calculated from above
  trustLevel: number;           // 0-1, trust in squadmates
  communicationEfficiency: number; // 0-1, how well they communicate

  // Unlocked coordination abilities
  unlockedFormations: string[];
  unlockedTactics: string[];
}

// Training progression
const trainingThresholds = {
  basicFormation: 10,           // 10 hours → basic shield wall
  advancedFormation: 50,        // 50 hours → wedge, skirmish line
  masterFormation: 200,         // 200 hours → complex maneuvers

  basicCoordination: 5,         // 5 combats → basic coordination
  advancedCoordination: 20,     // 20 combats → advanced tactics
  eliteCoordination: 100,       // 100 combats → elite squad
};
```

### Emergent Formation Example

**Novice Squad** (0 hours training):
```typescript
// No formation training
// Each agent fights independently
// Occasional accidental coordination
// Communication mostly ineffective
cohesion: 0.1,
formationQuality: 0.0,
coordinatedActions: 5%
```

**Trained Squad** (50 hours training, 10 combats):
```typescript
// Learned shield wall and skirmish line
// Can maintain formation if not under heavy fire
// Communication 70% effective
// Occasional coordinated flanks
cohesion: 0.6,
formationQuality: 0.5,
coordinatedActions: 40%
```

**Elite Squad** (200 hours training, 100 combats):
```typescript
// Knows all formations
// Maintains formation even under fire
// Communication 95% effective
// Complex coordinated maneuvers (pincer, feint, etc.)
cohesion: 0.9,
formationQuality: 0.85,
coordinatedActions: 80%
```

**Veteran Hive Warriors** (hive mind):
```typescript
// Perfect coordination from birth
// Zero communication delay
// Formations never break
// Instant adaptation
cohesion: 1.0,
formationQuality: 1.0,
coordinatedActions: 100%
```

---

## 11. Integration with Existing Systems

### Personality Integration

```typescript
// Big Five traits influence combat style
- High Openness: Tries experimental tactics, uses special moves
- High Conscientiousness: Methodical, uses cover properly
- High Extraversion: Aggressive, seeks combat
- High Agreeableness: Defensive, protects allies
- High Neuroticism: Cautious, retreats easily
```

### Memory Integration

```typescript
// Combat creates memories
{
  type: 'combat_victory',
  opponent: 'Skilled Archer',
  weapon_used: 'sword',
  tactic_used: 'flanking',
  emotional_valence: 0.8
}

// Agents learn from experience
- "I beat archers by closing distance fast"
- "That guy is dangerous with a spear"
- "Cover saved my life last time"
```

### Event System Integration

```typescript
eventBus.emit('combat:tactical_decision', {
  agentId: entity.id,
  action: 'flank',
  reason: 'Target in cover, flanking to bypass',
  skillCheck: 'tactics:7'
});

eventBus.emit('combat:special_move', {
  agentId: entity.id,
  move: 'Backstab',
  target: targetId,
  damage: 85,
  critical: true
});
```

---

## 12. UI/UX Considerations

### Combat Feedback

Show players **why** things happen:

```typescript
// Damage number popup
{
  damage: 45,
  modifiers: [
    '×1.25 (Flanking)',
    '+20% (High Ground)',
    '-30% (Partial Cover)',
    '×2.0 (Critical Hit)'
  ],
  finalDamage: 68
}
```

### Tactical Overlay

```typescript
// Visual indicators
- Cover points highlighted
- Flanking angles shown
- Range bands color-coded
- Enemy threat levels
- Optimal positions suggested
```

### Combat Log

```
[12:34:56] Warrior closes distance on Archer
[12:34:57] Archer repositions to cover behind building
[12:34:58] Warrior uses [Charge] ability
[12:34:59] Archer uses [Quick Shot] - MISS (moving penalty)
[12:35:00] Warrior attacks - HIT for 42 damage (×1.25 flanking bonus)
[12:35:01] Archer retreats, suffers attack of opportunity - HIT for 38 damage
```

---

## 13. Implementation Phases

### Phase 1: Core Combat (Week 1)
- [ ] Implement CombatSkillsComponent
- [ ] Implement TacticalPositionComponent
- [ ] Implement basic attack resolution with accuracy/damage
- [ ] Add weapon skill modifiers

### Phase 2: Positioning (Week 2)
- [ ] Implement CoverSystem
- [ ] Add flanking detection
- [ ] Add high ground detection
- [ ] Implement range bands

### Phase 3: AI Tactics (Week 3)
- [ ] Implement CombatAISystem with utility scoring
- [ ] Add behavior archetypes
- [ ] Implement action queue system
- [ ] Add special move system

### Phase 4: Polish (Week 4)
- [ ] Combat feedback UI
- [ ] Skill progression
- [ ] Performance optimization
- [ ] Balance tuning
- [ ] Integration tests

---

## Conclusion

This system creates **meaningful tactical combat** where:

✅ **Skills matter**: Both general combat and weapon-specific proficiency
✅ **Positioning matters**: Cover, flanking, high ground, and range
✅ **Weapons feel different**: Each has unique tactical profile
✅ **AI is intelligent**: Uses real tactics, adapts to situation
✅ **Outcomes are readable**: Players understand why they won/lost
✅ **Emergent gameplay**: Rich tactical scenarios arise naturally

The combat is no longer a coin flip—it's a chess match where skill, positioning, and tactical decisions determine victory.
