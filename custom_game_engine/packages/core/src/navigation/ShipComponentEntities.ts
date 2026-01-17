/**
 * Ship Component Entities - Internal spaceship components
 *
 * These components are attached to entities that exist within a spaceship,
 * providing the internal infrastructure for emotional navigation.
 *
 * Components:
 * - EmotionTheater: Induces specific emotional states via VR
 * - MemoryHall: Preserves and replays emotional memories
 * - MeditationChamber: Facilitates emotional regulation
 * - HeartChamber: Synchronizes crew for β-space jumps (The Heart)
 *
 * Based on spaceships-and-vr-spec.md
 */

import type { Component } from '../ecs/Component.js';
import type { EmotionalSignature } from './SpaceshipComponent.js';

// ============================================================================
// Common Types
// ============================================================================

export interface ShipComponentBase {
  /** Parent spaceship entity ID */
  shipId: string;

  /** Location within ship (deck, section) */
  location?: {
    deck: number;
    section: string;
  };

  /** Current occupants */
  occupantIds: string[];

  /** Maximum capacity */
  maxOccupants: number;

  /** Component operational status */
  status: 'operational' | 'damaged' | 'offline' | 'in_use';

  /** Power consumption when active */
  powerConsumption: number;
}

// ============================================================================
// Emotion Theater Component
// ============================================================================

export type EmotionTheaterScenarioType =
  | 'joy_induction'
  | 'grief_processing'
  | 'fear_confrontation'
  | 'love_cultivation'
  | 'anger_release'
  | 'peace_meditation'
  | 'awe_experience'
  | 'custom';

export interface TheaterScenario {
  id: string;
  type: EmotionTheaterScenarioType;
  name: string;
  description: string;
  targetEmotion: EmotionalSignature;
  duration: number; // ticks
  vrEnvironment: string;
}

/**
 * Emotion Theater - VR space for inducing specific emotional states.
 * Used to guide crew through emotional state transitions for navigation.
 */
export interface EmotionTheaterComponent extends Component, ShipComponentBase {
  type: 'emotion_theater';

  name: string;

  /** Available scenarios */
  scenarios: TheaterScenario[];

  /** Currently active scenario */
  activeScenario?: {
    scenarioId: string;
    startTick: number;
    participantIds: string[];
    progress: number; // 0-1
  };

  /** Theater effectiveness */
  efficacy: {
    /** Base effectiveness (0-1) */
    baseEffectiveness: number;

    /** Experience accumulated (improves effectiveness) */
    experiencePoints: number;

    /** Per-individual susceptibility modifiers */
    individualSusceptibility: Map<string, number>;
  };

  /** Safety systems */
  safeguards: {
    maxDuration: number; // ticks
    emergencyExitEnabled: boolean;
    emotionalMonitoring: boolean;
    cooldownPeriod: number; // ticks between uses
    lastUseTick: number;
  };

  /** Sensory immersion capabilities */
  sensoryCapabilities: {
    visual: boolean;
    auditory: boolean;
    tactile: boolean;
    olfactory: boolean;
    gustatory: boolean;
    immersionLevel: number; // 0-1
  };
}

// ============================================================================
// Memory Hall Component
// ============================================================================

export interface StoredMemory {
  id: string;
  recorderId: string; // Entity who recorded this
  recordedAt: number; // tick
  title: string;
  description: string;
  duration: number; // ticks
  emotionalSignature: EmotionalSignature;
  narrativeWeight: number;
  tags: string[];

  /** Whether this was auto-recorded due to high narrative weight */
  autoRecorded: boolean;
}

/**
 * Memory Hall - Preserves and replays emotional memories.
 * Used for cultural preservation, grief processing, and training.
 */
export interface MemoryHallComponent extends Component, ShipComponentBase {
  type: 'memory_hall';

  name: string;

  /** Stored memories */
  memories: StoredMemory[];

  /** Maximum memory storage (in ticks of recording) */
  storageCapacity: number;

  /** Current storage used */
  storageUsed: number;

  /** Currently replaying memory */
  activeReplay?: {
    memoryId: string;
    viewerIds: string[];
    startTick: number;
    perspective: 'first_person' | 'third_person' | 'observer';
    progress: number; // 0-1
  };

