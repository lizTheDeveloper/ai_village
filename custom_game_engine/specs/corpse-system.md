# Corpse System Specification

**Status:** Draft
**Phase:** 9+ (After Body Parts System)
**Depends On:** BodyComponent, LifecycleSystem, NeedsSystem, MagicSystem (necromancy)

---

## Overview

When agents die, their bodies become corpses - physical entities that must be handled by the living. Corpses decay, spread disease if neglected, can be buried/cremated, and serve as material for necromancy.

**Core Principles:**
1. Death creates a physical corpse entity at death location
2. Corpses decay over time following a progression
3. Unburied corpses spread disease and reduce morale
4. Cultural practices determine burial customs
5. Necromancy requires corpses in specific decay states
6. Bodies contain resources (organs, blood) for specific purposes

---

## 1. Corpse Entity

### 1.1 CorpseComponent

```typescript
interface CorpseComponent extends Component {
  type: 'corpse';

  // Identity (who was this?)
  deceasedAgentId: string;
  deceasedName: string;
  species: string;
  deathTime: GameTime;
  deathCause: DeathCause;

  // Physical state
  decayState: DecayState;
  decayProgress: number;        // 0-100 within current state
  temperature: number;           // Affects decay rate
  exposed: boolean;              // Outdoors vs indoors

  // Body integrity
  bodyParts: Record<BodyPartId, CorpsePartState>;
  dismembered: boolean;
  missingParts: BodyPartId[];

  // Preservation
  preserved: boolean;
  preservationMethod?: PreservationMethod;
  preservationQuality: number;   // 0-1, degrades over time

  // Disease vector
  diseaseRisk: number;           // 0-1, how likely to spread disease
  infectiousDisease?: string;    // What disease they died from

  // Necromancy potential
  necromancyViability: number;   // 0-1, degrades with decay
  animatedBefore: boolean;       // Can't reanimate same corpse twice
  curseStatus?: CurseType;       // Some corpses are cursed

  // Forensic information
  injuries: Injury[];            // From BodyComponent at death
  timeSinceDeath: number;        // Ticks
  autopsyPerformed: boolean;
  autopsyFindings?: AutopsyReport;

  // Social/cultural
  claimed: boolean;              // Has family claimed the body?
  claimedBy?: string;            // Entity ID
  burialPrepared: boolean;
  funeralHeld: boolean;
}

type DecayState =
  | 'fresh'         // 0-24 hours: Suitable for medical harvest
  | 'bloated'       // 1-3 days: Gas buildup, highest disease risk
  | 'active_decay'  // 3-10 days: Tissue breakdown
  | 'advanced_decay'// 10-20 days: Mostly liquefied
  | 'dry'           // 20-40 days: Mummification begins
  | 'skeletal';     // 40+ days: Only bones remain

type PreservationMethod =
  | 'embalming'     // Chemical preservation
  | 'freezing'      // Ice/cold preservation
  | 'mummification' // Ritual wrapping
  | 'magic'         // Magical stasis
  | 'divine';       // Divine intervention (saints)

interface CorpsePartState {
  present: boolean;             // Is this part still attached?
  condition: PartCondition;
  harvestable: boolean;         // For organs, blood, etc.
  necromanticValue: number;     // Some parts more valuable than others
}

type PartCondition =
  | 'intact'
  | 'damaged'
  | 'decayed'
  | 'skeletal'
  | 'missing';

interface AutopsyReport {
  performedBy: string;
  timestamp: GameTime;
  skillLevel: number;           // Medicine skill of performer

  // Findings
  causeOfDeath: DeathCause;
  timeOfDeath: GameTime;        // Estimated
  injuriesCatalogued: Injury[];
  evidenceFound: string[];      // For murder investigations

  // Quality
  accuracy: number;             // 0-1, based on skill
  certainty: number;            // 0-1, how confident
}
```

### 1.2 Factory Function

