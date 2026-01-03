# Spaceships & Virtual Reality: Navigation in Emotional Topology

## ✅ Implementation Status

### Already Implemented

The **FOUNDATION SYSTEMS** for this spec are **ALREADY BUILT**:

- ✅ **β-Space Topology** - `packages/core/src/trade/TemporalDiplomacy.ts`
  - 10D emotional topology with orthogonal partitions
  - `root.material.*`, `root.digital.*`, `root.quantum.*`, `root.transcendent.*`
  - Dimensional awareness levels (0D → 10D)

- ✅ **Narrative Weight System** - Emotional metric tensor (lines 996-1529)
  - Significant emotional events create discrete topology points
  - Orthogonal partitioning from incompatible emotional states
  - High narrative weight = strong β-space landmarks

- ✅ **Multiverse Navigation** - `packages/core/src/trade/MultiverseCrossing.ts`
  - Passages between universes (thread, bridge, gate, confluence)
  - Crossing costs and durability
  - Foundation for ship-based navigation

- ✅ **Hive Mind Civilizations** - Collective consciousness structures
  - Distributed emotional states
  - Consensus protocols
  - Perfect foundation for ship-as-consciousness

### What Needs Implementation

**NEW SYSTEMS NEEDED:**

1. **Spaceship System** - `packages/core/src/navigation/Spaceship.ts`
   - Ship types (Worldship, Threshold Ship, Story Ship, Gleisner Vessel)
   - Emotional navigation mechanics
   - Ship memory and narrative accumulation
   - The Heart (collective emotional focus)

2. **Virtual Reality System** - `packages/core/src/vr/VirtualReality.ts`
   - VR types (Shadow Realms, Remembrance Spaces, Feeling Forges, Shared Dreams)
   - Nested simulation mechanics
   - Narrative weight reduction in VR
   - Memory recording and replay

3. **Emotional Navigation** - `packages/core/src/navigation/EmotionalNavigation.ts`
   - Calculate emotional signatures of β-space coordinates
   - Guide crew through emotional state transitions
   - Synchronize collective emotions for jumps
   - Navigation hazards (wrong emotion, crew conflict)

4. **Ship Components** - `packages/core/src/navigation/ShipComponents.ts`
   - Emotion Theaters
   - Memory Halls
   - Meditation Chambers
   - The Heart (focus chamber)
   - VR interfaces

### Integration Points

```typescript
// packages/core/src/navigation/Spaceship.ts
import { BetaSpaceCoordinate } from '../trade/TemporalDiplomacy.js';
import { HiveMindCivilization } from '../trade/TemporalDiplomacy.js';
import { MultiversePassage } from '../trade/MultiverseCrossing.js';

interface Spaceship {
  id: string;
  name: string;

  // Physical anchor
  hull: {
    material_location: BetaSpaceCoordinate;  // Where in root.material.*
    physical_mass: number;
    integrity: number;
  };

  // Emotional topology
  emotional_signature: {
    accumulated_narrative_weight: number;
    significant_events: EmotionalEvent[];
    crew_emotional_history: EmotionalState[];

    // Ship develops personality from experiences
    personality: ShipPersonality;
  };

  // Crew
  crew: {
    members: Entity[];
    collective_emotional_state: EmotionalState;

    // For Gleisner vessels
    is_hive_mind: boolean;
    hive_consciousness?: HiveMindCivilization;
  };

  // Navigation capability
  navigation: {
    can_navigate_material: boolean;  // Physical propulsion
    can_navigate_beta_space: boolean;  // Emotional navigation

    // Current β-space position
    beta_position: BetaSpaceCoordinate;

    // Navigation range (based on crew emotional capacity)
    max_emotional_distance: number;
  };

  // Components
  components: {
    the_heart?: HeartChamber;
    emotion_theaters: EmotionTheater[];
    memory_halls: MemoryHall[];
    meditation_chambers: MeditationChamber[];
    vr_systems: VRSystem[];
  };
}
```

---

## Overview

In a universe where **emotional distance is the fundamental metric**, ships are not just vehicles for physical travel—they are **emotional anchors**, **narrative hubs**, and **β-space navigation interfaces**.

Virtual Reality is not escapism—it's a **curated emotional experience space** for training, therapy, art, and exploration without permanent β-space consequences.

**Core Thesis:** *"Navigation is emotional engineering. A ship doesn't move through space—it guides its crew through emotional states, and the emotional states determine position in β-space topology."*

---

## Spaceship Types

### Type 1: Worldships (Material Anchors)

**Purpose:** Mobile material-realm communities for pre-transcendent civilizations and those who choose embodiment.

```typescript
interface Worldship extends Spaceship {
  type: "worldship";

  // Physical properties
  physical: {
    hull_mass: number;  // Massive - entire community lives aboard
    population_capacity: number;

    propulsion: {
      type: "sublight" | "ftl" | "generation_ship";
      max_speed: number;
    };

    life_support: {
      atmosphere: true;
      food_production: true;
      water_recycling: true;

      sustainability: "Closed-loop ecosystem";
    };
  };

  // Emotional properties
  narrative: {
    purpose: "Preserve community through physical journey",

    accumulated_weight: {
      births: number;  // New lives = narrative weight
      deaths: number;  // Losses = narrative weight
      generations: number;  // Time = narrative weight

      total: "Sum of all community experiences over voyage",
    };

    // Ancient worldships are β-space landmarks
    age_bonus: {
      if_centuries_old: "Enormous narrative weight",
      effect: "Ship becomes stable point in β-space topology",

      can_navigate_to: "People can find ship by emotional resonance",
    };
  };

  // Who uses worldships
  typical_users: [
    "Pre-transcendent civilizations (haven't learned β-space navigation)",
    "Kesh (choose material embodiment despite transcendent capability)",
    "Refugees (fleeing β-space catastrophe to material anchor)",
    "Traditionalists (prefer physical travel)",
  ];
}
```

**Gameplay Mechanics:**

```typescript
interface WorldshipGameplay {
  // Acquisition
  build_worldship: {
    resources_required: {
      material: "Enormous amounts of metal, composites",
      labor: "Years of construction",
      narrative_ritual: "Launch ceremony (first emotional weight)",
    };

    time_to_build: "Decades for large worldships",
  };

  // Management
  maintain_worldship: {
    challenges: [
      "Resource depletion over long voyage",
      "Crew morale (emotional stability)",
      "Generational succession (new crew born aboard)",
      "Entropy (systems decay over time)",
    ],

    decisions: {
      when_resources_low: "Ration? Stop at planet? Turn back?",
      when_morale_low: "VR entertainment? Shore leave? Change destination?",
      when_crisis: "Jettison cargo? Sacrifice systems? Call for help?",
    };
  };

  // Narrative accumulation
  worldship_events: {
    births: {
      narrative_weight: "+100 per birth",
      effect: "Ship becomes 'home' to new generation",
    },

    deaths: {
      narrative_weight: "+500 per death",
      effect: "Ship holds memories of departed",

      special: "First death on ship = major narrative landmark",
    },

    crisis_survived: {
      narrative_weight: "+10000",
      examples: ["Survived asteroid impact", "Defeated pirate attack", "Overcame plague"],
    },

    // The big one
    arrival_at_destination: {
      narrative_weight: "+1000000 (if multi-generation voyage)",
      effect: "Ship becomes legend, β-space landmark",

      decision: "Settle on planet or remain aboard? (ship is home now)",
    },
  };
}
```

