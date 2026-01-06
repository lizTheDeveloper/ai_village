/**
 * Midwifery System Module
 *
 * A comprehensive system for pregnancy, labor, delivery, and infant care.
 * Integrates with the medicine skill for midwife specialization.
 */

// Components
export * from './PregnancyComponent.js';
export {
  PregnancyComponent,
  createPregnancyComponent,
} from './PregnancyComponent.js';
export type {
  Trimester,
  FetalPosition,
  PregnancySymptoms,
  PregnancyRiskFactor,
  PrenatalCheckup,
} from './PregnancyComponent.js';

export * from './LaborComponent.js';
export {
  LaborComponent,
  createLaborComponent,
} from './LaborComponent.js';
export type {
  LaborStage,
  ComplicationSeverity,
  BirthComplication,
  ActiveComplication,
  DeliveryMethod,
} from './LaborComponent.js';

export * from './PostpartumComponent.js';
export {
  PostpartumComponent,
  createPostpartumComponent,
} from './PostpartumComponent.js';
export type {
  PostpartumComplication,
  PostpartumMood,
} from './PostpartumComponent.js';

export * from './InfantComponent.js';
export {
  InfantComponent,
  createInfantComponent,
} from './InfantComponent.js';
export type {
  BirthWeight,
  InfantVulnerability,
  DevelopmentalMilestones,
} from './InfantComponent.js';

export * from './NursingComponent.js';
export {
  NursingComponent,
  createNursingComponent,
} from './NursingComponent.js';

// System
export * from './MidwiferySystem.js';
export {
  MidwiferySystem,
} from './MidwiferySystem.js';
