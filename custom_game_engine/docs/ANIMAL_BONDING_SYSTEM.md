# Animal Bonding System - Deep Emotional Connections

## Philosophy

Animals shouldn't just be livestock or resources. The bond between an agent and an animal should be:
- **Deeply Emotional** - Bonded animals significantly affect agent mood and wellbeing
- **Personal** - Each bond is unique based on personality, experiences, and time invested
- **Meaningful** - Bonds create stories, shape behavior, and influence life decisions
- **Dynamic** - Relationships evolve through shared experiences, both positive and negative
- **Impactful** - Losing a bonded animal should be emotionally devastating

The bond system is **the heart** of the animal system - genetics, breeding, and production are secondary to the emotional relationships.

---

## Core Bond System

### BondComponent

Each agent-animal relationship is tracked with deep emotional data:

```typescript
interface AnimalBondComponent {
  agentId: EntityId;
  animalId: EntityId;

  // Bond strength (0-100)
  bondLevel: number;

  // Emotional attachment (how much this relationship affects mood)
  attachment: number; // 0-100

  // Trust level (affects interaction success)
  trust: number; // 0-100

  // Understanding (how well agent knows animal's needs/personality)
  understanding: number; // 0-100

  // Bond quality dimensions
  affection: number;      // 0-100 (how much love exists)
  respect: number;        // 0-100 (mutual respect)
  reliability: number;    // 0-100 (can depend on each other)

  // Relationship type (emergent from interactions)
  bondType: 'companion' | 'working_partner' | 'guardian' | 'protector' | 'soulmate';

  // Time together
  timeSpentTogether: number; // total ticks
  recentInteractions: Array<{
    type: string;
    timestamp: number;
    emotionalImpact: number;
    outcome: 'positive' | 'neutral' | 'negative';
  }>;

  // Shared experiences
  sharedMemories: Array<{
    memoryId: string;
    description: string;
    emotionalIntensity: number;
    timestamp: number;
  }>;

  // Bond milestones
  milestones: Array<{
    type: string;
    description: string;
    timestamp: number;
    bondLevelAtTime: number;
  }>;

  // Current state
  lastInteraction: number;
  bondHealth: 'thriving' | 'stable' | 'declining' | 'damaged';
  neglectScore: number; // increases if not interacted with

  // Agent's feelings about this animal
  emotionalState: {
    joy: number;          // happiness from bond
    pride: number;        // pride in animal's accomplishments
    worry: number;        // concern for animal's wellbeing
    grief: number;        // sadness (if animal is sick/dying/dead)
    attachment: number;   // how hard it would be to lose this animal
  };
}
```

### Animal Personality & Compatibility

Animals have personalities that affect bonding:

```typescript
interface AnimalPersonality {
  // Core traits (affect bonding compatibility)
  temperament: 'gentle' | 'energetic' | 'calm' | 'skittish' | 'stubborn' | 'playful';

  // Personality dimensions (0-100)
  friendliness: number;   // how easily they bond
  independence: number;   // how much they need attention
  trainability: number;   // how easy to work with
  loyalty: number;        // how strong bonds become

  // Quirks (make each animal unique)
  quirks: Array<{
    name: string;
    description: string;
    moodImpact: number;
  }>;

  // Preferences
  favoriteActivity: string;
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
  socialPreference: 'solitary' | 'pair' | 'herd';

  // Current emotional state
  mood: number;           // -100 to 100
  stress: number;         // 0-100
  contentment: number;    // 0-100

  // How they express emotions
  expressiveness: number; // how obviously they show feelings
}
```

---

## Bond Formation & Progression

### Initial Meeting

First interaction sets the foundation:

```typescript
function initiateFirstContact(agent: Agent, animal: Animal): BondResult {
  // Personality compatibility check
  const compatibility = calculateCompatibility(agent.personality, animal.personality);

  // Approach matters
  const approachQuality = determineApproach(agent, animal);
  // gentle, patient approach = better start
  // rushed, aggressive approach = fear/distrust

  // Animal's current state affects receptiveness
  const receptiveness = animal.mood > 0 && animal.stress < 50;

  const initialTrust = Math.max(0,
    (compatibility * 40) +
    (approachQuality * 30) +
    (receptiveness ? 20 : -10) +
    randomVariance(-10, 10)
  );

  // Create bond component
  createBondComponent(agent.id, animal.id, {
    bondLevel: 5,
    trust: initialTrust,
    attachment: 0, // develops over time
    understanding: 0,
    affection: initialTrust / 2,
    respect: 10,
    reliability: 0
  });

  // Create memory for both
  createMemory(agent, {
    type: 'first_meeting',
    content: `Met ${animal.name} for the first time`,
    emotionalValence: initialTrust > 30 ? 0.5 : -0.2,
    tags: ['animal', 'bonding', animal.species]
  });

  return {
    success: initialTrust > 20,
    trust: initialTrust,
    message: getTrustMessage(initialTrust)
  };
}

function getTrustMessage(trust: number): string {
  if (trust > 70) return "instant connection";
  if (trust > 40) return "cautiously interested";
  if (trust > 20) return "wary but curious";
  return "frightened and distrustful";
}
```

