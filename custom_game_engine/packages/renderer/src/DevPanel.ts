/**
 * DevPanel - Developer tools for testing magic and divinity systems
 *
 * Features:
 * - Magic paradigm state manipulation
 * - Mana/resource manipulation for all paradigms
 * - Belief manipulation for divine systems
 * - Spell unlocking/testing
 * - Skill tree progression
 * - Divine power testing
 * - Event injection
 * - State inspection
 * - Universe export/import (snapshot save/load)
 */

import type { World, MagicParadigm, PowerTier } from '@ai-village/core';
import {
  CORE_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
  HYBRID_PARADIGM_REGISTRY,
  POWER_TIER_THRESHOLDS,
  BELIEF_GENERATION_RATES,
  MagicSystemStateManager,
  type ResearchStateComponent,
  type SkillsComponent,
  type IdentityComponent,
  type TagsComponent,
  BuildingType,
  CT,
  EntityImpl,
  createEntityId,
  createPositionComponent,
  createPhysicsComponent,
  createRenderableComponent,
  createTagsComponent,
  createBuildingComponent,
} from '@ai-village/core';
import type { IWindowPanel } from './types/WindowTypes.js';

// ============================================================================
// Types
// ============================================================================

type DevSection = 'magic' | 'divinity' | 'skills' | 'events' | 'state' | 'research' | 'buildings' | 'agents' | 'world';

interface ResourceSlider {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  section: DevSection;
  paradigm?: string;
}

interface ActionButton {
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

interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'select_section' | 'toggle_paradigm' | 'adjust_slider' | 'execute_action' | 'unlock_spell' | 'grant_xp';
  data?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  background: 'rgba(10, 10, 15, 0.98)',
  headerBg: 'rgba(40, 20, 20, 0.95)',
  sectionBg: 'rgba(25, 25, 35, 0.9)',
  inputBg: 'rgba(30, 30, 40, 0.8)',
  text: '#FFFFFF',
  textMuted: '#AAAAAA',
  textDim: '#666666',
  dev: '#FF6666',
  warning: '#FFAA00',
  success: '#66FF66',
  magic: '#9966FF',
  divinity: '#FFD700',
  slider: '#4488FF',
  sliderBg: 'rgba(50, 50, 70, 0.5)',
  button: 'rgba(80, 60, 100, 0.7)',
  buttonDanger: 'rgba(120, 40, 40, 0.7)',
  border: 'rgba(100, 100, 140, 0.5)',
};

const SIZES = {
  padding: 12,
  lineHeight: 18,
  headerHeight: 44,
  tabHeight: 32,
  sectionHeaderHeight: 28,
  sliderHeight: 40,
  buttonHeight: 28,
  toggleHeight: 32,
  rowHeight: 36,
};

// ============================================================================
// Paradigm Data Generation
// ============================================================================

/** DevPanel representation of a paradigm for UI rendering */
interface DevParadigmData {
  id: string;
  name: string;
  enabled: boolean;
  active: boolean;
  manaType: string;
  mana: number;
  maxMana: number;
  category: string;
}

/**
 * Extract mana type from a MagicParadigm's sources.
 * Falls back to the first source's name or the paradigm id.
 */
function getManaType(paradigm: MagicParadigm): string {
  if (paradigm.sources && paradigm.sources.length > 0) {
    const firstSource = paradigm.sources[0];
    if (!firstSource) return paradigm.id;

    // Try to get id, name, or fallback to type
    if ('id' in firstSource && firstSource.id) {
      return firstSource.id;
    }
    if ('name' in firstSource && firstSource.name) {
      return firstSource.name.toLowerCase().replace(/\s+/g, '_');
    }
    if ('type' in firstSource) {
      return String(firstSource.type);
    }
  }
  return paradigm.id;
}

/**
 * Convert a MagicParadigm from the registry to DevPanel format.
 */
function paradigmToDevData(paradigm: MagicParadigm, category: string): DevParadigmData {
  // Determine default maxMana based on source type
  let maxMana = 100;
  if (paradigm.sources && paradigm.sources.length > 0) {
    const sourceType = paradigm.sources[0]?.type;
    // Some source types have different defaults
    if (sourceType === 'material') maxMana = 20;
    if (sourceType === 'temporal') maxMana = 80;
    if (sourceType === 'void') maxMana = 50;
  }

  // Null paradigms often have 0 max
  const isNull = category === 'null';
  if (isNull && (paradigm.id === 'null' || paradigm.id === 'dead')) {
    maxMana = 0;
  }

  return {
    id: paradigm.id,
    name: paradigm.name,
    enabled: false,
    active: false,
    manaType: getManaType(paradigm),
    mana: 0,
    maxMana,
    category,
  };
}

/**
 * Generate all paradigms from the registries.
 * This ensures the UI automatically includes any new paradigms added to the registries.
 */
function generateParadigmList(): DevParadigmData[] {
  const paradigms: DevParadigmData[] = [];
  const seen = new Set<string>();

  // Helper to add paradigms from a registry
  const addFromRegistry = (
    registry: Record<string, MagicParadigm>,
    category: string
  ) => {
    for (const paradigm of Object.values(registry)) {
      if (!seen.has(paradigm.id)) {
        seen.add(paradigm.id);
        paradigms.push(paradigmToDevData(paradigm, category));
      }
    }
  };

  // Add from all registries in order
  addFromRegistry(CORE_PARADIGM_REGISTRY, 'core');
  addFromRegistry(ANIMIST_PARADIGM_REGISTRY, 'animist');
  addFromRegistry(WHIMSICAL_PARADIGM_REGISTRY, 'whimsical');
  addFromRegistry(NULL_PARADIGM_REGISTRY, 'null');
  addFromRegistry(DIMENSIONAL_PARADIGM_REGISTRY, 'dimensional');
  addFromRegistry(HYBRID_PARADIGM_REGISTRY, 'hybrid');

  return paradigms;
}