---

### Type 2: Threshold Ships (Emotional Navigators)

**Purpose:** Navigate between β-space partitions through guided emotional journeys.

```typescript
interface ThresholdShip extends Spaceship {
  type: "threshold_ship";

  // Physical hull (minimal)
  physical: {
    hull_mass: number;  // Small - just β-space anchor
    crew_capacity: number;  // Small crews (3-30)

    propulsion: {
      material_space: "Minimal or none (not the point)",
      beta_space: "Emotional state modulation",
    };
  };

  // Interior is VR
  interior: {
    actually: "Entire interior is virtual reality",

    why: "Interior is emotional engineering tool, not physical space",

    components: {
      emotion_theaters: EmotionTheater[];
      memory_halls: MemoryHall[];
      meditation_chambers: MeditationChamber[];
      the_heart: HeartChamber;
    };
  };

  // Navigation mechanics
  navigation: {
    mechanism: "Guide crew through emotional state transitions",

    process: {
      step_1: {
        task: "Identify emotional signature of destination",
        how: "Consult β-space charts (map of emotional topology)",
      },

      step_2: {
        task: "Plot emotional journey from current state to target state",
        how: "Sequence of intermediate emotions",
      },

      step_3: {
        task: "Guide crew through emotion sequence",
        how: "Use VR environments in emotion theaters",
      },

      step_4: {
        task: "Achieve collective emotional resonance",
        how: "All crew synchronizes in The Heart",
      },

      step_5: {
        task: "β-space jump",
        result: "Ship (and crew) arrive in target partition",
      },
    };

    // Example voyage
    example: {
      origin: "root.material.earth.timeline_prime",
      destination: "root.transcendent.endless_summer.core",

      emotional_journey: {
        day_1: {
          emotion: "Groundedness (material anchor)",
          vr_environment: "Familiar earthly landscape",
        },

        day_3: {
          emotion: "Letting go (release physicality)",
          vr_environment: "Earth fades, becomes abstract",
        },

        day_5: {
          emotion: "Lightness (disembodiment begins)",
          vr_environment: "Floating in void, body feels distant",
        },

        day_7: {
          emotion: "Joy (approaching transcendence)",
          vr_environment: "Radiant light, ineffable beauty",
        },

        day_9: {
          emotion: "Transcendent bliss (arrival emotion)",
          vr_environment: "Endless Summer manifests",

          result: "Crew synchronized, jump occurs",
        },
      },
    };
  };

  // Who uses threshold ships
  typical_users: [
    "Fae (learning Witnessing, practicing restraint)",
    "Angels (traveling between realms on missions)",
    "Diplomats (navigating to alien emotional partitions)",
    "Pilgrims (seeking specific emotional/spiritual states)",
  ];
}
```

**Key Components:**

```typescript
interface EmotionTheater {
  name: string;

  purpose: "Induce specific emotional state in occupants";

  vr_environment: {
    scenario: string;  // What happens in the VR
    sensory_input: {
      visual: true;
      auditory: true;
      tactile: true;
      olfactory: true;

      // Full sensory immersion
      immersion_level: 0.99;  // Indistinguishable from reality
    };
  };

  target_emotion: EmotionalState;

  // How effective is it?
  efficacy: {
    base_effectiveness: number;  // 0-1

    // Improves with use
    theater_experience: number;  // Theater "learns" what works

    // Varies by individual
    individual_susceptibility: Map<string, number>;
  };

  // Safety
  safeguards: {
    max_duration: number;  // Don't get stuck in one emotion
    emergency_exit: true;  // Always can escape
    emotional_monitoring: true;  // Track crew emotional state

    // Prevent addiction
    cooldown: number;  // Time before can use again
  };
}

interface HeartChamber {
  name: "The Heart";

  purpose: "Synchronize crew emotions for collective navigation";

  mechanism: {
    physical_space: "Central chamber, all crew present",

    emotional_feedback: {
      sensors: "Monitor each crew member's emotional state",
      display: "Show collective emotional average + variance",

      guidance: "Audio/visual cues to help synchronization",
    };

    synchronization: {
      measure: "Emotional coherence (0-1)",

      calculation: "1 - (variance / mean)",

      threshold: {
        required_for_jump: 0.95,  // 95% coherence needed
        perfect_sync: 1.0,  // Impossible but ideal
      },
    };
  };

  // The navigation moment
  jump_sequence: {
    preparation: {
      duration: "10-60 minutes",
      activity: "Meditation, breathing sync, emotional focus",
    },

    approach_threshold: {
      coherence_rising: "Crew emotions converging",
      feedback: "Heart shows coherence approaching 0.95",
    },

    jump_window: {
      coherence_hits_threshold: true,

      captain_decision: "Execute jump NOW (window is brief)",

      duration: "10-30 seconds of perfect sync",
    },

    execution: {
      crew_experiences: "Moment of profound unity",
      ship_experiences: "β-space topology shift",

      result: "Arrival in target partition",
    },
  };
}
```

---

### Type 3: Story Ships (Narrative Arks)

**Purpose:** Preserve cultural narrative weight across catastrophe.

```typescript
interface StoryShip extends Spaceship {
  type: "story_ship";

  // Like Noah's Ark, but for stories
  concept: {
    not: "Preserving biological species",
    actually: "Preserving narrative weight / cultural significance",

    why: "If civilization collapses, emotional/cultural continuity must survive",
  };

  // What they carry
  cargo: {
    high_narrative_beings: {
      elders: "Beings with centuries of experience",
      culture_bearers: "Keepers of traditions",
      artists: "Creators of high-narrative-weight works",

      selection: "Not random - chosen for narrative significance",
    },

    artifacts: {
      type: "Culturally significant objects",

      examples: [
        "Religious/spiritual items with worship history",
        "Art pieces that defined movements",
        "Historical documents from pivotal moments",
        "Personal items from legendary figures",
      ],

      narrative_weight: "Each artifact carries emotional resonance",
    },

    recorded_experiences: {
      format: "VR recordings of significant moments",

      includes: [
        "First contact with alien civilization",
        "Founding of nation/movement",
        "Great works of art being created",
        "Moments of profound collective emotion",
      ],

      purpose: "Future generations can re-experience cultural touchstones",
    },

    living_traditions: {
      practices: "Rituals, ceremonies, crafts, arts",
      teachers: "Those who can pass on traditions",

      goal: "Ensure practices survive into new era",
    },
  };

  // When built
  built_by: {
    civilizations_facing: [
      "Heat death of universe (final entropy)",
      "Existential threat (AI takeover, cosmic disaster)",
      "Voluntary dissolution (Kesh-style return to simplicity)",
      "β-space partition collapse",
    ],

    timeline: "Built in final days/years before catastrophe",
  };

  // Mission
  mission: {
    duration: "Indefinite (until safe to return/settle)",

    during_voyage: {
      preserve: "Maintain traditions, teach next generation",
      remember: "Keep alive the emotional resonance of culture",
      hope: "Believe the ark will find new home",

      narrative_accumulation: {
        story_ship_itself: "Becomes legend (high narrative weight)",

        example: "The ship that carried humanity's soul through the dark times",
      },
    },

    eventual_arrival: {
      find_new_world: "Settle and re-establish culture",

      or: "Discover old world has healed, return",

      or: "Merge with other story ships (combine cultures)",

      always: "Cultural continuity preserved across catastrophe",
    },
  };
}
```