### Daily Bond Activities

Regular interactions deepen bonds:

```typescript
interface BondActivity {
  type: string;
  duration: number;          // ticks
  bondGain: number;          // base bond increase
  trustGain: number;
  attachmentGain: number;
  moodImpact: number;        // for agent
  animalMoodImpact: number;
  energyCost: number;

  // Requirements
  minimumTrust?: number;
  requiredBondLevel?: number;

  // Outcomes
  successRate: number;
  positiveOutcome: string;
  negativeOutcome: string;
}

const BOND_ACTIVITIES: Record<string, BondActivity> = {
  // Basic care
  feeding: {
    type: 'care',
    duration: 10,
    bondGain: 2,
    trustGain: 3,
    attachmentGain: 1,
    moodImpact: 5,
    animalMoodImpact: 10,
    energyCost: 5,
    successRate: 0.95,
    positiveOutcome: "appreciates the food",
    negativeOutcome: "doesn't seem interested"
  },

  grooming: {
    type: 'care',
    duration: 20,
    bondGain: 5,
    trustGain: 4,
    attachmentGain: 3,
    moodImpact: 8,
    animalMoodImpact: 15,
    energyCost: 10,
    successRate: 0.85,
    positiveOutcome: "relaxes and enjoys the attention",
    negativeOutcome: "fidgets and seems uncomfortable"
  },

  // Social bonding
  playing: {
    type: 'social',
    duration: 30,
    bondGain: 8,
    trustGain: 5,
    attachmentGain: 6,
    moodImpact: 15,
    animalMoodImpact: 20,
    energyCost: 20,
    minimumTrust: 30,
    successRate: 0.90,
    positiveOutcome: "plays joyfully",
    negativeOutcome: "not in the mood to play"
  },

  petting: {
    type: 'affection',
    duration: 15,
    bondGain: 4,
    trustGain: 3,
    attachmentGain: 5,
    moodImpact: 10,
    animalMoodImpact: 12,
    energyCost: 3,
    minimumTrust: 25,
    successRate: 0.88,
    positiveOutcome: "leans into your hand",
    negativeOutcome: "pulls away"
  },

  talking_to: {
    type: 'social',
    duration: 10,
    bondGain: 3,
    trustGain: 2,
    attachmentGain: 4,
    moodImpact: 7,
    animalMoodImpact: 8,
    energyCost: 2,
    successRate: 0.92,
    positiveOutcome: "listens attentively",
    negativeOutcome: "seems distracted"
  },

  // Working together
  training: {
    type: 'working',
    duration: 40,
    bondGain: 6,
    trustGain: 7,
    attachmentGain: 3,
    moodImpact: 12,
    animalMoodImpact: 5,
    energyCost: 25,
    minimumTrust: 40,
    requiredBondLevel: 20,
    successRate: 0.70,
    positiveOutcome: "learns the skill, feels accomplished",
    negativeOutcome: "struggles and gets frustrated"
  },

  working_alongside: {
    type: 'working',
    duration: 60,
    bondGain: 10,
    trustGain: 8,
    attachmentGain: 7,
    moodImpact: 20,
    animalMoodImpact: 15,
    energyCost: 30,
    requiredBondLevel: 40,
    successRate: 0.80,
    positiveOutcome: "works in perfect harmony",
    negativeOutcome: "coordination is off today"
  },

  // Deep bonding
  quiet_companionship: {
    type: 'affection',
    duration: 50,
    bondGain: 7,
    trustGain: 5,
    attachmentGain: 10,
    moodImpact: 18,
    animalMoodImpact: 18,
    energyCost: 5,
    requiredBondLevel: 30,
    successRate: 0.95,
    positiveOutcome: "peaceful moments together",
    negativeOutcome: "something feels off"
  },

  // Crisis bonding
  protecting: {
    type: 'crisis',
    duration: 20,
    bondGain: 20,
    trustGain: 25,
    attachmentGain: 15,
    moodImpact: 30,
    animalMoodImpact: 40,
    energyCost: 15,
    successRate: 1.0,
    positiveOutcome: "will never forget you saved them",
    negativeOutcome: "n/a"
  },

  comforting: {
    type: 'crisis',
    duration: 30,
    bondGain: 15,
    trustGain: 12,
    attachmentGain: 18,
    moodImpact: 25,
    animalMoodImpact: 30,
    energyCost: 10,
    minimumTrust: 20,
    successRate: 0.90,
    positiveOutcome: "calms down in your presence",
    negativeOutcome: "too stressed to be comforted"
  }
};
```

### Bond Level Progression

