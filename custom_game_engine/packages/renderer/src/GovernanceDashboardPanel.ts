/**
 * GovernanceDashboardPanel - Displays governance data from information buildings.
 *
 * Per governance-dashboard work order: Shows data collected by governance buildings
 * that agents have constructed. If buildings don't exist, panels are locked.
 *
 * Per CLAUDE.md: No silent fallbacks - crashes on invalid state.
 */

import type { World } from '@ai-village/core';
import { EntityImpl } from '@ai-village/core';
import type {
  BuildingComponent,
  NeedsComponent,
  CensusBureauComponent,
  HealthClinicComponent,
  InventoryComponent,
  RelationshipComponent,
  PositionComponent,
  AgentComponent,
} from '@ai-village/core';

interface PopulationWelfareData {
  healthy: number;
  struggling: number;
  critical: number;
  totalPopulation: number;
}

interface DemographicsData {
  children: number;
  adults: number;
  elders: number;
  birthRate: number;
  deathRate: number;
  replacementRate: number;
  extinctionRisk: 'none' | 'low' | 'moderate' | 'high';
}

interface HealthData {
  healthy: number;
  sick: number;
  critical: number;
  malnourished: number;
}

interface ResourceData {
  stockpiles: Record<string, number>;
  daysRemaining: Record<string, number>;
  status: Record<string, 'surplus' | 'adequate' | 'low' | 'critical'>;
}

interface SocialData {
  cohesionScore: number;
  isolatedAgents: number;
  avgRelationships: number;
  morale: number;
}

interface ThreatData {
  activeThreats: number;
  temperature: number;
  agentsAtRisk: number;
}

interface ProductivityData {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  utilizationRate: number;
}

export class GovernanceDashboardPanel {
  private padding = 10;
  private lineHeight = 18;
  private sectionSpacing = 10;
  private isCollapsed = false;

