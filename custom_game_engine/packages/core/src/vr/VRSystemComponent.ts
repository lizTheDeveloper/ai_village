import type { Component, ComponentSchema } from '../ecs/Component.js';
import type { EmotionalSignature } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// Types
// ============================================================================

export type VRSystemType = 'shadow_realm' | 'remembrance_space' | 'feeling_forge' | 'shared_dream' | 'recursion_realm';

export interface VRSession {
  id: string;
  vr_system_id: string;
  participant_ids: string[];  // Entity IDs

  scenario: {
    type: string;
    description: string;
    target_emotion?: EmotionalSignature;
  };

  start_time: number;
  duration: number;
  max_duration: number;
  emergency_exit_available: boolean;
}

// ============================================================================
// Interface
// ============================================================================

/**
 * Virtual Reality System - curated emotional experience spaces
 */
export interface VRSystemComponent extends Component {
  type: 'vr_system';

  vr_type: VRSystemType;
  name: string;

  // Simulation properties
  simulation: {
    fidelity: number;  // 0-1 (how real it feels)
    narrative_weight: number;  // 0-1 (how much it affects β-space)
  };

  // Active sessions
  active_sessions: VRSession[];

  // Capacity
  max_concurrent_sessions: number;
  max_participants_per_session: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createVRSystemComponent(
  vr_type: VRSystemType,
  name: string
): VRSystemComponent {
  return {
    type: 'vr_system',
    version: 1,
    vr_type,
    name,
    simulation: {
      fidelity: vr_type === 'shadow_realm' ? 0.99 : 0.95,
      narrative_weight: vr_type === 'shadow_realm' ? 0.01 : 0.5,
    },
    active_sessions: [],
    max_concurrent_sessions: 10,
    max_participants_per_session: vr_type === 'shared_dream' ? 100 : 1,
  };
}

// ============================================================================
// Schema
// ============================================================================

export const VRSystemComponentSchema: ComponentSchema<VRSystemComponent> = {
  type: 'vr_system',
  version: 1,
  fields: [
    { name: 'vr_type', type: 'string', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'simulation', type: 'object', required: true },
    { name: 'active_sessions', type: 'object', required: true },
    { name: 'max_concurrent_sessions', type: 'number', required: true },
    { name: 'max_participants_per_session', type: 'number', required: true },
  ],
  validate: (data: unknown): data is VRSystemComponent => {
    const d = data as any;
    return (
      d &&
      d.type === 'vr_system' &&
      typeof d.vr_type === 'string' &&
      typeof d.name === 'string'
    );
  },
  createDefault: () => createVRSystemComponent('shadow_realm', 'Default VR System'),
};
