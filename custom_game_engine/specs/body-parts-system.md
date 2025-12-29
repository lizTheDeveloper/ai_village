# Body Parts System Specification

**Status:** Draft
**Phase:** 9+ (After Temperature/Weather)
**Depends On:** NeedsSystem, MoodSystem, SkillsSystem, Medicine skill

---

## Overview

Agents have body parts that can be injured, healed, and affect their capabilities. Inspired by Dwarf Fortress wound system but simplified for village-scale simulation.

**Core Principles:**
1. Injuries affect specific body parts, not just abstract "health"
2. Body part damage affects relevant skills/actions
3. Medicine skill interacts with healing and diagnosis
4. Stress increases from injuries (ties into existing stress system)
5. Visual feedback in agent info panel

---

## 1. Body Part Hierarchy

### 1.1 Body Structure

```typescript
type BodyPartId =
  // Core (vital)
  | 'head'
  | 'torso'
  // Upper body
  | 'left_arm'
  | 'right_arm'
  | 'left_hand'
  | 'right_hand'
  // Lower body
  | 'left_leg'
  | 'right_leg'
  | 'left_foot'
  | 'right_foot';

interface BodyPartDefinition {
  id: BodyPartId;
  name: string;
  vital: boolean;           // Death if destroyed
  parent?: BodyPartId;      // Hierarchical damage (hand attached to arm)
  maxHealth: number;        // 100 for most, head/torso higher
  affectsSkills: SkillId[]; // Skills impacted when damaged
  affectsActions: string[]; // Actions impacted when damaged
}
```

### 1.2 Body Part Definitions

| Part | Vital | Parent | Max HP | Affects Skills | Affects Actions |
|------|-------|--------|--------|----------------|-----------------|
| head | Yes | - | 150 | all (reduced cognition) | talk, observe |
| torso | Yes | - | 200 | all (core stamina) | all movement |
| left_arm | No | torso | 100 | building, crafting | build, craft, gather |
| right_arm | No | torso | 100 | building, crafting | build, craft, gather |
| left_hand | No | left_arm | 80 | cooking, crafting | cook, craft, plant |
| right_hand | No | right_arm | 80 | cooking, crafting | cook, craft, plant |
| left_leg | No | torso | 100 | exploration | walk, run, flee |
| right_leg | No | torso | 100 | exploration | walk, run, flee |
| left_foot | No | left_leg | 60 | exploration | walk, run |
| right_foot | No | right_leg | 60 | exploration | walk, run |

### 1.3 Damage Cascading

When a parent part is destroyed, children become non-functional:
- Destroyed arm → hand is useless
- Destroyed leg → foot is useless
- Destroyed torso → death (vital)
- Destroyed head → death (vital)

---

## 2. BodyComponent

### 2.1 Component Definition

```typescript
interface BodyPartState {
  health: number;           // Current HP (0 = destroyed)
  maxHealth: number;        // Max HP for this part
  injuries: Injury[];       // Active injuries on this part
  bandaged: boolean;        // Temporary protection (stops bleeding)
  splinted: boolean;        // For broken bones
  infected: boolean;        // Untreated wounds can infect
}

interface Injury {
  id: string;
  type: InjuryType;
  severity: InjurySeverity;
  bleedRate: number;        // Health loss per second (0 = not bleeding)
  painLevel: number;        // 0-100, contributes to stress
  healingProgress: number;  // 0-100, natural healing over time
  treatedBy?: string;       // Entity ID of healer (if treated)
  timestamp: number;        // Tick when injury occurred
}

type InjuryType =
  | 'cut'           // Bleeding, affects dexterity
  | 'bruise'        // Pain, minimal lasting effect
  | 'burn'          // Pain, slow healing
  | 'fracture'      // Major debuff, needs splint
  | 'sprain'        // Moderate debuff, heals faster
  | 'puncture'      // Deep wound, infection risk
  | 'frostbite'     // From cold exposure
  | 'heatstroke';   // From heat exposure

type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'critical';

interface BodyComponent extends Component {
  type: 'body';
  parts: Record<BodyPartId, BodyPartState>;
  overallHealth: number;    // Derived from part health (for compatibility)
  totalPain: number;        // Sum of all pain (affects stress)
  bloodLoss: number;        // 0-100, high = weakness/death
  consciousness: boolean;   // False if head critical or blood loss high
}
```

### 2.2 Factory Function

