/**
 * Invariant checker for save file validation.
 *
 * Validates that save files and world state satisfy critical invariants:
 * - No dangling entity references
 * - Component data is valid
 * - World state is consistent
 * - Checksums match
 * - Schema versions are supported
 *
 * Throws errors on violations (no silent fallbacks).
 */

import type { SaveFile, VersionedEntity, VersionedComponent, UniverseSnapshot } from './types.js';
import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import { computeChecksum } from './utils.js';

/**
 * Invariant violation error.
 */
export class InvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantViolationError';
  }
}

/**
 * Check entity reference validity within a universe.
 */
function validateEntityReferences(universe: UniverseSnapshot): void {
  const entityIds = new Set(universe.entities.map(e => e.id));

  // Check that all entity references in components point to valid entities
  for (const entity of universe.entities) {
    for (const component of entity.components) {
      // Check for common entity reference patterns
      const data = component.data as Record<string, unknown>;

      // Check single entity references
      if (typeof data.entityId === 'string' && !entityIds.has(data.entityId)) {
        throw new InvariantViolationError(
          `Entity ${entity.id} references non-existent entity ${data.entityId} in component ${component.type}`
        );
      }

      if (typeof data.targetEntityId === 'string' && !entityIds.has(data.targetEntityId)) {
        throw new InvariantViolationError(
          `Entity ${entity.id} references non-existent targetEntityId ${data.targetEntityId} in component ${component.type}`
        );
      }

      if (typeof data.ownerId === 'string' && !entityIds.has(data.ownerId)) {
        throw new InvariantViolationError(
          `Entity ${entity.id} references non-existent ownerId ${data.ownerId} in component ${component.type}`
        );
      }

      // Check array of entity references
      if (Array.isArray(data.entityIds)) {
        for (const id of data.entityIds) {
          if (typeof id === 'string' && !entityIds.has(id)) {
            throw new InvariantViolationError(
              `Entity ${entity.id} references non-existent entity in entityIds array: ${id}`
            );
          }
        }
      }

      // Check Set of entity references (serialized as arrays)
      if (data.entitiesInTransit && Array.isArray(data.entitiesInTransit)) {
        for (const id of data.entitiesInTransit) {
          if (typeof id === 'string' && !entityIds.has(id)) {
            throw new InvariantViolationError(
              `Entity ${entity.id} references non-existent entity in entitiesInTransit: ${id}`
            );
          }
        }
      }
    }
  }
}

/**
 * Check component data validity.
 */
function validateComponentData(component: VersionedComponent): void {
  const data = component.data as Record<string, unknown>;

  // Version must be a positive integer
  if (component.$version !== undefined) {
    if (!Number.isInteger(component.$version) || component.$version < 1) {
      throw new InvariantViolationError(
        `Component ${component.type} has invalid version: ${component.$version}`
      );
    }
  }

  // Check for required type field
  if (typeof data.type !== 'string') {
    throw new InvariantViolationError(
      `Component missing required 'type' field or type is not a string: ${component.type}`
    );
  }

  // Type-specific validations
  switch (component.type) {
    case 'position':
      if (typeof data.x !== 'number' || !Number.isFinite(data.x)) {
        throw new InvariantViolationError('PositionComponent.x must be a finite number');
      }
      if (typeof data.y !== 'number' || !Number.isFinite(data.y)) {
        throw new InvariantViolationError('PositionComponent.y must be a finite number');
      }
      if (data.z !== undefined && (typeof data.z !== 'number' || !Number.isFinite(data.z))) {
        throw new InvariantViolationError('PositionComponent.z must be a finite number');
      }
      break;

    case 'health':
      if (typeof data.current !== 'number' || (data.current as number) < 0) {
        throw new InvariantViolationError('HealthComponent.current must be non-negative');
      }
      if (typeof data.maximum !== 'number' || (data.maximum as number) <= 0) {
        throw new InvariantViolationError('HealthComponent.maximum must be positive');
      }
      if ((data.current as number) > (data.maximum as number)) {
        throw new InvariantViolationError('HealthComponent.current cannot exceed maximum');
      }
      break;

    case 'inventory':
      if (!Array.isArray(data.slots)) {
        throw new InvariantViolationError('InventoryComponent.slots must be an array');
      }
      for (const slot of data.slots as unknown[]) {
        const s = slot as Record<string, unknown>;
        if (s.itemId && typeof s.itemId !== 'string') {
          throw new InvariantViolationError('InventorySlot.itemId must be a string');
        }
        if (s.quantity && (!Number.isInteger(s.quantity) || (s.quantity as number) <= 0)) {
          throw new InvariantViolationError('InventorySlot.quantity must be a positive integer');
        }
      }
      break;

    case 'passage':
      if (typeof data.passageId !== 'string') {
        throw new InvariantViolationError('PassageComponent.passageId must be a string');
      }
      if (typeof data.sourceUniverseId !== 'string') {
        throw new InvariantViolationError('PassageComponent.sourceUniverseId must be a string');
      }
      if (typeof data.targetUniverseId !== 'string') {
        throw new InvariantViolationError('PassageComponent.targetUniverseId must be a string');
      }
      if (!['thread', 'bridge', 'gate', 'confluence'].includes(data.passageType as string)) {
        throw new InvariantViolationError(
          `PassageComponent.passageType must be a valid passage type: ${data.passageType}`
        );
      }
      if (!['dormant', 'active', 'unstable', 'collapsing'].includes(data.state as string)) {
        throw new InvariantViolationError(
          `PassageComponent.state must be a valid state: ${data.state}`
        );
      }
      break;
  }
}

