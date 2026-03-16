/**
 * ParadoxComponent - stub component for tracking causal paradoxes
 */

export interface ParadoxDetails {
  type: string;
  severity: number;
  description: string;
  location: { x: number; y: number };
  affectedEvents: string[];
}

export interface ParadoxComponent {
  type: 'paradox';
  version: 1;
  id: string;
  universeId: string;
  severity: number;
  details: ParadoxDetails;
  resolved: boolean;
  resolution?: string;
  detectedAt: number;
}

export function createParadoxComponent(
  id: string,
  universeId: string,
  details: ParadoxDetails
): ParadoxComponent {
  return {
    type: 'paradox',
    version: 1,
    id,
    universeId,
    severity: details.severity,
    details,
    resolved: false,
    detectedAt: 0,
  };
}
