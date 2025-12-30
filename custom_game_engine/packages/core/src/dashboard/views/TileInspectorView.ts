/**
 * TileInspectorView - Detailed tile information
 *
 * Shows information about the currently inspected tile including:
 * - Terrain type and features
 * - Soil quality and moisture
 * - Plants growing on the tile
 * - Buildings on the tile
 * - Entities present
 *
 * Accessibility-first: describes the location in natural language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';

/**
 * Entity on the tile
 */
interface TileEntity {
  id: string;
  type: string; // 'agent', 'animal', 'plant', etc.
  name?: string;
}

/**
 * Soil information
 */
interface SoilInfo {
  moisture: number;
  fertility: number;
  isTilled: boolean;
}

/**
 * Building information
 */
interface BuildingInfo {
  type: string;
  isComplete: boolean;
  progress?: number;
}

/**
 * Data returned by the TileInspector view
 */
export interface TileInspectorViewData extends ViewData {
  /** Tile coordinates */
  position: { x: number; y: number } | null;
  /** Terrain type */
  terrainType: string | null;
  /** Biome type */
  biome: string | null;
  /** Is the tile walkable */
  walkable: boolean;
  /** Soil info if present */
  soil: SoilInfo | null;
  /** Building on tile if any */
  building: BuildingInfo | null;
  /** Entities on or near the tile */
  entities: TileEntity[];
  /** Resource nodes (trees, rocks, etc.) */
  resources: string[];
}

/**
 * TileInspector View Definition
 */
export const TileInspectorView: DashboardView<TileInspectorViewData> = {
  id: 'tile-inspector',
  title: 'Tile Inspector',
  category: 'farming',
  keyboardShortcut: 'T',
  description: 'Detailed information about a specific tile location',

  defaultSize: {
    width: 300,
    height: 400,
    minWidth: 250,
    minHeight: 300,
  },

  getData(_context: ViewContext): TileInspectorViewData {
    // Note: This would need the inspected tile position passed in context
    // For now, we'll show a placeholder indicating how it would work

    const emptyData: TileInspectorViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No tile selected. Right-click on a tile to inspect it.',
      position: null,
      terrainType: null,
      biome: null,
      walkable: true,
      soil: null,
      building: null,
      entities: [],
      resources: [],
    };

    // TODO: In full implementation, read inspected tile from context
    // This would query the world for tile data at a specific position

    return emptyData;
  },

  textFormatter(data: TileInspectorViewData): string {
    const lines: string[] = [
      'TILE INSPECTOR',
      '═'.repeat(50),
      '',
    ];

    if (!data.available || !data.position) {
      lines.push(data.unavailableReason || 'No tile selected');
      lines.push('');
      lines.push('Right-click on any tile in the game world to inspect it.');
      lines.push('You can learn about terrain, soil quality, and what\'s there.');
      return lines.join('\n');
    }

    // Location
    lines.push(`LOCATION: (${data.position.x}, ${data.position.y})`);
    lines.push('─'.repeat(50));

    // Terrain description
    if (data.terrainType) {
      const terrainDesc = data.walkable
        ? `This is ${data.terrainType} terrain that can be walked on.`
        : `This is ${data.terrainType} terrain and cannot be crossed.`;
      lines.push(terrainDesc);
    }
    if (data.biome) {
      lines.push(`Biome: ${data.biome}`);
    }
    lines.push('');

    // Soil information
    if (data.soil) {
      lines.push('SOIL CONDITIONS');
      lines.push('─'.repeat(50));

      const moistureDesc = data.soil.moisture > 70 ? 'well-watered' :
        data.soil.moisture > 40 ? 'adequately moist' :
          data.soil.moisture > 20 ? 'dry' : 'parched';

      const fertilityDesc = data.soil.fertility > 70 ? 'very fertile' :
        data.soil.fertility > 40 ? 'fertile' :
          data.soil.fertility > 20 ? 'poor' : 'barren';

      if (data.soil.isTilled) {
        lines.push(`The soil has been tilled and is ready for planting.`);
      } else {
        lines.push(`The ground here has not been tilled.`);
      }

      lines.push(`Moisture: ${moistureDesc} (${Math.round(data.soil.moisture)}%)`);
      lines.push(`Fertility: ${fertilityDesc} (${Math.round(data.soil.fertility)}%)`);
      lines.push('');
    }

    // Building
    if (data.building) {
      lines.push('STRUCTURE');
      lines.push('─'.repeat(50));
      if (data.building.isComplete) {
        lines.push(`A ${data.building.type} stands here.`);
      } else {
        const progress = data.building.progress || 0;
        lines.push(`A ${data.building.type} is under construction (${Math.round(progress * 100)}% complete).`);
      }
      lines.push('');
    }

    // Resources
    if (data.resources.length > 0) {
      lines.push('NATURAL RESOURCES');
      lines.push('─'.repeat(50));
      for (const resource of data.resources) {
        lines.push(`  • ${resource}`);
      }
      lines.push('');
    }

    // Entities
    if (data.entities.length > 0) {
      lines.push('PRESENT HERE');
      lines.push('─'.repeat(50));
      for (const entity of data.entities) {
        const name = entity.name || entity.type;
        lines.push(`  • ${name} (${entity.type})`);
      }
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: TileInspectorViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle no selection
    if (!data.available || !data.position) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Right-click to inspect a tile', x + padding, currentY);
      return;
    }

    // Position header
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText(`Tile (${data.position.x}, ${data.position.y})`, x + padding, currentY);
    currentY += lineHeight + 5;

    ctx.font = theme.fonts.normal;

    // Terrain
    if (data.terrainType) {
      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`Terrain: ${data.terrainType}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Soil
    if (data.soil) {
      currentY += 5;
      ctx.fillStyle = '#228B22';
      ctx.fillText(`Soil: ${data.soil.isTilled ? 'Tilled' : 'Untilled'}`, x + padding, currentY);
      currentY += lineHeight;

      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(`  Moisture: ${Math.round(data.soil.moisture)}%`, x + padding, currentY);
      currentY += lineHeight;
      ctx.fillText(`  Fertility: ${Math.round(data.soil.fertility)}%`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Building
    if (data.building) {
      currentY += 5;
      ctx.fillStyle = '#8B4513';
      const status = data.building.isComplete ? '' : ' (building)';
      ctx.fillText(`${data.building.type}${status}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Entities
    if (data.entities.length > 0) {
      currentY += 5;
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(`${data.entities.length} entities here`, x + padding, currentY);
    }
  },
};
