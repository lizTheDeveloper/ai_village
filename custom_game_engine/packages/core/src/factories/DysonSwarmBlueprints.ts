/**
 * Dyson Swarm Factory City Blueprints
 *
 * Complete mega-factory blueprint for producing Dyson Swarm components.
 * Organized into districts, each handling specific production chains.
 */

import type { FactoryBlueprint } from './FactoryBlueprintGenerator.js';

/**
 * Tier 1: Iron Plate Production District
 * Raw iron ore → iron plates for construction
 */
export const IRON_PLATE_DISTRICT: FactoryBlueprint = {
  id: 'iron_plate_district',
  name: 'Iron Plate Production District',
  size: { width: 50, height: 30 },

  machines: [
    // 10 smelters in a row
    { machineItemId: 'electric_furnace', offset: { x: 10, y: 10 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 10, y: 12 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 10, y: 14 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 10, y: 16 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 10, y: 18 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 15, y: 10 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 15, y: 12 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 15, y: 14 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 15, y: 16 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'electric_furnace', offset: { x: 15, y: 18 }, recipe: 'iron_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
  ],

  belts: [
    // Input belt line (iron ore)
    { offset: { x: 5, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 6, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 7, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 8, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 9, y: 10 }, direction: 'east', tier: 3 },
    // Output belt line (iron plates)
    { offset: { x: 20, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 21, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 22, y: 10 }, direction: 'east', tier: 3 },
  ],

  power: [
    { offset: { x: 0, y: 0 }, powerType: 'electrical', generation: 10000 },
    { offset: { x: 0, y: 5 }, powerType: 'electrical', generation: 10000 },
  ],

  productionGoal: {
    outputItemId: 'iron_plate',
    targetRate: 600, // 600 plates per minute
  },

  powerRequired: 10000,
  powerGeneration: 20000,
};

/**
 * Tier 2: Steel Production District
 * Iron plates → steel plates for advanced construction
 */
export const STEEL_DISTRICT: FactoryBlueprint = {
  id: 'steel_district',
  name: 'Steel Production District',
  size: { width: 50, height: 30 },

  machines: [
    // 5 steel furnaces (slower, more expensive)
    { machineItemId: 'steel_furnace', offset: { x: 10, y: 10 }, recipe: 'steel_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'steel_furnace', offset: { x: 10, y: 14 }, recipe: 'steel_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'steel_furnace', offset: { x: 10, y: 18 }, recipe: 'steel_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'steel_furnace', offset: { x: 15, y: 12 }, recipe: 'steel_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'steel_furnace', offset: { x: 15, y: 16 }, recipe: 'steel_plate', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
  ],

  belts: [
    // Input (iron plates from previous district)
    { offset: { x: 5, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 6, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 7, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 8, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 9, y: 10 }, direction: 'east', tier: 3 },
  ],

  power: [
    { offset: { x: 0, y: 0 }, powerType: 'electrical', generation: 5000 },
  ],

  productionGoal: {
    outputItemId: 'steel_plate',
    targetRate: 120, // 120 steel per minute
  },

  powerRequired: 5000,
  powerGeneration: 5000,
};

/**
 * Tier 3: Electronic Circuit District
 * Copper wire + iron plates → circuits for computer chips
 */
export const CIRCUIT_DISTRICT: FactoryBlueprint = {
  id: 'circuit_district',
  name: 'Electronic Circuit District',
  size: { width: 60, height: 40 },

  machines: [
    // Copper wire production (6 machines)
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 10 }, recipe: 'copper_wire', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 12 }, recipe: 'copper_wire', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 14 }, recipe: 'copper_wire', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 16 }, recipe: 'copper_wire', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 18 }, recipe: 'copper_wire', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 10, y: 20 }, recipe: 'copper_wire', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },

    // Circuit assembly (12 machines - circuits are expensive)
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 10 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 12 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 14 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 16 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 18 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 20 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 11 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 13 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 15 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 17 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 19 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 21 }, recipe: 'electronic_circuit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
  ],

  belts: [
    // Copper input
    { offset: { x: 5, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 6, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 7, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 8, y: 10 }, direction: 'east', tier: 3 },
    { offset: { x: 9, y: 10 }, direction: 'east', tier: 3 },
    // Iron input
    { offset: { x: 5, y: 25 }, direction: 'east', tier: 3 },
    { offset: { x: 6, y: 25 }, direction: 'east', tier: 3 },
    { offset: { x: 7, y: 25 }, direction: 'east', tier: 3 },
  ],

  power: [
    { offset: { x: 0, y: 0 }, powerType: 'electrical', generation: 15000 },
    { offset: { x: 5, y: 0 }, powerType: 'electrical', generation: 15000 },
  ],

  productionGoal: {
    outputItemId: 'electronic_circuit',
    targetRate: 300, // 300 circuits per minute
  },

  powerRequired: 18000,
  powerGeneration: 30000,
};