// Dynamically generated paradigm list from all registries
const PARADIGMS = generateParadigmList();

// ============================================================================
// Divine Resource Generation
// ============================================================================

/** DevPanel representation of a divine resource */
interface DevDivineResource {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  section: DevSection;
  category?: 'belief' | 'power_tier' | 'attribute' | 'entity';
}

/**
 * Generate divine resources from the core divinity types.
 * This ensures the UI automatically reflects any new divine mechanics.
 */
function generateDivineResources(): DevDivineResource[] {
  const resources: DevDivineResource[] = [];

  // Core belief resource (using highest tier threshold as max)
  const maxBeliefFromTiers = Math.max(...(Object.values(POWER_TIER_THRESHOLDS) as number[]));
  resources.push({
    id: 'belief',
    name: 'Belief',
    value: 0,
    min: 0,
    max: maxBeliefFromTiers * 2, // Allow twice the world_shaping threshold
    section: 'divinity',
    category: 'belief',
  });

  // Belief rate (based on belief activities)
  const maxBeliefRate = Math.max(...(Object.values(BELIEF_GENERATION_RATES) as number[])) * 100; // Scaled for multiple believers
  resources.push({
    id: 'beliefRate',
    name: 'Belief/Hour',
    value: 0,
    min: 0,
    max: Math.ceil(maxBeliefRate),
    section: 'divinity',
    category: 'belief',
  });

  // Power tier thresholds as resources (shows current belief relative to tiers)
  const tierOrder: PowerTier[] = ['dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'];
  for (const tier of tierOrder) {
    if (tier === 'dormant') continue; // Skip dormant
    resources.push({
      id: `tier_${tier}`,
      name: `${tier.charAt(0).toUpperCase() + tier.slice(1).replace('_', ' ')} Tier`,
      value: POWER_TIER_THRESHOLDS[tier],
      min: 0,
      max: POWER_TIER_THRESHOLDS[tier],
      section: 'divinity',
      category: 'power_tier',
    });
  }

  // Divine entity counts
  resources.push({
    id: 'believers',
    name: 'Believer Count',
    value: 0,
    min: 0,
    max: 1000,
    section: 'divinity',
    category: 'entity',
  });

  resources.push({
    id: 'angels',
    name: 'Angel Count',
    value: 0,
    min: 0,
    max: 20,
    section: 'divinity',
    category: 'entity',
  });

  // Divine attributes
  resources.push({
    id: 'benevolence',
    name: 'Benevolence',
    value: 0,
    min: -100,
    max: 100,
    section: 'divinity',
    category: 'attribute',
  });

  resources.push({
    id: 'wrath',
    name: 'Wrathfulness',
    value: 0,
    min: 0,
    max: 100,
    section: 'divinity',
    category: 'attribute',
  });

  resources.push({
    id: 'mysteriousness',
    name: 'Mysteriousness',
    value: 0,
    min: 0,
    max: 100,
    section: 'divinity',
    category: 'attribute',
  });

  return resources;
}

// Dynamically generated divine resources from divinity types
const DIVINE_RESOURCES = generateDivineResources();

/**
 * Generate skill trees from paradigms.
 * Creates a skill tree entry for each paradigm (skill progression is paradigm-based).
 */
function generateSkillTrees(): Array<{ id: string; name: string; xp: number; level: number }> {
  return PARADIGMS.map(paradigm => ({
    id: paradigm.id,
    name: paradigm.name,
    xp: 0,
    level: 0,
  }));
}

// Dynamically generated skill trees from paradigms
const SKILL_TREES = generateSkillTrees();

// Quick actions
const DEV_ACTIONS: ActionButton[] = [
  { id: 'unlock_all_spells', label: 'Unlock All Spells', description: 'Unlock every spell in all paradigms', section: 'magic' },
  { id: 'max_mana', label: 'Max All Mana', description: 'Restore all mana/resources to maximum', section: 'magic' },
  { id: 'reset_cooldowns', label: 'Reset Cooldowns', description: 'Clear all spell cooldowns', section: 'magic' },
  { id: 'grant_belief', label: '+1000 Belief', description: 'Add 1000 belief points', section: 'divinity' },
  { id: 'max_faith', label: 'Max All Faith', description: 'Set all believer faith to 100%', section: 'divinity' },
  { id: 'spawn_angel', label: 'Spawn Angel', description: 'Create a new angelic servant', section: 'divinity' },
  { id: 'answer_prayers', label: 'Answer All Prayers', description: 'Automatically answer all pending prayers', section: 'divinity' },
  { id: 'grant_xp_all', label: '+500 XP (All Trees)', description: 'Grant 500 XP to all skill trees', section: 'skills' },
  { id: 'unlock_all_nodes', label: 'Unlock All Nodes', description: 'Unlock every skill tree node', section: 'skills', dangerous: true },
  { id: 'trigger_eclipse', label: 'Trigger Eclipse', description: 'Force an eclipse event', section: 'events' },
  { id: 'trigger_miracle', label: 'Random Miracle', description: 'Trigger a random miracle effect', section: 'events' },
  { id: 'reset_all', label: 'RESET ALL', description: 'Reset all magic and divinity state to defaults', section: 'state', dangerous: true },
];

