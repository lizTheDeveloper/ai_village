import type { Component } from '../ecs/Component.js';

export interface AsteroidField {
  density: number;        // 0-1, 0 = empty space, 1 = dense field
  damagePerTick: number;  // hull damage per tick when unshielded
  asteroidCount: number;  // current asteroid count for rendering
}

export type ShipAwarenessState =
  | 'dormant'   // low activity, low threat
  | 'scanning'  // normal active scan baseline
  | 'alert'     // elevated threat or instability
  | 'critical'; // emergency risk band

export interface ShipAwarenessModel {
  state: ShipAwarenessState;
  level: number; // 0-1 composite awareness signal
  lastStateChangeTick: number;
  transitionBoost: number; // 0-1, decays after transitions to accelerate pulse briefly
}

export interface ShipHeartbeatModel {
  baseCadenceHz: number; // cadence from awareness state only
  cadenceHz: number; // final cadence with transition acceleration
  phase: number; // 0-1 running phase used by renderer/effects
  pulseStrength: number; // 0-1 visual intensity
  lastPulseTick: number;
  beats: number; // cumulative beat count for telemetry/debug
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
  awareness: ShipAwarenessModel;
  heartbeat: ShipHeartbeatModel;
}

export interface ShipSectionState {
  id: string;
  name: string;
  deckIndex: number;
  isDetached: boolean;
  isExempt: boolean;   // command module + adjacent special room
  detachedAt?: number; // tick when detached
}
