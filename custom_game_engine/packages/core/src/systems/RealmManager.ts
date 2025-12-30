import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { RealmComponent } from '../components/RealmComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import type { RealmProperties } from '../realms/RealmTypes.js';

/**
 * RealmManager - Manages all active realms
 *
 * Responsible for:
 * - Registering and tracking realms
 * - Updating realm state (time, maintenance costs)
 * - Managing realm stability
 * - Tracking inhabitants per realm
 */
export class RealmManager implements System {
  readonly id: SystemId = 'realm_manager';
  readonly priority: number = 50;
  readonly requiredComponents = [] as const;

  private realms: Map<string, string> = new Map();  // realmId -> entity ID
  private realmTicks: Map<string, number> = new Map();  // realmId -> tick count

  update(world: World, _entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Update each active realm independently
    for (const [realmId, entityId] of this.realms) {
      const entity = world.getEntity(entityId);
      if (!entity) continue;

      const realm = entity.components.get('realm') as RealmComponent | undefined;
      if (!realm || !realm.active) continue;

      // Calculate realm-specific delta based on time dilation
      const realmDelta = deltaTime * realm.properties.timeRatio;

      // Update realm tick
      const currentRealmTick = this.realmTicks.get(realmId) || 0;
      this.realmTicks.set(realmId, currentRealmTick + realmDelta);

      // Drain maintenance cost if not self-sustaining
      if (!realm.properties.selfSustaining) {
        realm.attentionReserve -= realm.properties.maintenanceCost * deltaTime;

        // Check if realm should collapse
        if (realm.attentionReserve <= 0) {
          this.collapseRealm(realmId, world);
        }
      }

      // Update realm component state
      realm.currentTick = currentRealmTick;
      realm.timeSinceCreation += deltaTime;
    }
  }

  /**
   * Register a new realm
   */
  registerRealm(entityId: string, properties: RealmProperties): void {
    this.realms.set(properties.id, entityId);
    this.realmTicks.set(properties.id, 0);
  }

  /**
   * Get realm entity by ID
   */
  getRealmEntity(realmId: string, world: World): any | undefined {
    const entityId = this.realms.get(realmId);
    if (!entityId) return undefined;
    return world.getEntity(entityId);
  }

  /**
   * Get realm component by ID
   */
  getRealm(realmId: string, world: World): RealmComponent | undefined {
    const entity = this.getRealmEntity(realmId, world);
    if (!entity) return undefined;
    return entity.components.get('realm') as RealmComponent | undefined;
  }

  /**
   * Get current tick for a specific realm
   */
  getRealmTime(realmId: string): number {
    return this.realmTicks.get(realmId) || 0;
  }

  /**
   * Add inhabitant to realm
   */
  addInhabitant(realmId: string, entityId: string, world: World): void {
    const realm = this.getRealm(realmId, world);
    if (!realm) {
      console.warn(`Cannot add inhabitant to unknown realm: ${realmId}`);
      return;
    }

    if (!realm.inhabitants.includes(entityId)) {
      realm.inhabitants.push(entityId);
    }
  }

  /**
   * Remove inhabitant from realm
   */
  removeInhabitant(realmId: string, entityId: string, world: World): void {
    const realm = this.getRealm(realmId, world);
    if (!realm) return;

    const index = realm.inhabitants.indexOf(entityId);
    if (index !== -1) {
      realm.inhabitants.splice(index, 1);
    }
  }

  /**
   * Get all inhabitants of a realm
   */
  getInhabitants(realmId: string, world: World): string[] {
    const realm = this.getRealm(realmId, world);
    return realm ? [...realm.inhabitants] : [];
  }

  /**
   * Collapse a realm due to lack of maintenance
   */
  private collapseRealm(realmId: string, world: World): void {
    console.warn(`Realm ${realmId} is collapsing due to lack of maintenance!`);

    const realm = this.getRealm(realmId, world);
    if (!realm) return;

    // Eject all inhabitants back to mortal world
    for (const inhabitantId of realm.inhabitants) {
      const entity = world.getEntity(inhabitantId);
      if (!entity) continue;

      const location = entity.components.get('realm_location') as RealmLocationComponent | undefined;
      if (location && location.currentRealmId === realmId) {
        // Force return to mortal world
        location.currentRealmId = 'mortal_world';
        location.enteredAt = 0;  // Reset entry time
        location.timeDilation = 1.0;
        location.canExit = true;

        console.log(`Entity ${inhabitantId} ejected from collapsing realm ${realmId}`);
      }
    }

    // Mark realm as inactive
    realm.active = false;
    realm.inhabitants = [];

    // TODO: Trigger realm collapse events
    // TODO: Notify ruler (if any)
    // TODO: Handle sub-realms
  }

  /**
   * Check if a realm exists and is active
   */
  isRealmActive(realmId: string, world: World): boolean {
    const realm = this.getRealm(realmId, world);
    return realm?.active ?? false;
  }

  /**
   * Get all active realm IDs
   */
  getActiveRealms(): string[] {
    return Array.from(this.realms.keys());
  }
}
