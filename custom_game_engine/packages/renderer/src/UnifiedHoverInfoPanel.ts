import type { Entity } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';
import type {
  AgentComponent,
  AnimalComponent,
  PlantComponent,
  BuildingComponent,
  ResourceComponent,
  IdentityComponent,
  NeedsComponent,
  MoodComponent,
  ShopComponent,
  InventoryComponent,
} from '@ai-village/core';

/**
 * UnifiedHoverInfoPanel - Shows contextual information when hovering over entities
 *
 * Phase 16: Polish & Player - Unified hover info system
 * Displays compact tooltips for agents, animals, plants, buildings, resources, and shops
 */
export class UnifiedHoverInfoPanel implements IWindowPanel {
  private visible: boolean = false;
  private currentEntity: Entity | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private enabled: boolean = true;
  private readonly padding = 8;
  private readonly lineHeight = 14;
  private readonly maxWidth = 250;


  getId(): string {
    return 'unified-hover-info';
  }

  getTitle(): string {
    return 'Hover Info';
  }

  getDefaultWidth(): number {
    return 350;
  }

  getDefaultHeight(): number {
    return 400;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  constructor() {}

  /**
   * Update the hover info with the entity currently under the mouse
   */
  update(entity: Entity | null, screenX: number, screenY: number): void {
    this.currentEntity = entity;
    this.mouseX = screenX;
    this.mouseY = screenY;
  }

  /**
   * Enable or disable hover info display
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Render the hover info tooltip
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    if (!this.enabled || !this.currentEntity) {
      return;
    }

    const entity = this.currentEntity;
    const info = this.getEntityInfo(entity);

    if (!info || info.lines.length === 0) {
      return;
    }

    // Calculate tooltip dimensions
    ctx.font = '12px monospace';
    const lineWidths = info.lines.map(line => ctx.measureText(line.text).width);
    const maxLineWidth = Math.max(...lineWidths, 100);
    const tooltipWidth = Math.min(maxLineWidth + this.padding * 2, this.maxWidth);
    const tooltipHeight = info.lines.length * this.lineHeight + this.padding * 2;

    // Position tooltip offset from cursor (avoid covering entity)
    let x = this.mouseX + 15;
    let y = this.mouseY + 15;

    // Keep tooltip on screen
    if (x + tooltipWidth > canvasWidth - 10) {
      x = this.mouseX - tooltipWidth - 15;
    }
    if (y + tooltipHeight > canvasHeight - 10) {
      y = this.mouseY - tooltipHeight - 15;
    }

    // Ensure tooltip doesn't go off left/top edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, tooltipWidth, tooltipHeight);

    // Draw tooltip border
    ctx.strokeStyle = info.borderColor || '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, tooltipWidth, tooltipHeight);

    // Draw tooltip content
    let currentY = y + this.padding + 11;
    for (const line of info.lines) {
      ctx.fillStyle = line.color || '#FFF';
      ctx.font = line.bold ? 'bold 12px monospace' : '12px monospace';
      ctx.fillText(line.text, x + this.padding, currentY);
      currentY += this.lineHeight;
    }
  }

  /**
   * Extract hover info from entity based on its type
   */
  private getEntityInfo(entity: Entity): HoverInfo | null {
    // Check entity type and delegate to appropriate handler
    if (entity.components.has('agent')) {
      return this.getAgentInfo(entity);
    } else if (entity.components.has('animal')) {
      return this.getAnimalInfo(entity);
    } else if (entity.components.has('plant')) {
      return this.getPlantInfo(entity);
    } else if (entity.components.has('building')) {
      return this.getBuildingInfo(entity);
    } else if (entity.components.has('resource')) {
      return this.getResourceInfo(entity);
    }

    return null;
  }

  /**
   * Get hover info for agents
   */
  private getAgentInfo(entity: Entity): HoverInfo {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const agent = entity.components.get('agent') as AgentComponent | undefined;
    const needs = entity.components.get('needs') as NeedsComponent | undefined;

    const lines: HoverLine[] = [];

    // Name
    const name = identity?.name ?? 'Unknown Agent';
    lines.push({ text: name, color: '#FFD700', bold: true });

    // Current behavior
    if (agent) {
      const behavior = this.formatBehavior(agent.behavior);
      lines.push({ text: `Task: ${behavior}`, color: '#AAA' });
    }

    // Health and hunger
    if (needs) {
      const healthPercent = Math.round(needs.health * 100);
      const healthColor = this.getHealthColor(needs.health);
      lines.push({ text: `Health: ${healthPercent}%`, color: healthColor });

      const hungerPercent = Math.round((1 - needs.hunger) * 100);
      const hungerColor = this.getHealthColor(1 - needs.hunger);
      lines.push({ text: `Hunger: ${hungerPercent}%`, color: hungerColor });
    }

    return { lines, borderColor: '#FFD700' };
  }

  /**
   * Get hover info for animals
   */
  private getAnimalInfo(entity: Entity): HoverInfo {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const animal = entity.components.get('animal') as AnimalComponent | undefined;
    const needs = entity.components.get('needs') as NeedsComponent | undefined;
    const mood = entity.components.get('mood') as MoodComponent | undefined;

    const lines: HoverLine[] = [];

    // Name (or species if unnamed)
    const name = identity?.name ?? animal?.speciesId ?? 'Unknown Animal';
    lines.push({ text: name, color: '#8FBC8F', bold: true });

    // Species and stage
    if (animal) {
      const stage = animal.lifeStage ?? 'adult';
      const species = animal.speciesId ?? 'unknown';
      lines.push({ text: `${stage} ${species}`, color: '#90EE90' });

      // Tame/Wild status
      const status = !animal.wild ? 'Tamed' : 'Wild';
      const statusColor = !animal.wild ? '#87CEEB' : '#FFB6C1';
      lines.push({ text: status, color: statusColor });
    }

    // Health
    if (needs) {
      const healthPercent = Math.round(needs.health * 100);
      const healthColor = this.getHealthColor(needs.health);
      lines.push({ text: `Health: ${healthPercent}%`, color: healthColor });
    }

    // Mood
    if (mood) {
      lines.push({ text: `Mood: ${mood.emotionalState}`, color: '#DDA0DD' });
    }

    return { lines, borderColor: '#8FBC8F' };
  }

  /**
   * Get hover info for plants
   */
  private getPlantInfo(entity: Entity): HoverInfo {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const plant = entity.components.get('plant') as PlantComponent | undefined;

    const lines: HoverLine[] = [];

    // Species name
    const species = identity?.name ?? plant?.speciesId ?? 'Unknown Plant';
    lines.push({ text: species, color: '#32CD32', bold: true });

    if (plant) {
      // Growth stage
      const stage = plant.stage ?? 'unknown';
      const stageProgress = plant.stageProgress ?? 0;
      const progressPercent = Math.round(stageProgress * 100);
      lines.push({ text: `Stage: ${stage} (${progressPercent}%)`, color: '#90EE90' });

      // Health
      if (plant.health !== undefined) {
        const healthPercent = Math.round(plant.health * 100);
        const healthColor = this.getHealthColor(plant.health);
        lines.push({ text: `Health: ${healthPercent}%`, color: healthColor });
      }

      // Age
      if (plant.age !== undefined) {
        lines.push({ text: `Age: ${Math.round(plant.age)} days`, color: '#AAA' });
      }
    }

    return { lines, borderColor: '#32CD32' };
  }

  /**
   * Get hover info for buildings
   */
  private getBuildingInfo(entity: Entity): HoverInfo {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const building = entity.components.get('building') as BuildingComponent | undefined;
    const shop = entity.components.get('shop') as ShopComponent | undefined;
    const inventory = entity.components.get('inventory') as InventoryComponent | undefined;

    const lines: HoverLine[] = [];

    // Building name/type
    const name = identity?.name ?? building?.buildingType ?? 'Unknown Building';
    lines.push({ text: name, color: '#CD853F', bold: true });

    if (building) {
      // Construction progress
      if (building.progress !== undefined && building.progress < 1.0) {
        const progressPercent = Math.round(building.progress * 100);
        lines.push({ text: `Construction: ${progressPercent}%`, color: '#FFA500' });
      } else {
        lines.push({ text: 'Complete', color: '#90EE90' });
      }

      // Owner
      if (building.ownerName) {
        lines.push({ text: `Owner: ${building.ownerName}`, color: '#AAA' });
      }
    }

    // Shop-specific info
    if (shop) {
      const itemCount = inventory?.slots?.filter((slot: any) => slot.itemId !== null).length ?? 0;
      lines.push({ text: `Items: ${itemCount}`, color: '#FFD700' });
    }

    return { lines, borderColor: '#CD853F' };
  }

  /**
   * Get hover info for resources
   */
  private getResourceInfo(entity: Entity): HoverInfo {
    const identity = entity.components.get('identity') as IdentityComponent | undefined;
    const resource = entity.components.get('resource') as ResourceComponent | undefined;

    const lines: HoverLine[] = [];

    // Resource name
    const name = identity?.name ?? resource?.resourceType ?? 'Unknown Resource';
    lines.push({ text: name, color: '#B8860B', bold: true });

    if (resource) {
      // Amount
      if (resource.amount !== undefined) {
        const maxAmount = resource.maxAmount ?? resource.amount;
        lines.push({ text: `Amount: ${resource.amount}/${maxAmount}`, color: '#DAA520' });
      }

      // Regeneration
      if (resource.regenerationRate !== undefined && resource.regenerationRate > 0) {
        lines.push({ text: `Regen: ${resource.regenerationRate}/tick`, color: '#90EE90' });
      }
    }

    return { lines, borderColor: '#B8860B' };
  }

  /**
   * Format behavior name from snake_case to Title Case
   */
  private formatBehavior(behavior: string): string {
    return behavior
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get color for health/need values (0.0 - 1.0)
   */
  private getHealthColor(value: number): string {
    if (value < 0.3) return '#FF0000'; // Red (critical)
    if (value < 0.6) return '#FF8C00'; // Orange (warning)
    if (value < 0.8) return '#FFFF00'; // Yellow (ok)
    return '#00FF00'; // Green (good)
  }
}

/**
 * Hover info data structure
 */
interface HoverInfo {
  lines: HoverLine[];
  borderColor?: string;
}

/**
 * A single line of hover info text
 */
interface HoverLine {
  text: string;
  color?: string;
  bold?: boolean;
}
