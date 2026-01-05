/**
 * Text Renderer Module (1D Renderer)
 *
 * Exports for the text-based rendering system.
 */

// Types
export * from './types.js';

// Adapters for terrain and event providers
export { createTerrainAdapter, createEventAdapter } from './adapters.js';

// Voice Modes
export {
  type VoiceTransformer,
  LiveVoice,
  ChronicleVoice,
  BardicVoice,
  ReporterVoice,
  VOICE_TRANSFORMERS,
  getVoiceTransformer,
} from './VoiceModes.js';

// Entity Description
export {
  extractEntityContext,
  getEntityType,
  getDistanceCategory,
  getCardinalDirection,
  generateEntitySummary,
  groupEntitiesByType,
  generateGroupedSummary,
  extractRecentDialogue,
} from './EntityDescriber.js';

// Scene Composition
export {
  SceneComposer,
  createSceneComposer,
  formatAsTextAdventure,
  formatAsScreenReader,
} from './SceneComposer.js';

// Main TextRenderer
export {
  TextRenderer,
  createTextRenderer,
  createAccessibilityRenderer,
  createLLMContextRenderer,
  createNarrationRenderer,
} from './TextRenderer.js';
