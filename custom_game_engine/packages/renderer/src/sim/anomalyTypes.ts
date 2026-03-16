/**
 * anomalyTypes.ts - Definitions and visual configs for asteroid anomaly types
 *
 * The 7 anomaly types that can be discovered on asteroids during stellar exploration.
 * Each type has unique color palettes, particle behaviors, and effect characteristics
 * used by AnomalyRenderer for distinctive visual rendering.
 *
 * Active state: animated, bright, dynamic particles
 * Dormant state: slow pulse, dimmed, minimal particles
 */

export type AnomalyTypeId =
  | 'strange_mineral'
  | 'ancient_signal'
  | 'spatial_distortion'
  | 'geometric_void'
  | 'biological_trace'
  | 'gravitational_anomaly'
  | 'convergence_point';

export type AnomalyState = 'active' | 'dormant';

/** Particle shape for the anomaly's visual effect */
export type AnomalyParticleShape = 'spark' | 'ring' | 'diamond' | 'dot' | 'triangle' | 'wave' | 'cross';

/** Per-anomaly visual configuration used by AnomalyRenderer */
export interface AnomalyVisualConfig {
  /** Human-readable name */
  name: string;
  /** Short description for UI tooltips */
  description: string;
  /** Primary glow color (CSS color string) */
  primaryColor: string;
  /** Secondary color for particles and inner effects */
  secondaryColor: string;
  /** Accent color for highlights and edges */
  accentColor: string;
  /** Background/outer glow color (usually transparent version of primary) */
  glowColor: string;
  /** Particle shape to use for this anomaly */
  particleShape: AnomalyParticleShape;
  /** Number of particles in active state */
  activeParticleCount: number;
  /** Number of particles in dormant state */
  dormantParticleCount: number;
  /** Glow radius in pixels at zoom=1 */
  glowRadius: number;
  /** Inner core radius in pixels at zoom=1 */
  coreRadius: number;
  /** Base animation speed multiplier (1.0 = normal) */
  animationSpeed: number;
  /** Whether this anomaly has a distortion/warp effect */
  hasDistortion: boolean;
  /** Whether this anomaly emits directional beams */
  hasBeams: boolean;
  /** Number of symmetry points (e.g. 4 = 4-fold symmetry) */
  symmetryPoints: number;
  /** Icon emoji for UI displays */
  icon: string;
}

/** Full anomaly type definition */
export interface AnomalyTypeDef {
  id: AnomalyTypeId;
  visual: AnomalyVisualConfig;
}

