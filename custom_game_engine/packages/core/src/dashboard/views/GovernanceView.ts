/**
 * GovernanceView - Village governance and statistics
 *
 * Shows governance data from information buildings including:
 * - Population welfare and demographics
 * - Health statistics
 * - Resource sustainability
 * - Social cohesion
 * - Threat monitoring
 * - Productivity metrics
 *
 * Accessibility-first: describes village status in narrative form.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { createProgressBar } from '../theme.js';

/**
 * Population welfare breakdown
 */
interface PopulationWelfare {
  healthy: number;
  struggling: number;
  critical: number;
  total: number;
}

/**
 * Demographics data
 */
interface Demographics {
  children: number;
  adults: number;
  elders: number;
  birthRate: number;
  deathRate: number;
  replacementRate: number;
  extinctionRisk: 'none' | 'low' | 'moderate' | 'high';
}

/**
 * Health statistics
 */
interface HealthStats {
  healthy: number;
  sick: number;
  critical: number;
  malnourished: number;
}

/**
 * Resource status
 */
interface ResourceStatus {
  id: string;
  amount: number;
  daysRemaining: number;
  status: 'surplus' | 'adequate' | 'low' | 'critical';
}

/**
 * Social metrics
 */
interface SocialMetrics {
  cohesionScore: number;
  isolatedAgents: number;
  avgRelationships: number;
  morale: number;
}

/**
 * Threat information
 */
interface ThreatInfo {
  activeThreats: number;
  temperature: number;
  agentsAtRisk: number;
}

/**
 * Productivity metrics
 */
interface ProductivityMetrics {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  utilizationRate: number;
}

/**
 * Building requirements for each section
 */
interface BuildingStatus {
  hasTownHall: boolean;
  hasCensusBureau: boolean;
  hasHealthClinic: boolean;
  hasWarehouse: boolean;
  hasMeetingHall: boolean;
  hasWatchtower: boolean;
  hasWeatherStation: boolean;
  hasLaborGuild: boolean;
}

/**
 * Data returned by the Governance view
 */
export interface GovernanceViewData extends ViewData {
  /** Building requirements */
  buildings: BuildingStatus;
  /** Population welfare */
  population: PopulationWelfare | null;
  /** Demographics */
  demographics: Demographics | null;
  /** Health statistics */
  health: HealthStats | null;
  /** Resource status */
  resources: ResourceStatus[];
  /** Social metrics */
  social: SocialMetrics | null;
  /** Threat information */
  threats: ThreatInfo | null;
  /** Productivity metrics */
  productivity: ProductivityMetrics | null;
}

/**
 * Governance View Definition
 */
