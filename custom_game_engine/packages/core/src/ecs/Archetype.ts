import type { Component } from './Component.js';

/**
 * An archetype defines a template for creating entities.
 * It specifies which components an entity should have and their default values.
 */
export interface Archetype {
  /** Unique name for this archetype */
  readonly name: string;

  /** Description of what this archetype represents */
  readonly description?: string;

  /** Factory function that creates the component set for this archetype */
  readonly create: () => Component[];
}

/**
 * Registry of all available archetypes.
 * Used by World.createEntity() to spawn entities from templates.
 */
export class ArchetypeRegistry {
  private archetypes = new Map<string, Archetype>();

  /**
   * Register an archetype.
   */
  register(archetype: Archetype): void {
    if (this.archetypes.has(archetype.name)) {
      throw new Error(`Archetype '${archetype.name}' is already registered`);
    }
    this.archetypes.set(archetype.name, archetype);
  }

  /**
   * Get an archetype by name.
   */
  get(name: string): Archetype | undefined {
    return this.archetypes.get(name);
  }

  /**
   * Check if an archetype exists.
   */
  has(name: string): boolean {
    return this.archetypes.has(name);
  }

  /**
   * Get all registered archetype names.
   */
  getNames(): string[] {
    return Array.from(this.archetypes.keys());
  }

  /**
   * Create components from an archetype.
   */
  createComponents(name: string): Component[] {
    const archetype = this.archetypes.get(name);
    if (!archetype) {
      throw new Error(`Archetype '${name}' not found. Available: ${this.getNames().join(', ')}`);
    }
    return archetype.create();
  }
}