/** All 7 anomaly type definitions */
export const ANOMALY_TYPES: Readonly<Record<AnomalyTypeId, AnomalyTypeDef>> = Object.freeze({
  strange_mineral: {
    id: 'strange_mineral',
    visual: {
      name: 'Strange Mineral',
      description: 'An unusual crystalline formation that emits soft bioluminescent radiation.',
      primaryColor: '#00e5ff',
      secondaryColor: '#00bcd4',
      accentColor: '#e0f7fa',
      glowColor: 'rgba(0, 229, 255, 0.25)',
      particleShape: 'diamond',
      activeParticleCount: 18,
      dormantParticleCount: 5,
      glowRadius: 28,
      coreRadius: 8,
      animationSpeed: 1.2,
      hasDistortion: false,
      hasBeams: false,
      symmetryPoints: 6,
      icon: '💎',
    },
  },

  ancient_signal: {
    id: 'ancient_signal',
    visual: {
      name: 'Ancient Signal',
      description: 'A rhythmic energy pulse broadcasting on frequencies predating known civilization.',
      primaryColor: '#ffd600',
      secondaryColor: '#ff8f00',
      accentColor: '#fff9c4',
      glowColor: 'rgba(255, 214, 0, 0.3)',
      particleShape: 'ring',
      activeParticleCount: 12,
      dormantParticleCount: 4,
      glowRadius: 36,
      coreRadius: 6,
      animationSpeed: 0.8,
      hasDistortion: false,
      hasBeams: true,
      symmetryPoints: 4,
      icon: '📡',
    },
  },

  spatial_distortion: {
    id: 'spatial_distortion',
    visual: {
      name: 'Spatial Distortion',
      description: 'A localized warping of spacetime that bends light and confounds navigation.',
      primaryColor: '#ce93d8',
      secondaryColor: '#7b1fa2',
      accentColor: '#f3e5f5',
      glowColor: 'rgba(206, 147, 216, 0.3)',
      particleShape: 'wave',
      activeParticleCount: 24,
      dormantParticleCount: 8,
      glowRadius: 40,
      coreRadius: 10,
      animationSpeed: 1.5,
      hasDistortion: true,
      hasBeams: false,
      symmetryPoints: 3,
      icon: '〜',
    },
  },

  geometric_void: {
    id: 'geometric_void',
    visual: {
      name: 'Geometric Void',
      description: 'A perfectly regular absence in space, its edges too sharp to be natural.',
      primaryColor: '#212121',
      secondaryColor: '#37474f',
      accentColor: '#eceff1',
      glowColor: 'rgba(33, 33, 33, 0.6)',
      particleShape: 'cross',
      activeParticleCount: 10,
      dormantParticleCount: 3,
      glowRadius: 32,
      coreRadius: 14,
      animationSpeed: 0.5,
      hasDistortion: true,
      hasBeams: false,
      symmetryPoints: 4,
      icon: '⬛',
    },
  },

  biological_trace: {
    id: 'biological_trace',
    visual: {
      name: 'Biological Trace',
      description: 'Organic compounds arranged in impossible patterns, hinting at extinct life.',
      primaryColor: '#69f0ae',
      secondaryColor: '#1b5e20',
      accentColor: '#f1f8e9',
      glowColor: 'rgba(105, 240, 174, 0.25)',
      particleShape: 'spark',
      activeParticleCount: 22,
      dormantParticleCount: 6,
      glowRadius: 26,
      coreRadius: 7,
      animationSpeed: 1.0,
      hasDistortion: false,
      hasBeams: false,
      symmetryPoints: 5,
      icon: '🌿',
    },
  },

  gravitational_anomaly: {
    id: 'gravitational_anomaly',
    visual: {
      name: 'Gravitational Anomaly',
      description: 'A point of extreme gravitational shear that pulls matter into spiraling arcs.',
      primaryColor: '#1565c0',
      secondaryColor: '#0d47a1',
      accentColor: '#bbdefb',
      glowColor: 'rgba(21, 101, 192, 0.35)',
      particleShape: 'dot',
      activeParticleCount: 30,
      dormantParticleCount: 10,
      glowRadius: 44,
      coreRadius: 5,
      animationSpeed: 2.0,
      hasDistortion: false,
      hasBeams: false,
      symmetryPoints: 2,
      icon: '🌀',
    },
  },

  convergence_point: {
    id: 'convergence_point',
    visual: {
      name: 'Convergence Point',
      description: 'A nexus where multiple dimensional layers overlap, radiating impossible energies.',
      primaryColor: '#ff6d00',
      secondaryColor: '#d500f9',
      accentColor: '#ffffff',
      glowColor: 'rgba(255, 109, 0, 0.3)',
      particleShape: 'triangle',
      activeParticleCount: 36,
      dormantParticleCount: 12,
      glowRadius: 50,
      coreRadius: 12,
      animationSpeed: 1.8,
      hasDistortion: true,
      hasBeams: true,
      symmetryPoints: 8,
      icon: '✦',
    },
  },
});

/** Ordered list of all anomaly type IDs */
export const ANOMALY_TYPE_IDS: readonly AnomalyTypeId[] = Object.freeze([
  'strange_mineral',
  'ancient_signal',
  'spatial_distortion',
  'geometric_void',
  'biological_trace',
  'gravitational_anomaly',
  'convergence_point',
]);

/** Get an anomaly type definition by id, or null if not found */
export function getAnomalyType(id: string): AnomalyTypeDef | null {
  return (ANOMALY_TYPES as Record<string, AnomalyTypeDef>)[id] ?? null;
}
