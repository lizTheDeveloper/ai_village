/**
 * MaterialTrait - For items that are building/crafting materials with special properties
 *
 * Supports surreal materials from GENERATIVE_CITIES_SPEC.md:
 * - Living materials (flesh, fungus, wood, clay, fire, clockwork)
 * - Transient materials (candy, shadow, dream, ice, smoke, etc.)
 * - Environmental requirements (light, dark, heat, cold, sound, dreams)
 * - Material interactions and transformations
 *
 * Integration with Phase 30 Magic System.
 */

/**
 * Material properties that define behavior in the world
 */
export interface MaterialTrait {
  // ========== Material Nature ==========

  /** Is this material alive (can grow, bleed, needs feeding)? */
  readonly isLiving: boolean;

  /** Can this material be eaten? */
  readonly isEdible: boolean;

  /** Does this material fade/melt/dissolve over time? */
  readonly isTransient: boolean;

  /** Is this material solid or fluid/gas? */
  readonly isSolid: boolean;

  // ========== Environmental Requirements ==========

  /** Requires light to remain stable (withers in darkness) */
  readonly requiresLight?: boolean;

  /** Requires darkness to exist (dissolves in light) */
  readonly requiresDark?: boolean;

  /** Requires heat to stay solid (melts without heat) */
  readonly requiresHeat?: boolean;

  /** Requires cold to stay solid (melts in heat) */
  readonly requiresCold?: boolean;

  /** Requires sound/music to stay stable */
  readonly requiresSound?: boolean;

  /** Requires nearby sleeping minds/dreams */
  readonly requiresDreams?: boolean;

  // ========== Decay and Danger ==========

  /** How fast this material degrades (0 = stable, 1 = very fast) */
  readonly decayRate: number;

  /** How dangerous this material is to inhabitants (0 = safe, 1 = deadly) */
  readonly hostility: number;

  // ========== Transformation ==========

  /** What happens when environmental requirements aren't met */
  readonly transmutation?: string;

  /** Items that can be harvested from this material */
  readonly harvestable?: readonly string[]; // Item IDs

  /** Crafting recipe to create this material (if craftable) */
  readonly craftableFrom?: readonly { itemId: string; amount: number }[];

  // ========== Magic Integration ==========

  /** Magic paradigms compatible with this material */
  readonly magicAffinities?: readonly string[];  // e.g., ['umbramancy', 'somnomancy']

  /** Spells that can be cast using this material as a component */
  readonly spellComponents?: readonly string[];  // Spell IDs

  /** Mana stored per unit of material (for magical materials) */
  readonly manaPerUnit?: number;

  // ========== Aesthetic ==========

  /** Visual/sensory description for rendering and narrative */
  readonly aestheticDescription: string;

  // ========== Building Properties ==========

  /** Can this be used as a building material? */
  readonly isBuildingMaterial: boolean;

  /** Structural integrity (0-100, affects building health) */
  readonly structuralStrength?: number;

  /** Temperature resistance (-100 = freezes easily, +100 = fire-proof) */
  readonly temperatureResistance?: number;

  /** Moisture resistance (0 = dissolves in water, 100 = waterproof) */
  readonly moistureResistance?: number;
}
