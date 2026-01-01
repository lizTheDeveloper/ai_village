/**
 * Realm system - Mythological pocket dimensions
 */

// Core types
export * from './RealmTypes.js';
export type {
  RealmCategory,
  RealmSize,
  TimeFlowType,
  AccessMethod,
  AccessRestriction,
  RealmLaw,
  RealmProperties,
  RealmTransitionResult,
  TransitionEffect,
  RealmInhabitant,
} from './RealmTypes.js';

// Predefined realms
export * from './RealmDefinitions.js';
export {
  UnderworldRealm,
  CelestialRealm,
  DreamRealm,
  REALM_REGISTRY,
  getRealmDefinition,
  getAllRealmDefinitions,
} from './RealmDefinitions.js';

// Transition logic
export * from './RealmTransition.js';
export {
  transitionToRealm,
  returnToMortalWorld,
} from './RealmTransition.js';

// Realm initialization
export * from './RealmInitializer.js';
export {
  createRealmEntity,
  initializeUnderworld,
  initializeCelestialRealm,
  initializeDreamRealm,
  initializeAllRealms,
} from './RealmInitializer.js';

// Soul routing (afterlife destination)
export * from './SoulRoutingService.js';
export {
  routeSoulToAfterlife,
  findDeityAfterlifeRealm,
  registerDeityAfterlife,
  isAfterlifeRealm,
  filterAfterlifeRealms,
  DEFAULT_AFTERLIFE_REALM,
} from './SoulRoutingService.js';
export type {
  SoulRoutingResult,
  SoulRoutingReason,
} from './SoulRoutingService.js';