```typescript
function createCorpseFromAgent(
  agent: Entity,
  deathCause: DeathCause,
  deathTime: GameTime,
  location: Position
): Entity {
  const body = agent.components.get('body') as BodyComponent;
  const identity = agent.components.get('identity');

  // Convert BodyComponent parts to CorpsePartState
  const corpseParts: Record<BodyPartId, CorpsePartState> = {};
  for (const [partId, partState] of Object.entries(body.parts)) {
    corpseParts[partId as BodyPartId] = {
      present: partState.health > 0,
      condition: partState.health === 0 ? 'damaged' : 'intact',
      harvestable: partState.health > partState.maxHealth * 0.5,
      necromanticValue: calculateNecromanticValue(partId, partState),
    };
  }

  const corpse: CorpseComponent = {
    type: 'corpse',
    version: 1,
    deceasedAgentId: agent.id,
    deceasedName: identity?.name ?? 'Unknown',
    species: identity?.species ?? 'human',
    deathTime,
    deathCause,

    decayState: 'fresh',
    decayProgress: 0,
    temperature: 20, // Room temp
    exposed: false,  // Indoors assumed

    bodyParts: corpseParts,
    dismembered: false,
    missingParts: [],

    preserved: false,
    preservationQuality: 0,

    diseaseRisk: calculateInitialDiseaseRisk(deathCause, body),

    necromancyViability: 1.0,
    animatedBefore: false,

    injuries: [...body.parts.flatMap(p => p.injuries)],
    timeSinceDeath: 0,
    autopsyPerformed: false,

    claimed: false,
    burialPrepared: false,
    funeralHeld: false,
  };

  const corpseEntity = world.createEntity();
  corpseEntity.addComponent('corpse', corpse);
  corpseEntity.addComponent('position', location);
  corpseEntity.addComponent('renderable', createCorpseRenderable(identity?.species));

  return corpseEntity;
}
```

---

## 2. Decay System

### 2.1 Decay Progression

```typescript
interface DecayConfig {
  baseDecayRate: number;        // Base decay per tick
  temperatureMultiplier: number;
  exposureMultiplier: number;
  preservationMultiplier: number;
}

const DECAY_THRESHOLDS = {
  fresh: { min: 0, max: 0.1, diseaseRisk: 0.3 },
  bloated: { min: 0.1, max: 0.25, diseaseRisk: 0.9 },      // PEAK disease
  active_decay: { min: 0.25, max: 0.5, diseaseRisk: 0.7 },
  advanced_decay: { min: 0.5, max: 0.75, diseaseRisk: 0.4 },
  dry: { min: 0.75, max: 0.9, diseaseRisk: 0.1 },
  skeletal: { min: 0.9, max: 1.0, diseaseRisk: 0.0 },
};

class CorpseSystem implements System {
  public readonly id: SystemId = 'corpse';
  public readonly priority: number = 12;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['corpse'];

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    for (const entity of entities) {
      const corpse = entity.components.get('corpse') as CorpseComponent;
      const position = entity.components.get('position') as PositionComponent;

      // Skip if preserved
      if (corpse.preserved && corpse.preservationQuality > 0.5) {
        this.degradePreservation(corpse, deltaTime);
        continue;
      }

      // 1. Calculate decay rate
      const decayRate = this.calculateDecayRate(corpse, position, world);

      // 2. Progress decay
      corpse.decayProgress += decayRate * deltaTime;

      // 3. Check for state transition
      this.checkDecayTransition(corpse);

      // 4. Update necromancy viability
      this.updateNecromanticViability(corpse);

      // 5. Spread disease if applicable
      this.spreadDisease(corpse, position, world);

      // 6. Affect nearby agents (morale, smell)
      this.affectNearbyAgents(corpse, position, world);

      // 7. Attract scavengers
      this.attractScavengers(corpse, position, world);
    }
  }

  private calculateDecayRate(
    corpse: CorpseComponent,
    position: PositionComponent,
    world: World
  ): number {
    let rate = 0.01; // Base rate (1% per tick)

    // Temperature: Cold slows, heat accelerates
    const tempEffect = (corpse.temperature - 10) / 30;
    rate *= (1 + tempEffect);

    // Exposure: Outdoors vs indoors
    if (corpse.exposed) {
      rate *= 1.5;
    }

    // Burial slows decay dramatically
    const tile = world.getTileAt(position.x, position.y);
    if (tile?.underground) {
      rate *= 0.3;
    }

    // Magic can slow or accelerate
    if (corpse.curseStatus === 'rapid_decay') {
      rate *= 5.0;
    }

    return rate;
  }

  private checkDecayTransition(corpse: CorpseComponent): void {
    const normalizedDecay = corpse.timeSinceDeath / (60 * 60 * 24 * 50); // 50 days to skeletal

    for (const [state, threshold] of Object.entries(DECAY_THRESHOLDS)) {
      if (normalizedDecay >= threshold.min && normalizedDecay < threshold.max) {
        if (corpse.decayState !== state as DecayState) {
          corpse.decayState = state as DecayState;
          corpse.decayProgress = 0;
          corpse.diseaseRisk = threshold.diseaseRisk;

          // Emit event
          world.emit('corpse:decay_transition', {
            corpseId: corpse.deceasedAgentId,
            newState: state,
          });
        }
        break;
      }
    }
  }

  private updateNecromanticViability(corpse: CorpseComponent): void {
    // Necromancy viability depends on decay state
    const viabilityByState: Record<DecayState, number> = {
      fresh: 1.0,         // Perfect for necromancy
      bloated: 0.9,       // Still good
      active_decay: 0.6,  // Harder to animate
      advanced_decay: 0.3,// Very difficult
      dry: 0.1,           // Nearly impossible (regular necromancy)
      skeletal: 0.05,     // Only skeleton spells work
    };

    corpse.necromancyViability = viabilityByState[corpse.decayState];

    // Missing parts reduce viability
    const missingPartsRatio = corpse.missingParts.length / 10;
    corpse.necromancyViability *= (1 - missingPartsRatio * 0.5);

    // Previous animation makes it harder
    if (corpse.animatedBefore) {
      corpse.necromancyViability *= 0.1;
    }
  }

  private spreadDisease(
    corpse: CorpseComponent,
    position: PositionComponent,
    world: World
  ): void {
    if (corpse.diseaseRisk === 0) return;

    // Find nearby agents
    const nearbyAgents = world.getAgentsNear(position, 5); // 5 tiles

    for (const agent of nearbyAgents) {
      const needs = agent.components.get('needs') as NeedsComponent;
      if (!needs) continue;

      // Chance to contract disease
      const infectionChance = corpse.diseaseRisk * 0.01; // 1% at peak

      if (Math.random() < infectionChance) {
        // Reduce health
        needs.health = Math.max(0, needs.health - 5);

        // Emit disease event
        world.emit('agent:disease_contracted', {
          agentId: agent.id,
          source: 'corpse',
          disease: corpse.infectiousDisease ?? 'corpse_sickness',
        });
      }
    }
  }

  private affectNearbyAgents(
    corpse: CorpseComponent,
    position: PositionComponent,
    world: World
  ): void {
    const nearbyAgents = world.getAgentsNear(position, 10);

    for (const agent of nearbyAgents) {
      const mood = agent.components.get('mood') as MoodComponent;
      if (!mood) continue;

      // Calculate morale penalty based on decay state and distance
      const distance = Math.sqrt(
        Math.pow(position.x - agent.position.x, 2) +
        Math.pow(position.y - agent.position.y, 2)
      );

      const proximityFactor = Math.max(0, 1 - distance / 10);

      const decayPenalty = {
        fresh: -5,
        bloated: -15,      // Worst smell/sight
        active_decay: -20,
        advanced_decay: -10,
        dry: -3,
        skeletal: -1,
      }[corpse.decayState];

      const totalPenalty = decayPenalty * proximityFactor;

      mood.factors.environment = Math.max(
        -100,
        mood.factors.environment + totalPenalty
      );

      // Add specific negative thought
      if (!corpse.burialPrepared && proximityFactor > 0.5) {
        // LLM context: "You can see/smell an unburied corpse nearby"
      }
    }
  }
}
```

