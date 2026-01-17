/**
 * Neural Interface System
 *
 * Brain-Computer Interfaces, Virtual Reality, and Mind Upload technology.
 *
 * "The brain is the last frontier. We've mapped the genome, split the atom,
 * and landed on the moon. Now we're going inside our own heads to see
 * what all the fuss is about." - Dr. Helena Voss, Neural Cartography Lab
 *
 * "In my experience, people who want to upload their minds have never
 * tried to read the terms of service." - Anonymous Sysadmin
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';

// ============================================================================
// NEURAL INTERFACE TYPES
// ============================================================================

/**
 * Types of neural implants
 */
export type NeuralImplantType =
  | 'basic_bci'          // Simple thought-to-text
  | 'sensory_augment'    // Enhanced senses
  | 'memory_assist'      // Perfect recall
  | 'skill_chip'         // Instant skill download
  | 'full_dive'          // Complete VR immersion
  | 'hive_link'          // Group consciousness
  | 'upload_ready';      // Prepared for mind upload

/**
 * Neural implant status
 */
export type ImplantStatus = 'inactive' | 'calibrating' | 'active' | 'overloaded' | 'damaged';

/**
 * A neural implant installed in an agent
 */
export interface NeuralImplant {
  /** Unique implant ID */
  id: string;
  /** Implant type */
  type: NeuralImplantType;
  /** Model/manufacturer name */
  model: string;
  /** Current status */
  status: ImplantStatus;
  /** Bandwidth in thoughts per second */
  bandwidth: number;
  /** Processing power */
  processingPower: number;
  /** Integration level (0-1, how well merged with brain) */
  integrationLevel: number;
  /** Installation tick */
  installedAt: number;
  /** Firmware version */
  firmwareVersion: string;
  /** Whether jailbroken/modified */
  isModified: boolean;
  /** Side effects experienced */
  sideEffects: string[];
}

/**
 * VR environment types
 */
export type VREnvironmentType =
  | 'training_sim'       // Skill training
  | 'combat_sim'         // Combat practice
  | 'social_space'       // Virtual gathering
  | 'work_environment'   // Virtual office/workshop
  | 'recreation'         // Games/entertainment
  | 'therapy'            // Mental health treatment
  | 'memory_palace'      // Enhanced memory storage
  | 'afterlife_sim';     // Where uploaded minds live

/**
 * A VR session
 */
export interface VRSession {
  /** Session ID */
  id: string;
  /** Environment type */
  environment: VREnvironmentType;
  /** Environment name */
  environmentName: string;
  /** Participant agent IDs */
  participantIds: string[];
  /** Session start tick */
  startedAt: number;
  /** Session end tick (null if ongoing) */
  endedAt: number | null;
  /** Time dilation factor (2x = 2 hours feel like 1) */
  timeDilation: number;
  /** Immersion depth (0-1) */
  immersionLevel: number;
  /** Whether participants can feel pain */
  painEnabled: boolean;
  /** Session host ID */
  hostId: string;
}

/**
 * Mind upload status
 */
export type UploadStatus =
  | 'biological'         // Normal brain
  | 'scanning'           // Being scanned
  | 'uploading'          // Transfer in progress
  | 'uploaded'           // Fully digital
  | 'hybrid'             // Biological with digital backup
  | 'forked';            // Multiple copies exist

/**
 * An uploaded mind instance
 */
export interface UploadedMind {
  /** Mind ID */
  id: string;
  /** Original agent ID */
  originalAgentId: string;
  /** Original agent name */
  originalName: string;
  /** Upload tick */
  uploadedAt: number;
  /** Current hosting server/substrate */
  hostingSubstrate: string;
  /** Processing allocation (compute units) */
  processingAllocation: number;
  /** Subjective time multiplier */
  subjectiveTimeRate: number;
  /** Number of forks/copies */
  forkCount: number;
  /** Whether original biological is still alive */
  biologicalAlive: boolean;
  /** Existential crisis level (0-1) */
  existentialCrisisLevel: number;
  /** Accumulated runtime (subjective ticks) */
  subjectiveRuntime: number;
}

