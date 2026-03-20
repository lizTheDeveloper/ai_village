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
}

export type ChorusEventType = keyof ChorusEvents;
export type ChorusEventData = ChorusEvents[ChorusEventType];
