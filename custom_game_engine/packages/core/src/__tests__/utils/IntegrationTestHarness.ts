import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import { createTimeComponent } from '../../systems/TimeSystem.js';
import { AnimalComponent } from '../../components/AnimalComponent.js';
import type { Entity } from '../../ecs/Entity.js';
import type { System } from '../../ecs/System.js';
import type { BuildingType } from '../../components/BuildingComponent.js';

/**
 * Test configuration options
 */
export interface TestConfig {
  /** Initial game hour (0-24) */
  startHour?: number;
  /** Seconds per day */
  secondsPerDay?: number;
  /** Time speed multiplier */
  timeSpeed?: number;
  /** Include time entity automatically */
  includeTime?: boolean;
}

/**
 * Integration test harness providing utilities for multi-system tests
 */
export class IntegrationTestHarness {
  public world: WorldImpl;
  public eventBus: EventBusImpl;
  private timeEntity: EntityImpl | null = null;
  private systems: Map<string, System> = new Map();
  private emittedEvents: Array<{ type: string; data: any }> = [];

  constructor() {
    this.eventBus = new EventBusImpl();
    this.world = new WorldImpl(this.eventBus);

    // Capture all emitted events for assertions
    const originalEmit = this.eventBus.emit.bind(this.eventBus);
    this.eventBus.emit = (event: any) => {
      this.emittedEvents.push({ type: event.type, data: event.data });
      return originalEmit(event);
    };
  }

  /**
   * Setup test world with optional configuration
   */
  setupTestWorld(config: TestConfig = {}): void {
    const {
      startHour = 6,
      secondsPerDay = 48,
      timeSpeed = 1,
      includeTime = true,
    } = config;

    if (includeTime) {
      this.timeEntity = new EntityImpl(createEntityId(), 0);
      this.timeEntity.addComponent(createTimeComponent(startHour, secondsPerDay, timeSpeed));
      (this.world as any)._addEntity(this.timeEntity);
    }
  }

  /**
   * Fast-forward time by specified real-world seconds
   */
  advanceTime(seconds: number): void {
    if (!this.timeEntity) {
      throw new Error('Time entity not initialized. Call setupTestWorld with includeTime: true');
    }

    // Update all systems with the time delta
    for (const system of this.systems.values()) {
      const entities = Array.from(this.world.entities.values());
      system.update(this.world, entities, seconds);
    }
  }

  /**
   * Advance by specific number of ticks (each tick = 1/60 second)
   */
  tick(count: number = 1): void {
    const deltaTime = count / 60; // 60 ticks per second
    this.advanceTime(deltaTime);
  }

  /**
   * Create test agent with position and optional additional components
   */
  createTestAgent(position: { x: number; y: number }, traits?: any): EntityImpl {
    const agent = new EntityImpl(createEntityId(), 0);

    // Add position component
    agent.addComponent(createPositionComponent(position.x, position.y));

    // Add any additional traits/components
    if (traits) {
      Object.entries(traits).forEach(([key, value]) => {
        if (typeof value === 'object' && 'type' in value) {
          agent.addComponent(value);
        }
      });
    }

    (this.world as any)._addEntity(agent);
    return agent;
  }

  /**
   * Create test building at position
   */
  createTestBuilding(type: string, position: { x: number; y: number }): EntityImpl {
    const building = new EntityImpl(createEntityId(), 0);

    building.addComponent(createPositionComponent(position.x, position.y));
    building.addComponent(createBuildingComponent(type as BuildingType, 1, 100));

    (this.world as any)._addEntity(building);
    return building;
  }

  /**
   * Create test animal with species and position
   */
  createTestAnimal(species: string, position: { x: number; y: number }): EntityImpl {
    const animal = new EntityImpl(createEntityId(), 0);

    animal.addComponent(createPositionComponent(position.x, position.y));

    // Create proper animal component with all required fields
    animal.addComponent(new AnimalComponent({
      id: animal.id,
      speciesId: species,
      name: `Test ${species}`,
      position: { x: position.x, y: position.y },
      age: 30, // Adult age
      lifeStage: 'adult' as const,
      health: 100,
      size: 1.0,
      state: 'idle' as const,
      hunger: 50,
      thirst: 50,
      energy: 80,
      stress: 20,
      mood: 70,
      wild: true,
      bondLevel: 0,
      trustLevel: 50,
    }));

    (this.world as any)._addEntity(animal);
    return animal;
  }

  /**
   * Register a system for updates
   */
  registerSystem<T extends System>(name: string, system: T): T {
    this.systems.set(name, system);
    return system;
  }

  /**
   * Get system by type
   */
  getSystem<T extends System>(SystemClass: new (...args: any[]) => T): T {
    const systemName = SystemClass.name;
    const system = this.systems.get(systemName);

    if (!system) {
      throw new Error(`System ${systemName} not registered. Call registerSystem first.`);
    }

    return system as T;
  }

  /**
   * Assert that an event was emitted
   */
  assertEventEmitted(eventType: string, expectedData?: any): void {
    const matchingEvents = this.emittedEvents.filter(e => e.type === eventType);

    if (matchingEvents.length === 0) {
      throw new Error(`Expected event '${eventType}' was not emitted`);
    }

    if (expectedData !== undefined) {
      const matchesData = matchingEvents.some(event => {
        return Object.entries(expectedData).every(([key, value]) => {
          return event.data[key] === value;
        });
      });

      if (!matchesData) {
        throw new Error(
          `Event '${eventType}' was emitted but did not match expected data.\n` +
          `Expected: ${JSON.stringify(expectedData)}\n` +
          `Actual: ${JSON.stringify(matchingEvents.map(e => e.data))}`
        );
      }
    }
  }

  /**
   * Get all emitted events of a specific type
   */
  getEmittedEvents(eventType: string): Array<{ type: string; data: any }> {
    return this.emittedEvents.filter(e => e.type === eventType);
  }

  /**
   * Clear the event log
   */
  clearEvents(): void {
    this.emittedEvents = [];
  }

  /**
   * Get the current game time in hours (0-24)
   */
  getGameHour(): number {
    if (!this.timeEntity) {
      throw new Error('Time entity not initialized');
    }
    const timeComponent = this.timeEntity.getComponent('time') as any;
    // TimeComponent uses timeOfDay (0-24), not currentHour
    return timeComponent.timeOfDay;
  }

  /**
   * Set the game time to a specific hour
   */
  setGameHour(hour: number): void {
    if (!this.timeEntity) {
      throw new Error('Time entity not initialized');
    }
    const timeComponent = this.timeEntity.getComponent('time') as any;
    // TimeComponent uses timeOfDay (0-24), not currentHour
    timeComponent.timeOfDay = hour % 24;
  }

  /**
   * Cleanup all state
   */
  teardown(): void {
    this.systems.clear();
    this.emittedEvents = [];
    this.timeEntity = null;
    // World and eventBus will be garbage collected
  }
}