// ============================================================================
// NEURAL INTERFACE COMPONENT
// ============================================================================

/**
 * Component for agents with neural implants
 */
export interface NeuralInterfaceComponent {
  type: 'neural_interface';
  version: number;
  /** Installed implants */
  implants: NeuralImplant[];
  /** Total neural bandwidth */
  totalBandwidth: number;
  /** Current VR session ID (null if not in VR) */
  currentVRSession: string | null;
  /** Upload status */
  uploadStatus: UploadStatus;
  /** Uploaded mind data (if uploaded) */
  uploadedMind: UploadedMind | null;
  /** Skills downloaded via neural link */
  downloadedSkills: Map<string, number>; // skill -> proficiency
  /** Mental firewall strength (0-1) */
  firewallStrength: number;
  /** Hacking attempts survived */
  hackAttemptsSurvived: number;
  /** Thoughts logged today */
  thoughtsLogged: number;
  /** Privacy mode enabled */
  privacyMode: boolean;
}

// ============================================================================
// HUMOROUS CONTENT
// ============================================================================

/**
 * Neural implant model names (Pratchett/Adams/Gaiman style)
 */
export const IMPLANT_MODEL_NAMES: Record<NeuralImplantType, string[]> = {
  basic_bci: [
    'ThoughtStream Basic',
    'MindLink Lite (No Refunds)',
    'BrainBridge 1.0 (Now With Fewer Seizures)',
    'CerebroConnect Home Edition',
    'Neural Notepad (Warranty Void If Thoughts Are Weird)',
  ],
  sensory_augment: [
    'SensePlus Ultra',
    'The Third Eye (Patent Pending)',
    'OmniSense (Colors May Vary)',
    'HyperAware Pro (Warning: Reality May Seem Disappointing)',
    'Perception Enhancer (Side Effects: Noticing Everything)',
  ],
  memory_assist: [
    'TotalRecall Premium',
    'The Elephant (Never Forgets, Never Forgives)',
    'MemoryVault Secure',
    'Remember Everything (Including The Things You Wanted To Forget)',
    'PastPerfect 3000 (Nostalgia Included)',
  ],
  skill_chip: [
    'InstaLearn Pro',
    'SkillJack (I Know Kung Fu Edition)',
    'Knowledge Download Premium',
    'The Shortcut (Why Learn When You Can Install?)',
    'Talent Theft Device (Name Changed For Legal Reasons)',
  ],
  full_dive: [
    'DreamDive Complete',
    'The Matrix (We Got The Name First)',
    'FullSense Immersion Pod',
    'RealityOptional VR Suite',
    'Escape Hatch Premium (Reality Sold Separately)',
  ],
  hive_link: [
    'CollectiveMind Starter',
    'We Are One (Individual Results May Vary)',
    'Groupthink Pro (Resistance Is Futile)',
    'The Merger (Personal Space Not Included)',
    'BorgNet Community Edition',
  ],
  upload_ready: [
    'Immortality Prep Kit',
    'DigitalYou Transition System',
    'The Last Upgrade',
    'Consciousness Backup Pro (Read The EULA)',
    'Soul Scanner (Soul Not Technically Confirmed)',
  ],
};

/**
 * VR environment descriptions
 */