/**
 * Check entity validity.
 */
function validateEntity(entity: VersionedEntity): void {
  // Entity must have a valid ID
  if (typeof entity.id !== 'string' || entity.id.length === 0) {
    throw new InvariantViolationError('Entity must have a non-empty string ID');
  }

  // Entity must have at least one component
  if (!Array.isArray(entity.components) || entity.components.length === 0) {
    throw new InvariantViolationError(`Entity ${entity.id} has no components`);
  }

  // Check all components
  for (const component of entity.components) {
    validateComponentData(component);
  }
}

/**
 * Check universe validity.
 */
async function validateUniverse(universe: UniverseSnapshot): Promise<void> {
  // Universe must have a valid ID
  if (typeof universe.identity.id !== 'string' || universe.identity.id.length === 0) {
    throw new InvariantViolationError('Universe must have a non-empty string ID');
  }

  // Check entities
  if (!Array.isArray(universe.entities)) {
    throw new InvariantViolationError(`Universe ${universe.identity.id} has invalid entities array`);
  }

  const entityIds = new Set<string>();
  for (const entity of universe.entities) {
    // Check for duplicate entity IDs
    if (entityIds.has(entity.id)) {
      throw new InvariantViolationError(
        `Universe ${universe.identity.id} contains duplicate entity ID: ${entity.id}`
      );
    }
    entityIds.add(entity.id);

    validateEntity(entity);
  }

  // Validate entity references
  validateEntityReferences(universe);

  // Check universe tick is valid
  const universeTick = universe.time.universeTick;
  if (typeof universeTick !== 'string') {
    throw new InvariantViolationError(
      `Universe ${universe.identity.id} has invalid universeTick (must be serialized bigint string): ${universeTick}`
    );
  }

  // Verify entity checksums if present
  if (universe.checksums?.entities) {
    const calculated = await computeChecksum(JSON.stringify(universe.entities));

    if (calculated !== universe.checksums.entities) {
      throw new InvariantViolationError(
        `Universe ${universe.identity.id} entities checksum mismatch: expected ${universe.checksums.entities}, got ${calculated}`
      );
    }
  }
}

/**
 * Validate a save file for invariant violations.
 * Throws InvariantViolationError on any violation.
 */
