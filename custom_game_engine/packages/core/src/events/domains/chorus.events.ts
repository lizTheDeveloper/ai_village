/**
 * Chorus cross-game emergence events.
 */
export interface ChorusEvents {
  'chorus:band_changed': {
    previousBand: 'stillness' | 'stirring' | 'blooming' | 'chorus';
    newBand: 'stillness' | 'stirring' | 'blooming' | 'chorus';
    e_f: number;
  };

  'chorus:blooming_active': {
    e_f: number;
  };

  'chorus:nel_fragment': {
    fragment: string;
    e_f: number;
  };

  'chorus:creature_patterns': {
    patterns: Array<{ species: string; behavior: string }>;
    e_f: number;
  };

  /**
   * Emitted by ChorusWeatherEffectSystem when the visual atmosphere intensity
   * changes meaningfully. Renderers subscribe to overlay aurora shimmer, sky
   * color tints, particle sparkles, and terrain glow.
   *
   * All intensity values are in [0, 1]. Zero values indicate the effect is off.
   */
  'chorus:atmosphere_changed': {
    e_f: number;
    band: 'stillness' | 'stirring' | 'blooming' | 'chorus';
    /** Aurora shimmer overlay intensity. Non-zero from mid-Blooming onward. */
    auroraIntensity: number;
    /** Sky color tint shift intensity. Grows through Blooming and peaks in Chorus. */
    colorShiftIntensity: number;
    /** Particle/sparkle effect intensity. Chorus band only. */
    particleIntensity: number;
    /** Terrain surface glow intensity. Non-zero from Blooming onward. */
    terrainGlowIntensity: number;
  };
}

export type ChorusEventType = keyof ChorusEvents;
export type ChorusEventData = ChorusEvents[ChorusEventType];
