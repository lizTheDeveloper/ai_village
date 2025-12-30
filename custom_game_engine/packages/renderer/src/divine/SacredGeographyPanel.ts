/**
 * SacredGeographyPanel - "The Blessed Lands"
 *
 * Map view showing spiritual geography overlaid on game world.
 * Features:
 * - Sacred sites map with markers
 * - Faith density heat map layer
 * - Prayer paths visualization
 * - Site details and actions
 *
 * See: specs/divine-systems-ui.md
 */

import type { IWindowPanel } from '../IWindowPanel.js';
import {
  SacredSite,
  SacredSiteLevel,
  DIVINE_COLORS,
  SACRED_SITE_NAMES,
  SACRED_SITE_BENEFITS,
} from './DivineUITypes.js';

export interface SacredGeographyCallbacks {
  onSelectSite: (siteId: string | null) => void;
  onBlessSite: (siteId: string) => void;
  onSendMiracle: (siteId: string) => void;
  onViewHistory: (siteId: string) => void;
  onToggleLayer: (layer: MapLayer) => void;
  onCenterOnSite: (siteId: string) => void;
}

export type MapLayer = 'sacred_sites' | 'faith_density' | 'prayer_paths' | 'ritual_grounds';

export interface FaithDensityCell {
  x: number;
  y: number;
  density: number; // 0-100
}

export interface SacredGeographyState {
  sites: SacredSite[];
  selectedSiteId: string | null;
  enabledLayers: Set<MapLayer>;
  faithDensity: FaithDensityCell[];
  currentEnergy: number;
  mapBounds: { minX: number; minY: number; maxX: number; maxY: number };
  cameraOffset: { x: number; y: number };
  zoom: number;
}

export class SacredGeographyPanel implements IWindowPanel {
  private visible: boolean = false;
  private state: SacredGeographyState;
  private callbacks: SacredGeographyCallbacks;

  private readonly padding: number = 10;
  private readonly layerBarHeight: number = 32;
  private readonly detailsPanelHeight: number = 180;

  // Map drag state - reserved for future pan/zoom implementation
  // private isDraggingMap: boolean = false;
  // private dragStartX: number = 0;
  // private dragStartY: number = 0;

  constructor(
    initialState: SacredGeographyState,
    callbacks: SacredGeographyCallbacks
  ) {
    this.state = initialState;
    this.callbacks = callbacks;
  }

  // ============================================================================
  // IWindowPanel Implementation
  // ============================================================================

  getId(): string {
    return 'divine-sacred-geography';
  }

  getTitle(): string {
    return `\u{1F5FA}\uFE0F Sacred Geography (${this.state.sites.length} sites)`;
  }

  getDefaultWidth(): number {
    return 650;
  }

  getDefaultHeight(): number {
    return 500;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  updateState(newState: Partial<SacredGeographyState>): void {
    this.state = { ...this.state, ...newState };
  }

  getState(): SacredGeographyState {
    return this.state;
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  render(
    ctx: CanvasRenderingContext2D,
    _x: number,
    _y: number,
    width: number,
    height: number,
    _world?: unknown
  ): void {
    ctx.save();

    // Layer toggle bar
    const layerBarY = this.renderLayerBar(ctx, width);

    // Map area
    const mapY = layerBarY;
    const mapHeight = height - layerBarY - (this.state.selectedSiteId ? this.detailsPanelHeight : 0);
    this.renderMap(ctx, 0, mapY, width, mapHeight);

    // Details panel (if site selected)
    if (this.state.selectedSiteId) {
      const detailsY = mapY + mapHeight;
      this.renderDetailsPanel(ctx, 0, detailsY, width, this.detailsPanelHeight);
    }

    ctx.restore();
  }

  /**
   * Render layer toggle bar
   */
  private renderLayerBar(ctx: CanvasRenderingContext2D, width: number): number {
    // Background
    ctx.fillStyle = 'rgba(40, 40, 60, 0.9)';
    ctx.fillRect(0, 0, width, this.layerBarHeight);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let x = this.padding;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Layers:', x, this.layerBarHeight / 2);
    x += 50;

    const layers: Array<{ id: MapLayer; label: string }> = [
      { id: 'sacred_sites', label: 'Sacred Sites' },
      { id: 'faith_density', label: 'Faith Density' },
      { id: 'prayer_paths', label: 'Prayer Paths' },
      { id: 'ritual_grounds', label: 'Ritual Grounds' },
    ];

    for (const layer of layers) {
      const isEnabled = this.state.enabledLayers.has(layer.id);
      const labelWidth = ctx.measureText(layer.label).width + 24;

      // Checkbox
      ctx.fillStyle = isEnabled ? DIVINE_COLORS.primary : '#333333';
      ctx.fillRect(x, this.layerBarHeight / 2 - 6, 12, 12);
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, this.layerBarHeight / 2 - 6, 12, 12);

      if (isEnabled) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText('\u2713', x + 2, this.layerBarHeight / 2 + 1);
      }

      // Label
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = isEnabled ? '#FFFFFF' : '#888888';
      ctx.fillText(layer.label, x + 16, this.layerBarHeight / 2);

      x += labelWidth + 15;
    }

    // Bottom border
    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(0, this.layerBarHeight);
    ctx.lineTo(width, this.layerBarHeight);
    ctx.stroke();

    return this.layerBarHeight;
  }