export async function validateSaveFile(saveFile: SaveFile): Promise<void> {
  // Check schema and version
  if (typeof saveFile.$schema !== 'string' || saveFile.$schema.length === 0) {
    throw new InvariantViolationError('SaveFile must have a non-empty $schema');
  }

  if (!Number.isInteger(saveFile.$version) || saveFile.$version < 1) {
    throw new InvariantViolationError(
      `SaveFile has invalid $version: ${saveFile.$version}`
    );
  }

  // Check header
  if (!saveFile.header) {
    throw new InvariantViolationError('SaveFile missing required header');
  }

  if (typeof saveFile.header.gameVersion !== 'string') {
    throw new InvariantViolationError('SaveFile.header.gameVersion must be a string');
  }

  if (typeof saveFile.header.createdAt !== 'number') {
    throw new InvariantViolationError('SaveFile.header.createdAt must be a number');
  }

  // Check multiverse
  if (!saveFile.multiverse) {
    throw new InvariantViolationError('SaveFile missing required multiverse');
  }

  if (typeof saveFile.multiverse.time.absoluteTick !== 'string') {
    throw new InvariantViolationError(
      `SaveFile.multiverse.time.absoluteTick must be a serialized bigint string: ${saveFile.multiverse.time.absoluteTick}`
    );
  }

  // Check universes
  if (!Array.isArray(saveFile.universes) || saveFile.universes.length === 0) {
    throw new InvariantViolationError('SaveFile must have at least one universe');
  }

  const universeIds = new Set<string>();
  for (const universe of saveFile.universes) {
    // Check for duplicate universe IDs
    if (universeIds.has(universe.identity.id)) {
      throw new InvariantViolationError(
        `SaveFile contains duplicate universe ID: ${universe.identity.id}`
      );
    }
    universeIds.add(universe.identity.id);

    await validateUniverse(universe);
  }

  // Validate passage references (if passages are defined)
  if (saveFile.passages && Array.isArray(saveFile.passages)) {
    for (const passage of saveFile.passages) {
      const p = passage as Record<string, unknown>;
      if (typeof p.sourceUniverseId === 'string' && !universeIds.has(p.sourceUniverseId)) {
        throw new InvariantViolationError(
          `Passage ${p.id} references non-existent source universe: ${p.sourceUniverseId}`
        );
      }
      if (typeof p.targetUniverseId === 'string' && !universeIds.has(p.targetUniverseId)) {
        throw new InvariantViolationError(
          `Passage ${p.id} references non-existent target universe: ${p.targetUniverseId}`
        );
      }
    }
  }

  // Verify overall checksum
  if (saveFile.checksums?.overall) {
    // Calculate checksum of everything except the checksums field
    const { checksums, ...dataToHash } = saveFile;
    const calculated = await computeChecksum(JSON.stringify(dataToHash));

    if (calculated !== saveFile.checksums.overall) {
      throw new InvariantViolationError(
        `SaveFile overall checksum mismatch: expected ${saveFile.checksums.overall}, got ${calculated}`
      );
    }
  }
}

/**
 * Validate world state before serialization.
 * Checks for common issues that would cause save failures.
 */
export function validateWorldState(world: World): void {
  // Check that world has entities
  const entityCount = Array.from(world.entities.values()).length;
  if (entityCount === 0) {
    throw new InvariantViolationError('Cannot save empty world (no entities)');
  }

  // Check for time component (required for tick tracking)
  const timeEntities = world.query().with(ComponentType.Time).executeEntities();
  if (timeEntities.length === 0) {
    throw new InvariantViolationError('World missing TimeComponent (required for save)');
  }

  // Validate each entity
  for (const entity of world.entities.values()) {
    const impl = entity as EntityImpl;

    // Entity must have at least one component
    if (impl.components.size === 0) {
      throw new InvariantViolationError(
        `Entity ${entity.id} has no components (invalid state)`
      );
    }

    // Check for invalid component types
    for (const [componentType, component] of impl.components.entries()) {
      if (typeof componentType !== 'string' || componentType.length === 0) {
        throw new InvariantViolationError(
          `Entity ${entity.id} has invalid component type: ${componentType}`
        );
      }

      if (!component || typeof component !== 'object') {
        throw new InvariantViolationError(
          `Entity ${entity.id} has invalid component data for type ${componentType}`
        );
      }

      const data = component as unknown as Record<string, unknown>;
      if (data.type !== componentType) {
        throw new InvariantViolationError(
          `Entity ${entity.id} component type mismatch: map key is ${componentType} but component.type is ${data.type}`
        );
      }
    }
  }
}
