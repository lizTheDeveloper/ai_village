/**
 * TextRenderer - The 1D Renderer
 *
 * Generates prose descriptions of the game world, operating alongside
 * the 2D and 3D visual renderers. Supports multiple voice modes for
 * accessibility, LLM context, and narrative playback.
 *
 * @example
 * ```typescript
 * const textRenderer = new TextRenderer({ voice: 'live' });
 * const frame = textRenderer.render(world, camera);
 * console.log(frame.scene);
 * // "Day 47. You are in the village. Mira gathers berries to the east.
 * //  A campfire (unlit) stands nearby. The air is cold."
 * ```
 */

import type { World, Entity, Component } from '@ai-village/core';
import type { Camera, VisibleBounds } from '../Camera.js';
import type {
  TextFrame,
  TextNarrative,
  TextRendererConfig,
  VoiceMode,
  EntityDescriptionContext,
  SceneContext,
  DialogueLine,
  TerrainProvider,
  EventProvider,
} from './types.js';
import { DEFAULT_TEXT_RENDERER_CONFIG } from './types.js';
import { SceneComposer, formatAsTextAdventure, formatAsScreenReader } from './SceneComposer.js';
import { extractEntityContext, extractRecentDialogue } from './EntityDescriber.js';
import { getVoiceTransformer } from './VoiceModes.js';

// ============================================================================
// Component Type Interfaces
// ============================================================================

interface PositionComponent extends Component {
  x: number;
  y: number;
  z?: number;
}

interface RenderableComponent extends Component {
  spriteId?: string;
  visible?: boolean;
}

interface AgentComponent extends Component {
  behavior?: string;
  recentSpeech?: string;
}

interface IdentityComponent extends Component {
  name: string;
}

// VideoReplayComponent for replay rendering
interface ReplayFrame {
  tick: number;
  cameraX: number;
  cameraY: number;
  cameraAngle: number;
  cameraZoom: number;
  entities: Array<{
    entityId: string;
    entityType: string;
    name?: string;
    x: number;
    y: number;
    facingAngle?: number;
    animation?: { state: string; frame: number };
    visual?: { sprite?: string; color?: string; scale?: number; opacity?: number };
    health?: number;
    distanceFromCamera: number;
  }>;
}

interface VideoReplayComponent extends Component {
  type: 'video_replay';
  frames: ReplayFrame[];
  recordedByName: string;
  startTick: number;
  endTick?: number;
  status: 'recording' | 'completed' | 'corrupted';
}

// ============================================================================
// TextRenderer Class
// ============================================================================

export class TextRenderer {
  private config: TextRendererConfig;
  private composer: SceneComposer;
  private lastRenderTick: number = -1;
  private cachedFrame: TextFrame | null = null;
  private terrainProvider: TerrainProvider | null = null;
  private eventProvider: EventProvider | null = null;

  constructor(config: Partial<TextRendererConfig> = {}) {
    this.config = { ...DEFAULT_TEXT_RENDERER_CONFIG, ...config };
    this.composer = new SceneComposer(
      this.config.voice,
      this.config.detailLevel,
      this.config.maxLength
    );
  }

  /**
   * Set terrain provider for terrain descriptions.
   */
  setTerrainProvider(provider: TerrainProvider | null): void {
    this.terrainProvider = provider;
    this.cachedFrame = null;
  }