```typescript
function createBodyComponent(): BodyComponent {
  const parts: Record<BodyPartId, BodyPartState> = {
    head: { health: 150, maxHealth: 150, injuries: [], bandaged: false, splinted: false, infected: false },
    torso: { health: 200, maxHealth: 200, injuries: [], bandaged: false, splinted: false, infected: false },
    left_arm: { health: 100, maxHealth: 100, injuries: [], bandaged: false, splinted: false, infected: false },
    right_arm: { health: 100, maxHealth: 100, injuries: [], bandaged: false, splinted: false, infected: false },
    left_hand: { health: 80, maxHealth: 80, injuries: [], bandaged: false, splinted: false, infected: false },
    right_hand: { health: 80, maxHealth: 80, injuries: [], bandaged: false, splinted: false, infected: false },
    left_leg: { health: 100, maxHealth: 100, injuries: [], bandaged: false, splinted: false, infected: false },
    right_leg: { health: 100, maxHealth: 100, injuries: [], bandaged: false, splinted: false, infected: false },
    left_foot: { health: 60, maxHealth: 60, injuries: [], bandaged: false, splinted: false, infected: false },
    right_foot: { health: 60, maxHealth: 60, injuries: [], bandaged: false, splinted: false, infected: false },
  };

  return {
    type: 'body',
    version: 1,
    parts,
    overallHealth: 100,
    totalPain: 0,
    bloodLoss: 0,
    consciousness: true,
  };
}
```

---

## 3. Injury System

### 3.1 Injury Sources

| Source | Typical Parts | Injury Types | Severity Range |
|--------|---------------|--------------|----------------|
| Combat (future) | Any | cut, bruise, puncture | minor-critical |
| Fall | legs, feet, arms | fracture, sprain, bruise | minor-severe |
| Tool accident | hands, arms | cut, bruise | minor-moderate |
| Temperature (cold) | feet, hands | frostbite | moderate-severe |
| Temperature (heat) | head, torso | heatstroke | moderate-critical |
| Animal attack | any | cut, puncture | minor-critical |
| Construction accident | any | bruise, fracture | minor-severe |

### 3.2 Injury Effects by Severity

| Severity | Health Damage | Pain | Bleed Rate | Heal Time |
|----------|---------------|------|------------|-----------|
| minor | 5-15 | 10-20 | 0-0.1/s | 1-2 days |
| moderate | 15-35 | 20-40 | 0.1-0.3/s | 2-5 days |
| severe | 35-60 | 40-70 | 0.3-0.5/s | 5-10 days |
| critical | 60-100 | 70-100 | 0.5-1.0/s | 10-20 days |

### 3.3 Part Damage → Skill Debuffs

```typescript
function getSkillDebuff(body: BodyComponent, skillId: SkillId): number {
  let debuff = 0;

  for (const [partId, state] of Object.entries(body.parts)) {
    const def = BODY_PART_DEFINITIONS[partId as BodyPartId];

    if (def.affectsSkills.includes(skillId)) {
      // Percentage of part that's damaged
      const damagePercent = 1 - (state.health / state.maxHealth);

      // Each affected part contributes to debuff
      // Hands/feet: 15% max debuff each
      // Arms/legs: 25% max debuff each
      // Head: 50% max debuff (affects cognition)
      // Torso: 30% max debuff (affects stamina)
      const partWeight = getPartWeight(partId as BodyPartId);
      debuff += damagePercent * partWeight;
    }
  }

  // Cap at 80% debuff (always some chance of success)
  return Math.min(0.8, debuff);
}

function getPartWeight(partId: BodyPartId): number {
  switch (partId) {
    case 'head': return 0.5;
    case 'torso': return 0.3;
    case 'left_arm': case 'right_arm': return 0.25;
    case 'left_leg': case 'right_leg': return 0.25;
    case 'left_hand': case 'right_hand': return 0.15;
    case 'left_foot': case 'right_foot': return 0.15;
  }
}
```

### 3.4 Movement Speed Debuff

