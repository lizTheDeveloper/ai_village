import type { World, BuildingComponent, PositionComponent, IdentityComponent } from '@ai-village/core';
import { ComponentType, BuildingType } from '@ai-village/core';
import type { Camera } from './Camera.js';

/**
 * BedOwnershipRenderer - Renders ownership markers on claimed beds
 *
 * Shows:
 * - Small house icon (🏠) above owned beds
 * - Owner's name initial in white text
 * - Only for claimed beds (not communal or unclaimed)
 *
 * Part of Phase 3 of the Bed-as-Home system
 */
export class BedOwnershipRenderer {
  /**
   * Render ownership markers for all claimed beds in view.
   */
  render(ctx: CanvasRenderingContext2D, camera: Camera, world: World): void {
    // Query all buildings with position
    const buildings = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Position)
      .executeEntities();

    for (const building of buildings) {
      const buildingComp = building.getComponent<BuildingComponent>(ComponentType.Building);
      const position = building.getComponent<PositionComponent>(ComponentType.Position);

      if (!buildingComp || !position) continue;
      if (!buildingComp.isComplete) continue; // Only complete buildings

      // Only render for beds/bedrolls
      if (buildingComp.buildingType !== BuildingType.Bed &&
          buildingComp.buildingType !== BuildingType.Bedroll) {
        continue;
      }

      // Only render for claimed beds (has owner, not communal)
      if (!buildingComp.ownerId || buildingComp.accessType === 'communal') {
        continue;
      }

      // Get owner's name
      const ownerEntity = world.entities.get(buildingComp.ownerId);
      if (!ownerEntity) continue;

      const identity = ownerEntity.getComponent<IdentityComponent>(ComponentType.Identity);
      const ownerName = identity?.name || '?';
      const initial = ownerName.charAt(0).toUpperCase();

      // Calculate screen position (centered on bed, offset upward)
      const screenX = (position.x - camera.x) * camera.zoom + ctx.canvas.width / 2;
      const screenY = (position.y - camera.y) * camera.zoom + ctx.canvas.height / 2;

      // Offset above the bed (scale with zoom)
      const offsetY = -12 * camera.zoom;

      // Skip if outside visible area (culling)
      const margin = 50;
      if (screenX < -margin || screenX > ctx.canvas.width + margin ||
          screenY < -margin || screenY > ctx.canvas.height + margin) {
        continue;
      }

      this.renderOwnershipMarker(ctx, screenX, screenY + offsetY, initial, camera.zoom);
    }
  }

  /**
   * Render a single ownership marker (house icon + initial).
   */
  private renderOwnershipMarker(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    initial: string,
    zoom: number
  ): void {
    ctx.save();

    // Scale font with zoom (but cap minimum size for readability)
    const fontSize = Math.max(10, 12 * zoom);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw background circle for better visibility
    const radius = fontSize * 0.8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw owner's initial in white
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(initial, screenX, screenY);

    ctx.restore();
  }

  /**
   * Get the owner name for a bed (used for tooltips).
   * Returns null if bed is not owned or owner not found.
   */
  getOwnerName(bedEntityId: string, world: World): string | null {
    const bedEntity = world.entities.get(bedEntityId);
    if (!bedEntity) return null;

    const building = bedEntity.getComponent<BuildingComponent>(ComponentType.Building);
    if (!building || !building.ownerId) return null;

    const ownerEntity = world.entities.get(building.ownerId);
    if (!ownerEntity) return null;

    const identity = ownerEntity.getComponent<IdentityComponent>(ComponentType.Identity);
    return identity?.name || null;
  }
}