  /**
   * Set event provider for recent events.
   */
  setEventProvider(provider: EventProvider | null): void {
    this.eventProvider = provider;
    this.cachedFrame = null;
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set the voice mode for narration.
   */
  setVoice(voice: VoiceMode): void {
    this.config.voice = voice;
    this.composer.setVoice(voice);
    this.cachedFrame = null;
  }

  /**
   * Get current voice mode.
   */
  getVoice(): VoiceMode {
    return this.config.voice;
  }

  /**
   * Set focus entity (for first-person perspective).
   */
  setFocus(entityId: string | null): void {
    this.config.focusEntityId = entityId;
    this.cachedFrame = null;
  }

  /**
   * Update configuration.
   */
  configure(config: Partial<TextRendererConfig>): void {
    this.config = { ...this.config, ...config };
    this.composer = new SceneComposer(
      this.config.voice,
      this.config.detailLevel,
      this.config.maxLength
    );
    this.cachedFrame = null;
  }

  // ==========================================================================
  // Main Render Method
  // ==========================================================================

  /**
   * Render current world state to text.
   * Uses the camera for viewport bounds.
   */
  render(world: World, camera: Camera): TextFrame {
    const currentTick = world.tick;

    // Return cached frame if within update interval
    if (
      this.cachedFrame &&
      currentTick - this.lastRenderTick < this.config.updateInterval / 50 // Convert ms to ticks (20 TPS)
    ) {
      return this.cachedFrame;
    }

    // Get visible bounds from camera
    const bounds = camera.getVisibleBounds();
    const cameraX = camera.x;
    const cameraY = camera.y;
    const cameraZ = camera.z;

    // Query visible entities
    const entities = this.queryVisibleEntities(world, bounds);

    // Extract entity contexts
    const entityContexts = entities.map(e => extractEntityContext(e));

    // Get recent dialogue from agents
    const agents = entities.filter(e => e.components.has('agent'));
    const dialogue = this.extractDialogue(agents, currentTick);

    // Build scene context
    const context: SceneContext = {
      cameraX,
      cameraY,
      cameraZ,
      tick: currentTick,
      timeOfDay: this.getTimeOfDay(world),
      weather: this.getWeather(world),
      season: this.getSeason(world),
      terrain: this.getTerrain(world, cameraX, cameraY),
      entities: entityContexts,
      recentEvents: this.getRecentEvents(world, currentTick),
      activeDialogues: dialogue,
    };

    // Compose the scene
    const frame = this.composer.composeScene(context);

    // Cache the result
    this.cachedFrame = frame;
    this.lastRenderTick = currentTick;

    return frame;
  }

  // ==========================================================================
  // Replay Rendering
  // ==========================================================================

  /**
   * Render a single VideoReplayComponent frame to text.
   */
  renderReplayFrame(frame: ReplayFrame, world?: World): TextFrame {
    // Convert replay entities to EntityDescriptionContext
    const entityContexts: EntityDescriptionContext[] = frame.entities.map(e => ({
      entityId: e.entityId,
      entityType: e.entityType,
      name: e.name || e.entityType,
      x: e.x,
      y: e.y,
      health: e.health,
      animationState: e.animation?.state,
    }));

    // Build scene context from replay frame
    const context: SceneContext = {
      cameraX: frame.cameraX,
      cameraY: frame.cameraY,
      tick: frame.tick,
      entities: entityContexts,
      recentEvents: [],
      activeDialogues: [],
    };

    return this.composer.composeScene(context);
  }

  /**
   * Render an entire VideoReplayComponent to narrative prose.
   */
  renderReplaySequence(
    replay: VideoReplayComponent,
    voice: VoiceMode = this.config.voice
  ): TextNarrative {
    // Temporarily switch voice
    const originalVoice = this.config.voice;
    this.setVoice(voice);

    const paragraphs: string[] = [];
    const keyEvents: string[] = [];
    const primarySubjects = new Map<string, number>();

    // Get transformer for opening/closing
    const transformer = getVoiceTransformer(voice);

    // Opening
    paragraphs.push(transformer.openScene('the village', `Day ${Math.floor(replay.startTick / (20 * 60 * 24)) + 1}`));

    // Sample key frames (every 10th frame to avoid verbosity)
    const sampleRate = Math.max(1, Math.floor(replay.frames.length / 20));

    for (let i = 0; i < replay.frames.length; i += sampleRate) {
      const frame = replay.frames[i]!;
      const textFrame = this.renderReplayFrame(frame);

      // Add significant scene descriptions
      if (textFrame.scene.length > 50) {
        paragraphs.push(textFrame.scene);
      }

      // Track primary subjects
      for (const entity of frame.entities) {
        if (entity.name) {
          primarySubjects.set(entity.name, (primarySubjects.get(entity.name) || 0) + 1);
        }
      }
    }

    // Restore original voice
    this.setVoice(originalVoice);

    // Sort subjects by screen time
    const sortedSubjects = [...primarySubjects.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      title: `Recording by ${replay.recordedByName}`,
      paragraphs,
      keyEvents,
      primarySubjects: sortedSubjects,
      startTick: replay.startTick,
      endTick: replay.endTick || replay.frames[replay.frames.length - 1]?.tick || replay.startTick,
      voice,
      source: 'replay',
    };
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Query entities within visible bounds.
   */
  private queryVisibleEntities(world: World, bounds: VisibleBounds): Entity[] {
    // Query all entities with position and renderable
    const allEntities = world.query()
      .with('position')
      .executeEntities();

    // Filter by bounds with margin
    const margin = 2;
    const visible: Entity[] = [];

    for (const entity of allEntities) {
      const position = entity.components.get('position') as PositionComponent;
      if (!position) continue;

      const inBounds =
        position.x >= bounds.left - margin &&
        position.x <= bounds.right + margin &&
        position.y >= bounds.top - margin &&
        position.y <= bounds.bottom + margin;

      if (inBounds) {
        // Check if renderable is visible (if it has one)
        const renderable = entity.components.get('renderable') as RenderableComponent | undefined;
        if (!renderable || renderable.visible !== false) {
          visible.push(entity);
        }
      }
    }

    // Limit to max entities
    return visible.slice(0, this.config.maxEntities * 2); // Double for grouping buffer
  }

  /**
   * Extract dialogue from visible agents.
   */
  private extractDialogue(agents: Entity[], currentTick: number): DialogueLine[] {
    return extractRecentDialogue(agents, currentTick, 100);
  }

  // ==========================================================================
  // World Context Methods
  // ==========================================================================

  /**
   * Get time of day (0-1 where 0.5 is noon).
   */
  private getTimeOfDay(world: World): number | undefined {
    // Try to find a time entity
    const timeEntities = world.query().with('time').executeEntities();
    if (timeEntities.length > 0) {
      const time = timeEntities[0]!.components.get('time') as Component & { timeOfDay?: number };
      return time?.timeOfDay;
    }
    return undefined;
  }

  /**
   * Get current weather description.
   */
  private getWeather(world: World): string | undefined {
    // Try to find a weather entity
    const weatherEntities = world.query().with('weather').executeEntities();
    if (weatherEntities.length > 0) {
      const weather = weatherEntities[0]!.components.get('weather') as Component & { condition?: string };
      return weather?.condition;
    }
    return undefined;
  }

  /**
   * Get current season.
   */
  private getSeason(world: World): string | undefined {
    // Try to find a time entity with season
    const timeEntities = world.query().with('time').executeEntities();
    if (timeEntities.length > 0) {
      const time = timeEntities[0]!.components.get('time') as Component & { season?: string };
      return time?.season;
    }
    return undefined;
  }

  /**
   * Get terrain description at position.
   * Uses the terrain provider if set, otherwise returns undefined.
   */
  private getTerrain(world: World, x: number, y: number): string | undefined {
    if (this.terrainProvider) {
      return this.terrainProvider.getTerrainDescription(x, y);
    }
    return undefined;
  }

  /**
   * Get recent events for action list.
   * Uses the event provider if set, otherwise returns empty.
   */
  private getRecentEvents(world: World, currentTick: number): string[] {
    if (this.eventProvider) {
      // Get events from the last ~5 seconds (100 ticks at 20 TPS)
      const sinceTick = Math.max(0, currentTick - 100);
      return this.eventProvider.getRecentEvents(sinceTick, this.config.maxActions);
    }
    return [];
  }

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Render and format as text adventure display.
   */
  renderTextAdventure(world: World, camera: Camera): string {
    const frame = this.render(world, camera);
    return formatAsTextAdventure(frame);
  }

  /**
   * Render and format for screen readers.
   */
  renderScreenReader(world: World, camera: Camera): string {
    const frame = this.render(world, camera);
    return formatAsScreenReader(frame);
  }

  /**
   * Render just the scene description (for LLM context).
   */
  renderSceneOnly(world: World, camera: Camera): string {
    const frame = this.render(world, camera);
    return frame.scene;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a text renderer with default settings.
 */
export function createTextRenderer(config?: Partial<TextRendererConfig>): TextRenderer {
  return new TextRenderer(config);
}

/**
 * Create a text renderer optimized for accessibility (screen readers).
 */
export function createAccessibilityRenderer(): TextRenderer {
  return new TextRenderer({
    voice: 'live',
    detailLevel: 'standard',
    includeSpeech: true,
    includeAmbience: true,
    updateInterval: 500, // Faster updates
  });
}

/**
 * Create a text renderer optimized for LLM context.
 */
export function createLLMContextRenderer(): TextRenderer {
  return new TextRenderer({
    voice: 'live',
    detailLevel: 'verbose',
    includeSpeech: true,
    includeAmbience: true,
    maxLength: 1000,
  });
}

/**
 * Create a text renderer for historical narration.
 */
export function createNarrationRenderer(voice: VoiceMode = 'chronicle'): TextRenderer {
  return new TextRenderer({
    voice,
    detailLevel: 'verbose',
    includeSpeech: true,
    includeAmbience: true,
    maxLength: 2000,
  });
}
