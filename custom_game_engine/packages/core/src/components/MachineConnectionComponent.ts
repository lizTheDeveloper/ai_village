import type { Component } from '../ecs/Component.js';
import type { ItemInstance } from '../items/ItemInstance.js';

/**
 * Machine slot for input/output
 */
export interface MachineSlot {
  /** Position relative to machine (e.g., {x: 0, y: -1} = north side) */
  offset: { x: number; y: number };

  /** Item filter (undefined = accept any) */
  filter?: string[];

  /** Current items in slot */
  items: ItemInstance[];

  /** Max stack size */
  capacity: number;
}

/**
 * MachineConnectionComponent - Input/output slots for machines
 *
 * Machines can connect directly to adjacent machines without belts.
 * Inputs accept items from adjacent outputs, outputs send to adjacent inputs.
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 3)
 */
export interface MachineConnectionComponent extends Component {
  readonly type: 'machine_connection';

  /** Input slots - accept items from adjacent outputs */
  inputs: MachineSlot[];

  /** Output slots - send items to adjacent inputs */
  outputs: MachineSlot[];
}

/**
 * Factory function to create MachineConnectionComponent
 */
export function createMachineConnectionComponent(
  inputCount: number = 1,
  outputCount: number = 1,
  slotCapacity: number = 10
): MachineConnectionComponent {
  const inputs: MachineSlot[] = [];
  const outputs: MachineSlot[] = [];

  // Default: inputs on west, outputs on east
  for (let i = 0; i < inputCount; i++) {
    inputs.push({
      offset: { x: -1, y: 0 },
      items: [],
      capacity: slotCapacity,
    });
  }

  for (let i = 0; i < outputCount; i++) {
    outputs.push({
      offset: { x: 1, y: 0 },
      items: [],
      capacity: slotCapacity,
    });
  }

  return {
    type: 'machine_connection',
    version: 1,
    inputs,
    outputs,
  };
}

/**
 * Create custom connection layout
 */
export function createCustomConnection(
  inputs: Array<{ offset: { x: number; y: number }; capacity: number; filter?: string[] }>,
  outputs: Array<{ offset: { x: number; y: number }; capacity: number }>
): MachineConnectionComponent {
  return {
    type: 'machine_connection',
    version: 1,
    inputs: inputs.map(config => ({
      offset: config.offset,
      filter: config.filter,
      items: [],
      capacity: config.capacity,
    })),
    outputs: outputs.map(config => ({
      offset: config.offset,
      items: [],
      capacity: config.capacity,
    })),
  };
}

/**
 * Check if input has space for item
 */
export function hasInputSpace(slot: MachineSlot, itemId: string): boolean {
  // Check capacity
  if (slot.items.length >= slot.capacity) {
    return false;
  }

  // Check filter
  if (slot.filter && !slot.filter.includes(itemId)) {
    return false;
  }

  return true;
}

/**
 * Add item to slot
 */
export function addToSlot(slot: MachineSlot, item: ItemInstance): boolean {
  if (slot.items.length >= slot.capacity) {
    return false;
  }

  if (slot.filter && !slot.filter.includes(item.definitionId)) {
    return false;
  }

  slot.items.push(item);
  return true;
}

/**
 * Remove item from slot
 */
export function removeFromSlot(slot: MachineSlot, instanceId: string): ItemInstance | null {
  const index = slot.items.findIndex(item => item.instanceId === instanceId);
  if (index === -1) {
    return null;
  }

  const [item] = slot.items.splice(index, 1);
  return item ?? null;
}

/**
 * Count items of type in all slots
 */
export function countItemsInSlots(slots: MachineSlot[], itemId: string): number {
  let count = 0;
  for (const slot of slots) {
    count += slot.items.filter(item => item.definitionId === itemId).length;
  }
  return count;
}
