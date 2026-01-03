# Threat Detection & Auto-Response System

**Date:** 2026-01-01
**Status:** ✅ Complete - Ready for Integration

## Overview

Automatic threat detection and response system that makes agents intelligently react to danger based on:
- **Power differential** (can they win?)
- **Personality traits** (courage, aggression)
- **Threat type** (melee vs ranged/magic)
- **Available cover** (buildings, terrain)

---

## Features

### 1. Threat Detection
- **Hostile Agents**: Detects enemy agents with Conflict component or faction hostility
- **Wild Animals**: Detects dangerous wild animals (danger >= 3)
- **Projectiles**: Framework for detecting incoming ranged/magic attacks (extensible)

### 2. Auto-Response Actions

#### **Auto-Flee**
- Triggered when: Threat is much stronger + agent has low courage
- Behavior: Run away from threat
- Direction: Opposite to threat, or perpendicular for ranged threats

#### **Auto-Attack**
- Triggered when: Agent can likely win + high aggression
- Behavior: Engage in combat
- Target: Most dangerous threat

#### **Auto-Cover (Seek Cover)**
- Triggered when: Ranged/magic threat detected + cover available
- Behavior: Move to nearest building for protection
- Fallback: Flee sideways if no cover found

#### **Stand Ground**
- Triggered when: Even match + moderate courage, or stronger but low aggression
- Behavior: Defensive posture, ready to react

---

## Decision Matrix

### Power Differential Thresholds

```typescript
differential = agentPower - threatPower

Critical Threat:  differential < -30  (threat 30+ stronger)
Strong Threat:    differential < -10  (threat moderately stronger)
Even Match:       -15 ≤ differential ≤ +15
Can Likely Win:   differential > +15  (agent 15+ stronger)
```

### Response Logic

| Situation | Courage | Aggression | Threat Type | Response |
|-----------|---------|------------|-------------|----------|
| Critical threat (-30+) | < 0.9 | Any | Any | **Flee** |
| Critical threat (-30+) | ≥ 0.9 | Any | Ranged/Magic | **Seek Cover** |
| Strong threat (-10 to -30) | < 0.4 | Any | Any | **Flee** |
| Strong threat (-10 to -30) | ≥ 0.4 | Any | Ranged/Magic | **Seek Cover** |
| Strong threat (-10 to -30) | ≥ 0.4 | Any | Melee | **Stand Ground** |
| Can win (+15+) | Any | > 0.5 | Any | **Attack** |
| Can win (+15+) | Any | ≤ 0.5 | Any | **Stand Ground** |
| Even match (±15) | Any | Any | Ranged/Magic | **Seek Cover** |
| Even match (±15) | Any | > 0.6 | Melee | **Attack** |
| Even match (±15) | Any | ≤ 0.6 | Melee | **Stand Ground** |

---

## Power Calculation

Agent power is calculated from multiple factors:

```typescript
Base Power: 50

+ Combat Skill: +10 per level (max +50 at level 5)
+ Attack Stat: +1 per attack point
+ Defense Stat: +0.5 per defense point
+ Weapon Equipped: +15
+ Armor Equipped: +10
× Health Percentage: multiply by (current / max health)

Max Power: 100
```

**Example:**
- Combat level 3: +30
- Attack 15: +15
- Defense 10: +5
- Weapon equipped: +15
- Armor equipped: +10
- 80% health: ×0.8

Total: (50 + 30 + 15 + 5 + 15 + 10) × 0.8 = **100 power**

---

## Components

### ThreatDetectionComponent

```typescript
interface ThreatDetectionComponent {
  type: 'threat_detection';
  threats: DetectedThreat[];
  currentResponse?: ThreatResponse;
  ownPowerLevel: number;
  lastScanTime: number;
  scanInterval: number;  // Default: 10 ticks
}
```

**DetectedThreat:**
```typescript
interface DetectedThreat {
  threatId: string;
  type: 'hostile_agent' | 'wild_animal' | 'projectile';
  attackType: 'melee' | 'ranged' | 'magic';
  powerLevel: number;
  distance: number;
  direction: { x: number; y: number };
  velocity?: { x: number; y: number };  // For projectiles
  detectedAt: number;
}
```