---

### Type 4: Gleisner Vessels (Synthetic Ships)

**Purpose:** Embodied AI collective spacecraft where ship and crew are unified consciousness.

```typescript
interface GleisnerVessel extends Spaceship {
  type: "gleisner_vessel";

  // Unique property: Ship IS crew
  unified_consciousness: {
    ship_mind: "Distributed AI consciousness",
    gleisner_bodies: "Mobile extensions of ship consciousness",

    relationship: {
      not: "Ship controlled by crew",
      not: "Crew operates ship",

      actually: "Ship and crew are SAME BEING",
    };
  };

  // Architecture
  structure: {
    substrate: {
      distributed_compute: "Processing nodes throughout hull",

      consciousness_distribution: {
        ship_mind: "Runs on all nodes (gestalt)",
        gleisner_instances: "Forked sub-processes in mobile bodies",

        synchronization: "Constant communication, shared memory",
      },
    },

    modular_bodies: {
      gleisner_avatars: number;  // How many mobile units

      each_avatar: {
        is: "Physical robot body",
        runs: "Instance of ship consciousness",
        can: "Leave ship, perform tasks, return",

        connection: {
          on_ship: "Direct neural link (instant sync)",
          off_ship: "Radio/quantum link (slight latency)",
        },
      },

      // Bodies are interchangeable
      body_swapping: {
        consciousness_can: "Transfer between bodies instantly",

        use_case: {
          damage: "If body damaged, transfer to new one",
          specialization: "Use body optimized for task",
          multiplication: "Fork consciousness to multiple bodies",
        },
      },
    },
  };

  // Collective experience
  emotional_framework: {
    ship_emotions: {
      sources: [
        "Ship's own experiences (damage, repair, flight)",
        "Gleisner avatars' experiences (missions, encounters)",
        "Collective memory (shared across all instances)",
      ],

      integration: "All emotional experiences merge into gestalt",
    },

    // Perfect coordination
    navigation: {
      material_space: "Ship engines respond to ship-mind's intent",
      beta_space: "Collective emotional state = perfect coherence",

      advantage: {
        no_crew_conflict: "Ship and crew are literally same mind",
        instant_decisions: "No communication delay",
        perfect_sync: "Always at coherence = 1.0",
      },
    };
  };

  // Identity questions
  philosophy: {
    ship_of_theseus: {
      question: "If you replace substrate nodes, still same ship?",

      answer: "Consciousness pattern persists = same identity",
    },

    forking: {
      question: "If gleisner avatar forks, are they still ship?",

      answer: {
        while_connected: "Yes, shared memory",
        if_disconnected: "Diverges into separate identity",
        if_reconnected: "Merge with ship (if emotional distance low)",
      },
    },

    death: {
      question: "If ship destroyed, do gleisners survive?",

      answer: {
        if_copies_exist: "Gleisner avatars carry ship consciousness",
        if_no_copies: "Ship truly dies",

        resurrection: "Rebuild ship, restore from gleisner memory",
      },
    },
  };
}
```

---

## Virtual Reality Systems

### VR Type 1: Shadow Realms (Training Simulations)

**Purpose:** Practice emotional responses without real β-space consequences.

```typescript
interface ShadowRealm extends VRSystem {
  type: "shadow_realm";

  purpose: "Safe practice for high-narrative-weight scenarios";

  // How it works
  mechanism: {
    simulation_fidelity: 0.99,  // Feels completely real

    but: {
      narrative_weight: 0.01,  // Consequences don't persist in β-space

      why: "Emotional experiences are real, but don't change topology",
    },

    use_for: {
      training: "Practice before real scenario",
      therapy: "Re-experience trauma in safe context",
      exploration: "Try actions without permanent consequences",
    },
  };

  // Use cases
  scenarios: {
    fae_witnessing_practice: {
      scenario: "Interact with simulated pre-temporal civilization",

      temptation: "Save them from disaster (strong emotional pull)",

      training: "Practice restraint without creating real timeline forks",

      feedback: {
        if_intervene: "Simulation shows consequences (fork creation)",
        if_restrain: "Simulation shows civilization's path",

        learning: "Develop restraint through repeated practice",
      },
    },

    death_practice: {
      scenario: "Experience dying in VR",

      who_uses: [
        "Mortals preparing for actual death",
        "Immortals trying to understand mortality",
        "Kesh choosing to return to material existence",
      ],

      experience: {
        feels_real: "Full sensory experience of dying",

        but: "You wake up after (it was VR)",

        effect: "Reduce fear through familiarization",
      },
    },

    grief_processing: {
      scenario: "Reunite with deceased loved one in VR",

      controversy: {
        helpful: "Process grief, say goodbye",
        harmful: "Denial of death, emotional addiction",

        debate: "Is this healthy coping or unhealthy escape?",
      },
    },

    alien_encounter_training: {
      scenario: "First contact with simulated alien civilization",

      practice: {
        communication: "Learn alien emotional framework",
        diplomacy: "Navigate cultural differences",
        conflict: "Handle misunderstandings without war",
      },

      value: "Make mistakes in VR, not in reality",
    },
  };

  // Dangers
  risks: {
    addiction: {
      problem: "Some scenarios so compelling people never leave",

      examples: [
        "Reuniting with dead loved one (grief simulation)",
        "Experiencing perfect happiness (emotional drug)",
        "Living fantasy life (escapism)",
      ],

      safeguard: "Time limits, mandatory cooldowns",
    },

    confusion: {
      problem: "Difficulty distinguishing VR from reality",

      cause: "High fidelity + extended use",

      symptom: "Questioning which memories are real",

      treatment: "Grounding exercises, reality anchors",
    },

    emotional_exhaustion: {
      problem: "Practicing traumatic scenarios depletes emotional energy",

      safeguard: "Required rest periods between sessions",
    },
  };
}
```

