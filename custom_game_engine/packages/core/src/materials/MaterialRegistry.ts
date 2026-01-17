import { MaterialTemplate, MaterialCategory } from './MaterialTemplate';

/**
 * Registry for material templates.
 * Singleton pattern - all materials registered here.
 */
export class MaterialRegistry {
  private static instance: MaterialRegistry | null = null;
  private materials: Map<string, MaterialTemplate> = new Map();

  private constructor() {}

  public static getInstance(): MaterialRegistry {
    if (!MaterialRegistry.instance) {
      MaterialRegistry.instance = new MaterialRegistry();
    }
    return MaterialRegistry.instance;
  }

  /**
   * Register a material template.
   * @throws Error if material ID already exists
   */
  public register(material: MaterialTemplate): void {
    if (this.materials.has(material.id)) {
      throw new Error(`Material '${material.id}' is already registered`);
    }
    this.materials.set(material.id, material);
  }

  /**
   * Get a material template by ID.
   * @throws Error if material doesn't exist
   */
  public get(id: string): MaterialTemplate {
    const material = this.materials.get(id);
    if (!material) {
      throw new Error(`Material not found: ${id}`);
    }
    return material;
  }

  /**
   * Check if a material exists.
   */
  public has(id: string): boolean {
    return this.materials.has(id);
  }

  /**
   * Get all registered materials.
   */
  public getAll(): MaterialTemplate[] {
    return Array.from(this.materials.values());
  }

  /**
   * Get materials by category.
   */
  public getByCategory(category: MaterialCategory): MaterialTemplate[] {
    return this.getAll().filter((m) => m.categories.includes(category));
  }

  /**
   * Clear all materials (for testing).
   */
  public clear(): void {
    this.materials.clear();
  }

  /**
   * Reset singleton instance (for testing).
   */
  public static reset(): void {
    if (MaterialRegistry.instance) {
      MaterialRegistry.instance.clear();
      MaterialRegistry.instance = null;
    }
  }
}

// Export singleton getter
export const materialRegistry = MaterialRegistry.getInstance();
