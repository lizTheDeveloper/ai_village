/**
 * SectionUIComponents - Shared UI rendering utilities for DevPanel sections
 */

import { COLORS, SIZES, DEV_ACTIONS } from '../DevPanelConstants.js';
import type { ClickRegion, ResourceSlider, DevSection, DevParadigmData, DevSkillTree } from '../DevPanelTypes.js';

// ============================================================================
// Section Header
// ============================================================================

export function renderSectionHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  title: string
): number {
  ctx.fillStyle = COLORS.sectionBg;
  ctx.fillRect(0, y, width, SIZES.sectionHeaderHeight);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = 'bold 9px monospace';
  ctx.fillText(title, SIZES.padding, y + 8);

  return y + SIZES.sectionHeaderHeight;
}

// ============================================================================
// Slider
// ============================================================================

export function renderSlider(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  slider: ResourceSlider,
  clickRegions: ClickRegion[]
): number {
  const sliderWidth = width - SIZES.padding * 2 - 80;
  const progress = (slider.value - slider.min) / (slider.max - slider.min);

  // Label
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px monospace';
  ctx.fillText(slider.name, SIZES.padding, y + 4);

  // Value
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`${Math.floor(slider.value)}`, SIZES.padding + sliderWidth + 10, y + 4);

  // Slider track
  ctx.fillStyle = COLORS.sliderBg;
  ctx.fillRect(SIZES.padding, y + 20, sliderWidth, 12);

  // Slider fill
  ctx.fillStyle = slider.section === 'divinity' ? COLORS.divinity : COLORS.slider;
  ctx.fillRect(SIZES.padding, y + 20, sliderWidth * progress, 12);

  // Slider handle
  const handleX = SIZES.padding + sliderWidth * progress;
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(handleX, y + 26, 8, 0, Math.PI * 2);
  ctx.fill();

  clickRegions.push({
    x: SIZES.padding,
    y: y + 16,
    width: sliderWidth,
    height: 20,
    action: 'adjust_slider',
    data: slider.id,
  });

  return y + SIZES.sliderHeight;
}

// ============================================================================
// Actions
// ============================================================================

export function renderActions(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  section: DevSection,
  clickRegions: ClickRegion[]
): number {
  const actions = DEV_ACTIONS.filter(a => a.section === section);

  for (const action of actions) {
    const btnWidth = width - SIZES.padding * 2;

    ctx.fillStyle = action.dangerous ? COLORS.buttonDanger : COLORS.button;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
    ctx.fill();

    ctx.fillStyle = action.dangerous ? COLORS.warning : COLORS.text;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(action.label, SIZES.padding + 8, y + 12);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '8px monospace';
    const descWidth = ctx.measureText(action.description).width;
    ctx.fillText(action.description, width - descWidth - SIZES.padding - 4, y + 13);

    clickRegions.push({
      x: SIZES.padding,
      y: y + 4,
      width: btnWidth,
      height: SIZES.buttonHeight,
      action: 'execute_action',
      data: action.id,
    });

    y += SIZES.buttonHeight + 4;
  }

  return y + 4;
}

// ============================================================================
// Paradigm Row
// ============================================================================

export function renderParadigmRow(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  paradigm: DevParadigmData,
  state: { enabled: boolean; active: boolean; mana: number },
  clickRegions: ClickRegion[]
): number {
  ctx.fillStyle = COLORS.inputBg;
  ctx.fillRect(SIZES.padding / 2, y + 2, width - SIZES.padding, SIZES.toggleHeight - 4);

  // Name
  ctx.fillStyle = state.enabled ? COLORS.text : COLORS.textDim;
  ctx.font = '10px monospace';
  ctx.fillText(paradigm.name, SIZES.padding, y + 10);

  // Enabled toggle
  const enabledX = width - 120;
  ctx.fillStyle = state.enabled ? COLORS.success : COLORS.textDim;
  ctx.fillRect(enabledX, y + 6, 40, 20);
  ctx.fillStyle = COLORS.text;
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(state.enabled ? 'ON' : 'OFF', enabledX + 20, y + 12);
  ctx.textAlign = 'left';

  clickRegions.push({
    x: enabledX,
    y: y + 6,
    width: 40,
    height: 20,
    action: 'toggle_paradigm',
    data: `enabled_${paradigm.id}`,
  });

  // Active toggle (only if enabled)
  if (state.enabled) {
    const activeX = width - 70;
    ctx.fillStyle = state.active ? COLORS.magic : COLORS.textDim;
    ctx.fillRect(activeX, y + 6, 50, 20);
    ctx.fillStyle = COLORS.text;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.active ? 'ACTIVE' : 'IDLE', activeX + 25, y + 12);
    ctx.textAlign = 'left';

    clickRegions.push({
      x: activeX,
      y: y + 6,
      width: 50,
      height: 20,
      action: 'toggle_paradigm',
      data: `active_${paradigm.id}`,
    });
  }

  return y + SIZES.toggleHeight;
}

// ============================================================================
// Skill Tree Row
// ============================================================================

