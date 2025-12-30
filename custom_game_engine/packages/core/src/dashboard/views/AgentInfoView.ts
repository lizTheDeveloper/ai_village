/**
 * AgentInfoView - Detailed agent information panel
 *
 * Shows comprehensive info about the selected agent including:
 * - Identity and current activity
 * - Needs (hunger, energy, health)
 * - Skills and experience
 * - Inventory
 * - Current behavior and action
 *
 * Accessibility-first: describes the agent's state in natural language.
 */

import type {
  DashboardView,
  ViewData,
  ViewContext,
  RenderBounds,
  RenderTheme,
} from '../types.js';
import { getStatusColor, createProgressBar } from '../theme.js';

/**
 * Inventory slot data
 */
interface InventorySlot {
  itemId: string;
  quantity: number;
}

/**
 * Skill data
 */
interface SkillInfo {
  name: string;
  level: number;
  experience: number;
}

/**
 * Need data
 */
interface NeedInfo {
  name: string;
  value: number;
  max: number;
}

/**
 * Data returned by the AgentInfo view
 */
export interface AgentInfoViewData extends ViewData {
  /** Agent's display name */
  name: string | null;
  /** Agent's unique ID */
  agentId: string | null;
  /** Current behavior/activity */
  currentBehavior: string | null;
  /** Current action being performed */
  currentAction: string | null;
  /** Agent's needs */
  needs: NeedInfo[];
  /** Agent's skills */
  skills: SkillInfo[];
  /** Inventory contents */
  inventory: InventorySlot[];
  /** Maximum inventory slots */
  maxInventorySlots: number;
  /** Current position */
  position: { x: number; y: number } | null;
  /** Agent's age (if tracked) */
  age: number | null;
}

/**
 * Get description for a need level
 */
function describeNeedLevel(value: number, max: number): string {
  const pct = (value / max) * 100;
  if (pct >= 80) return 'satisfied';
  if (pct >= 60) return 'comfortable';
  if (pct >= 40) return 'moderate';
  if (pct >= 20) return 'low';
  return 'critical';
}

/**
 * Get friendly name for a need
 */