```typescript
function getMovementSpeedMultiplier(body: BodyComponent): number {
  // Check leg/foot damage
  const leftLegHealth = body.parts.left_leg.health / body.parts.left_leg.maxHealth;
  const rightLegHealth = body.parts.right_leg.health / body.parts.right_leg.maxHealth;
  const leftFootHealth = body.parts.left_foot.health / body.parts.left_foot.maxHealth;
  const rightFootHealth = body.parts.right_foot.health / body.parts.right_foot.maxHealth;

  // Average leg functionality (legs weighted more than feet)
  const legFunction = (leftLegHealth * 0.35 + rightLegHealth * 0.35 +
                       leftFootHealth * 0.15 + rightFootHealth * 0.15);

  // Minimum 20% speed even with severe injuries (crawling)
  return Math.max(0.2, legFunction);
}
```

---

## 4. BodySystem

### 4.1 System Definition

```typescript
class BodySystem implements System {
  public readonly id: SystemId = 'body';
  public readonly priority: number = 13; // After NeedsSystem (15), before AI
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['body'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const body = entity.components.get('body') as BodyComponent;

      // 1. Process bleeding from injuries
      this.processBleedingDamage(entity, body, deltaTime);

      // 2. Natural healing over time
      this.processNaturalHealing(entity, body, deltaTime);

      // 3. Infection progression
      this.processInfections(entity, body, deltaTime, world);

      // 4. Update derived stats
      this.updateDerivedStats(entity, body);

      // 5. Check consciousness
      this.checkConsciousness(entity, body, world);

      // 6. Check vital part destruction (death)
      this.checkVitalParts(entity, body, world);

      // 7. Apply pain to stress
      this.applyPainToStress(entity, body);
    }
  }
}
```

### 4.2 Bleeding Processing

```typescript
private processBleedingDamage(
  entity: Entity,
  body: BodyComponent,
  deltaTime: number
): void {
  let totalBleedRate = 0;

  for (const [partId, state] of Object.entries(body.parts)) {
    for (const injury of state.injuries) {
      // Bandaging stops bleeding
      if (!state.bandaged && injury.bleedRate > 0) {
        totalBleedRate += injury.bleedRate;
      }
    }
  }

  // Apply blood loss
  if (totalBleedRate > 0) {
    body.bloodLoss = Math.min(100, body.bloodLoss + totalBleedRate * deltaTime);

    // Blood loss affects overall health
    if (body.bloodLoss > 50) {
      // Start taking health damage from blood loss
      const needs = entity.components.get('needs') as NeedsComponent;
      if (needs) {
        const bleedDamage = (body.bloodLoss - 50) * 0.02 * deltaTime;
        needs.health = Math.max(0, needs.health - bleedDamage);
      }
    }
  }

  // Natural blood recovery (when not bleeding)
  if (totalBleedRate === 0 && body.bloodLoss > 0) {
    body.bloodLoss = Math.max(0, body.bloodLoss - 0.5 * deltaTime);
  }
}
```

### 4.3 Natural Healing

```typescript
private processNaturalHealing(
  entity: Entity,
  body: BodyComponent,
  deltaTime: number
): void {
  const needs = entity.components.get('needs') as NeedsComponent;
  const isResting = this.isAgentResting(entity);

  // Healing rate factors
  let healingMultiplier = 1.0;
  if (needs?.hunger < 30) healingMultiplier *= 0.5;  // Hungry = slow healing
  if (needs?.energy < 30) healingMultiplier *= 0.5;  // Tired = slow healing
  if (isResting) healingMultiplier *= 2.0;           // Resting = faster healing
  if (body.bloodLoss > 30) healingMultiplier *= 0.5; // Blood loss = slow healing

  for (const [partId, state] of Object.entries(body.parts)) {
    // Infected parts don't heal naturally
    if (state.infected) continue;

    for (const injury of state.injuries) {
      // Base healing: 1% per in-game hour
      const baseHealRate = 1.0 / 3600; // Per second
      injury.healingProgress += baseHealRate * healingMultiplier * deltaTime * 100;

      // Fully healed injuries are removed
      if (injury.healingProgress >= 100) {
        // Remove injury, restore some part health
        const index = state.injuries.indexOf(injury);
        state.injuries.splice(index, 1);

        // Restore health based on injury severity
        const healthRestore = this.getHealthRestoreFromHealing(injury);
        state.health = Math.min(state.maxHealth, state.health + healthRestore);
      }
    }
  }
}
```

---

## 5. Medicine Integration

### 5.1 Diagnosis (Medicine skill gating)