  /** Recording settings */
  recording: {
    autoRecordThreshold: number; // narrative weight threshold for auto-record
    currentlyRecording: boolean;
    recordingStartTick?: number;
    recordingSubjectId?: string;
  };

  /** Memory editing capabilities (ethically complex) */
  editingCapabilities: {
    canEdit: boolean;
    editLog: Array<{
      memoryId: string;
      editedAt: number;
      editType: 'trim' | 'enhance' | 'suppress' | 'merge';
      editorId: string;
    }>;
  };
}

// ============================================================================
// Meditation Chamber Component
// ============================================================================

export type MeditationTechnique =
  | 'breath_focus'
  | 'emotional_grounding'
  | 'perspective_shift'
  | 'collective_harmony'
  | 'trauma_release'
  | 'gratitude_cultivation';

/**
 * Meditation Chamber - Facilitates emotional regulation and balance.
 * Helps crew process emotions and prepare for navigation.
 */
export interface MeditationChamberComponent extends Component, ShipComponentBase {
  type: 'meditation_chamber';

  name: string;

  /** Available meditation techniques */
  availableTechniques: MeditationTechnique[];

  /** Active meditation session */
  activeSession?: {
    technique: MeditationTechnique;
    participantIds: string[];
    startTick: number;
    targetDuration: number;
    guidedBy?: string; // Entity ID of guide/leader
  };

  /** Environmental controls */
  environment: {
    lightingLevel: number; // 0-1
    ambientSound: string;
    temperature: number;
    aromaType?: string;
  };

  /** Session history for effectiveness tracking */
  sessionHistory: Array<{
    technique: MeditationTechnique;
    participantIds: string[];
    duration: number;
    completedAt: number;
    effectivenessRating: number; // 0-1
  }>;

  /** Biofeedback monitoring */
  biofeedback: {
    enabled: boolean;
    monitoringHeartRate: boolean;
    monitoringBreathing: boolean;
    monitoringBrainwaves: boolean;
  };
}

// ============================================================================
// Heart Chamber Component (The Heart)
// ============================================================================

export interface CrewEmotionalState {
  entityId: string;
  currentEmotion: EmotionalSignature;
  coherenceContribution: number; // 0-1
  synchronized: boolean;
}

/**
 * Heart Chamber (The Heart) - Central synchronization chamber for β-space navigation.
 * All crew must achieve emotional coherence here to execute jumps.
 */
export interface HeartChamberComponent extends Component, ShipComponentBase {
  type: 'heart_chamber';

  name: string;

  /** There can only be one Heart per ship */
  isPrimary: boolean;

  /** Emotional synchronization state */
  synchronization: {
    /** Current emotional coherence of crew (0-1) */
    coherence: number;

    /** Required coherence for jump (typically 0.95) */
    jumpThreshold: number;

    /** Perfect sync (1.0) - ideal but rarely achieved */
    perfectSyncAchieved: boolean;

    /** Time spent at/above threshold this session (ticks) */
    timeAtThreshold: number;

    /** Individual crew states */
    crewStates: CrewEmotionalState[];

    /** Target emotion for current navigation */
    targetEmotion?: EmotionalSignature;
  };

  /** Feedback systems */
  feedback: {
    /** Visual display of collective emotional state */
    displayType: 'holographic' | 'ambient_lighting' | 'symbolic';

    /** Audio cues for synchronization guidance */
    audioGuidanceEnabled: boolean;

    /** Haptic feedback for emotional alignment */
    hapticFeedbackEnabled: boolean;

    /** Real-time coherence display */
    coherenceDisplayEnabled: boolean;
  };

  /** Jump sequence state */
  jumpSequence: {
    state: 'idle' | 'preparing' | 'approaching_threshold' | 'jump_window' | 'executing' | 'cooldown';

    /** Preparation started at */
    preparationStartTick?: number;

    /** Jump window duration (ticks) */
    jumpWindowDuration: number;

    /** Jump window opened at */
    windowOpenedTick?: number;

    /** Cooldown after jump (ticks) */
    cooldownDuration: number;

    /** Last jump executed at */
    lastJumpTick?: number;
  };

