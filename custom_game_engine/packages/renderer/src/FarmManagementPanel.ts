import type { World, PlantComponent, BuildingComponent, PositionComponent } from '@ai-village/core';
import { ComponentType as CT } from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

/**
 * Farm health status summary
 */
interface FarmHealthSummary {
  totalPlants: number;
  healthyPlants: number;
  sickPlants: number;
  infectedPlants: number;
  averageHealth: number;
  averageHydration: number;
  averageNutrition: number;
}

/**
 * Disease/Pest issue affecting plants
 */
interface FarmIssue {
  type: 'disease' | 'pest';
  name: string;
  affectedCount: number;
  severity: string;
}

/**
 * Active farming building
 */
interface FarmBuilding {
  id: string;
  name: string;
  type: string;
  effectRadius: number;
  affectedPlants: number;
}

/**
 * UI Panel for farm management overview.
 * Shows farm health, diseases/pests, buildings, and recommendations.
 */
export class FarmManagementPanel implements IWindowPanel {
  private visible: boolean = false;
  private panelWidth = 320;
  private panelHeight = 480;
  private padding = 10;
  private lineHeight = 18;
  private scrollOffset = 0;
  private contentHeight = 0;
  private isCollapsed = false;
  private activeSection: 'overview' | 'issues' | 'buildings' | 'tips' = 'overview';

  /**
   * Toggle panel collapsed state.
   */

  getId(): string {
    return 'farm-management';
  }

  getTitle(): string {
    return 'Farm Management';
  }

  getDefaultWidth(): number {
    return 500;
  }

  getDefaultHeight(): number {
    return 600;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  /**
   * Set active section tab.
   */
  setActiveSection(section: 'overview' | 'issues' | 'buildings' | 'tips'): void {
    this.activeSection = section;
    this.scrollOffset = 0;
  }

  /**
   * Handle scroll events.
   */
  handleScroll(deltaY: number, viewportHeight: number): boolean {
    const scrollSpeed = 30;
    const maxScroll = Math.max(0, this.contentHeight - viewportHeight + this.padding * 2);

    this.scrollOffset += deltaY > 0 ? scrollSpeed : -scrollSpeed;
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset));

