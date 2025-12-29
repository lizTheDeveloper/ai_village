/**
 * ZonePainterUI - Player zone painting interface
 *
 * Allows players to designate zones that influence agent building placement:
 * - Farming zones for crops and wells
 * - Storage zones for chests and warehouses
 * - Industry zones for workshops
 * - Housing zones for beds and shelters
 * - Social zones for meeting areas
 * - Pasture zones for animals
 * - Wilderness zones (no building)
 * - Restricted zones (hard block)
 *
 * Usage:
 * - Press 'Z' to toggle zone menu
 * - Select a zone type
 * - Click and drag to paint zones
 * - Right-click to erase zones
 *
 * Zones are stored in ZoneManager and influence PlacementScorer.
 */

import type { EventBus } from '@ai-village/core';
import {
  getZoneManager,
  ZONE_COLORS,
  type ZoneType,
} from '@ai-village/core';
import { Camera } from './Camera.js';

export interface ZonePainterState {
  isMenuOpen: boolean;
  isPainting: boolean;
  isErasing: boolean;
  selectedZoneType: ZoneType;
  currentZoneId: string | null;
  cursorWorldPosition: { x: number; y: number } | null;
  brushSize: number; // 1, 2, or 3 tiles
}

export interface ZonePainterUIOptions {
  camera: Camera;
  eventBus: EventBus;
}

const ZONE_TYPE_INFO: Record<ZoneType, { name: string; description: string; icon: string }> = {
  farming: { name: 'Farming', description: 'Crops, wells, orchards', icon: '🌾' },
  storage: { name: 'Storage', description: 'Chests, stockpiles', icon: '📦' },
  industry: { name: 'Industry', description: 'Workshops, forges', icon: '🔨' },
  housing: { name: 'Housing', description: 'Beds, shelters', icon: '🏠' },
  social: { name: 'Social', description: 'Meeting areas', icon: '👥' },
  pasture: { name: 'Pasture', description: 'Animal areas', icon: '🐄' },
  wilderness: { name: 'Wilderness', description: 'Leave untouched', icon: '🌲' },
  restricted: { name: 'Restricted', description: 'No building', icon: '🚫' },
};

const ZONE_TYPES: ZoneType[] = [
  'farming',
  'storage',
  'industry',
  'housing',
  'social',
  'pasture',
  'wilderness',
  'restricted',
];

/**
 * ZonePainterUI - Zone painting interface
 */
export class ZonePainterUI {
  private readonly camera: Camera;
  private readonly eventBus: EventBus;
  private readonly tileSize = 16;
  private readonly zoneManager = getZoneManager();

  private state: ZonePainterState = {
    isMenuOpen: false,
    isPainting: false,
    isErasing: false,
    selectedZoneType: 'farming',
    currentZoneId: null,
    cursorWorldPosition: null,
    brushSize: 1,
  };

  // Menu dimensions
  private readonly menuWidth = 180;
  private readonly menuPadding = 10;
  private readonly itemHeight = 40;

  constructor(options: ZonePainterUIOptions) {
    this.camera = options.camera;
    this.eventBus = options.eventBus;
  }

  /**
   * Get current state
   */
  getState(): Readonly<ZonePainterState> {
    return this.state;
  }

  /**
   * Check if menu is open
   */
  isMenuOpen(): boolean {
    return this.state.isMenuOpen;
  }

  /**
   * Check if in paint mode (menu closed, zone selected)
   */
  isInPaintMode(): boolean {
    return !this.state.isMenuOpen && this.state.selectedZoneType !== null;
  }