export function renderSkillTreeRow(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  tree: DevSkillTree,
  xp: number,
  clickRegions: ClickRegion[]
): number {
  ctx.fillStyle = COLORS.inputBg;
  ctx.fillRect(SIZES.padding / 2, y + 2, width - SIZES.padding, SIZES.rowHeight - 4);

  // Name
  ctx.fillStyle = xp > 0 ? COLORS.text : COLORS.textDim;
  ctx.font = '10px monospace';
  ctx.fillText(tree.name, SIZES.padding, y + 6);

  // Level
  ctx.fillStyle = COLORS.magic;
  ctx.font = 'bold 9px monospace';
  ctx.fillText(`Lvl ${tree.level}`, SIZES.padding, y + 20);

  // XP
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px monospace';
  ctx.fillText(`${xp} XP`, SIZES.padding + 50, y + 20);

  // +XP button
  const btnX = width - 70;
  ctx.fillStyle = COLORS.button;
  ctx.fillRect(btnX, y + 6, 50, 24);
  ctx.fillStyle = COLORS.text;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('+100 XP', btnX + 25, y + 14);
  ctx.textAlign = 'left';

  clickRegions.push({
    x: btnX,
    y: y + 6,
    width: 50,
    height: 24,
    action: 'grant_xp',
    data: tree.id,
  });

  return y + SIZES.rowHeight;
}

// ============================================================================
// Action Log
// ============================================================================

export function renderActionLog(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  actionLog: string[]
): number {
  const logToShow = actionLog.slice(0, 8);

  if (logToShow.length === 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '10px monospace';
    ctx.fillText('No actions yet', SIZES.padding, y + 8);
    return y + 30;
  }

  for (const entry of logToShow) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText(entry, SIZES.padding, y + 4);
    y += 14;
  }

  return y + 8;
}

// ============================================================================
// State Summary
// ============================================================================

export function renderStateSummary(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  paradigmStates: Map<string, { enabled: boolean; active: boolean; mana: number }>,
  divineResources: Map<string, number>,
  skillXp: Map<string, number>,
  actionLog: string[]
): number {
  const enabledParadigms = Array.from(paradigmStates.entries()).filter(([, s]) => s.enabled).length;
  const activeParadigms = Array.from(paradigmStates.entries()).filter(([, s]) => s.active).length;
  const belief = divineResources.get('belief') ?? 0;
  const totalXp = Array.from(skillXp.values()).reduce((sum, xp) => sum + xp, 0);

  const stats = [
    `Paradigms: ${enabledParadigms} enabled, ${activeParadigms} active`,
    `Belief: ${belief}`,
    `Total Skill XP: ${totalXp}`,
    `Actions logged: ${actionLog.length}`,
  ];

  for (const stat of stats) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px monospace';
    ctx.fillText(stat, SIZES.padding, y + 4);
    y += 18;
  }

  return y + 8;
}

// ============================================================================
// Spawn Location Controls
// ============================================================================

export function renderSpawnLocationControls(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  spawnX: number,
  spawnY: number,
  clickRegions: ClickRegion[]
): number {
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px monospace';
  ctx.fillText('Spawn Location:', SIZES.padding, y + 4);
  y += 18;

  // X coordinate slider
  const sliderWidth = width - SIZES.padding * 2 - 60;
  const maxCoord = 200;
  const progressX = spawnX / maxCoord;

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px monospace';
  ctx.fillText('X:', SIZES.padding, y + 4);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`${spawnX}`, SIZES.padding + sliderWidth + 10, y + 4);

  ctx.fillStyle = COLORS.sliderBg;
  ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth, 12);

  ctx.fillStyle = COLORS.slider;
  ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth * progressX, 12);

  const handleX = SIZES.padding + 15 + sliderWidth * progressX;
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(handleX, y + 22, 8, 0, Math.PI * 2);
  ctx.fill();

  clickRegions.push({
    x: SIZES.padding + 15,
    y: y + 12,
    width: sliderWidth,
    height: 20,
    action: 'adjust_spawn_x',
    data: 'spawnX',
  });

  y += 36;

  // Y coordinate slider
  const progressY = spawnY / maxCoord;

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px monospace';
  ctx.fillText('Y:', SIZES.padding, y + 4);

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`${spawnY}`, SIZES.padding + sliderWidth + 10, y + 4);

  ctx.fillStyle = COLORS.sliderBg;
  ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth, 12);

  ctx.fillStyle = COLORS.slider;
  ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth * progressY, 12);

  const handleY = SIZES.padding + 15 + sliderWidth * progressY;
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(handleY, y + 22, 8, 0, Math.PI * 2);
  ctx.fill();

  clickRegions.push({
    x: SIZES.padding + 15,
    y: y + 12,
    width: sliderWidth,
    height: 20,
    action: 'adjust_spawn_y',
    data: 'spawnY',
  });

  y += 40;

  return y;
}

// ============================================================================
// Button
// ============================================================================

export function renderButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  clickRegions: ClickRegion[],
  actionData: string,
  options: {
    disabled?: boolean;
    dangerous?: boolean;
    selected?: boolean;
  } = {}
): number {
  const { disabled = false, dangerous = false, selected = false } = options;

  ctx.fillStyle = disabled
    ? COLORS.inputBg
    : selected
      ? COLORS.magic
      : dangerous
        ? COLORS.buttonDanger
        : COLORS.button;
  ctx.beginPath();
  ctx.roundRect(x, y + 4, width, height, 4);
  ctx.fill();

  ctx.fillStyle = disabled ? COLORS.textDim : dangerous ? COLORS.warning : COLORS.text;
  ctx.font = 'bold 9px monospace';
  ctx.fillText(label, x + 8, y + 12);

  if (!disabled) {
    clickRegions.push({
      x,
      y: y + 4,
      width,
      height,
      action: 'execute_action',
      data: actionData,
    });
  }

  return y + height + 4;
}
