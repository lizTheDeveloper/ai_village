import type { World, Entity } from '@ai-village/core';
import type { NeedsComponent } from '@ai-village/core';

// Component interfaces for type safety
interface PositionComponent {
  x: number;
  y: number;
  z?: number;
}

interface CombatStatsComponent {
  combatSkill?: number;
  weapon?: string;
  armor?: string;
}

interface ConflictComponent {
  stance?: string;
  currentAction?: string;
}

interface InjuryData {
  type: string;
  severity?: string;
  bodyPart?: string;
}

interface InjuryComponent {
  injuries: InjuryData[];
}

/**
 * HealthBarRenderer - Renders health bars and injury indicators above entities
 *
 * REQ-COMBAT-002: Health Bar Display
 * - Shows health bars above injured or in-combat entities
 * - Color-coded by health percentage
 * - Displays injury indicators as icons
 */
export class HealthBarRenderer {
  private world: World;
  private ctx: CanvasRenderingContext2D;

  // Visual configuration
  private readonly BAR_WIDTH = 32;
  private readonly BAR_HEIGHT = 4;
  private readonly BAR_OFFSET_Y = -12; // Above entity sprite
  private readonly BORDER_WIDTH = 1;
  private readonly INJURY_ICON_SIZE = 6;
  private readonly INJURY_ICON_SPACING = 2;

  // Color thresholds
  private readonly HEALTH_GOOD = 0.66;
  private readonly HEALTH_MODERATE = 0.33;

  constructor(world: World, canvas: HTMLCanvasElement) {
    if (!world) {
      throw new Error('HealthBarRenderer requires World parameter');
    }
    if (!canvas) {
      throw new Error('HealthBarRenderer requires Canvas parameter');
    }

    this.world = world;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
  }

  /**
   * Render all health bars for entities in view
   *
   * PERFORMANCE: Accepts pre-filtered entities to avoid full world scan.
   * If filteredEntities is provided, only those entities are checked (96% reduction).
   * Otherwise, falls back to all world entities for backward compatibility.
   */
  public render(cameraX: number, cameraY: number, viewWidth: number, viewHeight: number, zoom: number = 1.0, filteredEntities?: Entity[]): void {
    const entities = filteredEntities ?? Array.from(this.world.entities.values());

    for (const entity of entities) {
      if (!this.shouldRenderHealthBar(entity)) {
        continue;
      }

      // Get entity position
      const position = entity.components.get('position') as PositionComponent | undefined;
      if (!position) {
        continue;
      }

      // Check if entity is in view
      const screenX = (position.x - cameraX) * zoom;
      const screenY = (position.y - cameraY) * zoom;

      // Cull off-screen entities (with margin for health bar)
      if (
        screenX < -this.BAR_WIDTH ||
        screenX > viewWidth + this.BAR_WIDTH ||
        screenY < -this.BAR_HEIGHT - 20 ||
        screenY > viewHeight + this.BAR_HEIGHT + 20
      ) {
        continue;
      }

      this.renderHealthBar(entity, screenX, screenY);
      this.renderInjuryIndicators(entity, screenX, screenY);
    }
  }

  /**
   * Determine if entity should display health bar
   */
  public shouldRenderHealthBar(entity: Entity): boolean {
    const needs = entity.components.get('needs') as NeedsComponent | undefined;
    const combatStats = entity.components.get('combat_stats') as CombatStatsComponent | undefined;
    const conflict = entity.components.get('conflict') as ConflictComponent | undefined;

    // Must have needs component for health tracking
    if (!needs || !combatStats) {
      return false;
    }

    // Show if health below 100%
    if (needs.health < 1.0) {
      return true;
    }

    // Show if entity is in combat
    if (conflict) {
      return true;
    }

    // Don't show for healthy entities not in combat
    return false;
  }

  /**
   * Render health bar for a specific entity
   */
  public renderHealthBar(entity: Entity, screenX: number, screenY: number): void {
    const needs = entity.components.get('needs') as NeedsComponent | undefined;
    const position = entity.components.get('position') as PositionComponent | undefined;

    if (!needs) {
      throw new Error('Cannot render health bar: entity missing needs component');
    }
    if (!position) {
      throw new Error('Cannot render health bar: entity missing position component');
    }

    const health = needs.health;

    // Calculate bar position (centered above entity)
    const barX = screenX - this.BAR_WIDTH / 2;
    const barY = screenY + this.BAR_OFFSET_Y;

    // Draw background (black)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(barX, barY, this.BAR_WIDTH, this.BAR_HEIGHT);

    // Draw border (white)
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = this.BORDER_WIDTH;
    this.ctx.strokeRect(barX, barY, this.BAR_WIDTH, this.BAR_HEIGHT);

    // Calculate health bar fill width
    const fillWidth = Math.max(0, Math.min(1, health)) * this.BAR_WIDTH;

    // Choose color based on health percentage
    let fillColor: string;
    if (health >= this.HEALTH_GOOD) {
      fillColor = '#00FF00'; // Green
    } else if (health >= this.HEALTH_MODERATE) {
      fillColor = '#FFFF00'; // Yellow
    } else {
      fillColor = '#FF0000'; // Red
    }

    // Draw health fill
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(barX, barY, fillWidth, this.BAR_HEIGHT);
  }

  /**
   * Render injury indicators above health bar
   */
  public renderInjuryIndicators(entity: Entity, screenX: number, screenY: number): void {
    const injury = entity.components.get('injury') as InjuryComponent | undefined;

    if (!injury || !injury.injuries || injury.injuries.length === 0) {
      return;
    }

    // Position icons above health bar
    const startX = screenX - ((injury.injuries.length * (this.INJURY_ICON_SIZE + this.INJURY_ICON_SPACING)) / 2);
    const iconY = screenY + this.BAR_OFFSET_Y - this.INJURY_ICON_SIZE - 2;

    // Render each injury as a small icon
    for (let i = 0; i < injury.injuries.length; i++) {
      const injuryData = injury.injuries[i];
      if (!injuryData) {
        throw new Error(`Injury data at index ${i} is undefined`);
      }
      const iconX = startX + i * (this.INJURY_ICON_SIZE + this.INJURY_ICON_SPACING);

      this.renderInjuryIcon(injuryData.type, iconX, iconY);
    }
  }

  /**
   * Render a single injury icon
   */
  private renderInjuryIcon(type: string, x: number, y: number): void {
    const size = this.INJURY_ICON_SIZE;

    // Choose color based on injury type
    let color: string;
    switch (type) {
      case 'laceration':
        color = '#CC0000'; // Dark red - bleeding
        break;
      case 'puncture':
        color = '#990000'; // Darker red
        break;
      case 'blunt':
        color = '#6666CC'; // Blue-purple - bruising
        break;
      case 'burn':
        color = '#FF6600'; // Orange - fire
        break;
      case 'bite':
        color = '#993300'; // Brown-red - animal attack
        break;
      case 'exhaustion':
        color = '#666666'; // Gray - fatigue
        break;
      case 'psychological':
        color = '#CC66CC'; // Purple - mental trauma
        break;
      default:
        color = '#FFFFFF'; // White - unknown
    }

    // Draw simple square icon with border
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, size, size);

    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);
  }
}
