/**
 * WorldSection - World stats and controls
 */

import type { WorldMutator } from '@ai-village/core';
import { CT } from '@ai-village/core';
import { COLORS, SIZES } from '../DevPanelConstants.js';
import type { ClickRegion } from '../DevPanelTypes.js';
import { renderSectionHeader } from './SectionUIComponents.js';

/**
 * Render the World section of the DevPanel
 */
export function renderWorldSection(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  world: WorldMutator | null,
  clickRegions: ClickRegion[]
): number {
  if (!world) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px monospace';
    ctx.fillText('No world available', SIZES.padding, y + 8);
    return y + 30;
  }

  // World stats
  y = renderSectionHeader(ctx, width, y, 'WORLD STATS');

  const allEntities = world.query().executeEntities();
  const agents = world.query().with(CT.Agent).executeEntities();
  const buildings = world.query().with(CT.Building).executeEntities();

  const stats = [
    `Total Entities: ${allEntities.length}`,
    `Agents: ${agents.length}`,
    `Buildings: ${buildings.length}`,
    `Tick: ${world.tick}`,
  ];

  for (const stat of stats) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px monospace';
    ctx.fillText(stat, SIZES.padding, y + 4);
    y += 18;
  }

  // World controls
  y = renderSectionHeader(ctx, width, y, 'WORLD CONTROLS');

  const worldButtons = [
    { label: 'Fast Forward (100 ticks)', action: 'fast_forward_100' },
    { label: 'Fast Forward (1000 ticks)', action: 'fast_forward_1000' },
    { label: 'Clear All Dead Bodies', action: 'clear_dead_bodies' },
    { label: 'Heal All Agents', action: 'heal_all_agents' },
    { label: 'Feed All Agents', action: 'feed_all_agents' },
  ];

  for (const btn of worldButtons) {
    const btnWidth = width - SIZES.padding * 2;

    ctx.fillStyle = COLORS.button;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(btn.label, SIZES.padding + 8, y + 12);

    clickRegions.push({
      x: SIZES.padding,
      y: y + 4,
      width: btnWidth,
      height: SIZES.buttonHeight,
      action: 'execute_action',
      data: btn.action,
    });

    y += SIZES.buttonHeight + 4;
  }

  return y + SIZES.padding;
}