```typescript
const BOND_LEVELS = {
  0: { name: "Stranger", description: "Doesn't know you" },
  10: { name: "Acquaintance", description: "Recognizes you" },
  20: { name: "Familiar", description: "Comfortable around you" },
  30: { name: "Trusting", description: "Seeks you out" },
  40: { name: "Bonded", description: "Strong emotional connection" },
  50: { name: "Devoted", description: "Deeply attached" },
  60: { name: "Soulmate", description: "Inseparable bond" },
  70: { name: "Lifelong Companion", description: "Part of your soul" }
};

function updateBondLevel(bond: AnimalBondComponent): void {
  const oldLevel = bond.bondLevel;
  const oldTier = Math.floor(oldLevel / 10);

  // Calculate new level based on trust, attachment, understanding
  const targetLevel = Math.min(100,
    (bond.trust * 0.4) +
    (bond.attachment * 0.4) +
    (bond.understanding * 0.2)
  );

  // Move gradually toward target
  bond.bondLevel += (targetLevel - bond.bondLevel) * 0.1;

  const newTier = Math.floor(bond.bondLevel / 10);

  // Milestone reached
  if (newTier > oldTier) {
    const milestone = BOND_LEVELS[newTier * 10];

    bond.milestones.push({
      type: 'bond_tier',
      description: `Reached ${milestone.name} status`,
      timestamp: Date.now(),
      bondLevelAtTime: bond.bondLevel
    });

    // Create memory
    const agent = getAgent(bond.agentId);
    const animal = getAnimal(bond.animalId);

    createMemory(agent, {
      type: 'meaningful',
      content: `${animal.name} and I have become ${milestone.name}. ${milestone.description}`,
      emotionalValence: 0.9,
      emotionalIntensity: 0.8,
      tags: ['bonding', 'milestone', animal.species]
    });

    // Huge mood boost
    applyMoodChange(agent, {
      delta: 30,
      factor: 'animal_bond',
      description: `Bonding milestone with ${animal.name}`
    });

    // Trigger reflection
    triggerReflection(agent, {
      type: 'post_event',
      focus: `relationship with ${animal.name}`,
      emotionalContext: 'joy and deep connection'
    });
  }
}
```

---

## Daily Mood Impact from Bonds

### Morning Check-In