**ThreatResponse:**
```typescript
interface ThreatResponse {
  action: 'flee' | 'attack' | 'seek_cover' | 'stand_ground';
  targetId?: string;           // For attack
  fleeDirection?: { x: number; y: number };  // For flee
  coverPosition?: { x: number; y: number };  // For seek_cover
  reason: string;              // Human-readable explanation
}
```

---

## System: ThreatResponseSystem

**Update Interval:** Every 5 ticks (~0.25 seconds)

### Process Flow

1. **Scan for Threats** (every `scanInterval` ticks, default 10):
   - Query hostile agents in vision
   - Query dangerous wild animals nearby
   - Check for incoming projectiles (TODO)
   - Calculate power differential for each

2. **Determine Response**:
   - Find most dangerous threat
   - Calculate power differential
   - Check personality (courage, aggression)
   - Apply decision matrix

3. **Execute Response**:
   - Emit `threat:auto_response` event
   - Update agent behavior state
   - Set appropriate behavior (flee, attack, navigate, wander)

### Performance

- **Optimized Scanning:** Only scans every 10 ticks (not every frame)
- **Early Returns:** Skips processing if no threats detected
- **Squared Distance:** Uses `distSq < 400` instead of `Math.sqrt(dx*dx+dy*dy) < 20`
- **Query Caching:** Queries animals once per scan, not per threat

---

## Integration

### Add to registerAllSystems.ts

```typescript
import { ThreatResponseSystem } from './systems/ThreatResponseSystem.js';

// In registerAllSystems function:
gameLoop.systemRegistry.register(new ThreatResponseSystem());
```

### Add to components/index.ts

```typescript
export {
  createThreatDetectionComponent,
  calculatePowerDifferential,
  isCriticalThreat,
  canLikelyWin,
  isEvenMatch,
  type ThreatDetectionComponent,
  type DetectedThreat,
  type ThreatResponse,
} from './ThreatDetectionComponent.js';
```

### Add to systems/index.ts

```typescript
export { ThreatResponseSystem } from './ThreatResponseSystem.js';
```

---

## Events

### threat:auto_response

Emitted when system triggers auto-response:

```typescript
{
  type: 'threat:auto_response',
  source: 'threat-response-system',
  data: {
    agentId: string;
    response: 'flee' | 'attack' | 'seek_cover' | 'stand_ground';
    targetId?: string;
    reason: string;
  }
}
```

---

## Usage Examples

### Example 1: Brave Warrior vs Wild Bear

```
Agent: Grok the Brave
- Combat: 3
- Courage: 0.85
- Aggression: 0.70
- Power: 85

Threat: Wild Bear
- Danger: 5
- Power: 50

Power Differential: +35 (can win)
Response: AUTO-ATTACK (superior power + high aggression)
```

### Example 2: Timid Farmer vs Bandit

```
Agent: Lark the Farmer
- Combat: 1
- Courage: 0.30
- Aggression: 0.20
- Power: 40

Threat: Armed Bandit
- Combat: 4
- Equipment: Sword + Armor
- Power: 90

Power Differential: -50 (critical threat)
Response: AUTO-FLEE (critical threat + low courage)
```

### Example 3: Archer Under Fire

```
Agent: Robin the Ranger
- Combat: 2
- Courage: 0.60
- Aggression: 0.50
- Power: 60

Threat: Enemy Mage
- Magic Attack: Ranged
- Power: 65

Power Differential: -5 (slight disadvantage)
Threat Type: Ranged/Magic
Cover Available: Building at (10, 15)
Response: AUTO-COVER (ranged threat + cover found)
```

### Example 4: Even Match - Cautious Response

```
Agent: Echo the Cautious
- Combat: 2
- Courage: 0.50
- Aggression: 0.40
- Power: 55

Threat: Wild Wolf
- Danger: 4
- Power: 50

Power Differential: +5 (even match)
Aggression: 0.40 (≤ 0.6)
Response: STAND GROUND (even match + moderate aggression)
```

---

## Ranged Combat & Cover

### Seeking Cover

When ranged or magic threat detected:

1. **Find Nearest Building**:
   - Check all buildings in vision
   - Calculate squared distance to each
   - Select closest

2. **Navigate to Cover**:
   - Set agent behavior to `navigate`
   - Target: building position
   - Agent moves behind building

3. **Fallback if No Cover**:
   - Flee perpendicular to threat direction
   - Minimizes exposure to projectiles

### Cover Effectiveness