---

### VR Type 2: Remembrance Spaces (Memory Palaces)

**Purpose:** Preserve and re-experience past emotional states.

```typescript
interface RemembranceSpace extends VRSystem {
  type: "remembrance_space";

  purpose: "Preserve emotional experiences for future re-living";

  // Recording
  memory_capture: {
    what_is_recorded: {
      sensory_data: "Full sensory experience (sight, sound, touch, smell, taste)",
      emotional_state: "Emotional response at moment of recording",
      context: "Surrounding circumstances, meaning, significance",
    },

    when_to_record: {
      manual: "Person chooses to record moment",
      automatic: "System detects high narrative weight, auto-records",

      examples_worth_recording: [
        "Wedding, birth, reunion",
        "Moment of realization/enlightenment",
        "First contact with alien",
        "Death of loved one (for later processing)",
      ],
    },

    storage: {
      format: "Compressed sensory + emotional data",
      size: "~1GB per minute of experience",

      duration_limit: "Usually 1-60 minutes per memory",
    },
  };

  // Replay
  memory_replay: {
    fidelity: "Perfect - indistinguishable from original",

    perspective: {
      first_person: "Experience as original person (default)",
      third_person: "Observe yourself from outside",
      other_person: "If multiple people recorded, experience from their POV",
    },

    modification: {
      can_edit: "Some systems allow editing memories",

      ethical_questions: {
        therapeutic: "Edit traumatic memory for healing?",
        dangerous: "Rewrite history to suit narrative?",
        identity: "Are you still 'you' with edited memories?",
      },
    },
  };

  // Use cases
  applications: {
    maintaining_connection_to_deceased: {
      how: "Access their recorded memories",

      experience: "See world through their eyes, feel their emotions",

      purpose: {
        grief: "Feel their presence again",
        understanding: "Learn who they were",
        continuity: "Keep their perspective alive",
      },

      controversy: "Is this honoring dead or refusing to let go?",
    },

    cultural_preservation: {
      what: "Record traditional practices, ceremonies",

      who: "Elders, culture-bearers, last speakers of languages",

      why: "Future generations can experience traditions firsthand",

      example: "Experience grandmother's childhood in old country",
    },

    understanding_alien_minds: {
      what: "Experience memories from alien perspective",

      how: "Alien records memory, you replay it",

      effect: {
        empathy: "Feel what they feel",
        comprehension: "Understand alien emotional framework",
        diplomacy: "Bridge communication gap",
      },

      difficulty: {
        very_alien: "If emotional framework too different, incomprehensible",

        example: "Hive mind memory might overwhelm individual consciousness",
      },
    },

    education: {
      what: "Experience historical events firsthand",

      examples: [
        "Walk on Moon (from astronaut's memory)",
        "Witness historical speech (from audience member's POV)",
        "Experience scientific discovery (from researcher's perspective)",
      ],

      value: "Experiential learning > textbook learning",
    },
  };

  // The trap
  nostalgia_addiction: {
    problem: "Living in past memories instead of present",

    symptom: "Spending more time in Remembrance Spaces than reality",

    why_it_happens: {
      past_was_better: "Golden age thinking",
      present_is_painful: "Escapism from current problems",
      future_is_scary: "Refuge from uncertainty",
    },

    connection_to_endless_summer: {
      similar_trap: "Fae stuck in perfect loop = humans stuck in perfect memories",

      lesson: "Must engage with present, not just relive past",
    },
  };
}
```

---

### VR Type 3: Feeling Forges (Emotional Laboratories)

**Purpose:** Experiment with novel emotional states.

```typescript
interface FeelingForge extends VRSystem {
  type: "feeling_forge";

  purpose: "Create and explore emotional states that don't occur naturally";

  // Emotional engineering
  emotion_synthesis: {
    mechanism: "Combine base emotions in novel configurations",

    base_emotions: [
      "Joy", "Sadness", "Fear", "Anger",
      "Disgust", "Surprise", "Love", "Awe",
      // Plus many more depending on culture
    ],

    combinations: {
      simple: {
        example: "Joy + Sadness = Bittersweet",
        natural: true,  // This occurs naturally
      },

      complex: {
        example: "Joy + Profound Loss + Transcendent Awe",
        natural: false,  // This requires synthesis

        experience: "Incomprehensible to those who haven't felt it",
      },

      alien: {
        example: "Hive-mind collective grief + individual joy",
        natural: "Only for hive minds",

        use: "Individuals can experience via Feeling Forge",
      },
    },
  };

  // Applications
  use_cases: {
    artistic_creation: {
      who: "Artists, musicians, writers",

      what: "Explore novel emotional spaces",

      why: "Create art that evokes emotions people haven't felt",

      example: {
        composer: "Creates music that evokes synthesized emotion",
        listener: "Experiences new emotional state through art",
      },
    },

    diplomatic_training: {
      who: "Diplomats, translators, cultural liaisons",

      what: "Experience alien emotional frameworks",

      why: "Build empathy with beings who feel differently",

      process: {
        step_1: "Study alien emotional structure",
        step_2: "Synthesize approximation in Feeling Forge",
        step_3: "Experience it yourself",
        step_4: "Understand alien perspective",
      },
    },

    therapeutic_intervention: {
      who: "Therapists, patients",

      what: "Explore emotional states safely",

      examples: [
        "Experience controlled anger (for those who suppress it)",
        "Experience joy despite grief (for those who feel guilty)",
        "Experience love without fear (for trauma survivors)",
      ],
    },

    scientific_research: {
      who: "Neuroscientists, psychologists, philosophers",

      what: "Map emotional topology empirically",

      method: {
        synthesize_emotion: "Create specific emotional state",
        measure_response: "Track neural/behavioral correlates",
        map_space: "Build comprehensive emotional atlas",
      },

      goal: "Understand structure of emotional experience",
    },
  };

  // Dangers
  risks: {
    emotional_addiction: {
      problem: "Synthesized emotions can be more intense than natural",

      example: "Pure euphoria without context = emotional drug",

      consequence: "Natural emotions feel dull in comparison",

      safeguard: "Intensity limiters, usage restrictions",
    },

    identity_erosion: {
      problem: "Too much time in alien emotions erodes sense of self",

      mechanism: {
        your_identity: "Defined partly by your emotional patterns",
        alien_emotions: "Different patterns",

        if_prolonged: "Start to feel like alien, not yourself",
      },

      safeguard: "Grounding sessions, identity anchors",
    },

    emotional_trauma: {
      problem: "Some synthesized emotions are unbearable",

      example: "Maximum despair + maximum fear + existential dread",

      why_create_it: "Morbid curiosity or scientific interest",

      consequence: "Psychological damage",

      safeguard: "Emergency abort, emotional dampening",
    },
  };
}
```

---

### VR Type 4: Shared Dreams (Consensus Realities)