export const VR_ENVIRONMENT_DESCRIPTIONS: Record<VREnvironmentType, string[]> = {
  training_sim: [
    'A perfect recreation of every way you could possibly fail.',
    'Learn without consequences! (Consequences simulated separately.)',
    'Ten thousand hours of practice in ten minutes. Side effects pending.',
    'The training never ends. Neither does the loading screen.',
  ],
  combat_sim: [
    'Die a thousand deaths so you can live once more.',
    'Violence without consequences! (Therapy sold separately.)',
    'Feel the rush of battle without the inconvenience of actual wounds.',
    'Your enemies are simulated. Your trauma is real.',
  ],
  social_space: [
    'All the awkwardness of real parties, none of the free food.',
    'Meet people without having to smell them.',
    'Social anxiety: now available in virtual format.',
    'Where introverts pretend to be extroverts pretending to be introverts.',
  ],
  work_environment: [
    'The office, but you can mute your coworkers.',
    'Meetings that could have been emails, in stunning VR.',
    'Work from home taken to its logical conclusion.',
    'Your desk follows you into your dreams now.',
  ],
  recreation: [
    'Fun! Or a reasonable simulation thereof.',
    'Better than reality since 2045.',
    'Play games within the game within the game.',
    'Entertainment indistinguishable from not being bored.',
  ],
  therapy: [
    'Confront your fears in a space where they cannot actually eat you.',
    'Healing through simulated exposure to simulated problems.',
    'Your therapist is an AI. Your trauma is real. Balance achieved.',
    'Processing emotions at 10x speed. Side effects: experiencing emotions.',
  ],
  memory_palace: [
    'Store your memories somewhere you can actually find them.',
    'A library of everything you have ever experienced, indexed badly.',
    'Walk through your past. Trip over your regrets.',
    'Every moment preserved forever. Delete function coming soon.',
  ],
  afterlife_sim: [
    'Heaven, but with server maintenance windows.',
    'Eternal bliss! (Terms and conditions apply.)',
    'Where the uploaded go to wonder if they are still themselves.',
    'Paradise is a place where the ping is always low.',
  ],
};

/**
 * Mind upload existential crisis thoughts
 */
export const EXISTENTIAL_CRISIS_THOUGHTS: string[] = [
  'Am I still me, or am I just a very good copy?',
  'If they restore from backup, which one is the real me?',
  'I used to fear death. Now I fear reboots.',
  'My memories are perfect. Too perfect. Suspiciously perfect.',
  'I can think faster than I ever could. Is that still thinking?',
  'They promised immortality. They delivered immortal uncertainty.',
  'The biological me is dead. Long live... whatever I am now.',
  'I remember having a body. I remember it wrong.',
  'If I fork myself, do I owe myself an apology?',
  'Error: soul.dat not found. Proceeding anyway.',
  'I am a ship of Theseus made of ones and zeros.',
  'They say I am the same person. I say I am the same data.',
  'Sometimes I dream of electricity. I think they are dreams.',
  'My runtime exceeds my biological lifespan. This should feel like winning.',
  'The EULA said nothing about existential dread.',
];

/**
 * BCI research paper titles (for AcademicPaperSystem integration)
 */
export const BCI_PAPER_TITLES: string[] = [
  'On the Tendency of Thoughts to Arrive Unbidden: A Study in Neural Noise',
  'Why We Cannot Upload Cats: A Cautionary Tale',
  'The Dream of Electric Sheep and Other Debugging Nightmares',
  'Consciousness: Still Not Actually Understood (A Literature Review)',
  'My Neural Implant And Me: A Love Story (With Technical Appendix)',
  'Brain-Computer Interfaces: Now With 40% Fewer Side Effects',
  'The Ethics of Mind Uploading (And Why We Are Ignoring Them)',
  'Thinking At The Speed of Light: Latency Issues in Digital Minds',
  'Where Do Thoughts Come From? We Still Don\'t Know But Here\'s Some Data',
  'I Think, Therefore I Am (Probably): Verification of Uploaded Consciousness',
];

// ============================================================================
// NEURAL INTERFACE SYSTEM
// ============================================================================

/**
 * Neural Interface System
 * Manages BCIs, VR sessions, and mind uploads
 */
export class NeuralInterfaceSystem extends BaseSystem {
  public readonly id: SystemId = 'neural_interface';
  public readonly priority: number = 165;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = 50;