---

## 3. Burial and Cremation

### 3.1 Burial Actions

```typescript
interface BurialAction {
  type: 'bury' | 'cremate' | 'embalm' | 'sky_burial' | 'water_burial';
  corpseId: string;
  performedBy: string[];        // May require multiple agents
  location: Position;           // Grave site

  // Requirements
  requiredItems: ItemStack[];   // Coffin, shroud, etc.
  requiredSkill?: SkillLevel;   // Medicine for embalming
  timeRequired: number;         // Ticks to complete

  // Cultural
  ritualRequired: boolean;
  clericPresence: boolean;
  familyPresent: string[];
}

class BurialSystem {
  /**
   * Bury a corpse in the ground.
   * Creates a grave marker at location.
   */
  buryCorpse(
    corpse: CorpseComponent,
    location: Position,
    gravediggers: Entity[],
    world: World
  ): BurialResult {
    // 1. Check if location is valid
    const tile = world.getTileAt(location.x, location.y);
    if (!tile.diggable) {
      return { success: false, reason: 'Cannot dig here' };
    }

    // 2. Create grave entity
    const grave = world.createEntity();
    grave.addComponent('grave', {
      deceasedId: corpse.deceasedAgentId,
      deceasedName: corpse.deceasedName,
      burialDate: world.currentTime,
      gravediggers: gravediggers.map(g => g.id),
      epitaph: generateEpitaph(corpse),
    });
    grave.addComponent('position', location);
    grave.addComponent('renderable', {
      sprite: 'grave_marker',
      layer: 'buildings',
    });

    // 3. Remove corpse entity
    world.removeEntity(corpse.deceasedAgentId);

    // 4. Mark as buried
    corpse.burialPrepared = true;

    // 5. Emit event for family/mourners
    world.emit('corpse:buried', {
      deceased: corpse.deceasedName,
      location,
      attendees: gravediggers.map(g => g.id),
    });

    return { success: true };
  }

  /**
   * Cremate a corpse.
   * Requires fuel and fire source.
   */
  cremateCorpse(
    corpse: CorpseComponent,
    location: Position,
    cremators: Entity[],
    world: World
  ): BurialResult {
    // 1. Check for pyre or crematorium
    const building = world.getBuildingAt(location);
    if (building?.type !== 'crematorium') {
      return { success: false, reason: 'Requires crematorium' };
    }

    // 2. Consume fuel
    const fuelRequired = 10; // Wood units
    if (!this.consumeFuel(building, fuelRequired)) {
      return { success: false, reason: 'Insufficient fuel' };
    }

    // 3. Create ashes item
    const ashes = world.createItem('cremated_remains', {
      deceasedName: corpse.deceasedName,
      cremationDate: world.currentTime,
    });

    // 4. Remove corpse
    world.removeEntity(corpse.deceasedAgentId);

    // 5. Emit event
    world.emit('corpse:cremated', {
      deceased: corpse.deceasedName,
      ashes: ashes.id,
    });

    return { success: true, ashes };
  }

  /**
   * Embalm a corpse for preservation.
   * Requires medicine skill and embalming supplies.
   */
  embalmCorpse(
    corpse: CorpseComponent,
    embalmer: Entity,
    world: World
  ): BurialResult {
    const skills = embalmer.components.get('skills') as SkillsComponent;
    const medicineLevel = skills?.levels.medicine ?? 0;

    // Requires medicine level 3+
    if (medicineLevel < 3) {
      return { success: false, reason: 'Insufficient medicine skill' };
    }

    // Check for embalming supplies
    const inventory = embalmer.components.get('inventory') as InventoryComponent;
    if (!inventory.hasItem('embalming_fluid', 1)) {
      return { success: false, reason: 'No embalming fluid' };
    }

    // Consume supplies
    inventory.removeItem('embalming_fluid', 1);

    // Preserve the corpse
    corpse.preserved = true;
    corpse.preservationMethod = 'embalming';
    corpse.preservationQuality = 0.7 + (medicineLevel / 20); // 0.7-0.95
    corpse.decayProgress = 0; // Reset decay
    corpse.diseaseRisk = 0;   // No longer infectious

    return { success: true };
  }
}
```