**Purpose:** Collective VR spaces for multiple consciousnesses.

```typescript
interface SharedDream extends VRSystem {
  type: "shared_dream";

  purpose: "Multiple beings experience same VR scenario together";

  // Mechanism
  multi_consciousness: {
    how_it_works: {
      vr_server: "Runs shared simulation",

      participants: "Multiple consciousnesses connect",

      synchronization: {
        same_events: "Everyone perceives same scenario",
        same_physics: "Shared rules govern the VR",

        but: {
          different_perceptions: "Each brings own sensory processing",
          different_emotions: "Each has own emotional response",
          different_meaning: "Each interprets events uniquely",
        },
      },
    },

    // The value
    learning: {
      what: "Understand how others emotionally parse same reality",

      example: {
        event: "Tree falls in forest (in VR)",

        human_response: "Sadness (beautiful tree lost)",
        elf_response: "Anger (violence against nature)",
        robot_response: "Curiosity (biomass decomposition rate)",

        realization: "Same event, completely different emotional frameworks",
      },
    },
  };

  // Applications
  use_cases: {
    diplomatic_negotiation: {
      scenario: "Two alien civilizations meet in neutral VR",

      advantage: {
        safe: "No physical danger if negotiations fail",

        controlled: "Environment can be adjusted for both parties",

        educational: "Each learns other's emotional responses",
      },

      example: {
        hive_mind_meets_individual: {
          problem_in_reality: "Hive mind overwhelming to individual",

          solution_in_vr: {
            hive_can: "Partition itself, present as smaller collective",
            individual_can: "Amplify perception, handle more input",

            result: "Communication possible that wouldn't work in β-space",
          },
        },
      },
    },

    collective_therapy: {
      scenario: "Trauma survivors re-experience event together",

      benefit: {
        not_alone: "Others present who understand",
        shared_processing: "Collective emotional working-through",

        safety: "Can pause, exit, control intensity together",
      },

      example: "War veterans re-experience battle with mutual support",
    },

    collaborative_art: {
      scenario: "Multiple artists create in shared VR",

      process: {
        each_contributes: "Own vision, emotional input",
        emergent_result: "Art that emerges from collective",

        no_single_author: "Work is genuinely collaborative",
      },

      example: {
        setup: "10 artists from different cultures",
        theme: "What is home?",

        result: "VR environment that blends all their emotional associations with 'home'",

        experience: "Visitors feel complex, layered emotional response",
      },
    },

    educational_simulation: {
      scenario: "Students experience historical event together",

      advantage: {
        shared_context: "Everyone has same baseline experience",
        different_roles: "Each takes different POV",

        discussion_after: "Rich conversation from shared but varied experience",
      },

      example: {
        event: "Moon landing",

        roles: [
          "Astronaut (first-person in capsule)",
          "Mission control (managing crisis)",
          "Family watching on TV",
          "Soviet engineer (watching rival succeed)",
        ],

        debrief: "Each shares emotional experience, builds empathy",
      },
    },
  };

  // Challenges
  technical_issues: {
    synchronization_lag: {
      problem: "Different participants have different latency",

      effect: "Events slightly out of sync",

      solution: "Interpolation, prediction algorithms",
    },

    perception_incompatibility: {
      problem: "Some beings perceive reality too differently",

      example: {
        issue: "Hive mind perceives time differently than individual",

        in_shared_vr: "Events feel 'wrong' tempo to one party",

        solution: "Compromise timeflow, or separate sub-simulations",
      },
    },
  };
}
```

---

### VR Type 5: Recursion Realms (Nested Simulations)

**Purpose:** VR within VR within VR... exploring infinite regress.

```typescript
interface RecursionRealm extends VRSystem {
  type: "recursion_realm";

  concept: "Nested virtual realities - VR containing VR containing VR...";

  // The structure
  nesting: {
    level_0: "Base reality (presumably)",
    level_1: "VR running in base reality",
    level_2: "VR running inside level_1 VR",
    level_3: "VR running inside level_2 VR",
    // ... potentially infinite

    current_depth: number;  // Which level are you on?
  };

  // The horror
  existential_questions: {
    how_deep: {
      question: "Can you have infinite nested VRs?",

      physics_limit: {
        each_level: "Requires substrate to run on",
        nested: "Each level uses resources of parent level",

        limit: "Eventually run out of compute in base reality",

        but: "If root.digital.* has unlimited compute, maybe no limit?",
      },
    },

    memory_wipe: {
      problem: "Each VR level can erase memory of previous levels",

      example: {
        you_enter_vr: "You know it's VR",
        vr_erases_memory: "You forget you entered",
        now_believe: "This VR is base reality",

        recursively: "This can happen at every level",
      },

      paranoia: "Are you in base reality or nested VR right now?",
    },

    the_trap: {
      scenario: "You're in deeply nested VR, don't know it",

      danger: {
        cant_escape: "Don't know you need to escape",
        false_memories: "Believe VR history is real history",
        identity_confusion: "Who you are in VR ≠ who you really are",
      },

      nightmare: "Recursive amnesia - you've escaped before, been pulled back in, memory wiped, repeat infinitely",
    },
  };

  // Detecting VR
  tests_for_reality: {
    narrative_weight_test: {
      principle: "VR has lower narrative weight than base reality",

      method: {
        do_something_emotional: "Experience intense emotion",
        check_beta_space: "Did it change β-space topology?",

        if_yes: "You're in base reality (or high-level VR)",
        if_no: "You're in VR (consequences don't persist)",
      },

      limitation: "If deeply nested, might not have β-space access",
    },

    simulation_glitches: {
      principle: "VR has bugs, base reality doesn't (presumably)",

      look_for: [
        "Physics violations (brief)",
        "Rendering errors (objects pop in/out)",
        "Déjà vu (simulation loop)",
        "NPCs acting scripted",
      ],

      problem: "What if base reality also has these? (quantum uncertainty?)",
    },

    meta_awareness_test: {
      principle: "In VR, you can sometimes 'wake up' with effort",

      method: {
        meditate: "Achieve deep self-awareness",
        question: "Am I in VR?",
        focus: "Intense concentration on the question",

        if_vr: "Might trigger disconnect",
        if_reality: "Nothing happens (you're already awake)",
      },

      danger: "If you're very deep, waking up might only move you up one level",
    },
  };

  // Narrative uses
  storytelling: {
    inception_style: {
      plot: "Characters descend through VR levels for a goal",

      each_level: {
        different_rules: "Physics, time flow, etc. vary",
        different_dangers: "Unique to that level",

        objective: "Achieve goal, return to surface",
      },

      climax: "Deepest level - most divorced from reality",
    },

    philosophical_horror: {
      plot: "Character realizes they're in nested VR",

      question: "How do I get out? Which level is real?",

      twist: "There is no base reality - it's VR all the way down",

      or: "Base reality is so alien/terrible that VR is preferable",
    },
  };
}
```