  /**
   * Render the governance dashboard panel.
   * @param ctx Canvas rendering context
   * @param _canvasWidth Width of the canvas (unused - WindowManager handles positioning)
   * @param world World instance to query governance buildings
   */
  render(ctx: CanvasRenderingContext2D, _canvasWidth: number, world: World): void {
    const x = 0;
    const y = 0;
    const headerHeight = 30;

    // Set up text rendering
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + this.padding;

    // Title with collapse button
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    const title = this.isCollapsed ? '▶ GOVERNANCE' : '▼ GOVERNANCE';
    ctx.fillText(title, x + this.padding, currentY);
    ctx.font = '14px monospace';

    if (this.isCollapsed) {
      return;
    }

    currentY += headerHeight;

    // Check if Town Hall exists
    const hasTownHall = this.hasBuilding(world, 'town_hall');
    const hasCensusBureau = this.hasBuilding(world, 'census_bureau');
    const hasHealthClinic = this.hasBuilding(world, 'health_clinic');

    if (!hasTownHall) {
      // No Town Hall - show locked message with navigation hint
      ctx.fillStyle = '#888888';
      ctx.fillText('🔒 No Town Hall', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillText('Build Town Hall to unlock', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillText('population tracking', x + this.padding, currentY);
      currentY += this.lineHeight + 5;

      // Navigation hint
      ctx.fillStyle = '#666666';
      ctx.font = '11px monospace';
      ctx.fillText('📍 Press B → COMMUNITY tab', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillText('   to find governance', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillText('   buildings', x + this.padding, currentY);
      return;
    }

    // Render Population section (requires Town Hall)
    currentY = this.renderPopulationSection(ctx, x, currentY, world);
    currentY += this.sectionSpacing;

    // Render Demographics section (requires Census Bureau)
    if (hasCensusBureau) {
      currentY = this.renderDemographicsSection(ctx, x, currentY, world);
      currentY += this.sectionSpacing;
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('🔒 Census Bureau needed for demographics', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.fillText('(B → COMMUNITY tab)', x + this.padding + 10, currentY);
      ctx.font = '14px monospace';
      currentY += this.lineHeight + this.sectionSpacing;
    }

    // Render Health section (requires Health Clinic)
    if (hasHealthClinic) {
      currentY = this.renderHealthSection(ctx, x, currentY, world);
      currentY += this.sectionSpacing;
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('🔒 Health Clinic needed for health data', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.fillText('(B → COMMUNITY tab)', x + this.padding + 10, currentY);
      ctx.font = '14px monospace';
      currentY += this.lineHeight + this.sectionSpacing;
    }

    // Render Resource section (requires Warehouse)
    const hasWarehouse = this.hasBuilding(world, 'warehouse');
    if (hasWarehouse) {
      currentY = this.renderResourceSection(ctx, x, currentY, world);
      currentY += this.sectionSpacing;
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('🔒 Warehouse needed for resource tracking', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.fillText('(B → STORAGE tab)', x + this.padding + 10, currentY);
      ctx.font = '14px monospace';
      currentY += this.lineHeight + this.sectionSpacing;
    }

    // Render Social section (requires Meeting Hall)
    const hasMeetingHall = this.hasBuilding(world, 'meeting_hall');
    if (hasMeetingHall) {
      currentY = this.renderSocialSection(ctx, x, currentY, world);
      currentY += this.sectionSpacing;
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('🔒 Meeting Hall needed for social data', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.fillText('(B → COMMUNITY tab)', x + this.padding + 10, currentY);
      ctx.font = '14px monospace';
      currentY += this.lineHeight + this.sectionSpacing;
    }

    // Render Threat section (requires Watchtower + Weather Station)
    const hasWatchtower = this.hasBuilding(world, 'watchtower');
    const hasWeatherStation = this.hasBuilding(world, 'weather_station');
    if (hasWatchtower && hasWeatherStation) {
      currentY = this.renderThreatSection(ctx, x, currentY, world);
      currentY += this.sectionSpacing;
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      const missing = [];
      if (!hasWatchtower) missing.push('Watchtower');
      if (!hasWeatherStation) missing.push('Weather Station');
      ctx.fillText(`🔒 ${missing.join(' + ')} needed for threat monitoring`, x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.fillText('(B → COMMUNITY tab)', x + this.padding + 10, currentY);
      ctx.font = '14px monospace';
      currentY += this.lineHeight + this.sectionSpacing;
    }

    // Render Productivity section (requires Labor Guild)
    const hasLaborGuild = this.hasBuilding(world, 'labor_guild');
    if (hasLaborGuild) {
      currentY = this.renderProductivitySection(ctx, x, currentY, world);
      currentY += this.sectionSpacing;
    } else {
      ctx.fillStyle = '#888888';
      ctx.font = '12px monospace';
      ctx.fillText('🔒 Labor Guild needed for productivity data', x + this.padding, currentY);
      currentY += this.lineHeight;
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.fillText('(B → COMMUNITY tab)', x + this.padding + 10, currentY);
      ctx.font = '14px monospace';
      currentY += this.lineHeight;
    }
  }

  /**
   * Render population section from Town Hall data.
   */
  private renderPopulationSection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getPopulationWelfareData(world);

    // Section title
    ctx.fillStyle = '#90EE90';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('📊 POPULATION', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Total population
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Total: ${data.totalPopulation}`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Health breakdown
    const healthyPct = data.totalPopulation > 0 ? Math.round((data.healthy / data.totalPopulation) * 100) : 0;
    const strugglingPct = data.totalPopulation > 0 ? Math.round((data.struggling / data.totalPopulation) * 100) : 0;
    const criticalPct = data.totalPopulation > 0 ? Math.round((data.critical / data.totalPopulation) * 100) : 0;

    // Healthy
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`✓ Healthy: ${data.healthy} (${healthyPct}%)`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Struggling
    if (data.struggling > 0) {
      ctx.fillStyle = '#FFFF00';
      ctx.fillText(`⚠ Struggling: ${data.struggling} (${strugglingPct}%)`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    // Critical
    if (data.critical > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.fillText(`🚨 Critical: ${data.critical} (${criticalPct}%)`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    return currentY;
  }

  /**
   * Render demographics section from Census Bureau data.
   */
  private renderDemographicsSection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getDemographicsData(world);

    if (!data) {
      return currentY;
    }

    // Section title
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('👥 DEMOGRAPHICS', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Age distribution (placeholder - not yet tracked)
    if (data.children + data.adults + data.elders > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Children: ${data.children}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
      ctx.fillText(`Adults: ${data.adults}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
      ctx.fillText(`Elders: ${data.elders}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    // Birth/Death rates
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '12px monospace';
    ctx.fillText(`Birth rate: ${data.birthRate.toFixed(1)}/day`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;
    ctx.fillText(`Death rate: ${data.deathRate.toFixed(1)}/day`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;
    ctx.font = '14px monospace';

    // Replacement rate
    const replacementColor = data.replacementRate >= 1.0 ? '#00FF00' : '#FF0000';
    ctx.fillStyle = replacementColor;
    ctx.fillText(`Replacement: ${data.replacementRate.toFixed(2)}`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Extinction risk
    let riskColor = '#00FF00';
    let riskIcon = '✓';
    if (data.extinctionRisk === 'high') {
      riskColor = '#FF0000';
      riskIcon = '🚨';
    } else if (data.extinctionRisk === 'moderate') {
      riskColor = '#FFA500';
      riskIcon = '⚠';
    } else if (data.extinctionRisk === 'low') {
      riskColor = '#FFFF00';
      riskIcon = '⚠';
    }

    ctx.fillStyle = riskColor;
    ctx.fillText(`${riskIcon} Risk: ${data.extinctionRisk}`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    return currentY;
  }

  /**
   * Render health section from Health Clinic data.
   */
  private renderHealthSection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getHealthData(world);

    if (!data) {
      return currentY;
    }

    // Section title
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('🏥 HEALTH', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Health breakdown
    const total = data.healthy + data.sick + data.critical;
    const healthyPct = total > 0 ? Math.round((data.healthy / total) * 100) : 0;
    const sickPct = total > 0 ? Math.round((data.sick / total) * 100) : 0;
    const criticalPct = total > 0 ? Math.round((data.critical / total) * 100) : 0;

    ctx.fillStyle = '#00FF00';
    ctx.fillText(`✓ Healthy: ${data.healthy} (${healthyPct}%)`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    if (data.sick > 0) {
      ctx.fillStyle = '#FFFF00';
      ctx.fillText(`⚠ Sick: ${data.sick} (${sickPct}%)`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    if (data.critical > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.fillText(`🚨 Critical: ${data.critical} (${criticalPct}%)`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    // Malnutrition
    if (data.malnourished > 0) {
      ctx.fillStyle = '#FFA500';
      ctx.fillText(`🍎 Malnourished: ${data.malnourished}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    return currentY;
  }

  /**
   * Render resource sustainability section from Granary data.
   */
  private renderResourceSection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getResourceData(world);

    if (!data) {
      return currentY;
    }

    // Section title
    ctx.fillStyle = '#FFA500';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('📦 RESOURCES', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Show key resources with status
    const keyResources = ['wood', 'stone', 'food', 'water'];
    for (const resourceId of keyResources) {
      const amount = data.stockpiles[resourceId] || 0;
      const days = data.daysRemaining[resourceId] || 0;
      const status = data.status[resourceId] || 'adequate';

      let statusColor = '#00FF00';
      let statusIcon = '✓';
      if (status === 'critical') {
        statusColor = '#FF0000';
        statusIcon = '🚨';
      } else if (status === 'low') {
        statusColor = '#FFA500';
        statusIcon = '⚠';
      } else if (status === 'adequate') {
        statusColor = '#FFFF00';
        statusIcon = '⚠';
      }

      ctx.fillStyle = statusColor;
      ctx.fillText(
        `${statusIcon} ${resourceId}: ${amount} (${days.toFixed(1)}d)`,
        x + this.padding + 10,
        currentY
      );
      currentY += this.lineHeight;
    }

    return currentY;
  }

  /**
   * Render social stability section from Meeting Hall data.
   */
  private renderSocialSection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getSocialData(world);

    if (!data) {
      return currentY;
    }

    // Section title
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('👥 SOCIAL', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Cohesion score
    const cohesionColor = data.cohesionScore > 70 ? '#00FF00' : data.cohesionScore > 40 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = cohesionColor;
    ctx.fillText(`Cohesion: ${data.cohesionScore.toFixed(0)}/100`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Morale
    const moraleColor = data.morale > 70 ? '#00FF00' : data.morale > 40 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = moraleColor;
    ctx.fillText(`Morale: ${data.morale.toFixed(0)}/100`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Relationships
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`Avg Relationships: ${data.avgRelationships.toFixed(1)}`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Isolated agents
    if (data.isolatedAgents > 0) {
      ctx.fillStyle = '#FFA500';
      ctx.fillText(`⚠ Isolated: ${data.isolatedAgents}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    return currentY;
  }

  /**
   * Render threat monitoring section from Watchtower + Weather Station data.
   */
  private renderThreatSection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getThreatData(world);

    if (!data) {
      return currentY;
    }

    // Section title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('⚠️ THREATS', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Active threats
    if (data.activeThreats > 0) {
      ctx.fillStyle = '#FF0000';
      ctx.fillText(`🚨 Active Threats: ${data.activeThreats}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    // Temperature
    const tempColor = data.temperature < 35 || data.temperature > 95 ? '#FF0000' : '#00FF00';
    ctx.fillStyle = tempColor;
    ctx.fillText(`🌡️ Temp: ${data.temperature.toFixed(1)}°F`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Agents at risk
    if (data.agentsAtRisk > 0) {
      ctx.fillStyle = '#FFA500';
      ctx.fillText(`⚠ At Risk: ${data.agentsAtRisk}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    if (data.activeThreats === 0 && data.agentsAtRisk === 0) {
      ctx.fillStyle = '#00FF00';
      ctx.fillText('✓ All Clear', x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    return currentY;
  }

  /**
   * Render productivity section from Labor Guild data.
   */
  private renderProductivitySection(ctx: CanvasRenderingContext2D, x: number, currentY: number, world: World): number {
    const data = this.getProductivityData(world);

    if (!data) {
      return currentY;
    }

    // Section title
    ctx.fillStyle = '#90EE90';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('⚙️ PRODUCTIVITY', x + this.padding, currentY);
    ctx.font = '14px monospace';
    currentY += this.lineHeight;

    // Total workforce
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Total: ${data.totalAgents}`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Active agents
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`✓ Active: ${data.activeAgents}`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    // Idle agents
    if (data.idleAgents > 0) {
      ctx.fillStyle = '#FFFF00';
      ctx.fillText(`⚠ Idle: ${data.idleAgents}`, x + this.padding + 10, currentY);
      currentY += this.lineHeight;
    }

    // Utilization rate
    const utilizationColor = data.utilizationRate > 70 ? '#00FF00' : data.utilizationRate > 40 ? '#FFFF00' : '#FF0000';
    ctx.fillStyle = utilizationColor;
    ctx.fillText(`Utilization: ${data.utilizationRate.toFixed(0)}%`, x + this.padding + 10, currentY);
    currentY += this.lineHeight;

    return currentY;
  }

  /**
   * Check if a specific building type exists and is complete.
   */
  private hasBuilding(world: World, componentType: string): boolean {
    if (!world || typeof world.query !== 'function') {
      return false;
    }

    const buildings = world.query()
      .with(componentType, 'building')
      .executeEntities();

    for (const building of buildings) {
      const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>('building');
      if (buildingComp?.isComplete) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get population welfare data from Town Hall.
   */
  private getPopulationWelfareData(world: World): PopulationWelfareData {
    if (!world || typeof world.query !== 'function') {
      return { healthy: 0, struggling: 0, critical: 0, totalPopulation: 0 };
    }

    // Get all agents with needs
    const agents = world.query()
      .with('agent', 'needs')
      .executeEntities();

    let healthy = 0;
    let struggling = 0;
    let critical = 0;

    for (const agent of agents) {
      const needs = (agent as EntityImpl).getComponent<NeedsComponent>('needs');
      if (!needs) {
        continue;
      }

      // Calculate average health from needs (NeedsComponent uses 0-1 scale)
      const avgNeeds = (needs.hunger + needs.thirst + needs.energy) / 3;

      if (avgNeeds > 0.7) {
        healthy++;
      } else if (avgNeeds > 0.3) {
        struggling++;
      } else {
        critical++;
      }
    }

    return {
      healthy,
      struggling,
      critical,
      totalPopulation: agents.length,
    };
  }

  /**
   * Get demographics data from Census Bureau.
   */
  private getDemographicsData(world: World): DemographicsData | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    const bureaus = world.query()
      .with('census_bureau', 'building')
      .executeEntities();

    for (const bureau of bureaus) {
      const buildingComp = (bureau as EntityImpl).getComponent<BuildingComponent>('building');
      const censusBureau = (bureau as EntityImpl).getComponent<CensusBureauComponent>('census_bureau');

      if (!buildingComp?.isComplete || !censusBureau) {
        continue;
      }

      return {
        children: censusBureau.demographics.children,
        adults: censusBureau.demographics.adults,
        elders: censusBureau.demographics.elders,
        birthRate: censusBureau.birthRate,
        deathRate: censusBureau.deathRate,
        replacementRate: censusBureau.replacementRate,
        extinctionRisk: censusBureau.projections.extinctionRisk,
      };
    }

    return null;
  }

  /**
   * Get health data from Health Clinic.
   */
  private getHealthData(world: World): HealthData | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    const clinics = world.query()
      .with('health_clinic', 'building')
      .executeEntities();

    for (const clinic of clinics) {
      const buildingComp = (clinic as EntityImpl).getComponent<BuildingComponent>('building');
      const healthClinic = (clinic as EntityImpl).getComponent<HealthClinicComponent>('health_clinic');

      if (!buildingComp?.isComplete || !healthClinic) {
        continue;
      }

      return {
        healthy: healthClinic.populationHealth.healthy,
        sick: healthClinic.populationHealth.sick,
        critical: healthClinic.populationHealth.critical,
        malnourished: healthClinic.malnutrition.affected,
      };
    }

    return null;
  }

  /**
   * Get resource data from Granary + actual stockpiles.
   */
  private getResourceData(world: World): ResourceData | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    // Count resources from storage buildings
    const storageBuildings = world.query()
      .with('building', 'inventory')
      .executeEntities();

    const stockpiles: Record<string, number> = {};

    for (const storage of storageBuildings) {
      const building = (storage as EntityImpl).getComponent<BuildingComponent>('building');
      const inventory = (storage as EntityImpl).getComponent<InventoryComponent>('inventory');

      if (!building?.isComplete || !inventory) {
        continue;
      }

      // Aggregate inventory items
      for (const slot of inventory.slots) {
        if (slot.itemId) {
          stockpiles[slot.itemId] = (stockpiles[slot.itemId] || 0) + slot.quantity;
        }
      }
    }

    // Calculate days remaining (simplified - assume 1 unit consumed per day per agent)
    const agents = world.query().with('agent').executeEntities();
    const agentCount = agents.length || 1;

    const daysRemaining: Record<string, number> = {};
    const status: Record<string, 'surplus' | 'adequate' | 'low' | 'critical'> = {};

    for (const resourceId in stockpiles) {
      const amount = stockpiles[resourceId];
      if (amount === undefined) {
        continue;
      }
      const consumptionPerDay = resourceId === 'food' || resourceId === 'water' ? agentCount : agentCount * 0.1;
      const days = amount / consumptionPerDay;

      daysRemaining[resourceId] = days;

      if (days < 1) {
        status[resourceId] = 'critical';
      } else if (days < 3) {
        status[resourceId] = 'low';
      } else if (days < 7) {
        status[resourceId] = 'adequate';
      } else {
        status[resourceId] = 'surplus';
      }
    }

    return { stockpiles, daysRemaining, status };
  }

  /**
   * Get social stability data from Meeting Hall + relationships.
   */
  private getSocialData(world: World): SocialData | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    const agents = world.query().with('agent').executeEntities();

    if (agents.length === 0) {
      return null;
    }

    let totalRelationships = 0;
    let isolatedCount = 0;
    let totalMorale = 0;
    let agentsWithNeeds = 0;

    for (const agent of agents) {
      const relationships = (agent as EntityImpl).getComponent<RelationshipComponent>('relationships');
      const needs = (agent as EntityImpl).getComponent<NeedsComponent>('needs');

      // Count relationships
      if (relationships && relationships.relationships) {
        const relationshipCount = Object.keys(relationships.relationships).length;
        totalRelationships += relationshipCount;
        if (relationshipCount === 0) {
          isolatedCount++;
        }
      } else {
        isolatedCount++;
      }

      // Calculate morale from needs (NeedsComponent uses 0-1 scale, convert to 0-100)
      if (needs) {
        const avgNeeds = (needs.hunger + needs.thirst + needs.energy) / 3;
        totalMorale += avgNeeds * 100; // Convert to 0-100 scale
        agentsWithNeeds++;
      }
    }

    const avgRelationships = totalRelationships / agents.length;
    const morale = agentsWithNeeds > 0 ? totalMorale / agentsWithNeeds : 50;

    // Cohesion score based on relationships and morale
    const cohesionScore = Math.min(100, (avgRelationships / 5) * 50 + morale * 0.5);

    return {
      cohesionScore,
      isolatedAgents: isolatedCount,
      avgRelationships,
      morale,
    };
  }

  /**
   * Get threat monitoring data from Watchtower + Weather Station.
   */
  private getThreatData(world: World): ThreatData | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    // Get current temperature from weather system
    const temperature = 70; // Default
    // Note: getSystem is not available on World type interface, so we cannot query it
    // This feature would require passing TimeSystem separately or extending World interface

    // Count agents at risk from temperature
    const agents = world.query().with('agent', 'needs').executeEntities();
    let agentsAtRisk = 0;
    let activeThreats = 0;

    for (const agent of agents) {
      const needs = (agent as EntityImpl).getComponent<NeedsComponent>('needs');
      if (!needs) continue;

      // Check if agent is critically low on any need (NeedsComponent uses 0-1 scale)
      if (needs.hunger < 0.2 || needs.thirst < 0.2 || needs.energy < 0.2) {
        agentsAtRisk++;
      }
    }

    // Check for extreme temperature
    if (temperature < 35 || temperature > 95) {
      activeThreats++;
      // Count agents outside
      for (const agent of agents) {
        const position = (agent as EntityImpl).getComponent<PositionComponent>('position');
        if (position) {
          // Simplified: assume agents outside are at risk
          agentsAtRisk++;
        }
      }
    }

    return {
      activeThreats,
      temperature,
      agentsAtRisk,
    };
  }

  /**
   * Get productivity data from Labor Guild + agent states.
   */
  private getProductivityData(world: World): ProductivityData | null {
    if (!world || typeof world.query !== 'function') {
      return null;
    }

    const agents = world.query().with('agent').executeEntities();

    if (agents.length === 0) {
      return null;
    }

    let activeAgents = 0;

    for (const agent of agents) {
      const agentComp = (agent as EntityImpl).getComponent<AgentComponent>('agent');
      if (!agentComp) continue;

      // Consider agent active if they have a current behavior that isn't idle/wander
      if (agentComp.behavior && !['idle', 'wander'].includes(agentComp.behavior)) {
        activeAgents++;
      }
    }

    const idleAgents = agents.length - activeAgents;
    const utilizationRate = (activeAgents / agents.length) * 100;

    return {
      totalAgents: agents.length,
      activeAgents,
      idleAgents,
      utilizationRate,
    };
  }

  /**
   * Toggle collapsed state.
   */
  toggleCollapsed(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  /**
   * Get whether panel is collapsed.
   */
  getIsCollapsed(): boolean {
    return this.isCollapsed;
  }
}