### 3.2 Grave Component

```typescript
interface GraveComponent extends Component {
  type: 'grave';

  // Who is buried here
  deceasedId: string;
  deceasedName: string;
  deathDate: GameTime;
  burialDate: GameTime;

  // Grave details
  gravediggers: string[];
  epitaph: string;
  graveType: GraveType;

  // Maintenance
  maintained: boolean;
  lastVisited?: GameTime;
  visitors: string[];           // Family who visit

  // Cultural/religious
  sacred: boolean;
  consecrated: boolean;
  offerings: ItemStack[];       // Flowers, food, etc.

  // Necromancy protection
  warded: boolean;               // Protected against necromancy
  disturbance: DisturbanceState;
}

type GraveType =
  | 'simple'          // Mound of dirt
  | 'marked'          // Wooden marker
  | 'headstone'       // Stone marker
  | 'monument'        // Elaborate memorial
  | 'mausoleum';      // Building

type DisturbanceState =
  | 'undisturbed'
  | 'disturbed'       // Someone dug it up
  | 'desecrated'      // Deliberately violated
  | 'empty';          // Body is gone (raised as undead?)

function generateEpitaph(corpse: CorpseComponent): string {
  // Generate epitaph based on life achievements
  // "Beloved parent and master craftsman"
  // "Died defending the village"
  // etc.
  return `Here lies ${corpse.deceasedName}`;
}
```

---

## 4. Necromancy Integration

### 4.1 Corpse Requirements for Necromancy

