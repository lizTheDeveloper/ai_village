/**
 * DevPanel Types - Shared types and interfaces for DevPanel components
 */

import type { World, WorldMutator } from '@ai-village/core';

// ============================================================================
// Types
// ============================================================================

export type DevSection = 'magic' | 'divinity' | 'skills' | 'events' | 'state' | 'research' | 'buildings' | 'agents' | 'world' | 'introspection' | 'grand_strategy';

export interface ResourceSlider {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  section: DevSection;
  paradigm?: string;
}

export interface ActionButton {
  id: string;
  label: string;
  description: string;
  section: DevSection;
  dangerous?: boolean;
}

/** Handler callbacks for agent spawning (provided by main.ts) */
export interface AgentSpawnHandler {
  spawnWanderingAgent: (x: number, y: number) => string;
  spawnLLMAgent: (x: number, y: number) => string;
  spawnVillage: (count: number, x: number, y: number) => string[];
}

/** LLM Scheduler interface for DevPanel integration */
export interface LLMScheduler {
  selectLayer(agent: any, world: any): { layer: string; reason: string; urgency: number };
  isLayerReady(agentId: string, layer: string): boolean;
  getTimeUntilReady(agentId: string, layer: string): number;
  getLayerConfig(layer: string): { cooldownMs: number; priority: number; enabled: boolean };
}

export interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'select_section' | 'toggle_paradigm' | 'adjust_slider' | 'execute_action' | 'unlock_spell' | 'grant_xp' | 'adjust_spawn_x' | 'adjust_spawn_y' | 'select_introspection_component';
  data?: string;
}

/** DevPanel representation of a paradigm for UI rendering */
export interface DevParadigmData {
  id: string;
  name: string;
  enabled: boolean;
  active: boolean;
  manaType: string;
  mana: number;
  maxMana: number;
  category: string;
}

/** DevPanel representation of a divine resource */
export interface DevDivineResource {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  section: DevSection;
  category?: 'belief' | 'energy' | 'power_tier' | 'attribute' | 'entity';
}

/** DevPanel representation of a skill tree */
export interface DevSkillTree {
  id: string;
  name: string;
  xp: number;
  level: number;
}

/** Section rendering context passed to section render functions */
export interface SectionRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  y: number;
  world: WorldMutator | null;
  clickRegions: ClickRegion[];
  log: (message: string) => void;
}

/** Section renderer function type */
export type SectionRenderer = (context: SectionRenderContext) => number;