export const GovernanceView: DashboardView<GovernanceViewData> = {
  id: 'governance',
  title: 'Governance Dashboard',
  category: 'social',
  keyboardShortcut: 'G',
  description: 'Village governance, population, and sustainability metrics',

  defaultSize: {
    width: 400,
    height: 600,
    minWidth: 350,
    minHeight: 500,
  },

  getData(context: ViewContext): GovernanceViewData {
    const { world } = context;

    const emptyData: GovernanceViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No world available',
      buildings: {
        hasTownHall: false,
        hasCensusBureau: false,
        hasHealthClinic: false,
        hasWarehouse: false,
        hasMeetingHall: false,
        hasWatchtower: false,
        hasWeatherStation: false,
        hasLaborGuild: false,
      },
      population: null,
      demographics: null,
      health: null,
      resources: [],
      social: null,
      threats: null,
      productivity: null,
    };

    if (!world) {
      return emptyData;
    }

    try {
      // In real implementation, query world for governance buildings and data
      // For now, return placeholder structure showing the architecture
      return {
        ...emptyData,
        available: true,
        unavailableReason: undefined,
      };
    } catch (error) {
      return {
        ...emptyData,
        unavailableReason: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  textFormatter(data: GovernanceViewData): string {
    const lines: string[] = [
      'GOVERNANCE DASHBOARD',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Governance data unavailable');
      return lines.join('\n');
    }

    // Building status
    if (!data.buildings.hasTownHall) {
      lines.push('GOVERNANCE LOCKED');
      lines.push('─'.repeat(50));
      lines.push('Build a Town Hall to unlock population tracking.');
      lines.push('');
      lines.push('The Town Hall is the heart of village governance.');
      lines.push('From there, you can expand with specialized buildings:');
      lines.push('  - Census Bureau: detailed demographics');
      lines.push('  - Health Clinic: medical statistics');
      lines.push('  - Warehouse: resource tracking');
      lines.push('  - Meeting Hall: social cohesion');
      lines.push('  - Watchtower + Weather Station: threat monitoring');
      lines.push('  - Labor Guild: productivity metrics');
      lines.push('');
      lines.push('Press B to open the building menu, then COMMUNITY tab.');
      return lines.join('\n');
    }

    // Population Section
    if (data.population) {
      lines.push('POPULATION WELFARE');
      lines.push('─'.repeat(50));
      lines.push(`Your village has ${data.population.total} residents.`);

      if (data.population.total > 0) {
        const healthyPct = Math.round((data.population.healthy / data.population.total) * 100);
        lines.push(`${healthyPct}% are in good health.`);

        if (data.population.critical > 0) {
          lines.push(`WARNING: ${data.population.critical} residents are in critical condition!`);
        } else if (data.population.struggling > 0) {
          lines.push(`${data.population.struggling} residents are struggling and need attention.`);
        } else {
          lines.push('All residents are thriving.');
        }
      }
      lines.push('');
    }

    // Demographics Section
    if (data.demographics) {
      lines.push('DEMOGRAPHICS');
      lines.push('─'.repeat(50));

      const total = data.demographics.children + data.demographics.adults + data.demographics.elders;
      if (total > 0) {
        lines.push(`Age distribution: ${data.demographics.children} children, ${data.demographics.adults} adults, ${data.demographics.elders} elders`);
      }

      lines.push(`Birth rate: ${data.demographics.birthRate.toFixed(1)} per day`);
      lines.push(`Death rate: ${data.demographics.deathRate.toFixed(1)} per day`);

      const replacementDesc = data.demographics.replacementRate >= 1.0
        ? 'Population is growing'
        : 'Population is declining';
      lines.push(`Replacement rate: ${data.demographics.replacementRate.toFixed(2)} (${replacementDesc})`);

      if (data.demographics.extinctionRisk !== 'none') {
        const riskEmoji = data.demographics.extinctionRisk === 'high' ? 'CRITICAL' :
          data.demographics.extinctionRisk === 'moderate' ? 'WARNING' : 'CAUTION';
        lines.push(`${riskEmoji}: Extinction risk is ${data.demographics.extinctionRisk}`);
      }
      lines.push('');
    } else if (data.buildings.hasTownHall && !data.buildings.hasCensusBureau) {
      lines.push('DEMOGRAPHICS');
      lines.push('─'.repeat(50));
      lines.push('Build a Census Bureau to track detailed demographics.');
      lines.push('');
    }

    // Health Section
    if (data.health) {
      lines.push('HEALTH STATUS');
      lines.push('─'.repeat(50));
      const total = data.health.healthy + data.health.sick + data.health.critical;
      if (total > 0) {
        lines.push(`${data.health.healthy} healthy, ${data.health.sick} sick, ${data.health.critical} critical`);
        if (data.health.malnourished > 0) {
          lines.push(`${data.health.malnourished} are suffering from malnutrition.`);
        }
      }
      lines.push('');
    } else if (data.buildings.hasTownHall && !data.buildings.hasHealthClinic) {
      lines.push('HEALTH');
      lines.push('─'.repeat(50));
      lines.push('Build a Health Clinic to track population health.');
      lines.push('');
    }

    // Resources Section
    if (data.resources.length > 0) {
      lines.push('RESOURCE SUSTAINABILITY');
      lines.push('─'.repeat(50));

      for (const resource of data.resources) {
        const statusWord = resource.status === 'surplus' ? 'plentiful' :
          resource.status === 'adequate' ? 'adequate' :
            resource.status === 'low' ? 'running low' : 'critically low';
        lines.push(`${resource.id}: ${resource.amount} units (${resource.daysRemaining.toFixed(1)} days remaining)`);
        lines.push(`  Status: ${statusWord}`);
      }
      lines.push('');
    } else if (data.buildings.hasTownHall && !data.buildings.hasWarehouse) {
      lines.push('RESOURCES');
      lines.push('─'.repeat(50));
      lines.push('Build a Warehouse to track resource sustainability.');
      lines.push('');
    }

    // Social Section
    if (data.social) {
      lines.push('SOCIAL COHESION');
      lines.push('─'.repeat(50));

      const cohesionDesc = data.social.cohesionScore > 70 ? 'strong' :
        data.social.cohesionScore > 40 ? 'moderate' : 'weak';
      lines.push(`Community cohesion is ${cohesionDesc} (${data.social.cohesionScore.toFixed(0)}/100).`);

      const moraleDesc = data.social.morale > 70 ? 'high' :
        data.social.morale > 40 ? 'moderate' : 'low';
      lines.push(`Village morale is ${moraleDesc} (${data.social.morale.toFixed(0)}/100).`);

      lines.push(`Average relationships per resident: ${data.social.avgRelationships.toFixed(1)}`);

      if (data.social.isolatedAgents > 0) {
        lines.push(`Warning: ${data.social.isolatedAgents} residents are socially isolated.`);
      }
      lines.push('');
    } else if (data.buildings.hasTownHall && !data.buildings.hasMeetingHall) {
      lines.push('SOCIAL');
      lines.push('─'.repeat(50));
      lines.push('Build a Meeting Hall to track social cohesion.');
      lines.push('');
    }

    // Threats Section
    if (data.threats) {
      lines.push('THREAT ASSESSMENT');
      lines.push('─'.repeat(50));

      if (data.threats.activeThreats === 0 && data.threats.agentsAtRisk === 0) {
        lines.push('All clear. No active threats detected.');
      } else {
        if (data.threats.activeThreats > 0) {
          lines.push(`ALERT: ${data.threats.activeThreats} active threats detected!`);
        }
        if (data.threats.agentsAtRisk > 0) {
          lines.push(`${data.threats.agentsAtRisk} residents are at risk.`);
        }
      }

      const tempDesc = data.threats.temperature < 35 ? 'dangerously cold' :
        data.threats.temperature > 95 ? 'dangerously hot' : 'comfortable';
      lines.push(`Current temperature: ${data.threats.temperature.toFixed(1)}°F (${tempDesc})`);
      lines.push('');
    } else if (data.buildings.hasTownHall && (!data.buildings.hasWatchtower || !data.buildings.hasWeatherStation)) {
      lines.push('THREATS');
      lines.push('─'.repeat(50));
      const missing = [];
      if (!data.buildings.hasWatchtower) missing.push('Watchtower');
      if (!data.buildings.hasWeatherStation) missing.push('Weather Station');
      lines.push(`Build ${missing.join(' and ')} to monitor threats.`);
      lines.push('');
    }

    // Productivity Section
    if (data.productivity) {
      lines.push('WORKFORCE PRODUCTIVITY');
      lines.push('─'.repeat(50));

      lines.push(`Workforce: ${data.productivity.totalAgents} total`);
      lines.push(`  Active: ${data.productivity.activeAgents}`);
      if (data.productivity.idleAgents > 0) {
        lines.push(`  Idle: ${data.productivity.idleAgents}`);
      }

      const utilizationDesc = data.productivity.utilizationRate > 70 ? 'excellent' :
        data.productivity.utilizationRate > 40 ? 'moderate' : 'low';
      lines.push(`Utilization: ${data.productivity.utilizationRate.toFixed(0)}% (${utilizationDesc})`);
      lines.push(`  ${createProgressBar(data.productivity.utilizationRate, 30)}`);
    } else if (data.buildings.hasTownHall && !data.buildings.hasLaborGuild) {
      lines.push('PRODUCTIVITY');
      lines.push('─'.repeat(50));
      lines.push('Build a Labor Guild to track workforce productivity.');
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: GovernanceViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y, width } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle locked state
    if (!data.buildings.hasTownHall) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText('Build a Town Hall to unlock governance', x + padding, currentY);
      currentY += lineHeight;
      ctx.font = '11px monospace';
      ctx.fillText('Press B -> COMMUNITY tab', x + padding, currentY);
      return;
    }

    // Population summary
    if (data.population) {
      ctx.fillStyle = '#90EE90';
      ctx.font = theme.fonts.bold;
      ctx.fillText('POPULATION', x + padding, currentY);
      currentY += lineHeight;

      ctx.font = theme.fonts.normal;
      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`Total: ${data.population.total}`, x + padding, currentY);
      currentY += lineHeight;

      // Health bar
      if (data.population.total > 0) {
        const healthyPct = (data.population.healthy / data.population.total) * 100;
        const barWidth = width - padding * 2 - 50;

        ctx.fillStyle = theme.colors.border;
        ctx.fillRect(x + padding, currentY, barWidth, 12);

        ctx.fillStyle = '#00FF00';
        ctx.fillRect(x + padding, currentY, barWidth * (healthyPct / 100), 12);

        ctx.fillStyle = theme.colors.text;
        ctx.font = '10px monospace';
        ctx.fillText(`${Math.round(healthyPct)}%`, x + padding + barWidth + 5, currentY + 1);
      }
      currentY += 20;
    }

    // Resource status summary
    if (data.resources.length > 0) {
      ctx.fillStyle = '#FFA500';
      ctx.font = theme.fonts.bold;
      ctx.fillText('RESOURCES', x + padding, currentY);
      currentY += lineHeight;

      ctx.font = theme.fonts.normal;
      for (const resource of data.resources.slice(0, 4)) {
        const statusColor = resource.status === 'critical' ? '#FF0000' :
          resource.status === 'low' ? '#FFA500' :
            resource.status === 'adequate' ? '#FFFF00' : '#00FF00';

        ctx.fillStyle = statusColor;
        ctx.fillText(`${resource.id}: ${resource.amount}`, x + padding, currentY);
        currentY += lineHeight;
      }
    }
  },
};