```typescript
interface NecromanticRequirements {
  // Corpse state
  minViability: number;          // Minimum necromancyViability
  maxDecayState: DecayState;     // Most decayed state allowed
  requiredParts: BodyPartId[];   // Must have these parts

  // Restrictions
  canUseAnimatedBefore: boolean;
  canUseCremated: boolean;
  requiresIntactHead: boolean;

  // Enhancements
  fresherIsBetter: boolean;      // Quality scales with freshness
  partCountMatters: boolean;     // Missing parts = weaker undead
}

const NECROMANCY_SPELLS: Record<string, NecromanticRequirements> = {
  // Basic necromancy
  raise_zombie: {
    minViability: 0.5,
    maxDecayState: 'active_decay',
    requiredParts: ['head', 'torso', 'left_arm', 'right_arm'],
    canUseAnimatedBefore: false,
    canUseCremated: false,
    requiresIntactHead: true,
    fresherIsBetter: true,
    partCountMatters: true,
  },

  raise_skeleton: {
    minViability: 0.05,           // Can use very decayed
    maxDecayState: 'skeletal',
    requiredParts: [],            // Parts don't matter for skeleton
    canUseAnimatedBefore: true,   // Can reanimate bones
    canUseCremated: false,
    requiresIntactHead: false,
    fresherIsBetter: false,
    partCountMatters: false,
  },

  create_ghoul: {
    minViability: 0.8,            // Needs fresh corpse
    maxDecayState: 'fresh',
    requiredParts: ['head', 'torso', 'left_arm', 'right_arm'],
    canUseAnimatedBefore: false,
    canUseCremated: false,
    requiresIntactHead: true,
    fresherIsBetter: true,
    partCountMatters: true,
  },

  raise_lich: {
    minViability: 1.0,            // Requires perfect corpse
    maxDecayState: 'fresh',
    requiredParts: [] as BodyPartId[], // All parts required
    canUseAnimatedBefore: false,
    canUseCremated: false,
    requiresIntactHead: true,
    fresherIsBetter: true,
    partCountMatters: true,
  },
};

function canAnimateCorpse(
  corpse: CorpseComponent,
  spell: string
): { canAnimate: boolean; reason?: string } {
  const reqs = NECROMANCY_SPELLS[spell];
  if (!reqs) {
    return { canAnimate: false, reason: 'Unknown spell' };
  }

  // Check viability
  if (corpse.necromancyViability < reqs.minViability) {
    return { canAnimate: false, reason: 'Corpse too decayed' };
  }

  // Check decay state
  const decayOrder: DecayState[] = ['fresh', 'bloated', 'active_decay', 'advanced_decay', 'dry', 'skeletal'];
  if (decayOrder.indexOf(corpse.decayState) > decayOrder.indexOf(reqs.maxDecayState)) {
    return { canAnimate: false, reason: `Corpse is ${corpse.decayState}, requires ${reqs.maxDecayState} or fresher` };
  }

  // Check required parts
  for (const part of reqs.requiredParts) {
    if (!corpse.bodyParts[part].present) {
      return { canAnimate: false, reason: `Missing ${part}` };
  }
  }

  // Check previous animation
  if (corpse.animatedBefore && !reqs.canUseAnimatedBefore) {
    return { canAnimate: false, reason: 'Corpse already animated once' };
  }

  // Check head requirement
  if (reqs.requiresIntactHead && !corpse.bodyParts.head.present) {
    return { canAnimate: false, reason: 'Requires intact head' };
  }

  return { canAnimate: true };
}
```

### 4.2 Animation Process

```typescript
/**
 * Animate a corpse using necromancy.
 * Creates an undead entity, removes corpse.
 */
function animateCorpse(
  corpse: CorpseComponent,
  spell: string,
  necromancer: Entity,
  world: World
): AnimationResult {
  const check = canAnimateCorpse(corpse, spell);
  if (!check.canAnimate) {
    return { success: false, reason: check.reason };
  }

  // Create undead entity
  const undead = world.createEntity();

  // Copy body structure from corpse
  const undeadBody = createUndeadBodyFromCorpse(corpse);
  undead.addComponent('body', undeadBody);

  // Add undead-specific components
  undead.addComponent('undead', {
    type: getUndeadType(spell),
    necromancer: necromancer.id,
    createdFrom: corpse.deceasedAgentId,
    animationTime: world.currentTime,

    // Control
    autonomous: false,          // Necromancer must command
    commandQueue: [],
    lastCommand: null,

    // Degradation
    undeadDecay: 0,            // Undead also decay
    stabilityLoss: 0,          // May become uncontrollable

    // Memories
    retainedMemories: extractMemoriesFromCorpse(corpse),
    intelligenceLevel: calculateUndeadIntelligence(spell, corpse),
  });

  // Mark corpse as animated
  corpse.animatedBefore = true;

  // Remove corpse entity
  world.removeEntity(corpse.deceasedAgentId);

  // Emit event
  world.emit('necromancy:corpse_animated', {
    necromancer: necromancer.id,
    deceased: corpse.deceasedName,
    undeadType: getUndeadType(spell),
    undeadId: undead.id,
  });

  // Social consequences
  for (const agent of world.getAgentsNear(undead.position, 20)) {
    const relationship = agent.components.get('relationship');
    if (relationship?.knows(corpse.deceasedAgentId)) {
      // "My friend has been desecrated and raised as undead"
      const mood = agent.components.get('mood') as MoodComponent;
      mood.factors.social -= 50;

      // May turn hostile to necromancer
      relationship.modifyOpinion(necromancer.id, -100);
    }
  }

  return { success: true, undead };
}

type UndeadType =
  | 'zombie'      // Slow, dumb, decaying
  | 'skeleton'    // Fast, no organs, brittle
  | 'ghoul'       // Intelligent, hungry, strong
  | 'wight'       // Intelligent, drains life
  | 'lich';       // Extremely intelligent, powerful magic

function getUndeadType(spell: string): UndeadType {
  const mapping: Record<string, UndeadType> = {
    raise_zombie: 'zombie',
    raise_skeleton: 'skeleton',
    create_ghoul: 'ghoul',
    raise_wight: 'wight',
    raise_lich: 'lich',
  };
  return mapping[spell] ?? 'zombie';
}
```

