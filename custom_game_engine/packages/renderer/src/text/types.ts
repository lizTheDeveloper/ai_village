/**
 * Text Renderer Types
 *
 * Type definitions for the 1D Text Renderer system.
 * Enables text-based gameplay, accessibility, and narrative generation.
 */

// ============================================================================
// Voice Modes
// ============================================================================

/**
 * Voice mode determines the narrative style of text output.
 */
export type VoiceMode = 'live' | 'chronicle' | 'bardic' | 'reporter';

/**
 * Voice mode descriptions for UI.
 */
export const VOICE_MODE_INFO: Record<VoiceMode, { name: string; description: string }> = {
  live: {
    name: 'Live',
    description: 'Present tense, immediate, factual. Best for accessibility.',
  },
  chronicle: {
    name: 'Chronicle',
    description: 'Past tense, historical, formal. Best for written histories.',
  },
  bardic: {
    name: 'Bardic',
    description: 'Epic/poetic, embellished, dramatic. Best for oral retellings.',
  },
  reporter: {
    name: 'Reporter',
    description: 'News-style, objective, third person. Best for broadcasts.',
  },
};

// ============================================================================
// Detail Levels
// ============================================================================

/**
 * Detail level affects verbosity of descriptions.
 */
export type DetailLevel = 'minimal' | 'standard' | 'verbose';

// ============================================================================
// Text Frame Output
// ============================================================================

/**
 * A single rendered text frame - the output of TextRenderer.render()
 */
export interface TextFrame {
  /** Unique frame ID */
  frameId: string;

  /** Game tick when rendered */
  tick: number;

  /** Real timestamp */
  timestamp: number;

  /** Main scene description */
  scene: string;

  /** Recent actions/events (last few seconds) */
  actions: string[];

  /** Dialogue/speech currently visible */
  dialogue: DialogueLine[];

  /** Ambient description (weather, time of day, mood) */
  ambience: string | null;

  /** Navigation hints for interactive mode */
  navigation: NavigationHints | null;

  /** Entity summaries for detailed mode */
  entities: EntitySummary[];

  /** Voice mode used to generate this frame */
  voice: VoiceMode;
}

/**
 * A line of dialogue from an entity.
 */
export interface DialogueLine {
  /** Speaker entity ID */
  speakerId: string;

  /** Speaker name */
  speakerName: string;

  /** What they said */
  text: string;

  /** When they said it (tick) */
  tick: number;
}

/**
 * Navigation hints for text adventure mode.
 */
export interface NavigationHints {
  north: string | null;
  south: string | null;
  east: string | null;
  west: string | null;
  up: string | null;
  down: string | null;
}

/**
 * Summary of an entity for detailed text output.
 */
export interface EntitySummary {
  /** Entity ID */
  id: string;

  /** Entity type */
  type: 'agent' | 'animal' | 'building' | 'resource' | 'plant' | 'item' | 'other';

  /** Display name */
  name: string;

  /** Current activity/state description */
  activity: string;

  /** Distance category from camera/focus */
  distance: 'immediate' | 'close' | 'area' | 'distant';

  /** Cardinal direction from camera/focus */
  direction: string | null;

  /** Additional details (health, inventory, etc.) */
  details: string | null;
}

// ============================================================================
// Text Narrative (for replay/history)
// ============================================================================

/**
 * A complete narrative composed from multiple frames.
 */
export interface TextNarrative {
  /** Narrative title */
  title: string;

  /** Narrative paragraphs */
  paragraphs: string[];

  /** Key events mentioned */
  keyEvents: string[];

  /** Primary subjects (most mentioned entities) */
  primarySubjects: string[];

  /** Time span (ticks) */
  startTick: number;
  endTick: number;

  /** Voice mode used */
  voice: VoiceMode;

  /** Source (replay ID or 'live') */
  source: string;
}

// ============================================================================
// Renderer Configuration
// ============================================================================

/**
 * Configuration for TextRenderer.
 */
export interface TextRendererConfig {
  /** Voice mode for narration style */
  voice: VoiceMode;

  /** Update frequency for real-time mode (ms) */
  updateInterval: number;

  /** Maximum characters per scene description */
  maxLength: number;

  /** Detail level (affects verbosity) */
  detailLevel: DetailLevel;

  /** Focus entity ID (whose perspective to describe from) */
  focusEntityId: string | null;

  /** Whether to include dialogue/speech */
  includeSpeech: boolean;

  /** Whether to include ambient descriptions */
  includeAmbience: boolean;

  /** Whether to include navigation hints */
  includeNavigation: boolean;

  /** Maximum entities to describe in detail */
  maxEntities: number;

  /** Maximum actions to include */
  maxActions: number;
}

/**
 * Default configuration.
 */
export const DEFAULT_TEXT_RENDERER_CONFIG: TextRendererConfig = {
  voice: 'live',
  updateInterval: 1000,
  maxLength: 500,
  detailLevel: 'standard',
  focusEntityId: null,
  includeSpeech: true,
  includeAmbience: true,
  includeNavigation: false,
  maxEntities: 10,
  maxActions: 5,
};

// ============================================================================
// Terrain and Event Providers
// ============================================================================

/**
 * Interface for terrain description provider.
 * Can be implemented by TerrainFeatureAnalyzer or cached terrain descriptions.
 */
export interface TerrainProvider {
  /**
   * Get terrain description at a position.
   * @param x World X coordinate
   * @param y World Y coordinate
   * @returns Terrain description string or undefined if not available
   */
  getTerrainDescription(x: number, y: number): string | undefined;
}

/**
 * Interface for recent event provider.
 * Can be implemented by EventBus wrapper or cached event formatter.
 */
export interface EventProvider {
  /**
   * Get recent events since a tick.
   * @param sinceTick Only events after this tick
   * @param limit Maximum number of events
   * @returns Array of event description strings
   */
  getRecentEvents(sinceTick: number, limit: number): string[];
}

// ============================================================================
// Entity Description Context
// ============================================================================

/**
 * Context for describing an entity (passed to EntityDescriber).
 */
export interface EntityDescriptionContext {
  /** Entity ID */
  entityId: string;

  /** Entity type */
  entityType: string;

  /** Entity name */
  name: string;

  /** Position */
  x: number;
  y: number;
  z?: number;

  /** Current behavior/state */
  behavior?: string;

  /** Animation state */
  animationState?: string;

  /** Recent speech */
  recentSpeech?: string;

  /** Health (0-1) */
  health?: number;

  /** Building type (for buildings) */
  buildingType?: string;

  /** Is building complete */
  isComplete?: boolean;

  /** Building progress (0-1) */
  progress?: number;

  /** Resource type (for resources) */
  resourceType?: string;

  /** Plant species (for plants) */
  species?: string;

  /** Plant growth stage */
  growthStage?: string;

  /** Animal species */
  animalSpecies?: string;

  /** Animal state (grazing, hunting, etc.) */
  animalState?: string;
}

// ============================================================================
// Scene Composition Context
// ============================================================================

/**
 * Context for composing a scene description (passed to SceneComposer).
 */
export interface SceneContext {
  /** Camera/focus position */
  cameraX: number;
  cameraY: number;
  cameraZ?: number;

  /** Current game tick */
  tick: number;

  /** Time of day (0-1, where 0.5 is noon) */
  timeOfDay?: number;

  /** Weather description */
  weather?: string;

  /** Season */
  season?: string;

  /** Terrain description */
  terrain?: string;

  /** Entities in scene */
  entities: EntityDescriptionContext[];

  /** Recent events/actions */
  recentEvents: string[];

  /** Active dialogues */
  activeDialogues: DialogueLine[];
}