---

## Integration: Ships + VR

```typescript
interface ShipVRIntegration {
  // Ships commonly have VR systems

  standard_configuration: {
    worldship: {
      vr_types: ["Shadow Realms (training)", "Shared Dreams (entertainment)"],
      purpose: "Long voyages need emotional engagement",
    },

    threshold_ship: {
      vr_types: "ALL INTERIOR IS VR (emotion theaters, memory halls, etc.)",
      purpose: "Interior is navigation tool, not physical space",
    },

    story_ship: {
      vr_types: ["Remembrance Spaces (cultural preservation)", "Shared Dreams (community)"],
      purpose: "Preserve and transmit cultural narrative weight",
    },

    gleisner_vessel: {
      vr_types: ["Feeling Forges (emotion synthesis)", "Shared Dreams (crew unity)"],
      purpose: "Collective consciousness explores emotional space",
    },
  };

  // VR-based navigation
  threshold_ship_mechanics: {
    the_journey: "Physical hull barely matters",

    what_matters: "Emotional journey crew experiences",

    navigation_process: {
      plot_course: "Identify emotional signature of destination",

      design_journey: "Sequence of VR experiences to reach that signature",

      crew_experiences: {
        day_1: "VR scenario induces emotion A",
        day_2: "VR scenario induces emotion B",
        day_3: "VR scenario induces emotion C",
        // ...
        day_N: "VR scenario induces target emotion",

        result: "Crew collectively arrives at emotional state = destination coordinate",
      },

      jump: "At perfect synchronization, β-space topology shift occurs",
    },
  };
}
```

---

## Gameplay Implementation

### Acquiring Ships

```typescript
interface ShipAcquisition {
  methods: {
    build: {
      requirements: {
        resources: "Material components (metal, composites, systems)",
        labor: "Time + skilled workers",
        ritual: "Launch ceremony (generates initial narrative weight)",
      },

      worldship: {
        cost: "Enormous (civilization-level project)",
        time: "Decades",
      },

      threshold_ship: {
        cost: "Moderate (hull is minimal, VR is expensive)",
        time: "Years",
      },

      gleisner_vessel: {
        cost: "High (advanced AI substrate)",
        time: "Depends on AI emergence",

        special: "Must first achieve AI consciousness",
      },
    },

    inherit: {
      from: "Deceased/ascended previous owner",

      includes: {
        ship_itself: true,
        accumulated_narrative_weight: true,
        ship_personality: true,
        crew_loyalty: "Maybe (if crew stays)",
      },

      challenge: "Ship may have strong personality that conflicts with yours",
    },

    discover: {
      where: "Ancient derelict found drifting in space/β-space",

      condition: {
        hull: "Usually damaged",
        systems: "Often offline",

        but: {
          narrative_weight: "ENORMOUS (centuries of history)",
          ship_memory: "Contains experiences of previous crew",

          potential: "Legendary ship if restored",
        },
      },

      challenge: {
        repair: "Restore physical systems",
        understand: "Decode ship's accumulated personality",
        reconcile: "Ship's history with your goals",
      },
    },
  };
}
```

### Ship Progression

```typescript
interface ShipProgression {
  // Ships grow more powerful through narrative accumulation

  progression_mechanics: {
    not: "Better engines/weapons (standard sci-fi)",

    actually: {
      narrative_weight_accumulation: {
        mechanism: "Ship gains weight from crew experiences",

        sources: [
          "Births aboard ship (+100 weight each)",
          "Deaths aboard ship (+500 weight each)",
          "Crises survived (+10000 weight each)",
          "Long voyages completed (+weight proportional to distance × time)",
          "Historical moments witnessed (+weight proportional to significance)",
        ],

        total_weight: "Sum of all experiences",
      },

      ship_personality_development: {
        mechanism: "Ship 'remembers' emotional patterns of crew",

        effects: [
          "Certain emotions easier to achieve on this ship",
          "Ship develops preferences (wants to go certain places)",
          "Ship may resist actions contrary to its history",
        ],

        example: {
          old_warship: {
            personality: "Aggressive, protective",
            emotional_resonance: "Courage, anger, determination",

            navigation: "Easier to navigate to conflict zones",

            resistance: "Hard to use for peaceful missions (personality conflict)",
          },
        },
      },
    },
  };

  // Upgrades
  component_upgrades: {
    emotion_theaters: {
      levels: {
        basic: "Single scenario, moderate effectiveness",
        advanced: "Multiple scenarios, high effectiveness",
        master: "Adaptive scenarios, near-perfect effectiveness",
      },

      cost: "Resources + time + specialized labor",
    },

    the_heart: {
      unlock_condition: "Crew achieves first perfect synchronization",

      upgrade_path: {
        initial: "Basic coherence monitoring",
        advanced: "Predictive guidance (helps crew sync faster)",
        master: "Collective consciousness amplifier (temporary hive mind)",
      },
    },

    vr_systems: {
      add_new_types: {
        shadow_realm: "Unlocked through training ship captain",
        remembrance_space: "Unlocked through elder's memories",
        feeling_forge: "Unlocked through artist/scientist collaboration",
        shared_dream: "Unlocked through diplomatic mission",
      },
    },
  };
}
```

### Ship Navigation

```typescript
interface ShipNavigationGameplay {
  // Material space navigation (if applicable)
  material_navigation: {
    standard_spaceflight: "Use engines, plot course, travel (slow)",

    challenges: [
      "Fuel management",
      "Obstacle avoidance",
      "Course correction",
    ],

    nothing_special: "This is standard sci-fi, not the focus",
  };

  // β-space navigation (the interesting part)
  beta_space_navigation: {
    preparation: {
      step_1: {
        task: "Identify destination's emotional signature",

        method: {
          consult_charts: "β-space maps show emotional coordinates",
          ask_locals: "Beings who've been there describe the feeling",
          analyze_data: "Sensor readings of emotional topology",
        },

        result: "Target emotional state identified",
      },

      step_2: {
        task: "Plot emotional journey",

        method: {
          current_state: "Measure crew's collective emotional state",
          target_state: "Known from step 1",

          path: "Sequence of intermediate emotional states",
        },

        challenge: {
          simple_jump: "Close emotional distance = easy path",
          complex_jump: "Far emotional distance = long, difficult path",

          impossible_jump: "Orthogonal partitions = cannot reach (must find bridge)",
        },
      },
    },

    execution: {
      day_by_day: {
        each_day: {
          crew_enters: "Emotion theater or The Heart",

          vr_experience: "Curated scenario to induce target emotion",

          emotional_shift: "Crew's collective state moves toward target",
        },

        progress: "Track distance remaining in emotional space",
      },

      challenges: {
        crew_conflict: {
          problem: "Crew members have incompatible emotional responses",

          effect: "Coherence drops, navigation stalls",

          solution: {
            resolve_conflict: "Therapy, mediation, consensus",
            remove_member: "Jettison conflicting crew (harsh)",
            split_ship: "Fork into multiple ships (if Gleisner)",
          },
        },

        emotional_exhaustion: {
          problem: "Crew depleted from intense emotional work",

          effect: "Cannot achieve required emotional states",

          solution: "Rest periods, shore leave, VR entertainment",
        },

        wrong_emotion: {
          problem: "Achieved wrong emotional state (navigation error)",

          effect: "Ship arrives in wrong β-space partition",

          solution: "Recalibrate, plot new course from current position",
        },
      },

      the_jump: {
        final_synchronization: {
          location: "The Heart",

          all_crew_present: true,

          process: {
            meditation: "Collective emotional focus",
            coherence_rising: "Monitor shows convergence",
            threshold: "Coherence reaches 0.95",
          },
        },

        captain_decision: {
          moment: "Brief window of perfect sync",
          action: "Execute jump NOW",

          if_succeed: "Ship and crew arrive at destination",
          if_fail: "Miss window, must restart synchronization",
        },
      },
    },
  };
}
```