---

## 5. Medical/Forensic Uses

### 5.1 Autopsy System

```typescript
/**
 * Perform an autopsy on a corpse.
 * Requires medicine skill, provides forensic information.
 */
function performAutopsy(
  corpse: CorpseComponent,
  examiner: Entity,
  world: World
): AutopsyResult {
  const skills = examiner.components.get('skills') as SkillsComponent;
  const medicineLevel = skills?.levels.medicine ?? 0;

  if (medicineLevel < 2) {
    return { success: false, reason: 'Insufficient medicine skill' };
  }

  // Corpse must be relatively fresh
  if (corpse.decayState !== 'fresh' && corpse.decayState !== 'bloated') {
    return { success: false, reason: 'Corpse too decayed for accurate autopsy' };
  }

  // Perform examination
  const report: AutopsyReport = {
    performedBy: examiner.id,
    timestamp: world.currentTime,
    skillLevel: medicineLevel,

    // Findings
    causeOfDeath: corpse.deathCause,
    timeOfDeath: estimateTimeOfDeath(corpse, medicineLevel),
    injuriesCatalogued: [...corpse.injuries],
    evidenceFound: findEvidence(corpse, medicineLevel),

    // Quality
    accuracy: calculateAccuracy(medicineLevel, corpse.decayState),
    certainty: calculateCertainty(medicineLevel, corpse.injuries),
  };

  corpse.autopsyPerformed = true;
  corpse.autopsyFindings = report;

  // Grant medicine XP
  skills.addXP('medicine', 50);

  return { success: true, report };
}

function findEvidence(
  corpse: CorpseComponent,
  skillLevel: number
): string[] {
  const evidence: string[] = [];

  // High skill can find subtle clues
  if (skillLevel >= 4) {
    // Poison detection
    if (corpse.deathCause === 'illness') {
      evidence.push('Signs of poisoning detected');
    }

    // Defensive wounds
    const defensiveWounds = corpse.injuries.filter(i =>
      i.type === 'cut' && (i.bodyPart === 'left_hand' || i.bodyPart === 'right_hand')
    );
    if (defensiveWounds.length > 0) {
      evidence.push('Defensive wounds on hands - victim fought back');
    }

    // Weapon identification
    for (const injury of corpse.injuries) {
      if (injury.type === 'cut') {
        evidence.push(`Wound pattern consistent with ${identifyWeapon(injury)}`);
      }
    }
  }

  return evidence;
}
```

### 5.2 Organ/Blood Harvesting

```typescript
interface HarvestableResource {
  resourceType: 'organ' | 'blood' | 'bone' | 'skin';
  bodyPart: BodyPartId;
  quality: number;           // 0-1, degrades with decay
  uses: HarvestUse[];
}

type HarvestUse =
  | 'transplant'           // Medical use
  | 'alchemy'              // Potion ingredients
  | 'blood_magic'          // Necromancy/hemomancy
  | 'ritual'               // Religious/cultural
  | 'research';            // Scientific study

function harvestFromCorpse(
  corpse: CorpseComponent,
  harvester: Entity,
  resourceType: HarvestableResource['resourceType'],
  bodyPart: BodyPartId
): HarvestResult {
  const part = corpse.bodyParts[bodyPart];

  // Check if harvestable
  if (!part.present || !part.harvestable) {
    return { success: false, reason: 'Part not harvestable' };
  }

  // Check decay state
  if (corpse.decayState !== 'fresh') {
    return { success: false, reason: 'Corpse too decayed for harvest' };
  }

  // Check skill
  const skills = harvester.components.get('skills') as SkillsComponent;
  const medicineLevel = skills?.levels.medicine ?? 0;

  if (resourceType === 'organ' && medicineLevel < 4) {
    return { success: false, reason: 'Organ harvest requires medicine level 4+' };
  }

  // Create resource item
  const quality = part.condition === 'intact' ? 1.0 : 0.5;
  const resource = world.createItem(`corpse_${resourceType}`, {
    bodyPart,
    source: corpse.deceasedName,
    quality,
    harvestTime: world.currentTime,
  });

  // Mark part as missing
  part.present = false;
  part.harvestable = false;
  corpse.missingParts.push(bodyPart);

  // Reduce necromancy viability
  corpse.necromancyViability *= 0.8;

  // Social consequences if witnessed
  const witnesses = world.getAgentsNear(corpse.position, 10);
  for (const witness of witnesses) {
    const mood = witness.components.get('mood') as MoodComponent;
    mood.factors.social -= 30; // Desecration

    // May report to authorities
    if (Math.random() < 0.5) {
      world.emit('crime:desecration_witnessed', {
        perpetrator: harvester.id,
        witness: witness.id,
        victim: corpse.deceasedName,
      });
    }
  }

  return { success: true, resource };
}
```

