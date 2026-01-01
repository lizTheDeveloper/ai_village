/**
 * Prompt Builder Modules
 *
 * Extracted from StructuredPromptBuilder for better separation of concerns.
 * Each builder handles a specific aspect of prompt construction.
 */

export { WorldContextBuilder } from './WorldContextBuilder.js';
export { VillageInfoBuilder } from './VillageInfoBuilder.js';
export { MemoryBuilder } from './MemoryBuilder.js';
export { ActionBuilder } from './ActionBuilder.js';
export { HarmonyContextBuilder } from './HarmonyContextBuilder.js';

// Utility functions
export {
  type TaskFamiliarity,
  getBuildTimeEstimate,
  getCraftTimeEstimate,
  buildBuildingSection,
  buildCraftingSection,
  getStrategicAdviceForInProgress,
  generateStrategicInstruction,
  getSkilledAgentsAsResources,
  getPerceivedAgentSkills,
  getAffordancesThroughRelationships,
  getBuildingAccessDescription,
} from './SkillProgressionUtils.js';
