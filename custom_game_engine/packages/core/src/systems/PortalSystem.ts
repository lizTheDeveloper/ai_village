import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { PortalComponent } from '../components/PortalComponent.js';
import type { RealmLocationComponent } from '../components/RealmLocationComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { transitionToRealm } from '../realms/RealmTransition.js';

/**
 * PortalSystem - Manages portal interactions and realm transitions
 *
 * Responsible for:
 * - Detecting entities near portals
 * - Validating portal access
 * - Triggering realm transitions
 * - Managing portal state (active, uses remaining, etc.)
 */
export class PortalSystem extends BaseSystem {
  readonly id: SystemId = 'portal_system';
  readonly priority: number = 55;
  readonly requiredComponents = ['portal', 'position'] as const;
  // Only run when portal components exist (O(1) activation check)
  readonly activationComponents = ['portal'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  private nearbyEntities: Map<string, Set<string>> = new Map();  // portalId -> Set of nearby entityIds

  protected onUpdate(ctx: SystemContext): void {
    // Clear proximity tracking
    this.nearbyEntities.clear();

    // Process each portal
    for (const portalEntity of ctx.activeEntities) {
      const comps = ctx.components(portalEntity);
      const portal = comps.optional<PortalComponent>('portal');
      const portalPos = comps.optional<PositionComponent>('position');

      if (!portal || !portalPos || !portal.active) continue;

      // Find entities near this portal
      const nearbyEntities = this.findNearbyEntities(ctx, portalPos, portalEntity.id);
      this.nearbyEntities.set(portalEntity.id, nearbyEntities);

      // Check if any entities should auto-transition
      for (const entityId of nearbyEntities) {
        const entity = ctx.world.getEntity(entityId);
        if (!entity) continue;

        const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
        if (!realmLocation) continue;

        // Auto-transition for certain access methods
        if (this.shouldAutoTransition(portal, realmLocation)) {
          this.attemptTransition(ctx.world, entity.id, portalEntity.id, portal);
        }
      }
    }
  }

  /**
   * Find entities within portal activation range
   */
  private findNearbyEntities(ctx: SystemContext, portalPos: PositionComponent, portalId: string): Set<string> {
    const nearby = new Set<string>();
    const PORTAL_RANGE = 2;  // Tiles

    // Use spatial query for efficient nearby entity lookup
    const nearbyEntitiesWithDistance = ctx.getNearbyEntities(
      portalPos,
      PORTAL_RANGE,
      ['position', 'realm_location'],
      { excludeIds: new Set([portalId]) }
    );

    for (const { entity } of nearbyEntitiesWithDistance) {
      nearby.add(entity.id);
    }

    return nearby;
  }

  /**
   * Check if entity should automatically transition through portal
   */
  private shouldAutoTransition(portal: PortalComponent, _realmLocation: RealmLocationComponent): boolean {
    // Auto-transition only for certain access methods
    switch (portal.accessMethod) {
      case 'death':
        // Death portals are handled elsewhere
        return false;
      case 'dream':
      case 'trance':
        // Dream/trance portals might auto-activate during sleep
        return false;
      case 'portal':
      case 'physical_gate':
        // Physical portals require explicit action (future work)
        return false;
      default:
        return false;
    }
  }

  /**
   * Attempt to transition an entity through a portal
   */
  attemptTransition(world: World, entityId: string, portalId: string, portal: PortalComponent): boolean {
    const entity = world.getEntity(entityId);
    if (!entity) return false;

    const realmLocation = entity.components.get('realm_location') as RealmLocationComponent | undefined;
    if (!realmLocation) return false;

    // Check if portal has uses remaining
    if (portal.usesRemaining !== undefined && portal.usesRemaining <= 0) {
      console.warn(`Portal ${portalId} has no uses remaining`);
      return false;
    }

    // Attempt transition
    const result = transitionToRealm(
      world,
      entityId,
      portal.targetRealmId,
      portal.accessMethod,
      portalId
    );

    if (result.success) {
      // Decrement uses if limited
      if (portal.usesRemaining !== undefined) {
        portal.usesRemaining--;
        if (portal.usesRemaining === 0) {
          portal.active = false;
        }
      }

      return true;
    } else {
      console.warn(`Transition failed for ${entityId}: ${result.reason}`);
      return false;
    }
  }

  /**
   * Check if entity is near any portal
   */
  isEntityNearPortal(entityId: string, portalId?: string): boolean {
    if (portalId) {
      return this.nearbyEntities.get(portalId)?.has(entityId) ?? false;
    } else {
      // Check all portals
      for (const nearbySet of this.nearbyEntities.values()) {
        if (nearbySet.has(entityId)) return true;
      }
      return false;
    }
  }

  /**
   * Get all portals near an entity
   */
  getNearbyPortals(entityId: string): string[] {
    const portals: string[] = [];
    for (const [portalId, nearbySet] of this.nearbyEntities.entries()) {
      if (nearbySet.has(entityId)) {
        portals.push(portalId);
      }
    }
    return portals;
  }
}
