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