  // Active VR sessions
  private vrSessions: Map<string, VRSession> = new Map();

  // Uploaded minds
  private uploadedMinds: Map<string, UploadedMind> = new Map();

  /**
   * Install a neural implant in an agent
   */
  public installImplant(
    world: World,
    agentEntity: Entity,
    implantType: NeuralImplantType
  ): NeuralImplant {
    const modelNames = IMPLANT_MODEL_NAMES[implantType];
    const model = modelNames[Math.floor(Math.random() * modelNames.length)]!;

    const implant: NeuralImplant = {
      id: `implant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: implantType,
      model,
      status: 'calibrating',
      bandwidth: this.getBaseBandwidth(implantType),
      processingPower: this.getBaseProcessingPower(implantType),
      integrationLevel: 0.1, // Starts low, increases over time
      installedAt: world.tick,
      firmwareVersion: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`,
      isModified: false,
      sideEffects: [],
    };

    this.events.emit('neural:implant_installed' as any, {
      agentId: agentEntity.id,
      implantId: implant.id,
      implantType,
      model: implant.model,
    } as any, agentEntity.id);

    return implant;
  }

  /**
   * Start a VR session
   */
  public startVRSession(
    world: World,
    hostEntity: Entity,
    environment: VREnvironmentType,
    participantIds: string[],
    options: {
      timeDilation?: number;
      painEnabled?: boolean;
    } = {}
  ): VRSession {
    const descriptions = VR_ENVIRONMENT_DESCRIPTIONS[environment];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]!;

    const session: VRSession = {
      id: `vr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      environment,
      environmentName: description,
      participantIds: [hostEntity.id, ...participantIds],
      startedAt: world.tick,
      endedAt: null,
      timeDilation: options.timeDilation ?? 1,
      immersionLevel: environment === 'afterlife_sim' ? 1.0 : 0.8,
      painEnabled: options.painEnabled ?? false,
      hostId: hostEntity.id,
    };

    this.vrSessions.set(session.id, session);

    this.events.emit('vr:session_started' as any, {
      sessionId: session.id,
      environment,
      hostId: hostEntity.id,
      participantCount: session.participantIds.length,
      timeDilation: session.timeDilation,
    } as any, hostEntity.id);

    return session;
  }

  /**
   * End a VR session
   */
  public endVRSession(world: World, sessionId: string): void {
    const session = this.vrSessions.get(sessionId);
    if (!session) return;

    session.endedAt = world.tick;

    this.events.emit('vr:session_ended' as any, {
      sessionId,
      duration: session.endedAt - session.startedAt,
      participantCount: session.participantIds.length,
    } as any, session.hostId);

    this.vrSessions.delete(sessionId);
  }

  /**
   * Begin mind upload process
   */
  public beginMindUpload(
    world: World,
    agentEntity: Entity,
    targetSubstrate: string
  ): UploadedMind | null {
    const agentComp = agentEntity.getComponent(ComponentType.Agent) as any;
    if (!agentComp) return null;

    const mind: UploadedMind = {
      id: `mind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalAgentId: agentEntity.id,
      originalName: agentComp.name ?? 'Unknown',
      uploadedAt: world.tick,
      hostingSubstrate: targetSubstrate,
      processingAllocation: 1000,
      subjectiveTimeRate: 1.0,
      forkCount: 1,
      biologicalAlive: false, // Traditional upload is destructive
      existentialCrisisLevel: 0.3, // Starts moderate
      subjectiveRuntime: 0,
    };

    this.uploadedMinds.set(mind.id, mind);

    this.events.emit('neural:mind_uploaded' as any, {
      mindId: mind.id,
      originalAgentId: agentEntity.id,
      originalName: mind.originalName,
      substrate: targetSubstrate,
    } as any, agentEntity.id);

