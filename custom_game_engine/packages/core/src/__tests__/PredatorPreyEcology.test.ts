import { describe, it, expect, beforeEach } from 'vitest';
import { AnimalComponent } from '../components/AnimalComponent.js';
import { PredatorPreyEcologySystem } from '../systems/PredatorPreyEcologySystem.js';
import type { SystemContext } from '../ecs/SystemContext.js';

// Uses real species IDs from animal-species.json:
//   'cat'    → carnivore
//   'trogdor' → carnivore
//   'cow'    → herbivore
//   'sheep'  → herbivore

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function makeAnimal(overrides: Partial<{
  speciesId: string;
  x: number;
  y: number;
  hunger: number;
  health: number;
  stress: number;
  state: AnimalComponent['state'];
}>): AnimalComponent {
  idCounter++;
  return new AnimalComponent({
    id: `animal-${idCounter}`,
    speciesId: overrides.speciesId ?? 'cow',
    name: `Animal-${idCounter}`,
    position: { x: overrides.x ?? 0, y: overrides.y ?? 0 },
    age: 100,
    lifeStage: 'adult',
    health: overrides.health ?? 100,
    size: 1,
    state: overrides.state ?? 'idle',
    hunger: overrides.hunger ?? 0,
    thirst: 0,
    energy: 100,
    stress: overrides.stress ?? 0,
    mood: 50,
    wild: true,
    bondLevel: 0,
    trustLevel: 0,
  });
}

/**
 * Build a minimal SystemContext mock.
 * The system only uses ctx.activeEntities — everything else is stubbed.
 */
function makeCtx(animals: AnimalComponent[]): SystemContext {
  const entityList = animals.map((a) => ({
    id: a.id,
    getComponent: (type: string) => (type === 'animal' ? a : undefined),
    hasComponent: (type: string) => type === 'animal',
  }));

  return {
    activeEntities: entityList,
    world: {},
    tick: 0,
    deltaTime: 0.05,
    events: { emit: () => {}, on: () => {}, cleanup: () => {} },
    components: () => { throw new Error('Not implemented in mock'); },
    getNearbyEntities: () => [],
    getNearestEntity: () => null,
    hasEntityInRadius: () => false,
    emit: () => {},
    getSingleton: () => null,
  } as unknown as SystemContext;
}

/**
 * Calls the protected `onUpdate` method via a cast.
 * Necessary because the public `update()` has an events-guard that requires
 * async initialization before it will run.
 */
function callOnUpdate(system: PredatorPreyEcologySystem, ctx: SystemContext): void {
  (system as unknown as { onUpdate(ctx: SystemContext): void }).onUpdate(ctx);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PredatorPreyEcologySystem', () => {
  let system: PredatorPreyEcologySystem;

  beforeEach(() => {
    idCounter = 0;
    system = new PredatorPreyEcologySystem();
  });

  it('hungry predator near prey → predator state becomes hunting, prey state becomes fleeing', () => {
    // cat is a real carnivore; cow is a real herbivore
    const predator = makeAnimal({ speciesId: 'cat', hunger: 80, x: 0, y: 0 });
    const prey = makeAnimal({ speciesId: 'cow', x: 5, y: 0 }); // distSq=25, within 225 detection range

    callOnUpdate(system, makeCtx([predator, prey]));

    expect(predator.state).toBe('hunting');
    expect(prey.state).toBe('fleeing');
    expect(prey.stress).toBeGreaterThan(0);
  });

  it('predator within attack range catches prey — prey loses health, predator hunger decreases', () => {
    const predator = makeAnimal({ speciesId: 'cat', hunger: 80, x: 0, y: 0 });
    const prey = makeAnimal({ speciesId: 'cow', x: 2, y: 0 }); // distSq=4, within attack range of 9

    callOnUpdate(system, makeCtx([predator, prey]));

    expect(prey.health).toBe(50);     // 100 − 50 damage
    expect(predator.hunger).toBe(10); // 80 − 70
    expect(predator.state).toBe('eating');
  });

  it('satiated predator (hunger < 60) stays idle and does not hunt', () => {
    const predator = makeAnimal({ speciesId: 'cat', hunger: 30, x: 0, y: 0 });
    const prey = makeAnimal({ speciesId: 'cow', x: 5, y: 0 });

    callOnUpdate(system, makeCtx([predator, prey]));

    expect(predator.state).toBe('idle');
    expect(prey.state).toBe('idle'); // prey should not flee from a non-hunting predator
  });

  it('hungry predator with no prey in range reverts from hunting to foraging', () => {
    const predator = makeAnimal({ speciesId: 'cat', hunger: 80, state: 'hunting', x: 0, y: 0 });
    const farPrey = makeAnimal({ speciesId: 'cow', x: 100, y: 0 }); // distSq=10000 > 225

    callOnUpdate(system, makeCtx([predator, farPrey]));

    expect(predator.state).toBe('foraging');
  });

  it('prey calms down when no hunting predators nearby', () => {
    // Prey is currently fleeing with stress just below the calm threshold boundary
    const prey = makeAnimal({ speciesId: 'cow', state: 'fleeing', stress: 15, x: 0, y: 0 });
    // Predator present but satiated — not in hunting state
    const satiated = makeAnimal({ speciesId: 'cat', hunger: 10, x: 5, y: 0 });

    callOnUpdate(system, makeCtx([satiated, prey]));

    // stress 15 − 5 = 10; 10 < 20 → state reverts to idle
    expect(prey.stress).toBe(10);
    expect(prey.state).toBe('idle');
  });

  it('omnivores are not treated as predators or prey', () => {
    // pig is a real omnivore
    const omnivore = makeAnimal({ speciesId: 'pig', hunger: 80, x: 0, y: 0 });
    const herbivore = makeAnimal({ speciesId: 'cow', x: 5, y: 0 });

    callOnUpdate(system, makeCtx([omnivore, herbivore]));

    expect(omnivore.state).toBe('idle');
    expect(herbivore.state).toBe('idle');
  });

  it('dead animals (health <= 0) are skipped', () => {
    const deadPredator = makeAnimal({ speciesId: 'cat', hunger: 90, health: 0, x: 0, y: 0 });
    const prey = makeAnimal({ speciesId: 'cow', x: 5, y: 0 });

    callOnUpdate(system, makeCtx([deadPredator, prey]));

    expect(prey.state).toBe('idle'); // Dead predator should not trigger flee
  });

  it('system has correct id and priority', () => {
    expect(system.id).toBe('predator_prey_ecology');
    expect(system.priority).toBe(64);
  });
});