  /** Statistics */
  statistics: {
    totalJumps: number;
    successfulJumps: number;
    failedJumps: number;
    averageCoherenceAtJump: number;
    fastestSyncTime: number; // ticks
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEmotionTheaterComponent(
  shipId: string,
  name: string = 'Emotion Theater'
): EmotionTheaterComponent {
  return {
    type: 'emotion_theater',
    version: 1,
    shipId,
    name,
    occupantIds: [],
    maxOccupants: 20,
    status: 'operational',
    powerConsumption: 50,
    scenarios: [
      {
        id: 'joy_basic',
        type: 'joy_induction',
        name: 'Garden of Delights',
        description: 'A beautiful garden filled with wonders',
        targetEmotion: { emotions: { joy: 0.8, peace: 0.5 } },
        duration: 200,
        vrEnvironment: 'paradise_garden',
      },
      {
        id: 'peace_basic',
        type: 'peace_meditation',
        name: 'Still Waters',
        description: 'A calm lake at sunset',
        targetEmotion: { emotions: { peace: 0.9, contentment: 0.6 } },
        duration: 300,
        vrEnvironment: 'mountain_lake',
      },
    ],
    efficacy: {
      baseEffectiveness: 0.7,
      experiencePoints: 0,
      individualSusceptibility: new Map(),
    },
    safeguards: {
      maxDuration: 1000,
      emergencyExitEnabled: true,
      emotionalMonitoring: true,
      cooldownPeriod: 100,
      lastUseTick: 0,
    },
    sensoryCapabilities: {
      visual: true,
      auditory: true,
      tactile: true,
      olfactory: true,
      gustatory: false,
      immersionLevel: 0.95,
    },
  };
}

export function createMemoryHallComponent(
  shipId: string,
  name: string = 'Memory Hall'
): MemoryHallComponent {
  return {
    type: 'memory_hall',
    version: 1,
    shipId,
    name,
    occupantIds: [],
    maxOccupants: 10,
    status: 'operational',
    powerConsumption: 30,
    memories: [],
    storageCapacity: 100000, // 100k ticks of recording
    storageUsed: 0,
    recording: {
      autoRecordThreshold: 1000, // narrative weight
      currentlyRecording: false,
    },
    editingCapabilities: {
      canEdit: false, // Disabled by default for ethical reasons
      editLog: [],
    },
  };
}

export function createMeditationChamberComponent(
  shipId: string,
  name: string = 'Meditation Chamber'
): MeditationChamberComponent {
  return {
    type: 'meditation_chamber',
    version: 1,
    shipId,
    name,
    occupantIds: [],
    maxOccupants: 8,
    status: 'operational',
    powerConsumption: 10,
    availableTechniques: [
      'breath_focus',
      'emotional_grounding',
      'collective_harmony',
    ],
    environment: {
      lightingLevel: 0.3,
      ambientSound: 'soft_tones',
      temperature: 22,
    },
    sessionHistory: [],
    biofeedback: {
      enabled: true,
      monitoringHeartRate: true,
      monitoringBreathing: true,
      monitoringBrainwaves: false,
    },
  };
}

export function createHeartChamberComponent(
  shipId: string,
  name: string = 'The Heart'
): HeartChamberComponent {
  return {
    type: 'heart_chamber',
    version: 1,
    shipId,
    name,
    occupantIds: [],
    maxOccupants: 50,
    status: 'operational',
    powerConsumption: 100,
    isPrimary: true,
    synchronization: {
      coherence: 0,
      jumpThreshold: 0.95,
      perfectSyncAchieved: false,
      timeAtThreshold: 0,
      crewStates: [],
    },
    feedback: {
      displayType: 'holographic',
      audioGuidanceEnabled: true,
      hapticFeedbackEnabled: true,
      coherenceDisplayEnabled: true,
    },
    jumpSequence: {
      state: 'idle',
      jumpWindowDuration: 30, // ~1.5 seconds at 20 TPS
      cooldownDuration: 200, // 10 seconds
    },
    statistics: {
      totalJumps: 0,
      successfulJumps: 0,
      failedJumps: 0,
      averageCoherenceAtJump: 0,
      fastestSyncTime: Infinity,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate emotional coherence from crew states.
 */
export function calculateCoherence(crewStates: CrewEmotionalState[]): number {
  if (crewStates.length === 0) return 0;
  if (crewStates.length === 1) return 1; // Solo = perfect coherence

  // Calculate average emotional signature
  const avgEmotion: Record<string, number> = {};
  let emotionCount = 0;

  for (const state of crewStates) {
    for (const [emotion, intensity] of Object.entries(state.currentEmotion.emotions)) {
      avgEmotion[emotion] = (avgEmotion[emotion] || 0) + intensity;
      emotionCount++;
    }
  }

  for (const emotion of Object.keys(avgEmotion)) {
    const val = avgEmotion[emotion];
    if (val !== undefined) {
      avgEmotion[emotion] = val / crewStates.length;
    }
  }

  // Calculate variance
  let totalVariance = 0;
  let varianceCount = 0;

  for (const state of crewStates) {
    for (const [emotion, intensity] of Object.entries(state.currentEmotion.emotions)) {
      const diff = intensity - (avgEmotion[emotion] || 0);
      totalVariance += diff * diff;
      varianceCount++;
    }
  }

  const avgVariance = varianceCount > 0 ? totalVariance / varianceCount : 0;

  // Coherence = 1 - variance (clamped to 0-1)
  return Math.max(0, Math.min(1, 1 - Math.sqrt(avgVariance)));
}

/**
 * Check if Heart is ready for jump.
 */
export function canExecuteJump(heart: HeartChamberComponent): {
  ready: boolean;
  reason?: string;
} {
  if (heart.status !== 'operational') {
    return { ready: false, reason: 'Heart chamber not operational' };
  }

  if (heart.jumpSequence.state === 'cooldown') {
    return { ready: false, reason: 'Jump on cooldown' };
  }

  if (heart.synchronization.coherence < heart.synchronization.jumpThreshold) {
    return {
      ready: false,
      reason: `Coherence ${(heart.synchronization.coherence * 100).toFixed(1)}% below ${(heart.synchronization.jumpThreshold * 100).toFixed(1)}% threshold`,
    };
  }

  if (heart.occupantIds.length === 0) {
    return { ready: false, reason: 'No crew in Heart chamber' };
  }

  return { ready: true };
}

/**
 * Update Heart synchronization state.
 */
export function updateHeartSynchronization(
  heart: HeartChamberComponent,
  tick: number
): void {
  // Calculate current coherence
  heart.synchronization.coherence = calculateCoherence(heart.synchronization.crewStates);

  // Update time at threshold
  if (heart.synchronization.coherence >= heart.synchronization.jumpThreshold) {
    heart.synchronization.timeAtThreshold++;

    // Check for perfect sync
    if (heart.synchronization.coherence >= 0.99) {
      heart.synchronization.perfectSyncAchieved = true;
    }

    // Update jump sequence state
    if (heart.jumpSequence.state === 'preparing') {
      heart.jumpSequence.state = 'approaching_threshold';
    } else if (heart.jumpSequence.state === 'approaching_threshold') {
      heart.jumpSequence.state = 'jump_window';
      heart.jumpSequence.windowOpenedTick = tick;
    }
  } else {
    // Lost coherence
    if (heart.jumpSequence.state === 'jump_window' || heart.jumpSequence.state === 'approaching_threshold') {
      heart.jumpSequence.state = 'preparing';
      heart.jumpSequence.windowOpenedTick = undefined;
    }
  }

  // Check jump window expiry
  if (
    heart.jumpSequence.state === 'jump_window' &&
    heart.jumpSequence.windowOpenedTick &&
    tick - heart.jumpSequence.windowOpenedTick > heart.jumpSequence.jumpWindowDuration
  ) {
    // Window expired without jump
    heart.jumpSequence.state = 'preparing';
    heart.jumpSequence.windowOpenedTick = undefined;
  }

  // Check cooldown expiry
  if (
    heart.jumpSequence.state === 'cooldown' &&
    heart.jumpSequence.lastJumpTick &&
    tick - heart.jumpSequence.lastJumpTick > heart.jumpSequence.cooldownDuration
  ) {
    heart.jumpSequence.state = 'idle';
  }
}
