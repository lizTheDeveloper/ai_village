/**
 * Neural Systems Module
 *
 * Brain-Computer Interfaces, Virtual Reality, and Mind Upload technology.
 *
 * "The last frontier is not space. It's the three pounds of meat
 * between your ears that somehow convinced itself it exists."
 *   - Dr. Wei Chen, Consciousness Research Lab
 *
 * Modules:
 * - NeuralInterfaceSystem: BCIs, VR sessions, mind upload
 * - VRTrainingSystem: Skill training in virtual environments
 */

// Neural Interface System
export {
  NeuralInterfaceSystem,
  getNeuralInterfaceSystem,
  resetNeuralInterfaceSystem,
  // Types
  type NeuralImplantType,
  type ImplantStatus,
  type NeuralImplant,
  type VREnvironmentType,
  type VRSession,
  type UploadStatus,
  type UploadedMind,
  type NeuralInterfaceComponent,
  // Content
  IMPLANT_MODEL_NAMES,
  VR_ENVIRONMENT_DESCRIPTIONS,
  EXISTENTIAL_CRISIS_THOUGHTS,
  BCI_PAPER_TITLES,
} from './NeuralInterfaceSystem.js';

// VR Training System
export {
  VRTrainingSystem,
  getVRTrainingSystem,
  resetVRTrainingSystem,
  // Types
  type TrainingCategory,
  type TrainingDifficulty,
  type TrainingProgram,
  type TrainingSession,
  type TrainingAchievement,
  type VRTrainingComponent,
  // Content
  TRAINING_PROGRAM_NAMES,
  TRAINING_SCENARIOS,
  TRAINING_ACHIEVEMENTS,
} from './VRTrainingSystem.js';