function getNeedDisplayName(name: string): string {
  const displayNames: Record<string, string> = {
    hunger: 'Hunger',
    energy: 'Energy',
    health: 'Health',
    thirst: 'Thirst',
    social: 'Social',
    rest: 'Rest',
  };
  return displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * AgentInfo View Definition
 */
export const AgentInfoView: DashboardView<AgentInfoViewData> = {
  id: 'agent-info',
  title: 'Agent Info',
  category: 'info',
  keyboardShortcut: 'I',
  description: 'Detailed information about the selected agent',

  defaultSize: {
    width: 320,
    height: 500,
    minWidth: 280,
    minHeight: 400,
  },

  getData(context: ViewContext): AgentInfoViewData {
    const { world, selectedEntityId } = context;

    const emptyData: AgentInfoViewData = {
      timestamp: Date.now(),
      available: false,
      unavailableReason: 'No agent selected',
      name: null,
      agentId: null,
      currentBehavior: null,
      currentAction: null,
      needs: [],
      skills: [],
      inventory: [],
      maxInventorySlots: 0,
      position: null,
      age: null,
    };

    if (!selectedEntityId) {
      return emptyData;
    }

    if (!world || typeof world.getEntity !== 'function') {
      emptyData.unavailableReason = 'Game world not available';
      return emptyData;
    }

    try {
      const entity = world.getEntity(selectedEntityId);
      if (!entity) {
        emptyData.unavailableReason = 'Selected entity not found';
        return emptyData;
      }

      // Check if this is actually an agent
      const agent = entity.components.get('agent') as unknown as {
        currentBehavior?: string;
        currentAction?: string;
        age?: number;
      } | undefined;

      if (!agent) {
        emptyData.unavailableReason = 'Selected entity is not an agent';
        return emptyData;
      }

      // Get identity
      const identity = entity.components.get('identity') as unknown as {
        name?: string;
      } | undefined;

      // Get needs
      const needsComp = entity.components.get('needs') as unknown as {
        hunger?: number;
        energy?: number;
        health?: number;
        maxHunger?: number;
        maxEnergy?: number;
        maxHealth?: number;
      } | undefined;

      const needs: NeedInfo[] = [];
      if (needsComp) {
        if (needsComp.hunger !== undefined) {
          needs.push({ name: 'hunger', value: needsComp.hunger, max: needsComp.maxHunger || 100 });
        }
        if (needsComp.energy !== undefined) {
          needs.push({ name: 'energy', value: needsComp.energy, max: needsComp.maxEnergy || 100 });
        }
        if (needsComp.health !== undefined) {
          needs.push({ name: 'health', value: needsComp.health, max: needsComp.maxHealth || 100 });
        }
      }

      // Get skills
      const skillsComp = entity.components.get('skills') as unknown as {
        skills?: Map<string, { level: number; experience: number }>;
      } | undefined;

      const skills: SkillInfo[] = [];
      if (skillsComp?.skills) {
        for (const [name, data] of skillsComp.skills.entries()) {
          skills.push({ name, level: data.level, experience: data.experience });
        }
        skills.sort((a, b) => b.level - a.level); // Sort by level descending
      }

      // Get inventory
      const inventoryComp = entity.components.get('inventory') as unknown as {
        slots?: Array<{ itemId?: string; quantity: number }>;
        maxSlots?: number;
      } | undefined;

      const inventory: InventorySlot[] = [];
      if (inventoryComp?.slots) {
        for (const slot of inventoryComp.slots) {
          if (slot.itemId && slot.quantity > 0) {
            inventory.push({ itemId: slot.itemId, quantity: slot.quantity });
          }
        }
      }

      // Get position
      const posComp = entity.components.get('position') as unknown as {
        x?: number;
        y?: number;
      } | undefined;

      return {
        timestamp: Date.now(),
        available: true,
        name: identity?.name || null,
        agentId: selectedEntityId,
        currentBehavior: agent.currentBehavior || null,
        currentAction: agent.currentAction || null,
        needs,
        skills: skills.slice(0, 5), // Top 5 skills
        inventory,
        maxInventorySlots: inventoryComp?.maxSlots || 0,
        position: posComp?.x !== undefined && posComp?.y !== undefined
          ? { x: posComp.x, y: posComp.y }
          : null,
        age: agent.age || null,
      };
    } catch (error) {
      emptyData.unavailableReason = `Error: ${error instanceof Error ? error.message : String(error)}`;
      return emptyData;
    }
  },

  textFormatter(data: AgentInfoViewData): string {
    const lines: string[] = [
      'AGENT INFORMATION',
      '═'.repeat(50),
      '',
    ];

    if (!data.available) {
      lines.push(data.unavailableReason || 'Agent data unavailable');
      lines.push('');
      lines.push('Click on an agent in the game world to view their details.');
      return lines.join('\n');
    }

    // Identity section
    const agentName = data.name || 'Unknown Agent';
    lines.push(`${agentName}`);
    if (data.age !== null) {
      lines.push(`Age: ${data.age.toFixed(1)} years`);
    }
    if (data.position) {
      lines.push(`Location: (${data.position.x.toFixed(0)}, ${data.position.y.toFixed(0)})`);
    }
    lines.push('');

    // Current activity
    lines.push('CURRENT ACTIVITY');
    lines.push('─'.repeat(50));
    if (data.currentBehavior) {
      lines.push(`${agentName} is currently: ${data.currentBehavior}`);
    } else {
      lines.push(`${agentName} is idle.`);
    }
    if (data.currentAction) {
      lines.push(`Performing action: ${data.currentAction}`);
    }
    lines.push('');

    // Needs section - describe their condition
    if (data.needs.length > 0) {
      lines.push('PHYSICAL CONDITION');
      lines.push('─'.repeat(50));

      const criticalNeeds = data.needs.filter(n => (n.value / n.max) < 0.2);
      const lowNeeds = data.needs.filter(n => (n.value / n.max) >= 0.2 && (n.value / n.max) < 0.4);

      if (criticalNeeds.length > 0) {
        lines.push(`⚠️  WARNING: ${agentName} is in critical condition!`);
        for (const need of criticalNeeds) {
          lines.push(`   ${getNeedDisplayName(need.name)} is dangerously low (${Math.round((need.value / need.max) * 100)}%)`);
        }
      } else if (lowNeeds.length > 0) {
        lines.push(`${agentName} could use some attention.`);
      } else {
        lines.push(`${agentName} is in good condition.`);
      }
      lines.push('');

      for (const need of data.needs) {
        const pct = Math.round((need.value / need.max) * 100);
        const status = describeNeedLevel(need.value, need.max);
        lines.push(`  ${getNeedDisplayName(need.name)}: ${pct}% (${status})`);
        lines.push(`  ${createProgressBar(pct, 30)}`);
      }
      lines.push('');
    }

    // Skills
    if (data.skills.length > 0) {
      lines.push('SKILLS');
      lines.push('─'.repeat(50));
      for (const skill of data.skills) {
        lines.push(`  ${skill.name}: Level ${skill.level} (${skill.experience.toFixed(0)} XP)`);
      }
      lines.push('');
    }

    // Inventory
    lines.push('INVENTORY');
    lines.push('─'.repeat(50));
    if (data.inventory.length === 0) {
      lines.push(`${agentName}'s inventory is empty.`);
    } else {
      const totalItems = data.inventory.reduce((sum, s) => sum + s.quantity, 0);
      lines.push(`Carrying ${totalItems} items:`);
      for (const slot of data.inventory) {
        lines.push(`  • ${slot.quantity}x ${slot.itemId}`);
      }
    }
    if (data.maxInventorySlots > 0) {
      lines.push(`Capacity: ${data.inventory.length}/${data.maxInventorySlots} slots used`);
    }

    return lines.join('\n');
  },

  canvasRenderer(
    ctx: CanvasRenderingContext2D,
    data: AgentInfoViewData,
    bounds: RenderBounds,
    theme: RenderTheme
  ): void {
    const { x, y } = bounds;
    const { padding, lineHeight } = theme.spacing;

    ctx.font = theme.fonts.normal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let currentY = y + padding;

    // Handle unavailable
    if (!data.available) {
      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(data.unavailableReason || 'Select an agent', x + padding, currentY);
      return;
    }

    // Name
    ctx.fillStyle = theme.colors.accent;
    ctx.font = theme.fonts.bold;
    ctx.fillText(data.name || 'Unknown Agent', x + padding, currentY);
    currentY += lineHeight + 5;

    // Current behavior
    ctx.font = theme.fonts.normal;
    ctx.fillStyle = theme.colors.text;
    if (data.currentBehavior) {
      ctx.fillText(`Doing: ${data.currentBehavior}`, x + padding, currentY);
      currentY += lineHeight;
    }

    // Needs bars
    currentY += 5;
    for (const need of data.needs) {
      const pct = Math.round((need.value / need.max) * 100);
      const color = getStatusColor(pct);

      ctx.fillStyle = theme.colors.textMuted;
      ctx.fillText(`${getNeedDisplayName(need.name)}:`, x + padding, currentY);

      // Draw bar
      const barX = x + padding + 70;
      const barWidth = 100;
      const barHeight = 10;

      ctx.fillStyle = theme.colors.border;
      ctx.fillRect(barX, currentY + 2, barWidth, barHeight);

      ctx.fillStyle = color;
      ctx.fillRect(barX, currentY + 2, (pct / 100) * barWidth, barHeight);

      ctx.fillStyle = theme.colors.text;
      ctx.fillText(`${pct}%`, barX + barWidth + 5, currentY);

      currentY += lineHeight;
    }

    // Inventory summary
    currentY += 10;
    ctx.fillStyle = theme.colors.textMuted;
    const itemCount = data.inventory.reduce((sum, s) => sum + s.quantity, 0);
    ctx.fillText(`Inventory: ${itemCount} items`, x + padding, currentY);
  },
};
