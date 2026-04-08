import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { getAnimalSpecies } from '../data/animalSpecies.js';
import { getSpeciesTemplate, type InterspeciesDisposition } from '../species/SpeciesRegistry.js';

// Detection and interaction ranges (in world units, squared for performance)
const PREDATOR_DETECTION_RANGE_SQ = 225; // 15 units
const ATTACK_RANGE_SQ = 9;              // 3 units — predator must be very close to catch prey

/**
 * PredatorPreyEcologySystem — simulates predator hunting and prey fleeing
 *
 * Priority: 64 (just before AnimalSystem at 65)
 * Throttle: every 10 ticks = 0.5 seconds (fast enough for believable reactions)
 *
 * Responsibilities:
 * - Carnivores with high hunger (> 60) scan for nearby herbivores → 'hunting' state
 * - Prey animals near predators spike stress and transition to 'fleeing'
 * - When a predator closes within attack range of stressed prey: catch event
 *   (reduce prey health by 50, reset predator hunger to 0)
 * - Prey that has been "caught" (health reduced to 0) stays dead — handled by AnimalSystem
 */
export class PredatorPreyEcologySystem extends BaseSystem {
  public readonly id: SystemId = 'predator_prey_ecology';
  public readonly priority: number = 64;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Animal];
  protected readonly throttleInterval = 60; // Every 3 seconds (population dynamics are slow-changing)

  protected onUpdate(ctx: SystemContext): void {
    const animals = ctx.activeEntities;

    // Partition into predators and prey for this tick
    const predators: Array<{ animal: AnimalComponent }> = [];
    const prey: Array<{ animal: AnimalComponent }> = [];

    for (const entity of animals) {
      const animal = entity.getComponent<AnimalComponent>('animal');
      if (!animal) continue;
      if (animal.health <= 0) continue; // Skip dead animals

      try {
        const species = getAnimalSpecies(animal.speciesId);
        if (species.diet === 'carnivore') {
          predators.push({ animal });
        } else if (species.diet === 'herbivore') {
          prey.push({ animal });
        }
        // Omnivores are neither active hunters nor primary prey in this simple model
      } catch {
        // Unknown species — skip
      }
    }

    // Each predator scans for prey
    for (const { animal: predator } of predators) {
      this.processPredator(predator, prey);
    }

    // Each prey checks for nearby predators
    for (const { animal: preyAnimal } of prey) {
      this.processPrey(preyAnimal, predators);
    }
  }

  private processPredator(
    predator: AnimalComponent,
    preyList: Array<{ animal: AnimalComponent }>
  ): void {
    // Only hunt when hungry (> 60) and not already fleeing
    if (predator.hunger < 60 || predator.state === 'fleeing') {
      if (predator.state === 'hunting') {
        predator.state = 'idle'; // Satiated — stop hunting
      }
      return;
    }

    // Find nearest prey within detection range
    let nearestPreyDist = Infinity;
    let nearestPrey: AnimalComponent | null = null;

    for (const { animal: preyAnimal } of preyList) {
      if (preyAnimal.health <= 0) continue;

      const disposition = this.resolveDisposition(predator.speciesId, preyAnimal.speciesId);
      if (disposition && !this.isPredatoryDisposition(disposition)) {
        continue;
      }

      const distSq = this.distanceSq(predator, preyAnimal);
      if (distSq <= PREDATOR_DETECTION_RANGE_SQ && distSq < nearestPreyDist) {
        nearestPreyDist = distSq;
        nearestPrey = preyAnimal;
      }
    }

    if (nearestPrey === null) {
      // No prey in range — revert to idle/foraging
      if (predator.state === 'hunting') predator.state = 'foraging';
      return;
    }

    // Enter hunting state
    predator.state = 'hunting';

    // Catch if within attack range
    if (nearestPreyDist <= ATTACK_RANGE_SQ) {
      this.catchPrey(predator, nearestPrey);
    }
  }

  private processPrey(
    preyAnimal: AnimalComponent,
    predatorList: Array<{ animal: AnimalComponent }>
  ): void {
    let nearestPredatorDistSq = Infinity;

    for (const { animal: predator } of predatorList) {
      if (predator.health <= 0) continue;

      const predatorDisposition = this.resolveDisposition(predator.speciesId, preyAnimal.speciesId);
      const preyDisposition = this.resolveDisposition(preyAnimal.speciesId, predator.speciesId);

      const predatorIsThreat =
        predator.state === 'hunting' &&
        (predatorDisposition === undefined || this.isPredatoryDisposition(predatorDisposition));
      const preyIsFearful = preyDisposition === 'fearful';

      // Flee from hunting predators unless contract says they are non-hostile,
      // or if prey species has an explicit fearful disposition.
      if (!predatorIsThreat && !preyIsFearful) continue;

      const distSq = this.distanceSq(preyAnimal, predator);
      if (distSq < nearestPredatorDistSq) {
        nearestPredatorDistSq = distSq;
      }
    }

    if (nearestPredatorDistSq <= PREDATOR_DETECTION_RANGE_SQ) {
      // Predator detected — spike stress and flee
      preyAnimal.stress = Math.min(100, preyAnimal.stress + 30);
      if (preyAnimal.state !== 'fleeing') {
        preyAnimal.state = 'fleeing';
      }
    } else if (preyAnimal.state === 'fleeing') {
      // No predators nearby — gradually calm down
      preyAnimal.stress = Math.max(0, preyAnimal.stress - 5);
      if (preyAnimal.stress < 20) {
        preyAnimal.state = 'idle';
      }
    }
  }

  private catchPrey(predator: AnimalComponent, prey: AnimalComponent): void {
    // Predator catches prey — deal significant damage
    prey.health = Math.max(0, prey.health - 50);
    // Predator is now fed
    predator.hunger = Math.max(0, predator.hunger - 70);
    predator.state = 'eating';
  }

  private distanceSq(a: AnimalComponent, b: AnimalComponent): number {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    return dx * dx + dy * dy;
  }

  private isPredatoryDisposition(disposition: InterspeciesDisposition): boolean {
    return disposition === 'predatory' || disposition === 'competitive';
  }

  private resolveDisposition(
    sourceSpeciesId: string,
    targetSpeciesId: string,
  ): InterspeciesDisposition | undefined {
    const profile = this.resolveBehaviorProfile(sourceSpeciesId);
    if (!profile) return undefined;

    const relation = profile.interspeciesRelations.find((entry) =>
      this.speciesIdMatches(entry.targetSpeciesId, targetSpeciesId),
    );
    return relation?.disposition;
  }

  private resolveBehaviorProfile(speciesId: string) {
    const direct = getSpeciesTemplate(speciesId);
    if (direct?.speciesBehaviorProfile) return direct.speciesBehaviorProfile;

    if (speciesId.startsWith('folkfork_')) {
      const unprefixed = getSpeciesTemplate(speciesId.slice('folkfork_'.length));
      if (unprefixed?.speciesBehaviorProfile) return unprefixed.speciesBehaviorProfile;
    }

    const prefixed = getSpeciesTemplate(`folkfork_${speciesId}`);
    return prefixed?.speciesBehaviorProfile;
  }

  private speciesIdMatches(registeredId: string, runtimeId: string): boolean {
    return (
      registeredId === runtimeId ||
      `folkfork_${registeredId}` === runtimeId ||
      registeredId === `folkfork_${runtimeId}`
    );
  }
}