```typescript
/**
 * What an agent can perceive about injuries depends on Medicine skill.
 * Level 0: "They look hurt"
 * Level 1: "They have a wound on their arm"
 * Level 2: "They have a moderate cut on their left arm"
 * Level 3: Severity, bleed rate, infection risk
 * Level 4+: Optimal treatment plan, prognosis
 */
function getInjuryDiagnosis(
  body: BodyComponent,
  observerMedicineLevel: SkillLevel
): string {
  if (observerMedicineLevel === 0) {
    const hasInjuries = Object.values(body.parts).some(p => p.injuries.length > 0);
    return hasInjuries ? "They look hurt" : "They look healthy";
  }

  if (observerMedicineLevel === 1) {
    const injured = Object.entries(body.parts)
      .filter(([_, s]) => s.injuries.length > 0)
      .map(([p, _]) => BODY_PART_DEFINITIONS[p as BodyPartId].name);
    return injured.length > 0
      ? `They have wounds on: ${injured.join(', ')}`
      : "They look healthy";
  }

  // Level 2+: Full diagnosis
  const details: string[] = [];
  for (const [partId, state] of Object.entries(body.parts)) {
    for (const injury of state.injuries) {
      const partName = BODY_PART_DEFINITIONS[partId as BodyPartId].name;
      let desc = `${injury.severity} ${injury.type} on ${partName}`;

      if (observerMedicineLevel >= 3) {
        if (injury.bleedRate > 0) desc += ` (bleeding)`;
        if (state.infected) desc += ` (INFECTED)`;
      }

      details.push(desc);
    }
  }

  if (observerMedicineLevel >= 4 && details.length > 0) {
    details.push(`Prognosis: ${getPrognosis(body)}`);
  }

  return details.length > 0 ? details.join('; ') : "Healthy";
}
```

### 5.2 Treatment Actions

```typescript
/**
 * Medical actions available by Medicine skill level
 */
const MEDICAL_ACTIONS: Record<number, string[]> = {
  0: [],                                    // No medical actions
  1: ['apply_bandage'],                     // Stop bleeding (basic)
  2: ['apply_bandage', 'clean_wound'],      // Prevent infection
  3: ['apply_bandage', 'clean_wound', 'apply_splint'], // Treat fractures
  4: ['apply_bandage', 'clean_wound', 'apply_splint', 'treat_infection'],
  5: ['apply_bandage', 'clean_wound', 'apply_splint', 'treat_infection', 'surgery'],
};

interface TreatmentResult {
  success: boolean;
  message: string;
  xpGained: number;
}

function applyTreatment(
  healer: Entity,
  patient: Entity,
  treatment: string,
  targetPart: BodyPartId
): TreatmentResult {
  const skills = healer.components.get('skills') as SkillsComponent;
  const medicineLevel = skills?.levels.medicine ?? 0;
  const body = patient.components.get('body') as BodyComponent;
  const part = body.parts[targetPart];

  // Check if healer can perform this treatment
  if (!MEDICAL_ACTIONS[medicineLevel]?.includes(treatment)) {
    return { success: false, message: "Insufficient medicine skill", xpGained: 0 };
  }

  switch (treatment) {
    case 'apply_bandage':
      part.bandaged = true;
      return { success: true, message: `Bandaged ${targetPart}`, xpGained: 10 };

    case 'clean_wound':
      // Reduces infection chance
      // ... implementation
      return { success: true, message: `Cleaned wound on ${targetPart}`, xpGained: 15 };

    case 'apply_splint':
      if (part.injuries.some(i => i.type === 'fracture')) {
        part.splinted = true;
        return { success: true, message: `Splinted ${targetPart}`, xpGained: 25 };
      }
      return { success: false, message: "No fracture to splint", xpGained: 0 };

    case 'treat_infection':
      if (part.infected) {
        part.infected = false;
        return { success: true, message: `Treated infection on ${targetPart}`, xpGained: 40 };
      }
      return { success: false, message: "No infection to treat", xpGained: 0 };

    default:
      return { success: false, message: "Unknown treatment", xpGained: 0 };
  }
}
```

---

## 6. Stress Integration

### 6.1 Pain → Stress

