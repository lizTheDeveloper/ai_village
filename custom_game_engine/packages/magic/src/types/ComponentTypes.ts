/**
 * ComponentTypes - Shared component type definitions for magic effects
 *
 * This file provides typed interfaces for game components that are accessed
 * by magic effect appliers. These types help avoid `as any` casts.
 */

// ============================================================================
// Position & Movement
// ============================================================================

export interface PositionComponentData {
  x: number;
  y: number;
  z?: number;
}

export interface VelocityComponentData {
  vx: number;
  vy: number;
  vz?: number;
}

export interface OrientationComponent {
  type: 'orientation';
  facing: number; // Angle in radians
}

// ============================================================================
// Status & State
// ============================================================================

export interface StatusEffectsComponent {
  type: 'status_effects';
  isStunned?: boolean;
  isDead?: boolean;
  timeScale?: number;
  temporalEffects?: TemporalEffectData[];
}

export interface TemporalEffectData {
  id: string;
  effectId: string;
  spellId: string;
  casterId: string;
  timeFactor: number;
  actionSpeedOnly?: boolean;
  temporalType: string;
  appliedAt: number;
  expiresAt?: number;
}

// ============================================================================
// Behavior & AI
// ============================================================================

export interface BehaviorComponent {
  type: 'behavior';
  currentBehavior: string;
  fleeFrom?: string;
  confused?: boolean;
  confusedUntil?: number;
}

// ============================================================================
// Needs & Health
// ============================================================================

export interface NeedsComponentWithHealth {
  type: 'needs';
  health: number;
  maxHealth?: number;
  [key: string]: any; // Allow other properties
}

// ============================================================================
// Mental Effects
// ============================================================================

export interface MentalEffectsComponent {
  type: 'mental_effects';
  charmedBy?: string;
  aware?: boolean;
  dominatedBy?: string;
  dominationEnds?: number;
  linkedTo?: string[];
  linkType?: string;
}

export interface PerceptionEffectsComponent {
  type: 'perception_effects';
  detectsSouls?: boolean;
  soulDetectionRange?: number;
  soulDetectionExpires?: number;
  illusions?: IllusionData[];
}

export interface IllusionData {
  content?: string;
  strength: number;
  casterId: string;
}

// ============================================================================
// Environment
// ============================================================================

export interface EnvironmentComponent {
  type: 'environment';
  weather?: string;
  weatherIntensity?: number;
  globalLightLevel?: number;
  temperatureModifier?: number;
  globalZones?: any[];
}

export interface EnvironmentalZoneComponent {
  type: 'environmental_zone';
  effectId: string;
  environmentType: string;
  radius: number;
  shape?: string;
  properties: Record<string, any>;
  areaEffects: any[];
  createdAt: number;
  duration?: number;
}

// ============================================================================
// Appearance & Transform
// ============================================================================

export interface AppearanceComponent {
  type: 'appearance';
  form: string;
  size: number;
  material: string;
  alignment?: string;
  species?: string;
}

// ============================================================================
// Magic & Paradigms
// ============================================================================

export interface ParadigmState {
  suppressed?: boolean;
  suppressedUntil?: number;
  [key: string]: any; // For extensibility
}

// ============================================================================
// Items & Creation
// ============================================================================

export interface ItemComponent {
  type: 'item';
  itemType: string;
  quality: number;
  createdBy: string;
  createdAt: number;
  spellId: string;
  permanent: boolean;
}

export interface IdentityComponent {
  type: 'identity';
  name: string;
  description?: string;
}

export interface ExpirationComponent {
  type: 'expiration';
  expiresAt: number;
  creatorId: string;
  reason: string;
}

// ============================================================================
// Teleportation
// ============================================================================

export interface TeleportAnchorsComponent {
  type: 'teleport_anchors';
  anchors: TeleportAnchor[];
}

export interface TeleportAnchor {
  name: string;
  x: number;
  y: number;
  z?: number;
}

// ============================================================================
// Temporal & Age
// ============================================================================

export interface AgeComponent {
  type: 'age';
  years: number;
}

export interface TemporalStateComponent {
  type: 'temporal_state';
  rewindRequests: RewindRequest[];
}

export interface RewindRequest {
  effectId: string;
  spellId: string;
  casterId: string;
  rewindTicks: number;
  requestedAt: number;
}

// ============================================================================
// Active Effects
// ============================================================================

export interface ActiveEffectsComponent {
  type: 'active_effects';
  effects: any[];
  suppressed?: boolean;
  suppressedUntil?: number;
  suppressionPower?: number;
}

// ============================================================================
// Stats & Attributes
// ============================================================================

export interface StatsComponent {
  type: 'stats';
  willpower?: number;
  [key: string]: any; // Allow other stats
}

export interface ResistanceComponent {
  type: 'resistance';
  teleport?: number;
  [key: string]: any; // Allow other resistance types
}