```typescript
function morningBondCheck(agent: Agent): MoodImpact {
  let totalMoodImpact = 0;
  const impacts: string[] = [];

  const bonds = getBondsForAgent(agent.id);

  for (const bond of bonds) {
    const animal = getAnimal(bond.animalId);

    // Seeing bonded animals each morning affects mood
    if (bond.bondLevel > 30) {
      const morningBoost = Math.min(15, bond.attachment / 5);
      totalMoodImpact += morningBoost;

      if (bond.bondLevel > 60) {
        impacts.push(`Seeing ${animal.name} brings pure joy`);
      } else if (bond.bondLevel > 40) {
        impacts.push(`${animal.name} greets you warmly`);
      } else {
        impacts.push(`${animal.name} is happy to see you`);
      }
    }

    // Worry if animal is sick/stressed
    if (animal.health < 50 || animal.stress > 70) {
      const worryPenalty = -(bond.attachment / 4);
      totalMoodImpact += worryPenalty;
      impacts.push(`Worried about ${animal.name}'s condition`);

      bond.emotionalState.worry = Math.min(100, bond.emotionalState.worry + 10);
    }

    // Neglect penalty
    const ticksSinceLastInteraction = getCurrentTick() - bond.lastInteraction;
    const daysSinceInteraction = ticksSinceLastInteraction / TICKS_PER_DAY;

    if (daysSinceInteraction > 2 && bond.bondLevel > 30) {
      const neglectPenalty = -(bond.attachment / 6) * daysSinceInteraction;
      totalMoodImpact += neglectPenalty;
      impacts.push(`Haven't spent time with ${animal.name} in ${Math.floor(daysSinceInteraction)} days`);

      // Bond deteriorates
      bond.trust = Math.max(0, bond.trust - 2);
      bond.bondHealth = 'declining';
    }
  }

  return {
    totalMoodImpact,
    impacts
  };
}
```

### Ambient Bond Benefits

```typescript
function applyAmbientBondBenefits(agent: Agent): void {
  const bonds = getBondsForAgent(agent.id)
    .filter(b => b.bondLevel > 30);

  if (bonds.length === 0) return;

  // Baseline happiness from having bonded companions
  const companionshipBonus = Math.min(20, bonds.length * 5);

  // Stress reduction from animal presence
  const stressReduction = bonds.reduce((sum, bond) => {
    if (bond.bondLevel > 50) return sum + 3;
    if (bond.bondLevel > 40) return sum + 2;
    return sum + 1;
  }, 0);

  agent.needs.stress = Math.max(0, agent.needs.stress - stressReduction);

  // Energy boost from joyful bonds
  const energyBoost = bonds
    .filter(b => b.emotionalState.joy > 50)
    .reduce((sum, b) => sum + 2, 0);

  agent.needs.energy = Math.min(100, agent.needs.energy + energyBoost);

  // Update mood factors
  agent.mood.factors.animal_bonds = companionshipBonus;
}
```

---

## Loss & Grief System

### When a Bonded Animal Dies

```typescript
function handleBondedAnimalDeath(agent: Agent, animal: Animal): void {
  const bond = getBond(agent.id, animal.id);

  if (!bond || bond.bondLevel < 20) {
    // Minor sadness for acquaintance
    applyMoodChange(agent, {
      delta: -10,
      factor: 'loss',
      description: `${animal.name} died`
    });
    return;
  }

  // Grief intensity based on bond strength
  const griefIntensity = Math.min(100,
    (bond.bondLevel * 0.5) +
    (bond.attachment * 0.3) +
    (bond.emotionalState.joy * 0.2)
  );

  // Immediate devastating mood impact
  const moodImpact = -(griefIntensity * 0.8); // up to -80 mood

  applyMoodChange(agent, {
    delta: moodImpact,
    factor: 'grief',
    description: `Lost ${animal.name}`,
    duration: TICKS_PER_DAY * 7 // lasts a week
  });

  // Create grief component
  createGriefComponent(agent, {
    lostEntityId: animal.id,
    lostEntityName: animal.name,
    lostEntityType: 'animal',
    bondLevel: bond.bondLevel,
    griefIntensity,
    griefStage: 'shock',
    startTime: getCurrentTick(),

    // Grief stages progress over time
    stages: ['shock', 'denial', 'anger', 'bargaining', 'depression', 'acceptance'],
    currentStageIndex: 0,

    // Memories of the lost companion
    memories: bond.sharedMemories,

    // How grief manifests
    behaviors: {
      avoidsSimilarAnimals: true,
      seeksComfort: true,
      reflectsOnLoss: true,
      visitsLastLocation: true
    }
  });

  // Create powerful memory
  createMemory(agent, {
    type: 'life_event',
    importance: 'critical',
    content: `${animal.name} died. We were ${BOND_LEVELS[Math.floor(bond.bondLevel / 10) * 10].name}`,
    emotionalValence: -1.0,
    emotionalIntensity: 1.0,
    tags: ['death', 'loss', 'grief', animal.species, animal.name],
    impactOnWorldview: {
      mortality: 10,
      attachment: -5, // may fear future bonds
      appreciation: 5  // values remaining bonds more
    }
  });

  // Trigger deep reflection
  triggerReflection(agent, {
    type: 'deep',
    focus: `loss of ${animal.name}`,
    emotionalContext: 'profound grief and heartbreak',
    duration: 60,
    priority: 'critical'
  });

  // Physical manifestations of grief
  agent.needs.hunger -= 20; // loss of appetite
  agent.needs.energy -= 30; // exhaustion from grief
  agent.needs.sleep += 40;  // grief is exhausting

  // Change behavior priorities
  agent.behaviorModifiers.grief = {
    seeksSolitude: griefIntensity > 70,
    avoidsJoyfulActivities: true,
    needsComfort: true,
    duration: Math.floor(griefIntensity / 10) // days
  };

  // Impact on other relationships
  for (const otherBond of getBondsForAgent(agent.id)) {
    if (otherBond.animalId === animal.id) continue;

    // May become more protective
    otherBond.emotionalState.worry += 20;
    otherBond.emotionalState.attachment += 10;

    // Or may emotionally distance to protect self
    if (griefIntensity > 80) {
      otherBond.emotionalState.attachment -= 5;
    }
  }

  // Community support
  emitEvent('bonded_animal_death', {
    agentId: agent.id,
    animalName: animal.name,
    bondLevel: bond.bondLevel,
    needsSupport: griefIntensity > 60
  });
}
```

### Grief Recovery

```typescript
function updateGriefRecovery(agent: Agent, grief: GriefComponent): void {
  const ticksSinceLoss = getCurrentTick() - grief.startTime;
  const daysSinceLoss = ticksSinceLoss / TICKS_PER_DAY;

  // Progress through grief stages
  const expectedStage = Math.min(
    grief.stages.length - 1,
    Math.floor(daysSinceLoss / 3) // new stage every 3 days
  );

  if (expectedStage > grief.currentStageIndex) {
    grief.currentStageIndex = expectedStage;
    const newStage = grief.stages[expectedStage];

    createMemory(agent, {
      type: 'reflection',
      content: `Grief over ${grief.lostEntityName}: entering ${newStage} stage`,
      emotionalValence: newStage === 'acceptance' ? 0.3 : -0.5,
      tags: ['grief', 'healing']
    });
  }

  // Recovery accelerators
  let recoveryBoost = 0;

  // Being with other bonded animals helps
  const otherBonds = getBondsForAgent(agent.id).filter(b => b.bondLevel > 30);
  recoveryBoost += otherBonds.length * 0.1;

  // Friends offering comfort
  const recentComfort = agent.interactions.filter(i =>
    i.type === 'comfort' &&
    i.timestamp > getCurrentTick() - TICKS_PER_DAY
  ).length;
  recoveryBoost += recentComfort * 0.15;

  // Time heals
  const baseRecovery = Math.min(1.0, daysSinceLoss / 30); // 30 days to full recovery

  grief.recoveryProgress = Math.min(1.0, baseRecovery + recoveryBoost);

  // Reduce grief intensity
  const currentGrief = grief.griefIntensity * (1 - grief.recoveryProgress);

  // Mood gradually improves
  if (grief.recoveryProgress > 0.7) {
    applyMoodChange(agent, {
      delta: 5,
      factor: 'healing',
      description: `Healing from loss of ${grief.lostEntityName}`
    });
  }

  // Reaching acceptance
  if (grief.currentStageIndex === grief.stages.length - 1 && grief.recoveryProgress > 0.8) {
    createMemory(agent, {
      type: 'meaningful',
      content: `I'll always cherish the time I had with ${grief.lostEntityName}`,
      emotionalValence: 0.6,
      emotionalIntensity: 0.7,
      tags: ['acceptance', 'healing', 'remembrance']
    });

    // Remove grief component
    removeComponent(agent, grief);

    // But memories remain
    createLastingMemory(agent, {
      type: 'treasured',
      content: `Memories of ${grief.lostEntityName}`,
      memories: grief.memories,
      emotionalResonance: 'bittersweet'
    });
  }
}
```

---

## Animal Communication & Understanding

### Reading Animal Signals

```typescript
interface AnimalSignal {
  type: 'need' | 'emotion' | 'intention' | 'communication';
  clarity: number; // 0-100, how obvious it is
  message: string;
  urgency: number; // 0-100
}