  /**
   * Render the map area
   */
  private renderMap(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    // Clip to map area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Background (simulated terrain)
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x, y, width, height);

    // Grid lines (for reference)
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 50 * this.state.zoom;
    for (let gx = x; gx < x + width; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();
    }
    for (let gy = y; gy < y + height; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }

    // Faith density layer
    if (this.state.enabledLayers.has('faith_density')) {
      this.renderFaithDensity(ctx, x, y, width, height);
    }

    // Sacred sites layer
    if (this.state.enabledLayers.has('sacred_sites')) {
      this.renderSacredSites(ctx, x, y, width, height);
    }

    // Map instructions
    if (this.state.sites.length === 0) {
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No sacred sites discovered yet', x + width / 2, y + height / 2 - 10);
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillText('Sacred sites form when prayers are answered at locations', x + width / 2, y + height / 2 + 10);
    }

    ctx.restore();
  }

  /**
   * Render faith density heat map
   */
  private renderFaithDensity(
    ctx: CanvasRenderingContext2D,
    mapX: number,
    mapY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const cellSize = 20 * this.state.zoom;
    const { minX, minY, maxX, maxY } = this.state.mapBounds;
    const worldWidth = maxX - minX || 100;
    const worldHeight = maxY - minY || 100;

    for (const cell of this.state.faithDensity) {
      const screenX = mapX + ((cell.x - minX) / worldWidth) * mapWidth;
      const screenY = mapY + ((cell.y - minY) / worldHeight) * mapHeight;

      // Color based on density
      const alpha = cell.density / 100 * 0.6;
      if (cell.density > 70) {
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // Gold for high faith
      } else if (cell.density > 40) {
        ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`; // Blue for medium
      } else {
        ctx.fillStyle = `rgba(240, 230, 140, ${alpha})`; // Khaki for low
      }

      ctx.fillRect(screenX - cellSize / 2, screenY - cellSize / 2, cellSize, cellSize);
    }
  }

  /**
   * Render sacred site markers
   */
  private renderSacredSites(
    ctx: CanvasRenderingContext2D,
    mapX: number,
    mapY: number,
    mapWidth: number,
    mapHeight: number
  ): void {
    const { minX, minY, maxX, maxY } = this.state.mapBounds;
    const worldWidth = maxX - minX || 100;
    const worldHeight = maxY - minY || 100;

    for (const site of this.state.sites) {
      const screenX = mapX + ((site.location.x - minX) / worldWidth) * mapWidth;
      const screenY = mapY + ((site.location.y - minY) / worldHeight) * mapHeight;
      const isSelected = site.id === this.state.selectedSiteId;

      // Site marker size based on level
      const baseSize = 12 + site.level * 4;
      const size = baseSize * this.state.zoom;

      // Glow effect for selected
      if (isSelected) {
        ctx.shadowColor = DIVINE_COLORS.primary;
        ctx.shadowBlur = 15;
      }

      // Outer circle (level indicator)
      ctx.fillStyle = this.getSiteLevelColor(site.level);
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();

      // Inner circle
      ctx.fillStyle = isSelected ? DIVINE_COLORS.primary : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Site icon (star)
      ctx.font = `${Math.floor(size * 0.8)}px "Segoe UI", sans-serif`;
      ctx.fillStyle = this.getSiteLevelColor(site.level);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u2728', screenX, screenY);

      // Site name label
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(site.name, screenX, screenY + size + 10);

      // Level badge
      ctx.font = '8px "Segoe UI", sans-serif';
      ctx.fillStyle = '#AAAAAA';
      ctx.fillText(`Lv.${site.level}`, screenX, screenY + size + 20);
    }
  }

  /**
   * Render details panel for selected site
   */
  private renderDetailsPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const site = this.state.sites.find(s => s.id === this.state.selectedSiteId);
    if (!site) return;

    // Background
    ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
    ctx.fillRect(x, y, width, height);

    // Top border
    ctx.strokeStyle = DIVINE_COLORS.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    const contentX = x + this.padding;
    let currentY = y + this.padding;
    const contentWidth = width - this.padding * 2;

    // Site name and level
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillStyle = DIVINE_COLORS.primary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`\u2728 ${site.name}`, contentX, currentY);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    const levelName = SACRED_SITE_NAMES[site.level];
    ctx.fillText(`Level ${site.level} - ${levelName}`, contentX + 200, currentY + 2);
    currentY += 22;

    // Faith power bar
    ctx.fillStyle = '#888888';
    ctx.fillText('Faith Power:', contentX, currentY);

    const barX = contentX + 75;
    const barWidth = 100;
    const barHeight = 12;
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, currentY - 1, barWidth, barHeight);

    ctx.fillStyle = this.getSiteLevelColor(site.level);
    ctx.fillRect(barX, currentY - 1, barWidth * (site.faithPower / 100), barHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${site.faithPower}%`, barX + barWidth + 8, currentY);
    currentY += 20;

    // Divider
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, currentY);
    ctx.lineTo(contentX + contentWidth, currentY);
    ctx.stroke();
    currentY += 8;

    // Two column layout
    const col1X = contentX;
    const col2X = contentX + contentWidth / 2;

    // Left column: Origin and stats
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Origin:', col1X, currentY);
    currentY += 12;

    ctx.fillStyle = '#CCCCCC';
    const originText = site.originEvent.length > 35
      ? site.originEvent.slice(0, 35) + '...'
      : site.originEvent;
    ctx.fillText(originText, col1X, currentY);
    currentY += 16;

    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Pilgrims: ${site.pilgrimCount} visitors`, col1X, currentY);
    currentY += 12;
    ctx.fillText(`Rituals: ${site.ritualTypes.length} types performed`, col1X, currentY);
    currentY += 16;

    // Right column: Benefits
    const benefitsY = y + this.padding + 22 + 20 + 8;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Benefits:', col2X, benefitsY);

    const benefits = SACRED_SITE_BENEFITS[site.level];
    let benefitY = benefitsY + 14;
    ctx.fillStyle = '#90EE90';
    ctx.fillText(`\u2022 Prayer success +${benefits.prayerBonus}%`, col2X, benefitY);
    benefitY += 12;
    if (benefits.visionClarityBonus > 0) {
      ctx.fillText(`\u2022 Vision clarity +${benefits.visionClarityBonus}%`, col2X, benefitY);
      benefitY += 12;
    }
    if (benefits.faithRegenBonus > 0) {
      ctx.fillText(`\u2022 Faith regen +${benefits.faithRegenBonus}%`, col2X, benefitY);
      benefitY += 12;
    }

    // Guardian angel
    if (site.guardianAngelId) {
      ctx.fillStyle = DIVINE_COLORS.secondary;
      ctx.fillText(`\u{1F47C} Guardian assigned`, col2X, benefitY);
    }

    // Action buttons at bottom
    const buttonY = y + height - 36;
    const buttonWidth = (contentWidth - 20) / 3;
    const buttonHeight = 26;

    // Bless Site button
    const blessCost = 30;
    const canBless = this.state.currentEnergy >= blessCost;
    this.renderButton(ctx, contentX, buttonY, buttonWidth, buttonHeight,
      `\u2728 Bless`, `\u26A1${blessCost}`,
      canBless ? DIVINE_COLORS.primary : '#555555');

    // Send Miracle button
    const miracleCost = 80;
    const canMiracle = this.state.currentEnergy >= miracleCost;
    this.renderButton(ctx, contentX + buttonWidth + 10, buttonY, buttonWidth, buttonHeight,
      `\u{1F31F} Miracle`, `\u26A1${miracleCost}`,
      canMiracle ? DIVINE_COLORS.secondary : '#555555');

    // View History button
    this.renderButton(ctx, contentX + (buttonWidth + 10) * 2, buttonY, buttonWidth, buttonHeight,
      '\u{1F4DC} History', '',
      DIVINE_COLORS.accent);
  }

  /**
   * Render a button
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    subLabel: string,
    color: string
  ): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();

    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2 - (subLabel ? 3 : 0));

    if (subLabel) {
      ctx.font = '8px "Segoe UI", sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(subLabel, x + width / 2, y + height / 2 + 8);
    }
  }

  /**
   * Get color for site level
   */
  private getSiteLevelColor(level: SacredSiteLevel): string {
    const colors: Record<SacredSiteLevel, string> = {
      1: '#8B7355', // Brown
      2: '#C0C0C0', // Silver
      3: '#FFD700', // Gold
      4: '#87CEEB', // Sky blue
      5: '#E6E6FA', // Lavender (divine)
    };
    return colors[level];
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ============================================================================
  // Click Handling
  // ============================================================================

  handleClick(x: number, y: number, _world?: unknown): boolean {
    // Check layer bar clicks
    if (y < this.layerBarHeight) {
      return this.handleLayerBarClick(x);
    }

    // Check map clicks
    const mapY = this.layerBarHeight;
    const mapHeight = this.getDefaultHeight() - this.layerBarHeight -
      (this.state.selectedSiteId ? this.detailsPanelHeight : 0);

    if (y >= mapY && y < mapY + mapHeight) {
      return this.handleMapClick(x, y - mapY, this.getDefaultWidth(), mapHeight);
    }

    // Check details panel clicks
    if (this.state.selectedSiteId && y >= mapY + mapHeight) {
      return this.handleDetailsPanelClick(x, y - (mapY + mapHeight));
    }

    return false;
  }

  private handleLayerBarClick(x: number): boolean {
    // Approximate layer checkbox positions
    const layerStarts = [60, 155, 260, 360];
    const layers: MapLayer[] = ['sacred_sites', 'faith_density', 'prayer_paths', 'ritual_grounds'];

    for (let i = 0; i < layers.length; i++) {
      const start = layerStarts[i] ?? 0;
      if (x >= start && x < start + 80) {
        const layer = layers[i];
        if (layer) {
          this.callbacks.onToggleLayer(layer);
          return true;
        }
      }
    }
    return false;
  }

  private handleMapClick(x: number, y: number, mapWidth: number, mapHeight: number): boolean {
    const { minX, minY, maxX, maxY } = this.state.mapBounds;
    const worldWidth = maxX - minX || 100;
    const worldHeight = maxY - minY || 100;

    // Check if clicked on a site
    for (const site of this.state.sites) {
      const screenX = ((site.location.x - minX) / worldWidth) * mapWidth;
      const screenY = ((site.location.y - minY) / worldHeight) * mapHeight;
      const size = (12 + site.level * 4) * this.state.zoom;

      const dx = x - screenX;
      const dy = y - screenY;
      if (dx * dx + dy * dy < size * size) {
        this.callbacks.onSelectSite(site.id);
        return true;
      }
    }

    // Clicked on empty space - deselect
    if (this.state.selectedSiteId) {
      this.callbacks.onSelectSite(null);
      return true;
    }

    return false;
  }

  private handleDetailsPanelClick(x: number, y: number): boolean {
    if (!this.state.selectedSiteId) return false;

    const contentX = this.padding;
    const contentWidth = this.getDefaultWidth() - this.padding * 2;
    const buttonY = this.detailsPanelHeight - 36;
    const buttonWidth = (contentWidth - 20) / 3;
    const buttonHeight = 26;

    if (y >= buttonY && y <= buttonY + buttonHeight) {
      if (x >= contentX && x <= contentX + buttonWidth) {
        // Bless Site
        this.callbacks.onBlessSite(this.state.selectedSiteId);
        return true;
      } else if (x >= contentX + buttonWidth + 10 && x <= contentX + buttonWidth * 2 + 10) {
        // Send Miracle
        this.callbacks.onSendMiracle(this.state.selectedSiteId);
        return true;
      } else if (x >= contentX + (buttonWidth + 10) * 2) {
        // View History
        this.callbacks.onViewHistory(this.state.selectedSiteId);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle scroll for zoom
   */
  handleScroll(deltaY: number): void {
    const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(2.0, this.state.zoom + zoomDelta));
    this.state.zoom = newZoom;
  }
}