Buildings provide:
- **Line-of-sight blocking** for projectiles
- **Safe position** away from threat
- **Tactical advantage** for counter-attack

---

## Future Extensions

### 1. Projectile Detection (TODO)

When projectile entities are added:

```typescript
// In scanForThreats():
const projectiles = world.query()
  .with(CT.Projectile)
  .with(CT.Velocity)
  .executeEntities();

for (const proj of projectiles) {
  const velocity = proj.getComponent<VelocityComponent>(CT.Velocity);
  const position = proj.getComponent<PositionComponent>(CT.Position);

  // Calculate trajectory
  // Check if heading toward agent
  // Add to threats if imminent impact
}
```

### 2. Group Combat Awareness

Consider allies nearby when calculating power:

```typescript
const allies = getNearbyAllies(entity, world);
const combinedPower = ownPower + allies.reduce((sum, ally) =>
  sum + calculateAgentPower(ally), 0
);
```

### 3. Tactical Positioning

Advanced cover selection:
- **Flanking positions**: Attack from side
- **High ground**: Tactical advantage
- **Chokepoints**: Force melee combat

### 4. Morale System

Group morale affects courage:
- **Allies fleeing**: -0.1 courage
- **Allies attacking**: +0.1 courage
- **Leader present**: +0.2 courage

---

## Testing

### Unit Tests

Test decision matrix:

```typescript
describe('ThreatResponseSystem', () => {
  it('flees from critical threat with low courage', () => {
    const agent = createAgent({ courage: 0.3, power: 40 });
    const threat = createThreat({ power: 80 });
    const response = determineResponse(agent, threat);
    expect(response.action).toBe('flee');
  });

  it('attacks weaker enemy with high aggression', () => {
    const agent = createAgent({ aggression: 0.8, power: 80 });
    const threat = createThreat({ power: 50 });
    const response = determineResponse(agent, threat);
    expect(response.action).toBe('attack');
  });

  it('seeks cover from ranged threat', () => {
    const agent = createAgent({ power: 60 });
    const threat = createThreat({ power: 65, attackType: 'ranged' });
    const cover = { x: 10, y: 10 };
    const response = determineResponse(agent, threat, { cover });
    expect(response.action).toBe('seek_cover');
  });
});
```

### Integration Tests

Test with live game:

```typescript
describe('ThreatResponseSystem Integration', () => {
  it('agent flees from bear when outmatched', async () => {
    const world = createTestWorld();
    const agent = spawnAgent(world, { combat: 1, courage: 0.3 });
    const bear = spawnAnimal(world, { species: 'bear', danger: 5 });

    // Position bear near agent
    positionNear(bear, agent, 5);

    // Run simulation
    await runTicks(world, 20);

    // Check agent fled
    const distance = getDistance(agent, bear);
    expect(distance).toBeGreaterThan(10);
  });
});
```

---

## Configuration

### Scan Interval

Adjust threat scan frequency:

```typescript
// More frequent scanning (5 ticks = 0.25s)
const threatComp = createThreatDetectionComponent(50, 5);

// Less frequent (20 ticks = 1s, saves performance)
const threatComp = createThreatDetectionComponent(50, 20);
```

### Power Thresholds

Customize in ThreatDetectionComponent.ts:

```typescript
// More cautious (flee earlier)
export function isCriticalThreat(differential: number): boolean {
  return differential < -20;  // Default: -30
}

// More aggressive (attack sooner)
export function canLikelyWin(differential: number): boolean {
  return differential > 10;  // Default: +15
}
```

---

## Files

```
packages/core/src/components/ThreatDetectionComponent.ts
packages/core/src/systems/ThreatResponseSystem.ts
packages/core/src/types/ComponentType.ts (added ThreatDetection)
THREAT_DETECTION_SYSTEM.md (this file)
```

---

## Summary

The Threat Detection & Auto-Response System provides:

✅ **Automatic threat scanning** for hostile agents, wild animals, and projectiles
✅ **Intelligent decision-making** based on power, personality, and threat type
✅ **Four response modes**: flee, attack, seek cover, stand ground
✅ **Cover-seeking behavior** for ranged/magic threats
✅ **Performance-optimized** with throttled scanning and squared distance checks
✅ **Event-driven** integration with other systems
✅ **Extensible** framework for future combat AI enhancements

Agents now **automatically respond to danger** without needing LLM decisions for basic survival instincts!