// ============================================================================
// DevPanel
// ============================================================================

export class DevPanel implements IWindowPanel {
  private visible = false;
  private scrollOffset = 0;
  private contentHeight = 0;
  private visibleHeight = 0;
  private clickRegions: ClickRegion[] = [];

  private activeSection: DevSection = 'magic';
  private paradigmStates = new Map<string, { enabled: boolean; active: boolean; mana: number }>();
  private divineResources = new Map<string, number>();
  private skillXp = new Map<string, number>();

  private actionLog: string[] = [];
  private world: World | null = null;
  private agentSpawnHandler: AgentSpawnHandler | null = null;

  constructor() {
    // Initialize paradigm states
    for (const p of PARADIGMS) {
      this.paradigmStates.set(p.id, { enabled: p.enabled, active: p.active, mana: p.mana });
    }
    // Initialize divine resources
    for (const r of DIVINE_RESOURCES) {
      this.divineResources.set(r.id, r.value);
    }
    // Initialize skill XP
    for (const s of SKILL_TREES) {
      this.skillXp.set(s.id, s.xp);
    }
  }

  // ========== State Sync ==========

  /**
   * Sync local state from world state (read actual game data)
   */
  private syncFromWorld(world: World): void {
    this.world = world;

    // Sync magic paradigm states from MagicSystemStateManager
    const magicManager = MagicSystemStateManager.getInstance();
    for (const paradigm of PARADIGMS) {
      const paradigmState = magicManager.getState(paradigm.id);
      const localState = this.paradigmStates.get(paradigm.id);
      if (localState) {
        localState.enabled = paradigmState !== 'disabled';
        localState.active = paradigmState === 'active';
        // Mana tracking would need to be added to MagicSystemStateManager
        // For now, keep local tracking
      }
    }
  }

  /**
   * Apply local state changes to world (write to actual game data)
   */
  private applyToWorld(): void {
    if (!this.world) return;

    const magicManager = MagicSystemStateManager.getInstance();

    // Apply magic paradigm state changes
    for (const [paradigmId, localState] of Array.from(this.paradigmStates.entries())) {
      const currentState = magicManager.getState(paradigmId);
      const targetState = localState.active ? 'active' : (localState.enabled ? 'enabled' : 'disabled');
      if (currentState !== targetState) {
        magicManager.setState(paradigmId, targetState);
      }
    }
  }

  // ========== IWindowPanel Interface ==========

  getId(): string {
    return 'dev';
  }

  getTitle(): string {
    return 'Dev Panel';
  }

  getDefaultWidth(): number {
    return 600;
  }

  getDefaultHeight(): number {
    return 700;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  // ========== Additional Visibility Methods ==========

  toggle(): void {
    this.visible = !this.visible;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  /**
   * Set the agent spawn handler (called from main.ts)
   */
  setAgentSpawnHandler(handler: AgentSpawnHandler): void {
    this.agentSpawnHandler = handler;
  }

  // ========== Dev API ==========

  setMana(paradigmId: string, amount: number): void {
    const state = this.paradigmStates.get(paradigmId);
    if (state) {
      state.mana = Math.max(0, amount);
      this.log(`Set ${paradigmId} mana to ${amount}`);
    }
  }

  setBelief(amount: number): void {
    this.divineResources.set('belief', Math.max(0, amount));
    this.log(`Set belief to ${amount}`);
  }

  grantXp(treeId: string, amount: number): void {
    const current = this.skillXp.get(treeId) ?? 0;
    this.skillXp.set(treeId, current + amount);
    this.log(`Granted ${amount} XP to ${treeId}`);
  }

  enableParadigm(paradigmId: string, enabled: boolean): void {
    const state = this.paradigmStates.get(paradigmId);
    if (state) {
      state.enabled = enabled;
      if (!enabled) state.active = false;
      this.log(`${enabled ? 'Enabled' : 'Disabled'} ${paradigmId}`);
    }
  }

  activateParadigm(paradigmId: string, active: boolean): void {
    const state = this.paradigmStates.get(paradigmId);
    if (state && state.enabled) {
      state.active = active;
      this.log(`${active ? 'Activated' : 'Deactivated'} ${paradigmId}`);
    }
  }

  getActionLog(): string[] {
    return [...this.actionLog];
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.actionLog.unshift(`[${timestamp}] ${message}`);
    if (this.actionLog.length > 50) {
      this.actionLog.pop();
    }
  }

  // ========== Rendering ==========

  render(ctx: CanvasRenderingContext2D, _x: number, _y: number, width: number, height: number, world?: any): void {
    // Sync state from world
    if (world) {
      this.syncFromWorld(world);
    }

    this.clickRegions = [];

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let y = 0;

    // Header
    y = this.renderHeader(ctx, width, y);

    // Tabs
    y = this.renderTabs(ctx, width, y);

    // Content area with clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, height - y);
    ctx.clip();

    const contentStartY = y;
    y -= this.scrollOffset;

    // Section content
    switch (this.activeSection) {
      case 'agents':
        y = this.renderAgentsSection(ctx, width, y);
        break;
      case 'world':
        y = this.renderWorldSection(ctx, width, y);
        break;
      case 'magic':
        y = this.renderMagicSection(ctx, width, y);
        break;
      case 'divinity':
        y = this.renderDivinitySection(ctx, width, y);
        break;
      case 'skills':
        y = this.renderSkillsSection(ctx, width, y);
        break;
      case 'events':
        y = this.renderEventsSection(ctx, width, y);
        break;
      case 'state':
        y = this.renderStateSection(ctx, width, y);
        break;
      case 'research':
        y = this.renderResearchSection(ctx, width, y);
        break;
      case 'buildings':
        y = this.renderBuildingsSection(ctx, width, y);
        break;
    }

    ctx.restore();

    this.contentHeight = y + this.scrollOffset - contentStartY;
    this.visibleHeight = height - contentStartY;
  }

  private renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, y, width, SIZES.headerHeight);

    ctx.fillStyle = COLORS.dev;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('DEV TOOLS', SIZES.padding, y + 14);

    ctx.fillStyle = COLORS.warning;
    ctx.font = '10px monospace';
    ctx.fillText('⚠ Development Mode', SIZES.padding + 90, y + 16);

    // Action log count
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '9px monospace';
    const logText = `Log: ${this.actionLog.length}`;
    ctx.fillText(logText, width - ctx.measureText(logText).width - SIZES.padding, y + 16);

    return y + SIZES.headerHeight;
  }