  /**
   * Toggle menu
   */
  toggleMenu(): void {
    if (this.state.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * Open zone menu
   */
  openMenu(): void {
    this.state.isMenuOpen = true;
    this.state.isPainting = false;
    this.state.isErasing = false;

    this.eventBus.emit({
      type: 'zone:menu:opened',
      source: 'zone-painter-ui',
      data: {},
    });
  }

  /**
   * Close zone menu
   */
  closeMenu(): void {
    this.state.isMenuOpen = false;

    this.eventBus.emit({
      type: 'zone:menu:closed',
      source: 'zone-painter-ui',
      data: {},
    });
  }

  /**
   * Select a zone type
   */
  selectZoneType(type: ZoneType): void {
    this.state.selectedZoneType = type;
    this.closeMenu();

    this.eventBus.emit({
      type: 'zone:type:selected',
      source: 'zone-painter-ui',
      data: { zoneType: type },
    });
  }

  /**
   * Update cursor position
   */
  updateCursorPosition(screenX: number, screenY: number): void {
    const worldPos = this.camera.screenToWorld(screenX, screenY);
    this.state.cursorWorldPosition = {
      x: Math.floor(worldPos.x / this.tileSize),
      y: Math.floor(worldPos.y / this.tileSize),
    };
  }

  /**
   * Start painting (mouse down)
   */
  startPainting(isErase: boolean): void {
    if (this.state.isMenuOpen) return;

    this.state.isPainting = !isErase;
    this.state.isErasing = isErase;

    if (!isErase) {
      // Create a new zone for this paint session
      this.state.currentZoneId = this.zoneManager.createZone(
        this.state.selectedZoneType,
        5, // Default priority
        Date.now()
      );
    }

    // Paint current tile
    this.paintCurrentTile();
  }

  /**
   * Stop painting (mouse up)
   */
  stopPainting(): void {
    if (this.state.isPainting && this.state.currentZoneId) {
      // Check if zone is empty and delete it
      const zone = this.zoneManager.getZone(this.state.currentZoneId);
      if (zone && zone.tiles.size === 0) {
        this.zoneManager.deleteZone(this.state.currentZoneId);
      }
    }

    this.state.isPainting = false;
    this.state.isErasing = false;
    this.state.currentZoneId = null;
  }

  /**
   * Paint while dragging
   */
  continuePainting(): void {
    if (this.state.isPainting || this.state.isErasing) {
      this.paintCurrentTile();
    }
  }

  /**
   * Paint the current tile and brush area
   */
  private paintCurrentTile(): void {
    if (!this.state.cursorWorldPosition) return;

    const tiles: Array<{ x: number; y: number }> = [];
    const cx = this.state.cursorWorldPosition.x;
    const cy = this.state.cursorWorldPosition.y;
    const radius = Math.floor(this.state.brushSize / 2);

    // Generate tiles in brush area
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        tiles.push({ x: cx + dx, y: cy + dy });
      }
    }

    if (this.state.isErasing) {
      this.zoneManager.removeTilesFromZones(tiles);
    } else if (this.state.currentZoneId) {
      this.zoneManager.addTilesToZone(this.state.currentZoneId, tiles);
    }
  }