---

## 6. Cultural Practices

### 6.1 Burial Customs by Culture

```typescript
interface BurialCustoms {
  cultureId: string;

  // Timing
  burialDeadline: number;        // Max hours before burial required
  preparationTime: number;       // Ritual preparation time

  // Method preferences
  preferredMethods: BurialMethod[];
  forbiddenMethods: BurialMethod[];

  // Rituals
  requiresFuneral: boolean;
  requiresClerical: boolean;
  lastRites: string;

  // Grave offerings
  commonOfferings: string[];
  requiresBurialGoods: boolean;

  // Restrictions
  cemeteryRequired: boolean;
  familyPlotTradition: boolean;
  cremationTaboo: boolean;
  autopsyForbidden: boolean;
}

type BurialMethod =
  | 'ground_burial'
  | 'cremation'
  | 'sky_burial'         // Leave for birds
  | 'water_burial'       // River/sea
  | 'mummification'
  | 'crypt'
  | 'pyre';

const EXAMPLE_CULTURES: Record<string, BurialCustoms> = {
  traditional_village: {
    cultureId: 'traditional',
    burialDeadline: 48,            // 2 days
    preparationTime: 12,           // Half day
    preferredMethods: ['ground_burial', 'cremation'],
    forbiddenMethods: ['sky_burial'],
    requiresFuneral: true,
    requiresClerical: true,
    lastRites: 'Blessing from village elder or cleric',
    commonOfferings: ['flowers', 'bread', 'wine'],
    requiresBurialGoods: false,
    cemeteryRequired: true,
    familyPlotTradition: true,
    cremationTaboo: false,
    autopsyForbidden: false,
  },

  desert_nomads: {
    cultureId: 'nomad',
    burialDeadline: 12,            // Quick in hot climate
    preparationTime: 2,
    preferredMethods: ['ground_burial', 'cremation'],
    forbiddenMethods: [],
    requiresFuneral: false,
    requiresClerical: false,
    lastRites: 'Family prayer',
    commonOfferings: ['water', 'dates'],
    requiresBurialGoods: false,
    cemeteryRequired: false,       // Bury where they fall
    familyPlotTradition: false,
    cremationTaboo: false,
    autopsyForbidden: true,         // Body must remain whole
  },

  sky_worshippers: {
    cultureId: 'sky_culture',
    burialDeadline: 24,
    preparationTime: 6,
    preferredMethods: ['sky_burial', 'pyre'],
    forbiddenMethods: ['ground_burial'], // Don't trap soul underground
    requiresFuneral: true,
    requiresClerical: true,
    lastRites: 'Sky blessing ceremony',
    commonOfferings: ['feathers', 'incense'],
    requiresBurialGoods: true,
    cemeteryRequired: false,
    familyPlotTradition: false,
    cremationTaboo: false,
    autopsyForbidden: true,
  },
};
```

---

## 7. System Integration

### 7.1 Death Event → Corpse Creation

```typescript
// In LifecycleSystem or NeedsSystem
function handleAgentDeath(
  agent: Entity,
  cause: DeathCause,
  world: World
): void {
  const position = agent.components.get('position');
  const currentTime = world.currentTime;

  // 1. Create death event (existing lifecycle system)
  const deathEvent: DeathEvent = {
    agentId: agent.id,
    deathTime: currentTime,
    cause,
    location: { ...position },
    witnesses: findWitnesses(agent, world),
    peacefulDeath: cause === 'old_age',
    estate: gatherEstate(agent),
    dependents: findDependents(agent),
    unfinishedBusiness: getUnfinishedBusiness(agent),
  };

  // 2. Create corpse entity
  const corpse = createCorpseFromAgent(agent, cause, currentTime, position);
  world.addEntity(corpse);

  // 3. Notify family/friends (existing mourning system)
  initiateMourningProcess(agent, world);

  // 4. Remove living agent from world
  world.removeEntity(agent.id);

  // 5. Emit death event
  world.emit('agent:died', deathEvent);
}
```

### 7.2 Corpse Disposal Urgency