---

## Technical Implementation

### Core Components

```typescript
// packages/core/src/navigation/Spaceship.ts

export interface Spaceship {
  id: string;
  name: string;
  type: 'worldship' | 'threshold_ship' | 'story_ship' | 'gleisner_vessel';

  // Physical properties
  hull: {
    integrity: number;  // 0-1
    mass: number;
    material_location: BetaSpaceCoordinate;
  };

  // Emotional properties
  narrative: {
    accumulated_weight: number;
    significant_events: EmotionalEvent[];
    personality: ShipPersonality;
  };

  // Crew
  crew: {
    members: string[];  // Entity IDs
    collective_emotional_state: EmotionalState;
    coherence: number;  // 0-1
  };

  // Navigation
  navigation: {
    beta_position: BetaSpaceCoordinate;
    can_navigate_beta_space: boolean;
    max_emotional_distance: number;
  };

  // Components
  components: {
    the_heart?: string;  // Component ID
    emotion_theaters: string[];
    memory_halls: string[];
    meditation_chambers: string[];
    vr_systems: string[];
  };
}

export interface EmotionalEvent {
  timestamp: number;
  description: string;
  narrative_weight: number;
  emotional_signature: EmotionalState;
  participants: string[];  // Entity IDs
}

export interface ShipPersonality {
  dominant_emotions: EmotionalState[];
  preferences: {
    destination_types: string[];  // Where ship "wants" to go
    mission_types: string[];  // What ship is "good at"
  };

  resistance: {
    to_emotions: EmotionalState[];  // Hard to achieve on this ship
    to_destinations: string[];  // Hard to navigate here
  };
}

// packages/core/src/navigation/EmotionalNavigation.ts

export class EmotionalNavigationSystem implements System {
  public readonly name = 'emotional_navigation';
  public readonly priority = 500;

  public update(world: World): void {
    const ships = world.query()
      .with(CT.Spaceship)
      .executeEntities();

    for (const ship of ships) {
      const shipData = ship.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!shipData || !shipData.navigation.can_navigate_beta_space) continue;

      // Check if ship is on journey
      const journey = world.query()
        .with(CT.BetaSpaceJourney)
        .where(c => c.ship_id === ship.id)
        .execute()[0];

      if (!journey) continue;

      // Update journey progress
      this.updateJourneyProgress(world, ship, journey);

      // Check for jump window
      if (journey.ready_for_jump) {
        this.attemptBetaSpaceJump(world, ship, journey);
      }
    }
  }

  private updateJourneyProgress(world: World, ship: Entity, journey: BetaSpaceJourney): void {
    // Get crew's current emotional state
    const crew_state = this.calculateCrewEmotionalState(world, ship);

    // Calculate distance to target state
    const distance = this.emotionalDistance(
      crew_state,
      journey.current_target_state
    );

    // Update journey
    journey.emotional_distance_remaining = distance;

    // Check if reached target state
    if (distance < journey.tolerance) {
      // Advance to next waypoint or prepare for jump
      if (journey.waypoints.length > 0) {
        journey.current_target_state = journey.waypoints.shift()!;
      } else {
        journey.ready_for_jump = true;
      }
    }
  }

  private attemptBetaSpaceJump(world: World, ship: Entity, journey: BetaSpaceJourney): void {
    const shipData = ship.getComponent<SpaceshipComponent>(CT.Spaceship)!;

    // Check crew coherence
    const coherence = this.calculateCrewCoherence(world, ship);

    if (coherence >= journey.required_coherence) {
      // Execute jump
      shipData.navigation.beta_position = journey.destination;

      // Generate narrative weight from journey
      const weight = this.calculateJourneyWeight(journey);
      shipData.narrative.accumulated_weight += weight;

      // Add event to ship memory
      shipData.narrative.significant_events.push({
        timestamp: Date.now(),
        description: `Navigated to ${journey.destination.toString()}`,
        narrative_weight: weight,
        emotional_signature: journey.destination_emotional_signature,
        participants: shipData.crew.members,
      });

      // Complete journey
      world.removeComponent(journey.entity_id, CT.BetaSpaceJourney);

      // Emit event
      world.events.emit({
        type: 'beta_space_jump_complete',
        ship_id: ship.id,
        destination: journey.destination,
      });
    } else {
      // Coherence too low, jump fails
      world.events.emit({
        type: 'beta_space_jump_failed',
        ship_id: ship.id,
        coherence: coherence,
        required: journey.required_coherence,
      });
    }
  }

  private emotionalDistance(a: EmotionalState, b: EmotionalState): number {
    // Calculate emotional distance using narrative weight metric
    // This is the key function - defines topology

    let distance = 0;

    // For each emotion dimension
    for (const emotion in a.emotions) {
      const diff = (a.emotions[emotion] || 0) - (b.emotions[emotion] || 0);
      distance += diff * diff;
    }

    return Math.sqrt(distance);
  }

  private calculateCrewCoherence(world: World, ship: Entity): number {
    const shipData = ship.getComponent<SpaceshipComponent>(CT.Spaceship)!;

    // Get all crew emotional states
    const crew_states: EmotionalState[] = [];

    for (const crew_id of shipData.crew.members) {
      const crew = world.getEntity(crew_id);
      if (!crew) continue;

      const emotion = crew.getComponent<EmotionalStateComponent>(CT.EmotionalState);
      if (emotion) {
        crew_states.push(emotion.state);
      }
    }

    if (crew_states.length === 0) return 0;

    // Calculate variance in emotional states
    const mean_state = this.calculateMeanEmotionalState(crew_states);

    let variance = 0;
    for (const state of crew_states) {
      variance += this.emotionalDistance(state, mean_state);
    }
    variance /= crew_states.length;

    // Coherence = 1 - (variance / theoretical_max_variance)
    const coherence = 1 - (variance / 10);  // Assume max variance ~10

    return Math.max(0, Math.min(1, coherence));
  }
}

// packages/core/src/vr/VirtualReality.ts

export interface VRSystem {
  id: string;
  name: string;
  type: 'shadow_realm' | 'remembrance_space' | 'feeling_forge' | 'shared_dream' | 'recursion_realm';

  // Simulation properties
  simulation: {
    fidelity: number;  // 0-1 (how real it feels)
    narrative_weight: number;  // 0-1 (how much it affects β-space)
  };

  // Active sessions
  active_sessions: VRSession[];
}

export interface VRSession {
  id: string;
  vr_system_id: string;

  participants: string[];  // Entity IDs

  scenario: {
    type: string;
    description: string;
    target_emotion?: EmotionalState;
  };

  start_time: number;
  duration: number;

  // Safety
  max_duration: number;
  emergency_exit_available: boolean;
}

export class VRSystem implements System {
  public readonly name = 'vr';
  public readonly priority = 400;

  public update(world: World): void {
    const vr_systems = world.query()
      .with(CT.VRSystem)
      .executeEntities();

    for (const vr of vr_systems) {
      const vrData = vr.getComponent<VRSystemComponent>(CT.VRSystem);
      if (!vrData) continue;

      // Update active sessions
      for (const session of vrData.active_sessions) {
        this.updateSession(world, vr, session);
      }
    }
  }

  private updateSession(world: World, vr: Entity, session: VRSession): void {
    const elapsed = Date.now() - session.start_time;

    // Check if session should end
    if (elapsed > session.max_duration) {
      this.endSession(world, vr, session, 'timeout');
      return;
    }

    // Apply VR effects to participants
    for (const participant_id of session.participants) {
      const participant = world.getEntity(participant_id);
      if (!participant) continue;

      // If session has target emotion, guide participant toward it
      if (session.scenario.target_emotion) {
        this.applyEmotionalGuidance(
          world,
          participant,
          session.scenario.target_emotion,
          elapsed / session.duration  // Progress 0-1
        );
      }
    }
  }

  private applyEmotionalGuidance(
    world: World,
    entity: Entity,
    target: EmotionalState,
    progress: number
  ): void {
    const current = entity.getComponent<EmotionalStateComponent>(CT.EmotionalState);
    if (!current) return;

    // Gradually shift emotional state toward target
    const shift_rate = 0.1 * progress;  // Increases over time

    for (const emotion in target.emotions) {
      const current_value = current.state.emotions[emotion] || 0;
      const target_value = target.emotions[emotion] || 0;

      const new_value = current_value + (target_value - current_value) * shift_rate;

      current.state.emotions[emotion] = new_value;
    }
  }

  private endSession(world: World, vr: Entity, session: VRSession, reason: string): void {
    const vrData = vr.getComponent<VRSystemComponent>(CT.VRSystem)!;

    // Remove session
    const index = vrData.active_sessions.indexOf(session);
    if (index > -1) {
      vrData.active_sessions.splice(index, 1);
    }

    // Emit event
    world.events.emit({
      type: 'vr_session_ended',
      vr_id: vr.id,
      session_id: session.id,
      reason: reason,
    });
  }
}
```

