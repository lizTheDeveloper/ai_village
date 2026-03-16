import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { VerificationSystem } from '../VerificationSystem';

import { ComponentType } from '../../types/ComponentType.js';
import { EventBusImpl } from '../../events/EventBus.js';
describe('VerificationSystem Debug', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let system: VerificationSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl(); world = new World(eventBus);
    system = new VerificationSystem();
    system.initialize(world, eventBus);
  });

  it('should find verifiers with correct component names', () => {
    const verifier = world.createEntity();
    verifier.addComponent('Agent', { id: 'bob' });
    verifier.addComponent('Position', { x: 100, y: 100 });
    verifier.addComponent('SocialGradient', {});

    // Test the filter used by VerificationSystem
    const entities = world.getAllEntities();
    const verifiers = entities.filter(e =>
      e.components.has(ComponentType.Agent) &&
      e.components.has(ComponentType.Position) &&
      e.components.has(ComponentType.SocialGradient)
    );

    expect(verifiers.length).toBe(1);
  });
});