```typescript
/**
 * Calculate urgency of corpse disposal.
 * Affects agent priorities.
 */
function calculateDisposalUrgency(
  corpse: CorpseComponent,
  culture: BurialCustoms
): number {
  const hoursSinceDeath = corpse.timeSinceDeath / 3600;
  const deadline = culture.burialDeadline;

  // Urgency increases as deadline approaches
  const timeRatio = hoursSinceDeath / deadline;

  // Disease risk adds urgency
  const diseaseUrgency = corpse.diseaseRisk;

  // Family obligation
  const familyUrgency = corpse.claimed ? 0.5 : 0.2;

  return Math.min(1.0, timeRatio + diseaseUrgency + familyUrgency);
}

/**
 * Add corpse disposal to agent behavior priorities.
 */
function getCorpseDisposalUtility(
  agent: Entity,
  corpse: CorpseComponent,
  culture: BurialCustoms
): number {
  const relationship = agent.components.get('relationship');

  // Family members prioritize their dead
  const isFamily = relationship?.isFamily(corpse.deceasedAgentId);
  if (isFamily) {
    return 0.9; // Very high priority
  }

  // Clerics/priests prioritize funerals
  const role = agent.components.get('profession')?.role;
  if (role === 'cleric' || role === 'priest') {
    return 0.7;
  }

  // Anyone else cares about disease risk
  const urgency = calculateDisposalUrgency(corpse, culture);
  return urgency * 0.4; // Moderate priority
}
```

---

## 8. UI/Rendering

### 8.1 Corpse Rendering

```
Visual states by decay:
- fresh: Normal body, slight pallor
- bloated: Distended, discolored
- active_decay: Decomposing, avoid showing too graphically
- advanced_decay: Mostly skeletal with tissue
- dry: Mummified appearance
- skeletal: Clean bones

Indicators:
- 🪦 Grave marker (after burial)
- ☠️ Unburied corpse (after 24 hours)
- 🩸 Blood pool (violent death)
- 🦴 Scattered bones (disturbed grave)
```

### 8.2 Agent Info Panel (when selecting corpse)

```
┌─ Corpse ──────────────────────────────┐
│ Name: [Deceased Name]                 │
│ Died: [Time since death]              │
│ Cause: [Death cause]                  │
│                                       │
│ State: [Decay state]                  │
│ Disease risk: [●●●○○] Medium          │
│                                       │
│ Status:                               │
│ ❌ Not claimed by family              │
│ ❌ No burial preparations             │
│ ⚠️  Spreading disease                 │
│                                       │
│ Actions:                              │
│ > Claim body (if family)              │
│ > Prepare for burial                  │
│ > Perform autopsy (medicine 2+)       │
│ > Animate corpse (necromancy)         │
└───────────────────────────────────────┘
```

---

## 9. Implementation Checklist

### 9.1 Core Components
- [ ] Create CorpseComponent with decay states
- [ ] Create CorpseSystem for decay progression
- [ ] Integrate with BodyComponent (death → corpse)
- [ ] Create GraveComponent for burial sites

### 9.2 Decay & Disease
- [ ] Implement decay progression algorithm
- [ ] Implement disease spread from corpses
- [ ] Implement morale effects on nearby agents
- [ ] Implement scavenger attraction

### 9.3 Burial System
- [ ] Implement burial action
- [ ] Implement cremation action
- [ ] Implement embalming action
- [ ] Create grave markers on map
- [ ] Cultural burial customs integration

### 9.4 Necromancy
- [ ] Implement corpse viability calculation
- [ ] Implement corpse animation spells
- [ ] Create undead entities from corpses
- [ ] Social consequences for necromancy

### 9.5 Medical/Forensic
- [ ] Implement autopsy system
- [ ] Implement organ/blood harvesting
- [ ] Medicine skill integration
- [ ] Evidence detection for investigations

### 9.6 Integration
- [ ] Death event creates corpse
- [ ] Agent priorities for burial
- [ ] LLM context for corpse proximity
- [ ] Family claiming/mourning integration

### 9.7 UI
- [ ] Corpse rendering by decay state
- [ ] Grave marker rendering
- [ ] Corpse info panel
- [ ] Cemetery management UI

---

## 10. Success Criteria

**Corpse System is complete when:**

1. Agent death creates physical corpse at death location
2. Corpses decay through progressive states
3. Unburied corpses spread disease and reduce morale
4. Families can claim and bury their dead
5. Multiple burial methods available (burial, cremation, etc.)
6. Necromancy can animate corpses with requirements
7. Autopsy provides forensic information
8. Cultural burial customs are respected
9. Graves persist as memorial sites
10. Agents prioritize corpse disposal appropriately

**Visual Confirmation:**
- Agent dies → corpse appears → starts decaying → family claims → prepares burial → funeral held → grave created → monument erected

---

## 11. Future Enhancements

- Vampire corpses (don't decay normally)
- Cursed corpses (spontaneously reanimate)
- Plague outbreaks from mass graves
- Crypt dungeons (exploring old burial sites)
- Relics from saint corpses
- Forensic detective mechanics
- Mass casualty management (wars, plagues)
- Cryonic preservation (magical ice)
- Soul binding (prevent resurrection)