    return true;
  }

  /**
   * Render the farm management panel.
   */
  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, world?: any): void {
    if (!world) return;

    const x = 0;
    const y = 0;
    const renderWidth = width || this.panelWidth;
    const renderHeight = height || this.panelHeight;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, renderWidth, renderHeight);
    ctx.clip();

    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + this.padding;

    // Render tabs
    currentY = this.renderTabs(ctx, x, currentY, renderWidth);

    // Apply scroll offset for content below tabs
    ctx.translate(0, -this.scrollOffset);
    const contentStartY = currentY;

    // Render active section
    switch (this.activeSection) {
      case 'overview':
        currentY = this.renderOverview(ctx, x, currentY, renderWidth, world);
        break;
      case 'issues':
        currentY = this.renderIssues(ctx, x, currentY, renderWidth, world);
        break;
      case 'buildings':
        currentY = this.renderBuildings(ctx, x, currentY, renderWidth, world);
        break;
      case 'tips':
        currentY = this.renderTips(ctx, x, currentY, renderWidth, world);
        break;
    }

    this.contentHeight = currentY - contentStartY + this.scrollOffset;

    ctx.restore();

    // Draw scroll indicator if needed
    if (this.contentHeight > renderHeight - 40) {
      this.renderScrollbar(ctx, renderWidth, renderHeight);
    }
  }

  /**
   * Render section tabs.
   */
  private renderTabs(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): number {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: '🌾' },
      { id: 'issues', label: 'Issues', icon: '⚠️' },
      { id: 'buildings', label: 'Buildings', icon: '🏠' },
      { id: 'tips', label: 'Tips', icon: '💡' },
    ] as const;

    const tabWidth = (width - 2 * this.padding) / tabs.length;
    const tabHeight = 28;

    ctx.font = '12px monospace';

    tabs.forEach((tab, i) => {
      const tabX = x + this.padding + i * tabWidth;
      const isActive = this.activeSection === tab.id;

      // Tab background
      ctx.fillStyle = isActive ? 'rgba(100, 150, 100, 0.6)' : 'rgba(50, 50, 50, 0.4)';
      ctx.fillRect(tabX, y, tabWidth - 2, tabHeight);

      // Tab border
      ctx.strokeStyle = isActive ? '#90EE90' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tabX, y, tabWidth - 2, tabHeight);

      // Tab text
      ctx.fillStyle = isActive ? '#FFFFFF' : '#AAAAAA';
      ctx.textAlign = 'center';
      ctx.fillText(`${tab.icon}`, tabX + tabWidth / 2 - 1, y + 6);
    });

    ctx.textAlign = 'left';
    return y + tabHeight + 8;
  }

  /**
   * Render overview section.
   */
  private renderOverview(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, world: World): number {
    const summary = this.getFarmHealthSummary(world);

    // Section header
    ctx.fillStyle = '#90EE90';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Farm Overview', x + this.padding, y);
    y += this.lineHeight + 4;
    ctx.font = '14px monospace';

    // Plant counts
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Total Plants: ${summary.totalPlants}`, x + this.padding, y);
    y += this.lineHeight;

    // Health status icons
    const healthyIcon = '🌿';
    const sickIcon = '🤒';
    const infectedIcon = '🦠';

    ctx.fillStyle = '#90EE90';
    ctx.fillText(`${healthyIcon} Healthy: ${summary.healthyPlants}`, x + this.padding, y);
    y += this.lineHeight;

    if (summary.sickPlants > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`${sickIcon} Sick: ${summary.sickPlants}`, x + this.padding, y);
      y += this.lineHeight;
    }

    if (summary.infectedPlants > 0) {
      ctx.fillStyle = '#FF6347';
      ctx.fillText(`${infectedIcon} Infested: ${summary.infectedPlants}`, x + this.padding, y);
      y += this.lineHeight;
    }

    y += 8;

    // Average stats
    ctx.fillStyle = '#CCCCCC';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Average Conditions:', x + this.padding, y);
    y += this.lineHeight;
    ctx.font = '14px monospace';

    // Health bar
    y = this.renderMiniBar(ctx, x, y, width, 'Health', summary.averageHealth, 100,
      summary.averageHealth > 70 ? '#00FF00' : summary.averageHealth > 40 ? '#FFFF00' : '#FF0000');

    // Hydration bar
    y = this.renderMiniBar(ctx, x, y, width, 'Hydration', summary.averageHydration, 100,
      summary.averageHydration > 60 ? '#1E90FF' : summary.averageHydration > 30 ? '#FFA500' : '#FF4500');

    // Nutrition bar
    y = this.renderMiniBar(ctx, x, y, width, 'Nutrition', summary.averageNutrition, 100,
      summary.averageNutrition > 60 ? '#8B4513' : summary.averageNutrition > 30 ? '#D2691E' : '#FF6347');

    return y + 8;
  }

  /**
   * Render mini progress bar.
   */
  private renderMiniBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number,
    label: string, value: number, max: number, color: string): number {
    const barWidth = width - 2 * this.padding - 80;
    const barHeight = 12;

    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(label, x + this.padding, y);

    const barX = x + this.padding + 80;

    // Background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(barX, y + 2, barWidth, barHeight);

    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(barX, y + 2, (value / max) * barWidth, barHeight);

    // Value
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px monospace';
    ctx.fillText(`${Math.round(value)}%`, barX + barWidth + 4, y + 2);
    ctx.font = '14px monospace';

    return y + this.lineHeight + 2;
  }

  /**
   * Render issues section.
   */
  private renderIssues(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number, world: World): number {
    const issues = this.getFarmIssues(world);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Active Issues', x + this.padding, y);
    y += this.lineHeight + 4;
    ctx.font = '14px monospace';

    if (issues.length === 0) {
      ctx.fillStyle = '#90EE90';
      ctx.fillText('No active diseases or pests!', x + this.padding, y);
      y += this.lineHeight;
      ctx.fillText('Your farm is healthy. 🌟', x + this.padding, y);
      return y + this.lineHeight + 8;
    }

    for (const issue of issues) {
      const icon = issue.type === 'disease' ? '🦠' : '🐛';
      const severityColor = issue.severity === 'severe' ? '#FF0000' :
        issue.severity === 'moderate' ? '#FFA500' : '#FFFF00';

      ctx.fillStyle = severityColor;
      ctx.fillText(`${icon} ${issue.name}`, x + this.padding, y);
      y += this.lineHeight;

      ctx.fillStyle = '#CCCCCC';
      ctx.font = '12px monospace';
      ctx.fillText(`  Affected: ${issue.affectedCount} plants`, x + this.padding, y);
      y += this.lineHeight - 2;

      ctx.fillText(`  Severity: ${issue.severity}`, x + this.padding, y);
      y += this.lineHeight;
      ctx.font = '14px monospace';
    }

    return y + 8;
  }

  /**
   * Render buildings section.
   */
  private renderBuildings(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number, world: World): number {
    const buildings = this.getFarmBuildings(world);

    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Farm Buildings', x + this.padding, y);
    y += this.lineHeight + 4;
    ctx.font = '14px monospace';

    if (buildings.length === 0) {
      ctx.fillStyle = '#888888';
      ctx.fillText('No farming buildings yet.', x + this.padding, y);
      y += this.lineHeight;
      ctx.fillText('Build scarecrows, sprinklers,', x + this.padding, y);
      y += this.lineHeight;
      ctx.fillText('and more to boost your farm!', x + this.padding, y);
      return y + this.lineHeight + 8;
    }

    const buildingIcons: Record<string, string> = {
      'scarecrow': '🎃',
      'sprinkler': '💦',
      'quality_sprinkler': '💦',
      'compost_bin': '🗑️',
      'large_compost_bin': '🗑️',
      'beehive': '🐝',
      'apiary': '🐝',
      'cold_frame': '🏠',
      'seed_vault': '🌰',
      'tool_shed': '🔧',
      'pest_trap': '🪤',
      'fumigation_station': '💨',
      'drying_rack': '🌾',
      'root_cellar': '🥔',
      'trellis': '🏗️',
    };

    for (const building of buildings) {
      const icon = buildingIcons[building.type] || '🏠';

      ctx.fillStyle = '#90EE90';
      ctx.fillText(`${icon} ${building.name}`, x + this.padding, y);
      y += this.lineHeight;

      ctx.fillStyle = '#CCCCCC';
      ctx.font = '12px monospace';
      ctx.fillText(`  Range: ${building.effectRadius} tiles`, x + this.padding, y);
      y += this.lineHeight - 2;

      if (building.affectedPlants > 0) {
        ctx.fillText(`  Covering: ${building.affectedPlants} plants`, x + this.padding, y);
        y += this.lineHeight - 2;
      }

      ctx.font = '14px monospace';
      y += 4;
    }

    return y + 8;
  }

  /**
   * Render tips section.
   */
  private renderTips(ctx: CanvasRenderingContext2D, x: number, y: number, _width: number, world: World | undefined): number {
    if (!world) return y;
    const tips = this.getFarmingTips(world);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Farming Tips', x + this.padding, y);
    y += this.lineHeight + 4;
    ctx.font = '14px monospace';

    for (const tip of tips) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`💡 ${tip.title}`, x + this.padding, y);
      y += this.lineHeight;

      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px monospace';

      // Word wrap the description
      const words = tip.description.split(' ');
      let line = '  ';
      const maxLineWidth = this.panelWidth - 2 * this.padding - 10;

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth && line.length > 2) {
          ctx.fillText(line, x + this.padding, y);
          y += this.lineHeight - 4;
          line = '  ' + word + ' ';
        } else {
          line = testLine;
        }
      }
      if (line.trim().length > 0) {
        ctx.fillText(line, x + this.padding, y);
        y += this.lineHeight;
      }

      ctx.font = '14px monospace';
      y += 4;
    }

    return y + 8;
  }

  /**
   * Render scrollbar.
   */
  private renderScrollbar(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const scrollbarWidth = 6;
    const scrollbarX = width - scrollbarWidth - 2;
    const scrollbarHeight = height - 44; // Account for tabs
    const thumbHeight = Math.max(20, (height / this.contentHeight) * scrollbarHeight);
    const maxScroll = this.contentHeight - height + 40;
    const thumbY = 42 + (this.scrollOffset / maxScroll) * (scrollbarHeight - thumbHeight);

    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(scrollbarX, 42, scrollbarWidth, scrollbarHeight);

    // Thumb
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }

  /**
   * Handle click events on the panel.
   */
  handleClick(localX: number, localY: number, width: number): boolean {
    // Check tab clicks
    const tabY = this.padding;
    const tabHeight = 28;

    if (localY >= tabY && localY <= tabY + tabHeight) {
      const tabs = ['overview', 'issues', 'buildings', 'tips'] as const;
      const tabWidth = (width - 2 * this.padding) / tabs.length;
      const tabIndex = Math.floor((localX - this.padding) / tabWidth);

      const selectedTab = tabs[tabIndex];
      if (tabIndex >= 0 && tabIndex < tabs.length && selectedTab) {
        this.setActiveSection(selectedTab);
        return true;
      }
    }

    return false;
  }

  /**
   * Get farm health summary from world.
   *
   * PERFORMANCE: Uses query to get only plant entities (99% reduction).
   * Avoids iterating through all 5000+ entities and filtering.
   */
  private getFarmHealthSummary(world: World): FarmHealthSummary {
    const summary: FarmHealthSummary = {
      totalPlants: 0,
      healthyPlants: 0,
      sickPlants: 0,
      infectedPlants: 0,
      averageHealth: 0,
      averageHydration: 0,
      averageNutrition: 0,
    };

    let totalHealth = 0;
    let totalHydration = 0;
    let totalNutrition = 0;

    const plantEntities = world.query().with('plant').executeEntities();
    for (const entity of plantEntities) {
      const plant = entity.components.get('plant') as PlantComponent | undefined;
      if (!plant) continue;

      summary.totalPlants++;
      totalHealth += plant.health ?? 0;
      totalHydration += plant.hydration ?? 0;
      totalNutrition += plant.nutrition ?? 0;

      const hasDiseases = plant.diseases && plant.diseases.length > 0;
      const hasPests = plant.pests && plant.pests.length > 0;

      if (hasDiseases || hasPests) {
        if (hasDiseases) summary.sickPlants++;
        if (hasPests) summary.infectedPlants++;
      } else if ((plant.health ?? 0) > 50) {
        summary.healthyPlants++;
      }
    }

    if (summary.totalPlants > 0) {
      summary.averageHealth = totalHealth / summary.totalPlants;
      summary.averageHydration = totalHydration / summary.totalPlants;
      summary.averageNutrition = totalNutrition / summary.totalPlants;
    }

    return summary;
  }

  /**
   * Get current farm issues (diseases and pests).
   *
   * PERFORMANCE: Uses query to get only plant entities (99% reduction).
   * Avoids iterating through all 5000+ entities and filtering.
   */
  private getFarmIssues(world: World): FarmIssue[] {
    const issueMap = new Map<string, FarmIssue>();

    const plantEntities = world.query().with('plant').executeEntities();
    for (const entity of plantEntities) {
      const plant = entity.components.get('plant') as PlantComponent | undefined;
      if (!plant) continue;

      // Check diseases
      if (plant.diseases) {
        for (const disease of plant.diseases) {
          const key = `disease:${disease.diseaseId}`;
          const existing = issueMap.get(key);
          if (existing) {
            existing.affectedCount++;
            // Update severity to worst case
            if (disease.severity === 'severe' || (disease.severity === 'moderate' && existing.severity === 'mild')) {
              existing.severity = disease.severity;
            }
          } else {
            issueMap.set(key, {
              type: 'disease',
              name: disease.diseaseId.replace(/_/g, ' '),
              affectedCount: 1,
              severity: disease.severity,
            });
          }
        }
      }

      // Check pests
      if (plant.pests) {
        for (const pest of plant.pests) {
          const key = `pest:${pest.pestId}`;
          const existing = issueMap.get(key);
          if (existing) {
            existing.affectedCount++;
          } else {
            issueMap.set(key, {
              type: 'pest',
              name: pest.pestId.replace(/_/g, ' '),
              affectedCount: 1,
              severity: pest.population > 50 ? 'severe' : pest.population > 20 ? 'moderate' : 'mild',
            });
          }
        }
      }
    }

    return Array.from(issueMap.values()).sort((a, b) => {
      // Sort by severity, then by count
      const severityOrder = { severe: 0, moderate: 1, mild: 2 };
      const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 2;
      const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 2;
      if (aSev !== bSev) return aSev - bSev;
      return b.affectedCount - a.affectedCount;
    });
  }

  /**
   * Get farm buildings with effects.
   * PERFORMANCE: Uses ECS query to get only building entities (avoids full scan)
   */
  private getFarmBuildings(world: World): FarmBuilding[] {
    const buildings: FarmBuilding[] = [];
    const farmingBuildingTypes = new Set([
      'scarecrow', 'sprinkler', 'quality_sprinkler', 'compost_bin', 'large_compost_bin',
      'beehive', 'apiary', 'cold_frame', 'seed_vault', 'tool_shed', 'pest_trap',
      'fumigation_station', 'drying_rack', 'root_cellar', 'trellis'
    ]);

    const buildingEntities = world.query().with(CT.Building).executeEntities();
    for (const entity of buildingEntities) {
      const building = entity.components.get('building') as BuildingComponent | undefined;
      if (!building || !farmingBuildingTypes.has(building.buildingType)) continue;

      const position = entity.components.get('position') as PositionComponent | undefined;
      let effectRadius = 0;
      let affectedPlants = 0;

      // Determine effect radius based on building type
      const radiusMap: Record<string, number> = {
        'scarecrow': 5,
        'sprinkler': 3,
        'quality_sprinkler': 5,
        'beehive': 4,
        'apiary': 8,
        'pest_trap': 2,
        'fumigation_station': 4,
        'trellis': 1,
      };
      effectRadius = radiusMap[building.buildingType] || 0;

      // Count affected plants if we have position
      // PERFORMANCE: Uses query to get only plant entities (O(n) instead of O(n²))
      if (position && effectRadius > 0) {
        const effectRadiusSquared = effectRadius * effectRadius; // Pre-compute squared threshold
        const plantEntities = world.query().with('plant').executeEntities();
        for (const plantEntity of plantEntities) {
          const plant = plantEntity.components.get('plant') as PlantComponent | undefined;
          const plantPos = plantEntity.components.get('position') as PositionComponent | undefined;
          if (!plant || !plantPos) continue;

          const dx = plantPos.x - position.x;
          const dy = plantPos.y - position.y;
          const distanceSquared = dx * dx + dy * dy; // Use squared distance for comparison (avoids sqrt)
          if (distanceSquared <= effectRadiusSquared) {
            affectedPlants++;
          }
        }
      }

      const displayNames: Record<string, string> = {
        'scarecrow': 'Scarecrow',
        'sprinkler': 'Sprinkler',
        'quality_sprinkler': 'Quality Sprinkler',
        'compost_bin': 'Compost Bin',
        'large_compost_bin': 'Large Compost Bin',
        'beehive': 'Beehive',
        'apiary': 'Apiary',
        'cold_frame': 'Cold Frame',
        'seed_vault': 'Seed Vault',
        'tool_shed': 'Tool Shed',
        'pest_trap': 'Pest Trap',
        'fumigation_station': 'Fumigation Station',
        'drying_rack': 'Drying Rack',
        'root_cellar': 'Root Cellar',
        'trellis': 'Trellis',
      };

      buildings.push({
        id: entity.id,
        name: displayNames[building.buildingType] || building.buildingType,
        type: building.buildingType,
        effectRadius,
        affectedPlants,
      });
    }

    return buildings;
  }

  /**
   * Get farming tips based on current state.
   */
  private getFarmingTips(world: World): Array<{ title: string; description: string }> {
    const tips: Array<{ title: string; description: string }> = [];
    const summary = this.getFarmHealthSummary(world);
    const issues = this.getFarmIssues(world);
    const buildings = this.getFarmBuildings(world);

    // General tips based on farm state
    if (summary.totalPlants === 0) {
      tips.push({
        title: 'Start Planting',
        description: 'Till some soil and plant seeds to start your farm. Wheat and carrots are good beginner crops.',
      });
    }

    if (summary.averageHydration < 40 && summary.totalPlants > 0) {
      tips.push({
        title: 'Water Your Crops',
        description: 'Many plants are thirsty! Build sprinklers or have agents water the crops regularly.',
      });
    }

    if (summary.averageNutrition < 40 && summary.totalPlants > 0) {
      tips.push({
        title: 'Fertilize Fields',
        description: 'Soil nutrients are low. Build compost bins to produce fertilizer for healthier crops.',
      });
    }

    if (issues.length > 0) {
      const hasDisease = issues.some(i => i.type === 'disease');
      const hasPests = issues.some(i => i.type === 'pest');

      if (hasDisease) {
        tips.push({
          title: 'Treat Diseases',
          description: 'Some plants are sick. Build a fumigation station or use treatments to cure diseases.',
        });
      }

      if (hasPests) {
        tips.push({
          title: 'Control Pests',
          description: 'Pests are damaging crops. Build scarecrows and pest traps to protect your farm.',
        });
      }
    }

    // Building suggestions
    const hasScarcrow = buildings.some(b => b.type === 'scarecrow');
    const hasSprinkler = buildings.some(b => b.type.includes('sprinkler'));
    const hasBeehive = buildings.some(b => b.type === 'beehive' || b.type === 'apiary');

    if (!hasScarcrow && summary.totalPlants > 5) {
      tips.push({
        title: 'Build a Scarecrow',
        description: 'Scarecrows deter birds and rodents from eating your crops. Place them centrally in your fields.',
      });
    }

    if (!hasSprinkler && summary.totalPlants > 10) {
      tips.push({
        title: 'Install Sprinklers',
        description: 'Sprinklers automate watering, freeing agents for other tasks. Very useful for larger farms.',
      });
    }

    if (!hasBeehive && summary.totalPlants > 15) {
      tips.push({
        title: 'Add Beehives',
        description: 'Bees pollinate flowering crops, increasing yield by 15-25%. Build near fruit and vegetable crops.',
      });
    }

    // Always show at least one tip
    if (tips.length === 0) {
      tips.push({
        title: 'Farm Looking Good!',
        description: 'Your farm is in great shape. Consider expanding or diversifying your crops for more variety.',
      });
    }

    return tips.slice(0, 5); // Limit to 5 tips
  }
}