```typescript
/**
 * Total pain from all injuries contributes to agent stress.
 * Pain is calculated each tick from active injuries.
 */
function calculateTotalPain(body: BodyComponent): number {
  let totalPain = 0;

  for (const state of Object.values(body.parts)) {
    for (const injury of state.injuries) {
      totalPain += injury.painLevel;
    }

    // Infection adds pain
    if (state.infected) {
      totalPain += 20;
    }
  }

  // Blood loss adds pain/discomfort
  totalPain += body.bloodLoss * 0.3;

  return Math.min(100, totalPain);
}

/**
 * Apply pain to mood/stress systems
 */
function applyPainToStress(entity: Entity, body: BodyComponent): void {
  const mood = entity.components.get('mood') as MoodComponent;
  const totalPain = calculateTotalPain(body);

  if (mood) {
    // Pain reduces physical satisfaction factor
    mood.factors.physical = Math.max(-100, mood.factors.physical - totalPain * 0.5);
  }

  // For animals (AnimalComponent has stress directly)
  const animal = entity.components.get('animal') as AnimalComponent;
  if (animal) {
    // Pain increases stress
    animal.stress = Math.min(100, animal.stress + totalPain * 0.1);
  }
}
```

---

## 7. LLM Context Integration

### 7.1 Body State in Agent Prompt

```typescript
function getBodyContextForLLM(
  body: BodyComponent,
  selfAwareness: boolean = true
): string {
  if (!selfAwareness) {
    // Agent doesn't know their own injuries in detail
    return body.totalPain > 30 ? "You are in pain." : "";
  }

  const issues: string[] = [];

  // Blood loss
  if (body.bloodLoss > 50) {
    issues.push(`You are bleeding heavily and feeling weak.`);
  } else if (body.bloodLoss > 20) {
    issues.push(`You are bleeding and need medical attention.`);
  }

  // Injuries by part
  for (const [partId, state] of Object.entries(body.parts)) {
    const partName = BODY_PART_DEFINITIONS[partId as BodyPartId].name;

    if (state.health < state.maxHealth * 0.3) {
      issues.push(`Your ${partName} is severely damaged.`);
    } else if (state.health < state.maxHealth * 0.6) {
      issues.push(`Your ${partName} is injured.`);
    }

    if (state.infected) {
      issues.push(`Your ${partName} is infected and getting worse.`);
    }
  }

  // Movement impairment
  const moveSpeed = getMovementSpeedMultiplier(body);
  if (moveSpeed < 0.5) {
    issues.push(`You can barely walk due to leg injuries.`);
  } else if (moveSpeed < 0.8) {
    issues.push(`You are limping.`);
  }

  // Consciousness
  if (!body.consciousness) {
    return "You are unconscious.";
  }

  return issues.length > 0
    ? `Physical condition: ${issues.join(' ')}`
    : "You are physically healthy.";
}
```

### 7.2 Medical Decision Making

```typescript
/**
 * LLM prompt addition for agents with medicine skill
 */
function getMedicalContextForLLM(
  self: Entity,
  nearbyAgents: Entity[]
): string {
  const skills = self.components.get('skills') as SkillsComponent;
  const medicineLevel = skills?.levels.medicine ?? 0;

  if (medicineLevel === 0) return "";

  const observations: string[] = [];

  for (const agent of nearbyAgents) {
    const body = agent.components.get('body') as BodyComponent;
    if (!body) continue;

    const diagnosis = getInjuryDiagnosis(body, medicineLevel);
    if (diagnosis !== "Healthy" && diagnosis !== "They look healthy") {
      const name = agent.components.get('identity')?.name ?? 'Someone';
      observations.push(`${name}: ${diagnosis}`);
    }
  }

  if (observations.length > 0) {
    const actions = MEDICAL_ACTIONS[medicineLevel].join(', ');
    return `\nMedical observations:\n${observations.join('\n')}\n` +
           `Available treatments: ${actions}`;
  }

  return "";
}
```

---

## 8. UI/Rendering

### 8.1 Agent Info Panel Addition

```
┌─ Body Status ─────────────────────────────┐
│ Overall: 85% (Minor injuries)             │
│                                           │
│ Head      [████████████████████] 100%     │
│ Torso     [████████████████████] 100%     │
│ L.Arm     [██████████████░░░░░░]  75%     │
│ R.Arm     [████████████████████] 100%     │
│ L.Hand    [████████████░░░░░░░░]  60% 🩸  │
│ R.Hand    [████████████████████] 100%     │
│ L.Leg     [████████████████████] 100%     │
│ R.Leg     [████████████████████] 100%     │
│ L.Foot    [████████████████████] 100%     │
│ R.Foot    [████████████████████] 100%     │
│                                           │
│ Injuries:                                 │
│  - Left hand: moderate cut (bleeding)     │
│  - Left arm: minor bruise                 │
│                                           │
│ Blood loss: 15%                           │
└───────────────────────────────────────────┘

Legend: 🩸 = bleeding, 🦴 = fracture, 🔥 = infected
```