  private renderTabs(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const sections: Array<{ id: DevSection; label: string }> = [
      { id: 'agents', label: 'Agents' },
      { id: 'world', label: 'World' },
      { id: 'magic', label: 'Magic' },
      { id: 'divinity', label: 'Divinity' },
      { id: 'research', label: 'Research' },
      { id: 'buildings', label: 'Buildings' },
      { id: 'skills', label: 'Skills' },
      { id: 'state', label: 'State' },
    ];

    const tabWidth = width / sections.length;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]!;
      const x = i * tabWidth;
      const isActive = this.activeSection === section.id;

      ctx.fillStyle = isActive ? COLORS.sectionBg : COLORS.inputBg;
      ctx.fillRect(x, y, tabWidth - 1, SIZES.tabHeight);

      if (isActive) {
        ctx.strokeStyle = section.id === 'divinity' ? COLORS.divinity : COLORS.magic;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + SIZES.tabHeight - 2);
        ctx.lineTo(x + tabWidth - 1, y + SIZES.tabHeight - 2);
        ctx.stroke();
      }

      ctx.fillStyle = isActive ? COLORS.text : COLORS.textMuted;
      ctx.font = isActive ? 'bold 10px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(section.label, x + tabWidth / 2, y + 10);
      ctx.textAlign = 'left';

      this.clickRegions.push({
        x,
        y,
        width: tabWidth - 1,
        height: SIZES.tabHeight,
        action: 'select_section',
        data: section.id,
      });
    }

    return y + SIZES.tabHeight;
  }

  private renderMagicSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Paradigm toggles
    y = this.renderSectionHeader(ctx, width, y, 'PARADIGM STATES');

    for (const paradigm of PARADIGMS) {
      y = this.renderParadigmRow(ctx, width, y, paradigm);
    }

    // Mana sliders
    y = this.renderSectionHeader(ctx, width, y, 'MANA / RESOURCES');

    for (const paradigm of PARADIGMS) {
      const state = this.paradigmStates.get(paradigm.id);
      if (!state?.enabled) continue;

      y = this.renderSlider(ctx, width, y, {
        id: `mana_${paradigm.id}`,
        name: `${paradigm.name} (${paradigm.manaType})`,
        value: state.mana,
        min: 0,
        max: paradigm.maxMana,
        section: 'magic',
        paradigm: paradigm.id,
      });
    }

    // Actions
    y = this.renderSectionHeader(ctx, width, y, 'QUICK ACTIONS');
    y = this.renderActions(ctx, width, y, 'magic');

    return y + SIZES.padding;
  }

  private renderDivinitySection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Divine resources
    y = this.renderSectionHeader(ctx, width, y, 'DIVINE RESOURCES');

    for (const resource of DIVINE_RESOURCES) {
      const value = this.divineResources.get(resource.id) ?? resource.value;
      y = this.renderSlider(ctx, width, y, { ...resource, value });
    }

    // Actions
    y = this.renderSectionHeader(ctx, width, y, 'QUICK ACTIONS');
    y = this.renderActions(ctx, width, y, 'divinity');

    return y + SIZES.padding;
  }

  private renderSkillsSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    // Skill trees
    y = this.renderSectionHeader(ctx, width, y, 'SKILL TREES');

    for (const tree of SKILL_TREES) {
      y = this.renderSkillTreeRow(ctx, width, y, tree);
    }

    // Actions
    y = this.renderSectionHeader(ctx, width, y, 'QUICK ACTIONS');
    y = this.renderActions(ctx, width, y, 'skills');

    return y + SIZES.padding;
  }

  private renderEventsSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    y = this.renderSectionHeader(ctx, width, y, 'TRIGGER EVENTS');
    y = this.renderActions(ctx, width, y, 'events');

    // Event log preview
    y = this.renderSectionHeader(ctx, width, y, 'RECENT ACTIONS');
    y = this.renderActionLog(ctx, width, y);

    return y + SIZES.padding;
  }

  private renderStateSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    y = this.renderSectionHeader(ctx, width, y, 'STATE SUMMARY');
    y = this.renderStateSummary(ctx, width, y);

    y = this.renderSectionHeader(ctx, width, y, 'DANGER ZONE');
    y = this.renderActions(ctx, width, y, 'state');

    return y + SIZES.padding;
  }

  private renderAgentsSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    if (!this.world) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No world available', SIZES.padding, y + 8);
      return y + 30;
    }

    // Get all agents
    const agents = this.world.query().with(CT.Agent).with(CT.Identity).executeEntities();

    y = this.renderSectionHeader(ctx, width, y, `AGENTS (${agents.length})`);

    // Show agent list with XP controls
    if (agents.length === 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No agents in world', SIZES.padding, y + 8);
      y += 24;
    } else {
      // Show first 10 agents
      const agentsToShow = agents.slice(0, 10);
      for (const agent of agentsToShow) {
        const identity = agent.getComponent<IdentityComponent>(CT.Identity);
        const skills = agent.getComponent<SkillsComponent>(CT.Skills);

        ctx.fillStyle = COLORS.text;
        ctx.font = '10px monospace';
        const name = identity?.name || 'Unnamed';
        ctx.fillText(name, SIZES.padding, y + 6);

        // Show total skill level
        if (skills) {
          const totalLevel = Object.values(skills.levels).reduce((sum: number, level) => sum + level, 0);
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '8px monospace';
          ctx.fillText(`Skills: ${Math.floor(totalLevel)}`, SIZES.padding, y + 20);
        }

        // XP button
        const btnX = width - 80;
        ctx.fillStyle = COLORS.button;
        ctx.fillRect(btnX, y + 6, 60, 20);
        ctx.fillStyle = COLORS.text;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+100 XP', btnX + 30, y + 14);
        ctx.textAlign = 'left';

        this.clickRegions.push({
          x: btnX,
          y: y + 6,
          width: 60,
          height: 20,
          action: 'execute_action',
          data: `grant_agent_xp_${agent.id}`,
        });

        y += 32;
      }

      if (agents.length > 10) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText(`... and ${agents.length - 10} more agents`, SIZES.padding, y + 4);
        y += 20;
      }
    }

    // Spawn controls
    y = this.renderSectionHeader(ctx, width, y, 'SPAWN AGENTS');

    const spawnButtons = [
      { label: 'Spawn Wandering Agent', action: 'spawn_wandering_agent' },
      { label: 'Spawn LLM Agent', action: 'spawn_llm_agent' },
      { label: 'Spawn Small Village (5)', action: 'spawn_village_5' },
      { label: 'Spawn Village (10)', action: 'spawn_village_10' },
      { label: 'Spawn Town (25)', action: 'spawn_town_25' },
      { label: 'Spawn City (50)', action: 'spawn_city_50' },
    ];

    for (const btn of spawnButtons) {
      const btnWidth = width - SIZES.padding * 2;

      ctx.fillStyle = COLORS.button;
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(btn.label, SIZES.padding + 8, y + 12);

      this.clickRegions.push({
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

  private renderWorldSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    if (!this.world) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No world available', SIZES.padding, y + 8);
      return y + 30;
    }

    // World stats
    y = this.renderSectionHeader(ctx, width, y, 'WORLD STATS');

    const allEntities = this.world.query().executeEntities();
    const agents = this.world.query().with(CT.Agent).executeEntities();
    const buildings = this.world.query().with(CT.Building).executeEntities();

    const stats = [
      `Total Entities: ${allEntities.length}`,
      `Agents: ${agents.length}`,
      `Buildings: ${buildings.length}`,
      `Tick: ${this.world.tick}`,
    ];

    for (const stat of stats) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(stat, SIZES.padding, y + 4);
      y += 18;
    }

    // World controls
    y = this.renderSectionHeader(ctx, width, y, 'WORLD CONTROLS');

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

      this.clickRegions.push({
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

  private renderResearchSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    if (!this.world) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No world available', SIZES.padding, y + 8);
      return y + 30;
    }

    // Get research state from world
    const worldEntity = this.world.query().with(CT.ResearchState).executeEntities()[0];
    if (!worldEntity) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No research system found', SIZES.padding, y + 8);
      return y + 30;
    }

    const researchState = worldEntity.getComponent<ResearchStateComponent>(CT.ResearchState);
    if (!researchState) {
      return y + 30;
    }

    // Show completed research
    y = this.renderSectionHeader(ctx, width, y, `COMPLETED RESEARCH (${researchState.completed.size})`);

    if (researchState.completed.size === 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No research completed yet', SIZES.padding, y + 8);
      y += 24;
    } else {
      const completedArray = Array.from(researchState.completed).slice(0, 10);
      for (const researchId of completedArray) {
        ctx.fillStyle = COLORS.success;
        ctx.font = '9px monospace';
        ctx.fillText(`✓ ${researchId}`, SIZES.padding, y + 4);
        y += 16;
      }
      if (researchState.completed.size > 10) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText(`... and ${researchState.completed.size - 10} more`, SIZES.padding, y + 4);
        y += 16;
      }
    }

    // Show in-progress research
    y = this.renderSectionHeader(ctx, width, y, `IN PROGRESS (${researchState.inProgress.size})`);

    if (researchState.inProgress.size === 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No research in progress', SIZES.padding, y + 8);
      y += 24;
    } else {
      for (const [researchId, progress] of Array.from(researchState.inProgress.entries())) {
        ctx.fillStyle = COLORS.text;
        ctx.font = '9px monospace';
        ctx.fillText(researchId, SIZES.padding, y + 4);

        // Progress amount (can't show percentage without research definition)
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '8px monospace';
        ctx.fillText(`Progress: ${Math.floor(progress.currentProgress)}`, SIZES.padding, y + 18);

        y += 28;
      }
    }

    // Show research queue
    y = this.renderSectionHeader(ctx, width, y, `QUEUED (${researchState.queue.length})`);

    if (researchState.queue.length === 0) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No research queued', SIZES.padding, y + 8);
      y += 24;
    } else {
      const queuedToShow = researchState.queue.slice(0, 5);
      for (let i = 0; i < queuedToShow.length; i++) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText(`${i + 1}. ${queuedToShow[i]}`, SIZES.padding, y + 4);
        y += 16;
      }
      if (researchState.queue.length > 5) {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = '9px monospace';
        ctx.fillText(`... and ${researchState.queue.length - 5} more`, SIZES.padding, y + 4);
        y += 16;
      }
    }

    return y + SIZES.padding;
  }

  private renderBuildingsSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    if (!this.world) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No world available', SIZES.padding, y + 8);
      return y + 30;
    }

    y = this.renderSectionHeader(ctx, width, y, 'SPAWN BUILDING');

    // Building type selector (show a few common ones as buttons)
    const commonBuildings: BuildingType[] = [
      BuildingType.Workbench,
      BuildingType.StorageChest,
      BuildingType.Campfire,
      BuildingType.Tent,
      BuildingType.Well,
      BuildingType.Forge,
      BuildingType.Library,
      BuildingType.University,
    ];

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText('Click to spawn at (50, 50):', SIZES.padding, y + 4);
    y += 20;

    for (const buildingType of commonBuildings) {
      const btnWidth = width - SIZES.padding * 2;

      ctx.fillStyle = COLORS.button;
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Spawn ${buildingType}`, SIZES.padding + 8, y + 12);

      this.clickRegions.push({
        x: SIZES.padding,
        y: y + 4,
        width: btnWidth,
        height: SIZES.buttonHeight,
        action: 'execute_action',
        data: `spawn_building_${buildingType}`,
      });

      y += SIZES.buttonHeight + 4;
    }

    return y + SIZES.padding;
  }

  private renderSectionHeader(ctx: CanvasRenderingContext2D, width: number, y: number, title: string): number {
    ctx.fillStyle = COLORS.sectionBg;
    ctx.fillRect(0, y, width, SIZES.sectionHeaderHeight);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(title, SIZES.padding, y + 8);

    return y + SIZES.sectionHeaderHeight;
  }

  private renderParadigmRow(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    paradigm: DevParadigmData
  ): number {
    const state = this.paradigmStates.get(paradigm.id) ?? { enabled: paradigm.enabled, active: paradigm.active, mana: paradigm.mana };

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

    this.clickRegions.push({
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

      this.clickRegions.push({
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

  private renderSlider(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    slider: ResourceSlider
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

    this.clickRegions.push({
      x: SIZES.padding,
      y: y + 16,
      width: sliderWidth,
      height: 20,
      action: 'adjust_slider',
      data: slider.id,
    });

    return y + SIZES.sliderHeight;
  }

  private renderSkillTreeRow(
    ctx: CanvasRenderingContext2D,
    width: number,
    y: number,
    tree: typeof SKILL_TREES[0]
  ): number {
    const xp = this.skillXp.get(tree.id) ?? tree.xp;

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

    this.clickRegions.push({
      x: btnX,
      y: y + 6,
      width: 50,
      height: 24,
      action: 'grant_xp',
      data: tree.id,
    });

    return y + SIZES.rowHeight;
  }

  private renderActions(ctx: CanvasRenderingContext2D, width: number, y: number, section: DevSection): number {
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

      this.clickRegions.push({
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

  private renderActionLog(ctx: CanvasRenderingContext2D, _width: number, y: number): number {
    const logToShow = this.actionLog.slice(0, 8);

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

  private renderStateSummary(ctx: CanvasRenderingContext2D, _width: number, y: number): number {
    const enabledParadigms = Array.from(this.paradigmStates.entries()).filter(([, s]) => s.enabled).length;
    const activeParadigms = Array.from(this.paradigmStates.entries()).filter(([, s]) => s.active).length;
    const belief = this.divineResources.get('belief') ?? 0;
    const totalXp = Array.from(this.skillXp.values()).reduce((sum, xp) => sum + xp, 0);

    const stats = [
      `Paradigms: ${enabledParadigms} enabled, ${activeParadigms} active`,
      `Belief: ${belief}`,
      `Total Skill XP: ${totalXp}`,
      `Actions logged: ${this.actionLog.length}`,
    ];

    for (const stat of stats) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '10px monospace';
      ctx.fillText(stat, SIZES.padding, y + 4);
      y += 18;
    }

    return y + 8;
  }

  // ========== Interaction ==========

  handleScroll(deltaY: number, _contentHeight?: number): boolean {
    const maxScroll = Math.max(0, this.contentHeight - this.visibleHeight);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + deltaY));
    return true;
  }

  handleClick(x: number, y: number): boolean {
    // Click regions are already in canvas coordinates (adjusted for scroll during render)
    // so we compare the click position directly without adjustment
    for (const region of this.clickRegions) {
      if (
        x >= region.x &&
        x <= region.x + region.width &&
        y >= region.y &&
        y <= region.y + region.height
      ) {
        return this.handleClickAction(region, x);
      }
    }

    return false;
  }

  private handleClickAction(region: ClickRegion, clickX: number): boolean {
    switch (region.action) {
      case 'select_section':
        this.activeSection = region.data as DevSection;
        this.scrollOffset = 0;
        return true;

      case 'toggle_paradigm': {
        const parts = region.data!.split('_');
        const type = parts[0];
        const paradigmId = parts.slice(1).join('_');
        const state = this.paradigmStates.get(paradigmId);
        if (state) {
          if (type === 'enabled') {
            state.enabled = !state.enabled;
            if (!state.enabled) state.active = false;
            this.log(`${state.enabled ? 'Enabled' : 'Disabled'} ${paradigmId}`);
          } else if (type === 'active' && state.enabled) {
            state.active = !state.active;
            this.log(`${state.active ? 'Activated' : 'Deactivated'} ${paradigmId}`);
          }
          // Apply changes to world immediately
          this.applyToWorld();
        }
        return true;
      }

      case 'adjust_slider': {
        const sliderId = region.data!;
        const progress = Math.max(0, Math.min(1, (clickX - region.x) / region.width));

        if (sliderId.startsWith('mana_')) {
          const paradigmId = sliderId.replace('mana_', '');
          const paradigm = PARADIGMS.find(p => p.id === paradigmId);
          const state = this.paradigmStates.get(paradigmId);
          if (paradigm && state) {
            state.mana = Math.floor(progress * paradigm.maxMana);
            this.log(`Set ${paradigmId} mana to ${state.mana}`);
          }
        } else {
          const resource = DIVINE_RESOURCES.find(r => r.id === sliderId);
          if (resource) {
            const value = Math.floor(resource.min + progress * (resource.max - resource.min));
            this.divineResources.set(sliderId, value);
            this.log(`Set ${resource.name} to ${value}`);
          }
        }
        return true;
      }

      case 'execute_action':
        this.executeAction(region.data!);
        return true;

      case 'grant_xp': {
        const treeId = region.data!;
        const current = this.skillXp.get(treeId) ?? 0;
        this.skillXp.set(treeId, current + 100);
        this.log(`Granted 100 XP to ${treeId}`);
        return true;
      }
    }
    return false;
  }

  private executeAction(actionId: string): void {
    // Handle building spawning
    if (actionId.startsWith('spawn_building_')) {
      const buildingType = actionId.replace('spawn_building_', '') as BuildingType;
      this.spawnBuilding(buildingType);
      return;
    }

    // Handle agent XP granting
    if (actionId.startsWith('grant_agent_xp_')) {
      const agentId = actionId.replace('grant_agent_xp_', '');
      this.grantAgentXP(agentId, 100);
      return;
    }

    // Handle agent spawning
    if (actionId.startsWith('spawn_')) {
      this.handleSpawnAction(actionId);
      return;
    }

    // Handle world control actions
    if (actionId.startsWith('fast_forward_') || actionId === 'clear_dead_bodies' ||
        actionId === 'heal_all_agents' || actionId === 'feed_all_agents') {
      this.handleWorldAction(actionId);
      return;
    }

    // Handle other actions
    switch (actionId) {
      case 'unlock_all_spells':
        this.log('Unlocked all spells');
        break;
      case 'max_mana':
        for (const paradigm of PARADIGMS) {
          const state = this.paradigmStates.get(paradigm.id);
          if (state) state.mana = paradigm.maxMana;
        }
        this.log('Restored all mana to maximum');
        break;
      case 'reset_cooldowns':
        this.log('Reset all spell cooldowns');
        break;
      case 'grant_belief':
        const belief = (this.divineResources.get('belief') ?? 0) + 1000;
        this.divineResources.set('belief', belief);
        this.log('Added 1000 belief');
        break;
      case 'max_faith':
        this.log('Set all believer faith to 100%');
        break;
      case 'spawn_angel':
        const angels = (this.divineResources.get('angels') ?? 0) + 1;
        this.divineResources.set('angels', angels);
        this.log('Spawned new angel');
        break;
      case 'answer_prayers':
        this.log('Answered all pending prayers');
        break;
      case 'grant_xp_all':
        for (const tree of SKILL_TREES) {
          const current = this.skillXp.get(tree.id) ?? 0;
          this.skillXp.set(tree.id, current + 500);
        }
        this.log('Granted 500 XP to all skill trees');
        break;
      case 'unlock_all_nodes':
        this.log('Unlocked all skill tree nodes');
        break;
      case 'trigger_eclipse':
        this.log('Triggered eclipse event');
        break;
      case 'trigger_miracle':
        this.log('Triggered random miracle');
        break;
      case 'reset_all':
        for (const p of PARADIGMS) {
          this.paradigmStates.set(p.id, { enabled: p.enabled, active: p.active, mana: p.mana });
        }
        for (const r of DIVINE_RESOURCES) {
          this.divineResources.set(r.id, r.value);
        }
        for (const s of SKILL_TREES) {
          this.skillXp.set(s.id, s.xp);
        }
        this.log('RESET ALL state to defaults');
        this.applyToWorld(); // Apply reset to world
        break;
    }
  }

  private spawnBuilding(buildingType: BuildingType): void {
    if (!this.world) {
      this.log('ERROR: No world available');
      return;
    }

    try {
      // Create building entity at position (50, 50)
      const entity = new EntityImpl(createEntityId(), this.world.tick);
      entity.addComponent(createPositionComponent(50, 50, 0));
      entity.addComponent(createPhysicsComponent(true, 1, 1));
      entity.addComponent(createRenderableComponent(buildingType, 'building'));
      entity.addComponent(createTagsComponent('building', buildingType));
      entity.addComponent(createBuildingComponent(buildingType));

      // Add to world using private method
      (this.world as any)._addEntity(entity);

      this.log(`Spawned ${buildingType} at (50, 50)`);
    } catch (error) {
      this.log(`ERROR spawning ${buildingType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private grantAgentXP(agentId: string, amount: number): void {
    if (!this.world) {
      this.log('ERROR: No world available');
      return;
    }

    try {
      const agent = this.world.getEntity(agentId);
      if (!agent) {
        this.log(`ERROR: Agent ${agentId} not found`);
        return;
      }

      const identity = agent.getComponent<IdentityComponent>(CT.Identity);
      const skills = agent.getComponent<SkillsComponent>(CT.Skills);

      if (!skills) {
        this.log(`ERROR: Agent has no skills component`);
        return;
      }

      // Grant XP to a random skill
      const skillNames = Object.keys(skills.levels);
      if (skillNames.length === 0) {
        this.log(`ERROR: Agent has no skills`);
        return;
      }

      const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)]!;
      const currentLevel = (skills.levels as any)[randomSkill] || 0;
      const newLevel = currentLevel + (amount / 100); // 100 XP = 1 level

      // Update the skill component
      (this.world as any).updateComponent(agentId, CT.Skills, (current: SkillsComponent) => ({
        ...current,
        levels: {
          ...current.levels,
          [randomSkill]: newLevel,
        },
      }));

      this.log(`Granted ${amount} XP to ${identity?.name || agentId} (${randomSkill}: ${currentLevel.toFixed(1)} → ${newLevel.toFixed(1)})`);
    } catch (error) {
      this.log(`ERROR granting XP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleSpawnAction(actionId: string): void {
    if (!this.world) {
      this.log('ERROR: No world available');
      return;
    }

    if (!this.agentSpawnHandler) {
      this.log('ERROR: Agent spawn handler not set. Call setAgentSpawnHandler() from main.ts');
      return;
    }

    try {
      switch (actionId) {
        case 'spawn_wandering_agent': {
          const agentId = this.agentSpawnHandler.spawnWanderingAgent(50, 50);
          this.log(`Spawned wandering agent: ${agentId}`);
          break;
        }

        case 'spawn_llm_agent': {
          const agentId = this.agentSpawnHandler.spawnLLMAgent(50, 50);
          this.log(`Spawned LLM agent: ${agentId}`);
          break;
        }

        case 'spawn_village_5': {
          const agentIds = this.agentSpawnHandler.spawnVillage(5, 50, 50);
          this.log(`Spawned village with 5 agents: ${agentIds.length} created`);
          break;
        }

        case 'spawn_village_10': {
          const agentIds = this.agentSpawnHandler.spawnVillage(10, 50, 50);
          this.log(`Spawned village with 10 agents: ${agentIds.length} created`);
          break;
        }

        case 'spawn_town_25': {
          const agentIds = this.agentSpawnHandler.spawnVillage(25, 50, 50);
          this.log(`Spawned town with 25 agents: ${agentIds.length} created`);
          break;
        }

        case 'spawn_city_50': {
          const agentIds = this.agentSpawnHandler.spawnVillage(50, 50, 50);
          this.log(`Spawned city with 50 agents: ${agentIds.length} created`);
          break;
        }

        default:
          this.log(`Unknown spawn action: ${actionId}`);
      }
    } catch (error) {
      this.log(`ERROR spawning agents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private handleWorldAction(actionId: string): void {
    if (!this.world) {
      this.log('ERROR: No world available');
      return;
    }

    try {
      switch (actionId) {
        case 'fast_forward_100':
          // Advance the world 100 ticks
          for (let i = 0; i < 100; i++) {
            (this.world as any).advanceTick();
          }
          this.log('Advanced world by 100 ticks');
          break;

        case 'fast_forward_1000':
          // Advance the world 1000 ticks
          for (let i = 0; i < 1000; i++) {
            (this.world as any).advanceTick();
          }
          this.log('Advanced world by 1000 ticks');
          break;

        case 'clear_dead_bodies':
          // Remove all entities with 'dead' tag
          const deadEntities = this.world.query().with(CT.Tags).executeEntities()
            .filter(e => {
              const tags = e.getComponent<TagsComponent>(CT.Tags);
              return tags?.tags.includes('dead');
            });
          for (const entity of deadEntities) {
            (this.world as any).destroyEntity(entity.id, 'dev_tools_cleanup');
          }
          this.log(`Removed ${deadEntities.length} dead bodies`);
          break;

        case 'heal_all_agents':
          // Set all agents' needs to satisfied
          const agents = this.world.query().with(CT.Agent).with(CT.Needs).executeEntities();
          for (const agent of agents) {
            (this.world as any).updateComponent(agent.id, CT.Needs, (needs: any) => ({
              ...needs,
              hunger: 0,
              thirst: 0,
              energy: 0,
              social: 0,
            }));
          }
          this.log(`Healed ${agents.length} agents`);
          break;

        case 'feed_all_agents':
          // Set hunger and thirst to 0
          const hungryAgents = this.world.query().with(CT.Agent).with(CT.Needs).executeEntities();
          for (const agent of hungryAgents) {
            (this.world as any).updateComponent(agent.id, CT.Needs, (needs: any) => ({
              ...needs,
              hunger: 0,
              thirst: 0,
            }));
          }
          this.log(`Fed ${hungryAgents.length} agents`);
          break;

        default:
          this.log(`Unknown world action: ${actionId}`);
      }
    } catch (error) {
      this.log(`ERROR in world action: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
