import type { Component } from '../ecs/Component.js';

export interface AsteroidField {
  density: number;        // 0-1, 0 = empty space, 1 = dense field
  damagePerTick: number;  // hull damage per tick when unshielded
  asteroidCount: number;  // current asteroid count for rendering
}

export interface ShipExteriorComponent extends Component {
  type: 'ship_exterior';
  viewActive: boolean;             // is exterior view currently shown
  galacticPosition: { x: number; y: number; z: number };  // position in galaxy
  velocity: { x: number; y: number; z: number };          // travel velocity
  asteroidField: AsteroidField;
  shieldActive: boolean;
  shieldStrength: number;          // 0-1
  shieldMaxStrength: number;
  shieldRechargeRate: number;      // per tick
  laserActive: boolean;
  laserCharge: number;             // 0-1
  laserMaxCharge: number;
  laserRechargeRate: number;       // per tick
  laserDamage: number;             // damage per shot
  hullIntegrity: number;           // 0-1
  detachableSections: ShipSectionState[];
}

export interface ShipSectionState {
  id: string;
  name: string;
  deckIndex: number;
  isDetached: boolean;
  isExempt: boolean;   // command module + adjacent special room
  detachedAt?: number; // tick when detached
}