### 8.2 World Rendering (Future)

- Injured agents move slower (visible in animation)
- Bandaged parts could show white wrap texture
- Blood drops when bleeding (particle effect)
- Limping animation when leg damaged

---

## 9. Animal Bodies (Optional Extension)

### 9.1 Animal Body Parts

Animals have simplified body structures:

```typescript
type AnimalBodyPartId =
  | 'head'
  | 'body'       // Simplified torso
  | 'front_legs' // Grouped
  | 'back_legs'  // Grouped
  | 'tail';      // Optional, some species

const ANIMAL_BODY_DEFINITIONS: Record<string, AnimalBodyPartId[]> = {
  chicken: ['head', 'body', 'front_legs', 'back_legs'],
  rabbit: ['head', 'body', 'front_legs', 'back_legs'],
  sheep: ['head', 'body', 'front_legs', 'back_legs'],
  cow: ['head', 'body', 'front_legs', 'back_legs', 'tail'],
  wolf: ['head', 'body', 'front_legs', 'back_legs', 'tail'],
};
```

---

## 10. Implementation Checklist

### 10.1 Core Components
- [ ] Create BodyComponent with part states
- [ ] Create Injury type definitions
- [ ] Create BodyPartDefinition registry
- [ ] Create factory function createBodyComponent()

### 10.2 BodySystem
- [ ] Implement bleeding damage processing
- [ ] Implement natural healing over time
- [ ] Implement infection progression
- [ ] Implement consciousness check
- [ ] Implement vital part death check
- [ ] Integrate with MoodComponent (pain → factors.physical)

### 10.3 Medicine Integration
- [ ] Add diagnosis function (gated by medicine level)
- [ ] Implement apply_bandage action
- [ ] Implement clean_wound action
- [ ] Implement apply_splint action
- [ ] Implement treat_infection action
- [ ] Add medicine XP for treatments

### 10.4 Skill Debuffs
- [ ] Implement getSkillDebuff() function
- [ ] Integrate debuffs into skill quality calculations
- [ ] Implement getMovementSpeedMultiplier()
- [ ] Integrate movement debuff into MovementSystem

### 10.5 LLM Context
- [ ] Add getBodyContextForLLM() to agent prompts
- [ ] Add getMedicalContextForLLM() for medicine-skilled agents
- [ ] Add injury events to timeline

### 10.6 UI
- [ ] Add body status to AgentInfoPanel
- [ ] Add injury list display
- [ ] Add health bars per body part
- [ ] Add injury icons (bleeding, infected, etc.)

### 10.7 Injury Sources
- [ ] Add fall damage (from construction, exploration)
- [ ] Add tool accidents (rare random events during work)
- [ ] Add temperature injuries (frostbite, heatstroke)
- [ ] Add animal attack injuries (future: predators)

### 10.8 Testing
- [ ] Unit tests for injury creation
- [ ] Unit tests for bleeding/healing
- [ ] Unit tests for skill debuffs
- [ ] Integration tests for medicine actions
- [ ] Integration tests for death from vital destruction

---

## 11. Success Criteria

**Body Parts System is complete when:**

1. Agents have trackable body parts with individual health
2. Injuries affect relevant skills (hand injury → worse crafting)
3. Leg injuries reduce movement speed
4. Bleeding causes progressive damage until bandaged
5. Medicine skill gates diagnosis detail and treatment options
6. Pain from injuries affects mood/stress
7. Vital part destruction causes death
8. LLM receives body condition context
9. Agent info panel shows body status
10. Medicine-skilled agents can heal others

**Visual Confirmation:**
- Agent falls, injures leg → moves slower → another agent with medicine skill bandages them → bleeding stops → over time injury heals → movement returns to normal

---

## 12. Future Enhancements

- Prosthetics (wooden leg, hook hand)
- Scars from healed wounds (permanent but minor debuff + memory)
- Disease system (spreading illness, quarantine)
- Surgical tools and medical buildings (clinic)
- Pain medication (temporary pain reduction)
- Physical therapy (faster healing with social skill)
- Genetic traits (some agents heal faster)
- Age-related healing speed (elders heal slower)