/**
 * Tier 4: Processing Unit District
 * Advanced circuits for space-age computing
 */
export const PROCESSING_UNIT_DISTRICT: FactoryBlueprint = {
  id: 'processing_unit_district',
  name: 'Processing Unit District',
  size: { width: 80, height: 50 },

  machines: [
    // 20 advanced assembly machines for processing units
    { machineItemId: 'assembly_machine_iii', offset: { x: 20, y: 10 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 20, y: 12 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 20, y: 14 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 20, y: 16 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 20, y: 18 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 10 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 12 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 14 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 16 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 25, y: 18 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 11 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 13 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 15 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 17 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 30, y: 19 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 35, y: 12 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 35, y: 14 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 35, y: 16 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 35, y: 18 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'assembly_machine_iii', offset: { x: 35, y: 20 }, recipe: 'processing_unit', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
  ],

  power: [
    { offset: { x: 0, y: 0 }, powerType: 'electrical', generation: 25000 },
    { offset: { x: 10, y: 0 }, powerType: 'electrical', generation: 25000 },
  ],

  productionGoal: {
    outputItemId: 'processing_unit',
    targetRate: 100, // 100 processing units per minute
  },

  powerRequired: 30000,
  powerGeneration: 50000,
};

/**
 * Tier 5: Rocket Fuel District
 * Rocket fuel production for space launches
 */
export const ROCKET_FUEL_DISTRICT: FactoryBlueprint = {
  id: 'rocket_fuel_district',
  name: 'Rocket Fuel District',
  size: { width: 60, height: 40 },

  machines: [
    // 10 refineries for rocket fuel
    { machineItemId: 'oil_refinery', offset: { x: 15, y: 10 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 15, y: 14 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 15, y: 18 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 15, y: 22 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 15, y: 26 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 25, y: 12 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 25, y: 16 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 25, y: 20 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 25, y: 24 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'oil_refinery', offset: { x: 25, y: 28 }, recipe: 'rocket_fuel', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
  ],

  power: [
    { offset: { x: 0, y: 0 }, powerType: 'electrical', generation: 20000 },
  ],

  productionGoal: {
    outputItemId: 'rocket_fuel',
    targetRate: 50, // 50 rocket fuel per minute
  },

  powerRequired: 15000,
  powerGeneration: 20000,
};

/**
 * Tier 6: Solar Sail District
 * Solar sail production for Dyson Swarm
 */
export const SOLAR_SAIL_DISTRICT: FactoryBlueprint = {
  id: 'solar_sail_district',
  name: 'Solar Sail District',
  size: { width: 100, height: 60 },

  machines: [
    // 30 mega-assemblers for solar sails (most expensive item)
    { machineItemId: 'mega_assembler', offset: { x: 20, y: 10 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 20, y: 12 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 20, y: 14 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 20, y: 16 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 20, y: 18 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 20, y: 20 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 30, y: 10 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 30, y: 12 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 30, y: 14 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 30, y: 16 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 30, y: 18 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 30, y: 20 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 40, y: 11 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 40, y: 13 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 40, y: 15 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 40, y: 17 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 40, y: 19 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 40, y: 21 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 50, y: 10 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 50, y: 12 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 50, y: 14 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 50, y: 16 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 50, y: 18 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 50, y: 20 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 60, y: 11 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 60, y: 13 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 60, y: 15 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 60, y: 17 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 60, y: 19 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
    { machineItemId: 'mega_assembler', offset: { x: 60, y: 21 }, recipe: 'solar_sail', inputDirection: { x: -1, y: 0 }, outputDirection: { x: 1, y: 0 } },
  ],

  power: [
    // Massive power grid for mega-assemblers
    { offset: { x: 0, y: 0 }, powerType: 'electrical', generation: 50000 },
    { offset: { x: 20, y: 0 }, powerType: 'electrical', generation: 50000 },
    { offset: { x: 40, y: 0 }, powerType: 'electrical', generation: 50000 },
    { offset: { x: 60, y: 0 }, powerType: 'electrical', generation: 50000 },
  ],

  productionGoal: {
    outputItemId: 'solar_sail',
    targetRate: 30, // 30 solar sails per minute
    targetTotal: 100000, // 100,000 sails for complete Dyson Swarm
  },

  powerRequired: 150000,
  powerGeneration: 200000,
};

/**
 * MASTER BLUEPRINT: Complete Dyson Swarm Factory City
 * Integrates all districts into a massive production complex
 */
export const DYSON_SWARM_FACTORY_CITY: FactoryBlueprint = {
  id: 'dyson_swarm_city',
  name: 'Dyson Swarm Factory City',
  size: { width: 500, height: 400 },

  districts: [
    // Base resource districts (bottom layer)
    { name: 'Iron District A', blueprint: IRON_PLATE_DISTRICT, offset: { x: 0, y: 0 } },
    { name: 'Iron District B', blueprint: IRON_PLATE_DISTRICT, offset: { x: 60, y: 0 } },
    { name: 'Iron District C', blueprint: IRON_PLATE_DISTRICT, offset: { x: 120, y: 0 } },

    // Steel production (second layer)
    { name: 'Steel District A', blueprint: STEEL_DISTRICT, offset: { x: 0, y: 50 } },
    { name: 'Steel District B', blueprint: STEEL_DISTRICT, offset: { x: 60, y: 50 } },

    // Electronics (third layer)
    { name: 'Circuit District A', blueprint: CIRCUIT_DISTRICT, offset: { x: 0, y: 100 } },
    { name: 'Circuit District B', blueprint: CIRCUIT_DISTRICT, offset: { x: 70, y: 100 } },
    { name: 'Circuit District C', blueprint: CIRCUIT_DISTRICT, offset: { x: 140, y: 100 } },

    // Advanced computing (fourth layer)
    { name: 'Processing Unit District A', blueprint: PROCESSING_UNIT_DISTRICT, offset: { x: 0, y: 160 } },
    { name: 'Processing Unit District B', blueprint: PROCESSING_UNIT_DISTRICT, offset: { x: 90, y: 160 } },

    // Rocket fuel (fifth layer)
    { name: 'Rocket Fuel District A', blueprint: ROCKET_FUEL_DISTRICT, offset: { x: 0, y: 230 } },
    { name: 'Rocket Fuel District B', blueprint: ROCKET_FUEL_DISTRICT, offset: { x: 70, y: 230 } },

    // Solar sails - final products (top layer)
    { name: 'Solar Sail District A', blueprint: SOLAR_SAIL_DISTRICT, offset: { x: 0, y: 290 } },
    { name: 'Solar Sail District B', blueprint: SOLAR_SAIL_DISTRICT, offset: { x: 110, y: 290 } },
    { name: 'Solar Sail District C', blueprint: SOLAR_SAIL_DISTRICT, offset: { x: 220, y: 290 } },
  ],

  productionGoal: {
    outputItemId: 'solar_sail',
    targetRate: 90, // 90 solar sails per minute from 3 districts
    targetTotal: 100000, // 100,000 total for complete Dyson Swarm
  },

  powerRequired: 500000,
  powerGeneration: 700000,

  agentRequirements: {
    agentType: 'flying',
    minAgents: 50, // Flying construction drones to build and maintain
  },
};