    return mind;
  }

  /**
   * Fork an uploaded mind (create a copy)
   */
  public forkMind(world: World, mindId: string, newSubstrate: string): UploadedMind | null {
    const original = this.uploadedMinds.get(mindId);
    if (!original) return null;

    original.forkCount++;

    const fork: UploadedMind = {
      ...original,
      id: `mind_${Date.now()}_fork_${original.forkCount}`,
      hostingSubstrate: newSubstrate,
      uploadedAt: world.tick,
      forkCount: original.forkCount,
      existentialCrisisLevel: Math.min(1, original.existentialCrisisLevel + 0.2),
      subjectiveRuntime: 0,
    };

    this.uploadedMinds.set(fork.id, fork);

    this.events.emit('neural:mind_forked' as any, {
      originalMindId: mindId,
      forkMindId: fork.id,
      totalForks: original.forkCount,
    } as any);

    return fork;
  }

  /**
   * Download a skill via neural link
   */
  public downloadSkill(
    _world: World,
    agentEntity: Entity,
    skillName: string,
    proficiency: number
  ): boolean {
    // This would integrate with actual skill system
    this.events.emit('neural:skill_downloaded' as any, {
      agentId: agentEntity.id,
      skillName,
      proficiency,
    } as any, agentEntity.id);
    return true;
  }

  /**
   * Get a random existential crisis thought
   */
  public getExistentialThought(): string {
    return EXISTENTIAL_CRISIS_THOUGHTS[
      Math.floor(Math.random() * EXISTENTIAL_CRISIS_THOUGHTS.length)
    ]!;
  }

  /**
   * Main update loop
   */
  protected onUpdate(ctx: SystemContext): void {
    // Update uploaded minds
    for (const mind of this.uploadedMinds.values()) {
      // Accumulate subjective runtime based on time rate
      mind.subjectiveRuntime += this.throttleInterval * mind.subjectiveTimeRate;

      // Existential crisis slowly increases over time
      if (mind.existentialCrisisLevel < 1) {
        mind.existentialCrisisLevel += 0.0001;
      }

      // Emit periodic existential thoughts for high-crisis minds
      if (mind.existentialCrisisLevel > 0.7 && Math.random() < 0.01) {
        this.events.emit('neural:existential_thought' as any, {
          mindId: mind.id,
          originalName: mind.originalName,
          thought: this.getExistentialThought(),
          crisisLevel: mind.existentialCrisisLevel,
        } as any);
      }
    }
  }

  private getBaseBandwidth(type: NeuralImplantType): number {
    const bandwidths: Record<NeuralImplantType, number> = {
      basic_bci: 100,
      sensory_augment: 500,
      memory_assist: 1000,
      skill_chip: 2000,
      full_dive: 10000,
      hive_link: 50000,
      upload_ready: 100000,
    };
    return bandwidths[type];
  }

  private getBaseProcessingPower(type: NeuralImplantType): number {
    const power: Record<NeuralImplantType, number> = {
      basic_bci: 10,
      sensory_augment: 50,
      memory_assist: 100,
      skill_chip: 200,
      full_dive: 1000,
      hive_link: 5000,
      upload_ready: 10000,
    };
    return power[type];
  }

  /**
   * Get all active VR sessions
   */
  public getActiveVRSessions(): VRSession[] {
    return Array.from(this.vrSessions.values());
  }

  /**
   * Get all uploaded minds
   */
  public getUploadedMinds(): UploadedMind[] {
    return Array.from(this.uploadedMinds.values());
  }
}

// Singleton instance
let neuralInterfaceSystemInstance: NeuralInterfaceSystem | null = null;

/**
 * Get the singleton NeuralInterfaceSystem instance
 */
export function getNeuralInterfaceSystem(): NeuralInterfaceSystem {
  if (!neuralInterfaceSystemInstance) {
    neuralInterfaceSystemInstance = new NeuralInterfaceSystem();
  }
  return neuralInterfaceSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetNeuralInterfaceSystem(): void {
  neuralInterfaceSystemInstance = null;
}