function detectAnimalSignals(
  agent: Agent,
  animal: Animal,
  bond: AnimalBondComponent
): AnimalSignal[] {
  const signals: AnimalSignal[] = [];

  // Understanding affects what agent can perceive
  const perceptionThreshold = 100 - bond.understanding;

  // Physical needs
  if (animal.needs.hunger > 70) {
    signals.push({
      type: 'need',
      clarity: 90,
      message: `${animal.name} is hungry`,
      urgency: animal.needs.hunger
    });
  }

  if (animal.stress > 60) {
    const clarity = Math.max(20, 100 - perceptionThreshold);
    signals.push({
      type: 'emotion',
      clarity,
      message: `${animal.name} seems stressed`,
      urgency: animal.stress
    });
  }

  // Emotional signals (harder to read)
  if (animal.mood < -30) {
    const clarity = Math.max(10, 80 - perceptionThreshold);
    if (clarity > 30) {
      signals.push({
        type: 'emotion',
        clarity,
        message: bond.understanding > 60
          ? `${animal.name} is sad and needs comfort`
          : `${animal.name} seems upset`,
        urgency: 50
      });
    }
  }

  if (animal.mood > 50 && bond.bondLevel > 40) {
    signals.push({
      type: 'emotion',
      clarity: 85,
      message: `${animal.name} is happy to see you`,
      urgency: 0
    });
  }

  // Health issues
  if (animal.health < 60) {
    const clarity = Math.max(40, 100 - (perceptionThreshold / 2));
    signals.push({
      type: 'need',
      clarity,
      message: bond.understanding > 70
        ? `${animal.name} is in pain`
        : `${animal.name} doesn't seem well`,
      urgency: 100 - animal.health
    });
  }

  // Desire to interact
  if (bond.bondLevel > 30 && animal.mood > 20) {
    const timeSinceInteraction = getCurrentTick() - bond.lastInteraction;
    if (timeSinceInteraction > TICKS_PER_DAY) {
      signals.push({
        type: 'communication',
        clarity: 70,
        message: `${animal.name} wants your attention`,
        urgency: Math.min(80, timeSinceInteraction / TICKS_PER_HOUR)
      });
    }
  }

  // Advanced: communicating intent (high understanding required)
  if (bond.understanding > 80) {
    // Animal tries to lead agent somewhere
    // Animal alerts to danger
    // Animal requests specific activity
    // These are emergent based on animal AI
  }

  return signals.filter(s => s.clarity > perceptionThreshold);
}
```

### Understanding Growth

```typescript
function improveUnderstanding(bond: AnimalBondComponent, interaction: Interaction): void {
  const animal = getAnimal(bond.animalId);

  // Each interaction teaches something
  let understandingGain = 1;

  // Observing reactions
  if (interaction.outcome === 'positive') {
    understandingGain += 2;
    // "They like when I do this"
  } else if (interaction.outcome === 'negative') {
    understandingGain += 3;
    // "They don't like this, I'll remember"
  }

  // Time spent together
  understandingGain += interaction.duration / 100;

  // Communication attempts
  if (interaction.type === 'talking_to' || interaction.type === 'training') {
    understandingGain += 2;
  }

  // Personality compatibility bonus
  const agent = getAgent(bond.agentId);
  if (agent.personality.conscientiousness > 70) {
    understandingGain *= 1.2; // attentive observers learn faster
  }

  // Animal expressiveness makes it easier
  understandingGain *= (animal.personality.expressiveness / 100);

  bond.understanding = Math.min(100, bond.understanding + understandingGain);

  // Milestones
  if (bond.understanding === 50 && !hasMilestone(bond, 'understanding_50')) {
    createMilestone(bond, {
      type: 'understanding_50',
      description: `Starting to really understand ${animal.name}`,
      impact: "Can read basic emotional states"
    });
  }

  if (bond.understanding === 80 && !hasMilestone(bond, 'understanding_80')) {
    createMilestone(bond, {
      type: 'understanding_80',
      description: `Deep connection with ${animal.name}`,
      impact: "Can sense needs and emotions clearly"
    });
  }

  if (bond.understanding === 100 && !hasMilestone(bond, 'perfect_understanding')) {
    createMilestone(bond, {
      type: 'perfect_understanding',
      description: `Perfect understanding with ${animal.name}`,
      impact: "Can communicate wordlessly"
    });

    // Huge mood boost
    applyMoodChange(agent, {
      delta: 40,
      factor: 'deep_bond',
      description: `Soul-deep connection with ${animal.name}`
    });
  }
}
```

---

## Working Animals & Partnership

### Work Bond Enhancement

```typescript
interface WorkPartnership {
  bondId: string;

