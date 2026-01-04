/**
 * PlotNarrativePressure - Inject plot context into agent decision-making
 *
 * Provides functions to generate narrative pressure text from active plots.
 * This text is injected into agent prompts to influence their decisions
 * toward plot progression.
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SoulLinkComponent } from '../soul/SoulLinkComponent.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { PlotLinesComponent, PlotLineInstance, PlotStage } from './PlotTypes.js';
import { plotLineRegistry } from './PlotLineRegistry.js';

/**
 * Narrative pressure influence on decision weights
 */
export interface NarrativePressure {
  text: string;            // Text to inject in prompt
  weight: number;          // Influence strength (0-1)
  plot_id: string;         // Source plot instance
  stage_id: string;        // Current stage
}

/**
 * Get narrative pressure for an agent
 */
export function getAgentNarrativePressure(
  agent: Entity,
  world: World
): NarrativePressure[] {
  const pressures: NarrativePressure[] = [];

  // Get soul link
  const soulLink = agent.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;
  if (!soulLink) return pressures;

  // Get soul entity
  const soul = world.getEntity(soulLink.soul_id);
  if (!soul) return pressures;

  const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
  const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;

  if (!identity || !plotLines) return pressures;

  // Generate pressure from each active plot
  for (const plot of plotLines.active) {
    const pressure = generatePlotPressure(plot, identity, soulLink);
    if (pressure) {
      pressures.push(pressure);
    }
  }

  return pressures;
}

/**
 * Generate narrative pressure from a plot
 */
function generatePlotPressure(
  plot: PlotLineInstance,
  _identity: SoulIdentityComponent,
  soulLink: SoulLinkComponent
): NarrativePressure | null {
  // Get template to access stages and scale
  const template = plotLineRegistry.getTemplate(plot.template_id);
  if (!template) return null;

  // Find current stage
  const stage = template.stages.find((s: PlotStage) => s.stage_id === plot.current_stage);
  if (!stage) return null;

  // Calculate pressure weight based on soul influence and plot scale
  const scaleWeights: Record<string, number> = {
    'micro': 0.2,
    'small': 0.4,
    'medium': 0.6,
    'large': 0.8,
    'epic': 1.0,
  };

  const scaleWeight = scaleWeights[template.scale] || 0.5;
  const influenceWeight = soulLink.soul_influence_strength;
  const pressureWeight = Math.min(1.0, scaleWeight * influenceWeight);

  // Generate narrative text based on stage
  const narrativeText = generateStageNarrative(template, stage);

  return {
    text: narrativeText,
    weight: pressureWeight,
    plot_id: plot.instance_id,
    stage_id: stage.stage_id,
  };
}

/**
 * Generate narrative text for current plot stage
 */
function generateStageNarrative(
  template: import('./PlotTypes.js').PlotLineTemplate,
  stage: PlotStage
): string {
  // Use stage description as base
  const narrative = stage.description;

  // Add lesson context
  const lessonHint = `This is part of your journey to learn about ${template.lesson.domain}.`;

  // Combine into narrative pressure
  const fullNarrative = `${narrative}\n\n${lessonHint}`;

  return fullNarrative;
}

/**
 * Format narrative pressures for prompt injection
 */
export function formatNarrativePressureForPrompt(
  pressures: NarrativePressure[]
): string {
  if (pressures.length === 0) {
    return '';
  }

  // Sort by weight (strongest first)
  const sorted = pressures.slice().sort((a: NarrativePressure, b: NarrativePressure) => b.weight - a.weight);

  // Format as prompt section
  const lines = [
    '## Active Story Arcs',
    '',
    ...sorted.map((p: NarrativePressure) => {
      const strength = p.weight > 0.7 ? 'strong' : p.weight > 0.4 ? 'moderate' : 'subtle';
      return `**[${strength} influence]** ${p.text}`;
    }),
    '',
  ];

  return lines.join('\n');
}

/**
 * Get highest priority plot for decision-making
 */
export function getPrimaryPlot(
  agent: Entity,
  world: World
): PlotLineInstance | null {
  const pressures = getAgentNarrativePressure(agent, world);
  if (pressures.length === 0) return null;

  // Get highest weighted pressure
  const primary = pressures.reduce((max: NarrativePressure, p: NarrativePressure) =>
    p.weight > max.weight ? p : max,
    pressures[0]!
  );
  if (!primary) return null;

  // Get soul and find plot
  const soulLink = agent.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;
  if (!soulLink) return null;

  const soul = world.getEntity(soulLink.soul_id);
  if (!soul) return null;

  const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
  if (!plotLines) return null;

  return plotLines.active.find((p: PlotLineInstance) => p.instance_id === primary.plot_id) || null;
}

/**
 * Check if agent should prioritize plot-related actions
 */
export function shouldPrioritizePlot(
  agent: Entity,
  world: World,
  threshold: number = 0.5
): boolean {
  const pressures = getAgentNarrativePressure(agent, world);
  if (pressures.length === 0) return false;

  // Check if any plot has weight above threshold
  return pressures.some((p: NarrativePressure) => p.weight >= threshold);
}

/**
 * Get plot guidance for specific action type
 */
export function getPlotGuidanceForAction(
  agent: Entity,
  actionType: string,
  world: World
): string | null {
  const primary = getPrimaryPlot(agent, world);
  if (!primary) return null;

  // Get template to access stages
  const template = plotLineRegistry.getTemplate(primary.template_id);
  if (!template) return null;

  // Find current stage
  const stage = template.stages.find((s: PlotStage) => s.stage_id === primary.current_stage);
  if (!stage) return null;

  // TODO: Add stage-specific action guidance based on stage metadata
  // For now, return general guidance
  return `Consider how this ${actionType} relates to your current journey: ${stage.description}`;
}
