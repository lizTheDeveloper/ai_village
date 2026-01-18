/**
 * Courtship System Exports
 *
 * Main entry point for the courtship system.
 */

// Types
export * from './types';

// Component
export { CourtshipComponent } from './CourtshipComponent';
import { CourtshipComponent } from './CourtshipComponent';
import { getCourtshipParadigm } from './paradigms';

// Tactics
export {
  UNIVERSAL_TACTICS,
  DWARF_TACTICS,
  BIRD_FOLK_TACTICS,
  MYSTIF_TACTICS,
  NEGATIVE_TACTICS,
  ALL_TACTICS,
  TACTICS_BY_ID,
  getTactic,
  getTacticsByCategory,
  getTacticsForSpecies,
} from './tactics';

// Paradigms
export {
  HUMAN_COURTSHIP_PARADIGM,
  DWARF_COURTSHIP_PARADIGM,
  BIRD_FOLK_COURTSHIP_PARADIGM,
  MYSTIF_COURTSHIP_PARADIGM,
  ELF_COURTSHIP_PARADIGM,
  DEFAULT_COURTSHIP_PARADIGM,
  PARADIGMS_BY_SPECIES,
  getCourtshipParadigm,
  createCourtshipParadigmForSpecies,
} from './paradigms';

// Compatibility
export {
  calculateSexualCompatibility,
  calculatePersonalityMesh,
  calculateSharedInterests,
  calculateRelationshipStrength,
  calculateCompatibility,
  calculateConceptionProbability,
  calculateBondStrength,
  attemptConception,
} from './compatibility';

// State Machine
export { CourtshipStateMachine } from './CourtshipStateMachine';

// Helper function to create courtship component
export function createCourtshipComponent(speciesId: string = 'human'): CourtshipComponent {
  const paradigm = getCourtshipParadigm(speciesId);

  // Random romantic inclination (0.3-0.9)
  const romanticInclination = 0.3 + Math.random() * 0.6;

  // Random style
  const styles: Array<import('./types').CourtshipStyle> = [
    'bold', 'subtle', 'traditional', 'creative', 'pragmatic', 'romantic'
  ];
  const style = styles[Math.floor(Math.random() * styles.length)]!;

  // Select preferred tactics based on paradigm
  const preferredTactics = [
    ...paradigm.requiredTactics,
    ...paradigm.optionalTactics.slice(0, 2), // Pick 2 optional tactics
  ];

  // Disliked tactics are forbidden tactics
  const dislikedTactics = [...paradigm.forbiddenTactics];

  return new CourtshipComponent({
    paradigm,
    preferredTactics,
    dislikedTactics,
    style,
    romanticInclination,
    lastCourtshipAttempt: -10000, // Start off-cooldown (far in the past)
  });
}

/**
 * Ensure an entity has a courtship component, adding it lazily if needed.
 * This should be called when an entity becomes actively seeking courtship.
 *
 * @param entity - The entity to ensure has a courtship component
 * @param speciesId - The species ID to use for creating the component
 * @returns The courtship component (existing or newly created)
 */
export function ensureCourtshipComponent(
  entity: import('../../ecs/Entity').Entity,
  speciesId: string
): CourtshipComponent {
  const CT = { Courtship: 'courtship' as const };
  let comp = entity.getComponent<CourtshipComponent>(CT.Courtship);
  if (!comp) {
    comp = createCourtshipComponent(speciesId);
    // Entity interface with addComponent method
    interface EntityWithAddComponent {
      addComponent(component: CourtshipComponent): void;
    }
    (entity as unknown as EntityWithAddComponent).addComponent(comp);
  }
  return comp;
}