  /**
   * Cycle brush size (1 -> 2 -> 3 -> 1)
   */
  cycleBrushSize(): void {
    this.state.brushSize = (this.state.brushSize % 3) + 1;
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(key: string, _shiftKey: boolean): boolean {
    switch (key.toLowerCase()) {
      case 'z':
        this.toggleMenu();
        return true;

      case 'escape':
        if (this.state.isMenuOpen) {
          this.closeMenu();
          return true;
        }
        return false;

      case '[':
        if (this.state.brushSize > 1) {
          this.state.brushSize--;
        }
        return true;

      case ']':
        if (this.state.brushSize < 3) {
          this.state.brushSize++;
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle mouse click
   */
  handleClick(screenX: number, screenY: number, button: number): boolean {
    // Check if click is in menu area
    if (this.state.isMenuOpen && screenX < this.menuWidth) {
      return this.handleMenuClick(screenX, screenY);
    }

    // Right click cancels/exits
    if (button === 2 && this.state.isMenuOpen) {
      this.closeMenu();
      return true;
    }

    return false;
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(screenX: number, screenY: number, button: number): boolean {
    if (this.state.isMenuOpen) return false;

    this.updateCursorPosition(screenX, screenY);

    if (button === 0) {
      // Left click = paint
      this.startPainting(false);
      return true;
    } else if (button === 2) {
      // Right click = erase
      this.startPainting(true);
      return true;
    }

    return false;
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(): void {
    this.stopPainting();
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(screenX: number, screenY: number): void {
    this.updateCursorPosition(screenX, screenY);
    this.continuePainting();
  }

  /**
   * Handle menu click
   */
  private handleMenuClick(screenX: number, screenY: number): boolean {
    const startY = this.menuPadding + 30; // After title

    // Check which zone type was clicked
    for (let i = 0; i < ZONE_TYPES.length; i++) {
      const itemY = startY + i * this.itemHeight;
      if (
        screenX >= this.menuPadding &&
        screenX < this.menuWidth - this.menuPadding &&
        screenY >= itemY &&
        screenY < itemY + this.itemHeight
      ) {
        this.selectZoneType(ZONE_TYPES[i]!);
        return true;
      }
    }

    return true; // Click was in menu area
  }

  /**
   * Render the zone painter UI
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Render all zones as overlays
    this.renderZoneOverlays(ctx);

    // Render brush preview if in paint mode
    if (!this.state.isMenuOpen && this.state.cursorWorldPosition) {
      this.renderBrushPreview(ctx);
    }

    // Render menu if open
    if (this.state.isMenuOpen) {
      this.renderMenu(ctx);
    }
  }

  /**
   * Render zone overlays on the map
   */
  private renderZoneOverlays(ctx: CanvasRenderingContext2D): void {
    const zones = this.zoneManager.getAllZones();

    for (const zone of zones) {
      const color = ZONE_COLORS[zone.type];

      for (const tileKey of zone.tiles) {
        const [xStr, yStr] = tileKey.split(',');
        if (xStr === undefined || yStr === undefined) continue;

        const tileX = parseInt(xStr, 10);
        const tileY = parseInt(yStr, 10);

        const screenPos = this.camera.worldToScreen(
          tileX * this.tileSize,
          tileY * this.tileSize
        );

        const size = this.tileSize * this.camera.zoom;

        ctx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${color.a})`;
        ctx.fillRect(screenPos.x, screenPos.y, size, size);

        // Draw border
        ctx.strokeStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.6)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(screenPos.x, screenPos.y, size, size);
      }
    }
  }

  /**
   * Render brush preview at cursor
   */
  private renderBrushPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.state.cursorWorldPosition) return;

    const color = ZONE_COLORS[this.state.selectedZoneType];
    const cx = this.state.cursorWorldPosition.x;
    const cy = this.state.cursorWorldPosition.y;
    const radius = Math.floor(this.state.brushSize / 2);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const screenPos = this.camera.worldToScreen(
          (cx + dx) * this.tileSize,
          (cy + dy) * this.tileSize
        );

        const size = this.tileSize * this.camera.zoom;

        // Preview with higher alpha
        ctx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.5)`;
        ctx.fillRect(screenPos.x, screenPos.y, size, size);

        ctx.strokeStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenPos.x, screenPos.y, size, size);
      }
    }

    // Show zone type label at cursor
    const info = ZONE_TYPE_INFO[this.state.selectedZoneType];
    if (!info) return; // Should never happen with valid zone type

    const screenPos = this.camera.worldToScreen(
      cx * this.tileSize,
      cy * this.tileSize
    );

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(screenPos.x, screenPos.y - 20, 80, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(`${info.icon} ${info.name}`, screenPos.x + 4, screenPos.y - 8);
  }

  /**
   * Render zone selection menu
   */
  private renderMenu(ctx: CanvasRenderingContext2D): void {
    const menuHeight = this.menuPadding * 2 + 30 + ZONE_TYPES.length * this.itemHeight + 40;

    // Background
    ctx.fillStyle = 'rgba(40, 30, 20, 0.95)';
    ctx.fillRect(0, 0, this.menuWidth, menuHeight);

    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.menuWidth, menuHeight);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Zone Painter', this.menuPadding, 20);

    // Subtitle
    ctx.fillStyle = '#888888';
    ctx.font = '9px monospace';
    ctx.fillText('Click to paint, right-click to erase', this.menuPadding, 32);

    // Zone type items
    const startY = this.menuPadding + 40;

    for (let i = 0; i < ZONE_TYPES.length; i++) {
      const type = ZONE_TYPES[i]!;
      const info = ZONE_TYPE_INFO[type];
      const color = ZONE_COLORS[type];
      if (!info || !color) continue; // Type safety

      const itemY = startY + i * this.itemHeight;
      const isSelected = type === this.state.selectedZoneType;

      // Item background
      if (isSelected) {
        ctx.fillStyle = 'rgba(100, 80, 60, 0.9)';
      } else {
        ctx.fillStyle = 'rgba(60, 50, 40, 0.7)';
      }
      ctx.fillRect(this.menuPadding, itemY, this.menuWidth - this.menuPadding * 2, this.itemHeight - 4);

      // Selection border
      if (isSelected) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.menuPadding, itemY, this.menuWidth - this.menuPadding * 2, this.itemHeight - 4);
      }

      // Color swatch
      ctx.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.8)`;
      ctx.fillRect(this.menuPadding + 4, itemY + 4, 24, 24);
      ctx.strokeStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 1)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(this.menuPadding + 4, itemY + 4, 24, 24);

      // Icon
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(info.icon, this.menuPadding + 8, itemY + 22);

      // Name
      ctx.fillStyle = isSelected ? '#FFD700' : '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(info.name, this.menuPadding + 34, itemY + 14);

      // Description
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '9px monospace';
      ctx.fillText(info.description, this.menuPadding + 34, itemY + 26);
    }

    // Brush size indicator
    const brushY = startY + ZONE_TYPES.length * this.itemHeight + 10;
    ctx.fillStyle = '#888888';
    ctx.font = '10px monospace';
    ctx.fillText(`Brush: ${this.state.brushSize}x${this.state.brushSize} ([ ] to change)`, this.menuPadding, brushY);

    // Close hint
    ctx.fillStyle = '#888888';
    ctx.font = '10px monospace';
    ctx.fillText('Press Z to close', this.menuPadding, brushY + 16);
  }

  /**
   * Clear all zones (for new game)
   */
  clearAllZones(): void {
    this.zoneManager.clearAll();
  }
}
