/**
 * Television Generation Module
 *
 * LLM-powered content generation for TV shows.
 */

export {
  ScriptGenerator,
  DialogueGenerator,
  createScriptGeneratorCallback,
  type ScriptGenerationRequest,
  type ScriptGenerationResult,
  type DialogueGenerationRequest,
  type DialogueGenerationResult,
} from './ScriptGenerator.js';

// Re-export LLMProvider from canonical source
export type { LLMProvider } from '../../types/LLMTypes.js';