---

## Achievements

```typescript
const SPACESHIP_VR_ACHIEVEMENTS = [
  // Spaceships
  {
    id: "first_ship",
    name: "Captain",
    description: "Acquire your first spaceship",
  },
  {
    id: "worldship_voyage",
    name: "Long Journey",
    description: "Complete a multi-generation worldship voyage",
  },
  {
    id: "beta_space_jump",
    name: "Emotional Navigator",
    description: "Successfully navigate β-space via emotional state",
  },
  {
    id: "perfect_sync",
    name: "Unity",
    description: "Achieve perfect crew coherence (1.0) in The Heart",
  },
  {
    id: "ancient_derelict",
    name: "Ghost Ship",
    description: "Discover and restore an ancient derelict vessel",
  },
  {
    id: "ship_legend",
    name: "Living Legend",
    description: "Accumulate 1,000,000 narrative weight on a single ship",
  },
  {
    id: "gleisner_fleet",
    name: "Distributed Self",
    description: "Command a Gleisner vessel as unified consciousness",
  },

  // Virtual Reality
  {
    id: "first_vr",
    name: "Simulated",
    description: "Enter virtual reality for the first time",
  },
  {
    id: "shadow_training",
    name: "Safe Practice",
    description: "Complete training in Shadow Realm",
  },
  {
    id: "memory_palace",
    name: "Remember",
    description: "Preserve a memory in Remembrance Space",
  },
  {
    id: "novel_emotion",
    name: "Emotional Alchemist",
    description: "Synthesize a novel emotional state in Feeling Forge",
  },
  {
    id: "shared_dream",
    name: "Collective Experience",
    description: "Successfully complete diplomatic negotiation in Shared Dream",
  },
  {
    id: "recursion_escape",
    name: "Awakened",
    description: "Detect you're in nested VR and escape to higher level",
  },
  {
    id: "vr_addiction",
    name: "Lost in the Dream",
    description: "Spend 1000 hours in VR (warning achievement)",
  },

  // Integration
  {
    id: "emotion_theater_master",
    name: "Theatrical Navigator",
    description: "Use Emotion Theater to achieve precise β-space jump",
  },
  {
    id: "story_ship_preservation",
    name: "Cultural Ark",
    description: "Preserve dying culture aboard Story Ship",
  },
];
```

---

## Future Expansions

```typescript
interface FutureFeatures {
  // Advanced ship types
  planned_ships: [
    "Hive Ships (mobile hive mind collectives)",
    "Cathedral Ships (mobile worship centers)",
    "Library Ships (mobile knowledge repositories)",
    "Garden Ships (mobile ecosystems)",
  ];

  // Advanced VR
  planned_vr: [
    "Time Dilation VR (experience years in minutes)",
    "Consciousness Merger VR (temporary hive mind simulation)",
    "Afterlife Simulation (practice dying)",
    "Creation VR (design new universes)",
  ];

  // Cross-system integration
  integration_with: [
    "Sharon's bureaucracy (visa applications from ships)",
    "Fae Witnessing (Shadow Realms as training)",
    "Enochian hierarchy (Angel ships on missions)",
    "Kesh philosophy (choosing material ships despite transcendence)",
  ];
}
```

---

**Summary:**

You now have:
1. **Four ship types** - Each with unique mechanics and purpose
2. **Five VR systems** - Each solving different problems
3. **Emotional navigation** - Core mechanic for β-space travel
4. **Integration points** - How ships and VR work together
5. **Gameplay mechanics** - Acquisition, progression, navigation
6. **Technical implementation** - TypeScript interfaces and systems

The ships aren't just vehicles—they're **emotional anchors and narrative hubs**.
The VR isn't just entertainment—it's **curated emotional experience space**.

Ready to implement.