  // Work compatibility
  workType: 'hauling' | 'plowing' | 'herding' | 'guarding' | 'hunting';
  skillLevel: number; // 0-100
  coordination: number; // how well they work together

  // Work history
  tasksCompleted: number;
  successRate: number;
  bestPerformances: Array<{
    task: string;
    timestamp: number;
    quality: number;
  }>;

  // Emotional rewards
  pride: number; // both feel proud of accomplishments
  trustFromWork: number; // work builds deep trust

  // State
  fatigueLevel: number;
  lastWorked: number;
}

function performWorkTogether(
  agent: Agent,
  animal: Animal,
  bond: AnimalBondComponent,
  task: WorkTask
): WorkResult {
  const partnership = getWorkPartnership(bond.id);

  // Calculate performance
  let performance = 50;

  // Bond quality affects work
  performance += (bond.trust / 5);
  performance += (bond.understanding / 4);
  performance += (bond.bondLevel / 5);

  // Skill affects work
  performance += partnership.skillLevel / 2;
  performance += partnership.coordination / 3;

  // Mood affects work
  if (agent.mood.currentMood > 50) performance += 10;
  if (animal.mood > 50) performance += 10;
  if (agent.mood.currentMood < 0) performance -= 15;
  if (animal.mood < 0) performance -= 15;

  // Fatigue penalty
  performance -= partnership.fatigueLevel / 2;
  performance -= animal.stamina / 100;

  const success = performance > 60;

  if (success) {
    // Great work session!
    partnership.tasksCompleted++;
    partnership.successRate =
      (partnership.successRate * 0.9) + (1.0 * 0.1);

    // Skill improvement
    partnership.skillLevel = Math.min(100, partnership.skillLevel + 2);
    partnership.coordination = Math.min(100, partnership.coordination + 3);

    // Bond strengthening through shared accomplishment
    bond.trust += 5;
    bond.respect += 4;
    bond.reliability += 6;

    // Emotional rewards
    partnership.pride += 10;

    // Mood boost from working well together
    applyMoodChange(agent, {
      delta: 15,
      factor: 'accomplishment',
      description: `${animal.name} and I worked perfectly together`
    });

    animal.mood += 20;
    animal.contentment += 15;

    // Memory of great teamwork
    if (performance > 90) {
      createSharedMemory(bond, {
        type: 'accomplishment',
        description: `Perfect teamwork on ${task.name}`,
        emotionalImpact: 1.0,
        significance: 'high'
      });
    }

    return {
      success: true,
      performance,
      taskQuality: performance / 100,
      bondGain: 10,
      message: getSuccessMessage(performance)
    };

  } else {
    // Struggled today
    partnership.successRate =
      (partnership.successRate * 0.9) + (0.0 * 0.1);

    // Minor mood penalty
    applyMoodChange(agent, {
      delta: -5,
      factor: 'frustration',
      description: `${animal.name} and I had trouble coordinating`
    });

    animal.mood -= 10;
    animal.stress += 15;

    return {
      success: false,
      performance,
      taskQuality: 0.3,
      bondGain: -2,
      message: getFailureMessage(performance, bond.understanding)
    };
  }
}

function getSuccessMessage(performance: number): string {
  if (performance > 90) return "We work as one";
  if (performance > 80) return "Excellent teamwork";
  if (performance > 70) return "Good coordination";
  return "Got the job done";
}

