/**
 * Ship exterior view, shields, lasers, asteroids, hull, and section detachment events.
 */

export interface ShipExteriorEvents {
  // === Exterior View Events ===

  /** Player opened the exterior view */
  'ship:exterior_opened': Record<string, never>;

  /** Player closed the exterior view */
  'ship:exterior_closed': Record<string, never>;

  // === Shield Events ===

  /** Shield turned on or off */
  'ship:shield_toggled': {
    active: boolean;
    strength: number;
  };

  /** Shield reached 0 strength */
  'ship:shield_depleted': Record<string, never>;

  /** Shield absorbed incoming damage */
  'ship:shield_hit': {
    damage: number;
    remaining: number;
  };

  // === Laser Events ===

  /** Laser fired at a target */
  'ship:laser_fired': {
    charge_used: number;
    target?: string;
  };

  // === Impact & Damage Events ===

  /** Asteroid struck the ship */
  'ship:asteroid_impact': {
    damage: number;
    shielded: boolean;
  };

  /** Hull took direct damage */
  'ship:hull_damage': {
    severity: number;
    integrity: number;
  };

  /** Hull integrity dropped below a warning threshold */
  'ship:section_damage_warning': {
    threshold: number;
    integrity: number;
  };

  // === Section Detachment Events ===

  /** A ship section successfully detached */
  'ship:section_detached': {
    sectionId: string;
    sectionName: string;
    deckIndex: number;
  };

  /** Attempted to detach a section that is exempt from detachment */
  'ship:section_detach_denied': {
    sectionId: string;
    reason: string;
  };
}

export type ShipExteriorEventType = keyof ShipExteriorEvents;
export type ShipExteriorEventData = ShipExteriorEvents[ShipExteriorEventType];
