/**
 * UniverseComponent - stub component for multiverse universe tracking
 */

export interface UniverseComponent {
  type: 'universe';
  version: 1;
  id: string;
  name: string;
  createdAt: number;
  parentUniverseId?: string;
  forkTick?: number;
  forkReason?: string;
  status: 'active' | 'collapsed' | 'merged';
  causalIntegrity: number;
  divergenceScore: number;
  timelineId?: string;
}

export function createUniverseComponent(
  id: string,
  name: string,
  createdAt: number
): UniverseComponent {
  return {
    type: 'universe',
    version: 1,
    id,
    name,
    createdAt,
    status: 'active',
    causalIntegrity: 1.0,
    divergenceScore: 0,
  };
}