function getFailureMessage(performance: number, understanding: number): string {
  if (understanding < 40) return "We're still learning to work together";
  if (performance < 40) return "Just not in sync today";
  return "Something was off";
}
```

---

## Integration with Other Systems

### Mood System Integration

```typescript
function calculateAnimalBondMoodFactors(agent: Agent): MoodFactors {
  const bonds = getBondsForAgent(agent.id);

  return {
    // Daily joy from bonded companions
    companionship: bonds
      .filter(b => b.bondLevel > 30)
      .reduce((sum, b) => sum + (b.emotionalState.joy / 10), 0),

    // Pride in accomplishments
    pride: bonds
      .reduce((sum, b) => sum + (b.emotionalState.pride / 15), 0),

    // Worry drains mood
    worry: -bonds
      .reduce((sum, b) => sum + (b.emotionalState.worry / 12), 0),

    // Grief devastates mood
    grief: -bonds
      .reduce((sum, b) => sum + (b.emotionalState.grief / 5), 0),

    // Working partnerships provide purpose
    purpose: bonds
      .filter(b => hasWorkPartnership(b))
      .reduce((sum, b) => sum + 5, 0)
  };
}
```

### Memory System Integration

```typescript
function createBondingMemory(
  agent: Agent,
  animal: Animal,
  bond: AnimalBondComponent,
  event: BondEvent
): void {
  const memory = {
    type: event.type,
    timestamp: getCurrentTick(),
    participants: [agent.id, animal.id],

    // Rich contextual data
    context: {
      bondLevel: bond.bondLevel,
      location: agent.position,
      weather: getCurrentWeather(),
      timeOfDay: getTimeOfDay(),
      agentMood: agent.mood.currentMood,
      animalMood: animal.mood
    },

    // Emotional encoding
    emotionalValence: event.emotionalImpact,
    emotionalIntensity: Math.min(1.0, bond.attachment / 100),

    // Narrative content
    content: event.description,
    significance: calculateSignificance(event, bond),

    // Tags for retrieval
    tags: [
      'animal',
      'bonding',
      animal.species,
      animal.name,
      event.type,
      bond.bondType
    ],

    // Impact on future behavior
    learnings: event.learnings || []
  };

  addMemory(agent, memory);

  // Animals also remember (simpler)
  addAnimalMemory(animal, {
    type: 'interaction',
    agentId: agent.id,
    outcome: event.outcome,
    emotionalImpact: event.emotionalImpact
  });
}
```

### Reflection System Integration

```typescript
function bondingReflectionPrompts(agent: Agent): string[] {
  const bonds = getBondsForAgent(agent.id);
  const prompts: string[] = [];

  for (const bond of bonds) {
    const animal = getAnimal(bond.animalId);

    if (bond.bondLevel > 50) {
      prompts.push(
        `Reflect on your relationship with ${animal.name}`,
        `What does ${animal.name} mean to you?`,
        `How has ${animal.name} changed your life?`
      );
    }

    if (bond.emotionalState.worry > 60) {
      prompts.push(
        `You're worried about ${animal.name}. What can you do?`
      );
    }

    if (bond.bondHealth === 'declining') {
      prompts.push(
        `You haven't spent time with ${animal.name} lately. How do you feel about that?`
      );
    }

    if (hasWorkPartnership(bond)) {
      const partnership = getWorkPartnership(bond.id);
      if (partnership.pride > 70) {
        prompts.push(
          `Reflect on working with ${animal.name}`
        );
      }
    }
  }

  return prompts;
}
```

---

## Emergent Narratives

### Example Stories

**1. The Rescue Bond**
```
Day 1: Agent finds injured wild rabbit, low health
Day 2: Agent brings food daily, rabbit slowly trusts
Day 5: Rabbit accepts petting, bond forms
Day 10: Rabbit fully recovered, chooses to stay
Day 20: Rabbit alerts agent to danger, saves their life
Day 30: Inseparable companions, bond level 65
Memory: "I saved them, and they saved me"
```

**2. The Work Partner**
```
Year 1: Agent starts training ox for plowing
Month 2: Frustrating, ox is stubborn
Month 4: Breakthrough, ox responds to commands
Month 6: Working together smoothly
Year 2: Perfect coordination, high pride
Year 3: Can communicate intent wordlessly
Year 5: Ox too old to work, agent cares for them
Year 6: Ox dies peacefully, agent grieves deeply
Memory: "We built this farm together"
```

**3. The Unexpected Friend**
```
Week 1: Agent dislikes chickens, finds them annoying
Week 3: One chicken follows them everywhere
Week 4: Agent names chicken "Pest" (affectionate)
Month 2: Realizes Pest's personality, starts bonding
Month 4: Pest sits with agent when they're sad
Month 6: Agent's favorite companion
Year 1: Devastated when Pest dies to predator
Behavior change: Builds better defenses, more protective
Legacy: Names farm "Pest's Place"
```

**4. The Guardian**
```
Spring: Agent raises wolf pup from baby
Summer: Pup follows everywhere, deep bond forms
Fall: Wolf mature, protective instincts emerge
Winter: Wolf guards agent at night
Year 2: Wolf drives off bear attacking agent
Year 3: Agent trusts wolf completely, perfect understanding
Year 5: Wolf has pups, introduces them to agent
Year 8: Original wolf dies, pups carry on bond
Memory: "Three generations of trust"
```

**5. The Healer**
```
Agent struggling with depression (low mood for weeks)
Horse seems to sense sadness
Horse stays close, comforting presence
Agent starts spending time with horse daily
Quiet companionship, no demands
Mood slowly improves over time
Agent reflects: "They helped me heal without words"
Bond becomes therapeutic anchor
```

---

## LLM Integration

### Context for Decision Making

```typescript
function getBondingContext(agent: Agent): string {
  const bonds = getBondsForAgent(agent.id)
    .filter(b => b.bondLevel > 20)
    .sort((a, b) => b.bondLevel - a.bondLevel);

  if (bonds.length === 0) {
    return "No bonded animals currently.";
  }

  const contexts = bonds.map(bond => {
    const animal = getAnimal(bond.animalId);
    const signals = detectAnimalSignals(agent, animal, bond);

    let context = `${animal.name} (${animal.species}):
- Bond: ${BOND_LEVELS[Math.floor(bond.bondLevel / 10) * 10].name} (${bond.bondLevel}/100)
- Emotional state: joy ${bond.emotionalState.joy}, worry ${bond.emotionalState.worry}
- Last interaction: ${formatTimeSince(bond.lastInteraction)}`;

    if (signals.length > 0) {
      context += `\n- Signals: ${signals.map(s => s.message).join(', ')}`;
    }

    if (hasWorkPartnership(bond)) {
      const work = getWorkPartnership(bond.id);
      context += `\n- Work partner (${work.workType}), coordination ${work.coordination}/100`;
    }

    return context;
  }).join('\n\n');

  return `Bonded Animals:\n${contexts}`;
}
```

### Decision Prompts

```
You notice {animal.name} seems {emotional_state}.
Your bond level: {bondLevel}
Recent interactions: {recentInteractions}
Your mood: {agentMood}
Your energy: {agentEnergy}

