import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World';
import { VerificationSystem } from '../VerificationSystem';

describe('VerificationSystem Debug', () => {
  let world: World;
  let system: VerificationSystem;

  beforeEach(() => {
    world = new World();
    system = new VerificationSystem();
    system.initialize(world, world.eventBus);
  });

  it('should find verifiers with correct component names', () => {
    const verifier = world.createEntity();
    verifier.addComponent('Agent', { id: 'bob' });
    verifier.addComponent('Position', { x: 100, y: 100 });
    verifier.addComponent('SocialGradient', {});

    console.log('\n=== DEBUG: Component names on entity ===');
    for (const [key, value] of verifier.components.entries()) {
      console.log(`  "${key}": (type field: "${(value as any).type || 'N/A'}")`);
    }

    console.log('\n=== DEBUG: Component checks ===');
    console.log('  has("agent"):', verifier.components.has('agent'));
    console.log('  has("position"):', verifier.components.has('position'));
    console.log('  has("social_gradient"):', verifier.components.has('social_gradient'));

    // Test the filter used by VerificationSystem
    const entities = world.getAllEntities();
    const verifiers = entities.filter(e =>
      e.components.has('agent') &&
      e.components.has('position') &&
      e.components.has('social_gradient')
    );

    console.log('\n=== DEBUG: Verifier filter results ===');
    console.log(`  Total entities: ${entities.length}`);
    console.log(`  Verifiers found: ${verifiers.length}`);

    expect(verifiers.length).toBe(1);
  });
});
