import type { Component } from '../ecs/Component.js';

/**
 * Bioluminescence pattern types for light production
 */
export type BioluminescentPattern =
  | 'lure' // Anglerfish - attracts prey
  | 'camouflage' // Counter-illumination to match surface light
  | 'communication' // Signals to mates or school
  | 'startle' // Flash to scare predators
  | 'attract_mate' // Mating displays
  | 'warning' // Warn predators of toxicity
  | 'continuous' // Constant glow
  | 'pulsing'; // Rhythmic flashing

/**
 * Bioluminescent component state
 */
export type BioluminescentState =
  | 'off' // Not emitting light
  | 'dim' // Low intensity
  | 'bright' // Full intensity
  | 'flashing'; // Rapid on/off

export interface BioluminescentComponentData {
  /** Light pattern type */
  pattern: BioluminescentPattern;

  /** Current state */
  state: BioluminescentState;

  /** Light color (hex) */
  color: string;

  /** Base brightness (0-1) */
  brightness: number;

  /** Current brightness (0-1, modified by state) */
  currentBrightness: number;

  /** Purpose/description */
  purpose: string;

  /** Energy cost per tick when active (0-1) */
  energyCost: number;

  /** Can be controlled voluntarily */
  controllable: boolean;

  /** Flash rate (times per second) for flashing patterns */
  flashRate?: number;

  /** Current phase of flash cycle (0-1) */
  flashPhase?: number;

  /** Trigger conditions (for automatic activation) */
  triggers?: {
    onDamage?: boolean; // Flash when damaged
    whenHungry?: boolean; // Glow when hunting
    atNight?: boolean; // Only at night
    inDarkness?: boolean; // Only in dark areas
  };
}

/**
 * Component for creatures with bioluminescence capabilities.
 * Used by deep-sea fish, jellyfish, and other light-producing organisms.
 */
export class BioluminescentComponent implements Component {
  public readonly type = 'bioluminescent' as const;
  public readonly version = 1;

  public pattern: BioluminescentPattern;
  public state: BioluminescentState;
  public color: string;
  public brightness: number;
  public currentBrightness: number;
  public purpose: string;
  public energyCost: number;
  public controllable: boolean;
  public flashRate?: number;
  public flashPhase?: number;
  public triggers?: {
    onDamage?: boolean;
    whenHungry?: boolean;
    atNight?: boolean;
    inDarkness?: boolean;
  };

  constructor(data: BioluminescentComponentData) {
    // Validate required fields - NO FALLBACKS
    if (data.pattern === undefined || data.pattern === null) {
      throw new Error('BioluminescentComponent requires "pattern" field');
    }
    if (data.state === undefined || data.state === null) {
      throw new Error('BioluminescentComponent requires "state" field');
    }
    if (data.color === undefined || data.color === null) {
      throw new Error('BioluminescentComponent requires "color" field');
    }
    if (data.brightness === undefined || data.brightness === null) {
      throw new Error('BioluminescentComponent requires "brightness" field');
    }
    if (data.currentBrightness === undefined || data.currentBrightness === null) {
      throw new Error('BioluminescentComponent requires "currentBrightness" field');
    }
    if (data.purpose === undefined || data.purpose === null) {
      throw new Error('BioluminescentComponent requires "purpose" field');
    }
    if (data.energyCost === undefined || data.energyCost === null) {
      throw new Error('BioluminescentComponent requires "energyCost" field');
    }
    if (data.controllable === undefined || data.controllable === null) {
      throw new Error('BioluminescentComponent requires "controllable" field');
    }

    // Validate brightness range
    if (data.brightness < 0 || data.brightness > 1) {
      throw new Error('BioluminescentComponent "brightness" must be between 0 and 1');
    }
    if (data.currentBrightness < 0 || data.currentBrightness > 1) {
      throw new Error('BioluminescentComponent "currentBrightness" must be between 0 and 1');
    }

    // Validate energy cost
    if (data.energyCost < 0 || data.energyCost > 1) {
      throw new Error('BioluminescentComponent "energyCost" must be between 0 and 1');
    }

    // Assign all fields
    this.pattern = data.pattern;
    this.state = data.state;
    this.color = data.color;
    this.brightness = data.brightness;
    this.currentBrightness = data.currentBrightness;
    this.purpose = data.purpose;
    this.energyCost = data.energyCost;
    this.controllable = data.controllable;
    this.flashRate = data.flashRate;
    this.flashPhase = data.flashPhase;
    this.triggers = data.triggers;
  }
}

/**
 * Check if bioluminescence is currently active
 */
export function isLightActive(biolum: BioluminescentComponent): boolean {
  return biolum.state !== 'off' && biolum.currentBrightness > 0;
}

/**
 * Get effective light intensity accounting for state
 */
export function getEffectiveBrightness(biolum: BioluminescentComponent): number {
  switch (biolum.state) {
    case 'off':
      return 0;
    case 'dim':
      return biolum.brightness * 0.3;
    case 'bright':
      return biolum.brightness;
    case 'flashing':
      // Use flash phase to determine if currently on or off
      const phase = biolum.flashPhase ?? 0;
      return phase < 0.5 ? biolum.brightness : 0;
    default:
      return 0;
  }
}

/**
 * Check if pattern is suitable for hunting
 */
export function isHuntingPattern(pattern: BioluminescentPattern): boolean {
  return pattern === 'lure' || pattern === 'continuous';
}

/**
 * Check if pattern is defensive
 */
export function isDefensivePattern(pattern: BioluminescentPattern): boolean {
  return pattern === 'startle' || pattern === 'warning';
}

/**
 * Check if pattern is for communication
 */
export function isCommunicationPattern(pattern: BioluminescentPattern): boolean {
  return (
    pattern === 'communication' ||
    pattern === 'attract_mate' ||
    pattern === 'pulsing'
  );
}