Do you:
- Spend time comforting them
- Work on your tasks (may feel guilty)
- Play together to lift both spirits
- Ignore the signal (may damage bond)

Consider how this affects your relationship and mood.
```

```
{animal.name} is very sick.
You're deeply bonded (attachment: {attachment}).
Treating them will take all day and cost resources.
You have urgent work to do.

What matters more to you?
How do you feel about this choice?
```

```
You haven't spent time with {animal.name} in {days} days.
Bond health: {bondHealth}
You feel: {guiltLevel}

What do you do?
```

---

## Implementation Phases

### Phase 1: Core Bonding (Week 1)
- [ ] BondComponent with all emotional tracking
- [ ] AnimalPersonality system
- [ ] Bond formation and progression
- [ ] Basic bond activities (feeding, petting, playing)
- [ ] Daily mood impact from bonds

### Phase 2: Deep Emotions (Week 2)
- [ ] Grief system for bonded animal death
- [ ] Worry/concern for sick animals
- [ ] Pride from accomplishments
- [ ] Joy from bonding milestones
- [ ] Attachment anxiety (fear of loss)

### Phase 3: Communication (Week 3)
- [ ] Animal signal detection
- [ ] Understanding progression
- [ ] Reading emotional states
- [ ] Responding to needs
- [ ] Advanced communication at high bond levels

### Phase 4: Working Partners (Week 4)
- [ ] WorkPartnership system
- [ ] Training mechanics
- [ ] Work coordination and performance
- [ ] Skill progression
- [ ] Pride and accomplishment from teamwork

### Phase 5: Full Integration (Week 5+)
- [ ] Memory system hooks
- [ ] Reflection prompts for bonds
- [ ] LLM decision integration
- [ ] Emergent bond types
- [ ] Legacy and multi-generational bonds
- [ ] UI for bond visualization

---

## Balance & Tuning

### Bond Progression Pacing
- First bond should form quickly (within 2-3 days of regular interaction)
- Deep bonds (60+) should take weeks of dedicated time
- Perfect understanding (100) should be rare and special

### Mood Impact Scale
- Daily companionship: +10 to +20 mood
- Bonding milestone: +30 mood
- Animal death (strong bond): -60 to -80 mood, lasting 1-2 weeks
- Neglecting bond: -5 to -15 mood per day

### Time Investment
- Basic care: 5-10 minutes per day
- Active bonding: 20-30 minutes per day
- Work partnership: 1-2 hours per day
- Should feel meaningful but not overwhelming

### Risk vs Reward
- Strong bonds provide huge mood benefits
- But create vulnerability (loss is devastating)
- Agents should make genuine choices about attachment
- Some agents may avoid deep bonds after loss

---

## Conclusion

Animal bonding is the emotional heart of the animal system. It creates:

1. **Deep Emotional Investment** - Agents genuinely care about their animals
2. **Meaningful Choices** - Time, attention, and attachment decisions matter
3. **Emergent Stories** - Every bond is unique with its own narrative
4. **Emotional Peaks and Valleys** - Joy from bonding, devastation from loss
5. **Long-term Relationships** - Bonds that span years and generations
6. **Behavioral Motivation** - Agents make decisions based on bond health
7. **Therapeutic Value** - Animals can help agents through difficult times

The system should make players feel the weight of these relationships - the joy of a morning greeting from a beloved companion, the pride of working perfectly together, the worry when they're sick, and the profound grief when they're gone.

**Every bond should tell a story worth remembering.**
