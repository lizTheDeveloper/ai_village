/**
 * Serializer for CourtshipComponent - properly reconstructs class instance with methods
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { CourtshipComponent } from '@ai-village/reproduction';
import type {
  CourtshipState,
  CourtshipStyle,
  ActiveCourtship,
  ReceivedCourtship,
  PastCourtship,
} from '@ai-village/reproduction';
import type { CourtshipParadigm } from '@ai-village/reproduction';

interface SerializedCourtship {
  state: CourtshipState;
  currentCourtshipTarget: string | null;
  currentCourtshipInitiator: string | null;
  paradigm: CourtshipParadigm;
  preferredTactics: string[];
  dislikedTactics: string[];
  style: CourtshipStyle;
  romanticInclination: number;
  activeCourtships: ActiveCourtship[];
  receivedCourtships: ReceivedCourtship[];
  pastCourtships: PastCourtship[];
  lastCourtshipAttempt: number;
  courtshipCooldown: number;
  rejectionCooldown: Array<[string, number]>;
}

export class CourtshipSerializer extends BaseComponentSerializer<CourtshipComponent> {
  constructor() {
    super('courtship', 1);
  }

  protected serializeData(component: CourtshipComponent): SerializedCourtship {
    // Convert Map to array of entries for JSON serialization
    // Handle undefined rejectionCooldown (may be missing on older components)
    const rejectionCooldown: Array<[string, number]> = component.rejectionCooldown
      ? Array.from(component.rejectionCooldown.entries())
      : [];
    return {
      state: component.state,
      currentCourtshipTarget: component.currentCourtshipTarget,
      currentCourtshipInitiator: component.currentCourtshipInitiator,
      paradigm: component.paradigm,
      preferredTactics: component.preferredTactics,
      dislikedTactics: component.dislikedTactics,
      style: component.style,
      romanticInclination: component.romanticInclination,
      activeCourtships: component.activeCourtships,
      receivedCourtships: component.receivedCourtships,
      pastCourtships: component.pastCourtships,
      lastCourtshipAttempt: component.lastCourtshipAttempt,
      courtshipCooldown: component.courtshipCooldown,
      rejectionCooldown,
    };
  }

  protected deserializeData(data: unknown): CourtshipComponent {
    const serialized = data as SerializedCourtship;

    // Provide default paradigm for older saves that don't have it
    const defaultParadigm = {
      type: 'romantic' as const,
      requiredTactics: [],
      optionalTactics: ['gifts', 'quality_time', 'compliments'],
      forbiddenTactics: [],
      minimumTactics: 1,
      typicalDuration: [100, 500] as [number, number],
      locationRequirement: null,
      matingBehavior: {
        requiresPrivacy: true,
        seasonalRestriction: null,
        cooldownTicks: 1000,
      },
    };

    // Create new component instance using constructor
    const component = new CourtshipComponent({
      state: serialized.state,
      currentCourtshipTarget: serialized.currentCourtshipTarget,
      currentCourtshipInitiator: serialized.currentCourtshipInitiator,
      paradigm: serialized.paradigm || defaultParadigm,
      preferredTactics: serialized.preferredTactics,
      dislikedTactics: serialized.dislikedTactics,
      style: serialized.style,
      romanticInclination: serialized.romanticInclination,
      activeCourtships: serialized.activeCourtships,
      receivedCourtships: serialized.receivedCourtships,
      pastCourtships: serialized.pastCourtships,
      lastCourtshipAttempt: serialized.lastCourtshipAttempt,
      courtshipCooldown: serialized.courtshipCooldown,
      rejectionCooldown: new Map(serialized.rejectionCooldown || []),
    });

    return component;
  }

  validate(data: unknown): data is CourtshipComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('CourtshipComponent data must be object');
    }
    const d = data as Record<string, unknown>;

    // Validate required fields (that should always be present)
    if (!d.state) {
      throw new Error('CourtshipComponent missing required state field');
    }
    if (!Array.isArray(d.preferredTactics)) {
      throw new Error('CourtshipComponent missing required preferredTactics array');
    }
    if (!Array.isArray(d.dislikedTactics)) {
      throw new Error('CourtshipComponent missing required dislikedTactics array');
    }
    if (!Array.isArray(d.activeCourtships)) {
      throw new Error('CourtshipComponent missing required activeCourtships array');
    }
    if (!Array.isArray(d.receivedCourtships)) {
      throw new Error('CourtshipComponent missing required receivedCourtships array');
    }
    if (!Array.isArray(d.pastCourtships)) {
      throw new Error('CourtshipComponent missing required pastCourtships array');
    }

    // Don't require paradigm or rejectionCooldown - older saves may not have them
    // The deserializeData method will provide defaults

    return true;
  }
}
