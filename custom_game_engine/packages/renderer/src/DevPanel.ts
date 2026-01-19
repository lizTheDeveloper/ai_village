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

import type { World } from '@ai-village/core';
import {
  type ResearchStateComponent,
  type SkillsComponent,
  type IdentityComponent,
  type TagsComponent,
  type NeedsComponent,
  type ManaPoolsComponent,
  type SpiritualComponent,
  CT,
  getTileBasedBlueprintRegistry,
  parseLayout,
  type WallMaterial,
  type DoorMaterial,
  type WindowMaterial,
  DeityComponent,
} from '@ai-village/core';
import type { MagicParadigm } from '@ai-village/magic';
import {
  CORE_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
  HYBRID_PARADIGM_REGISTRY,
  MagicSystemStateManager,
} from '@ai-village/magic';
import {
  POWER_TIER_THRESHOLDS,
  BELIEF_GENERATION_RATES,
} from '@ai-village/divinity';
import { DevRenderer, ComponentRegistry, IdentitySchema } from '@ai-village/introspection';
import type { IWindowPanel } from './types/WindowTypes.js';

// ============================================================================
// Types
// ============================================================================

type DevSection = 'magic' | 'divinity' | 'skills' | 'events' | 'state' | 'research' | 'buildings' | 'agents' | 'world' | 'introspection';

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

/** LLM Scheduler interface for DevPanel integration */
export interface LLMScheduler {
  selectLayer(agent: any, world: any): { layer: string; reason: string; urgency: number };
  isLayerReady(agentId: string, layer: string): boolean;
  getTimeUntilReady(agentId: string, layer: string): number;
  getLayerConfig(layer: string): { cooldownMs: number; priority: number; enabled: boolean };
}

interface ClickRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'select_section' | 'toggle_paradigm' | 'adjust_slider' | 'execute_action' | 'unlock_spell' | 'grant_xp' | 'adjust_spawn_x' | 'adjust_spawn_y' | 'select_introspection_component';
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
  const tierOrder = ['dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'] as const;
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
  private scheduler: LLMScheduler | null = null;

  // Spawn location state (deprecated - use click-to-place)
  private spawnX = 50;
  private spawnY = 50;

  // Building placement state
  private clickToPlaceMode = false;
  private selectedBlueprintId: string | null = null;
  private placeAsBlueprint = true; // true = blueprint for agents to build, false = instant build

  // Selected agent for skill XP operations
  private selectedAgentId: string | null = null;

  // Introspection renderer (Phase 2A + Phase 4)
  private devRenderer = new DevRenderer();
  private introspectionTestEntity: any = null;
  private selectedIntrospectionComponent: string = 'identity'; // Which schema to show
  private introspectionTestEntities: Map<string, any> = new Map(); // Test entity for each schema

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

  /**
   * Set the LLM scheduler (called from main.ts)
   */
  setScheduler(scheduler: LLMScheduler | null): void {
    this.scheduler = scheduler;
  }

  /**
   * Set the selected agent ID for skill XP operations (called from main.ts)
   */
  setSelectedAgentId(agentId: string | null): void {
    this.selectedAgentId = agentId;
  }

  /**
   * Get the currently selected agent ID
   */
  getSelectedAgentId(): string | null {
    return this.selectedAgentId;
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
      case 'introspection':
        y = this.renderIntrospectionSection(ctx, width, y);
        break;
    }

    ctx.restore();

    this.contentHeight = y + this.scrollOffset - contentStartY;
    this.visibleHeight = height - contentStartY;
  }

  renderHeader(ctx: CanvasRenderingContext2D, width: number, y: number): number {
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
      { id: 'introspection', label: 'Intro' },
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
    if (!this.world) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No world available', SIZES.padding, y + 8);
      return y + 30;
    }

    // Query for deity entities
    const deities = this.world.query().with(CT.Deity).executeEntities();

    if (deities.length === 0) {
      y = this.renderSectionHeader(ctx, width, y, 'DIVINITY');
      ctx.fillStyle = COLORS.warning;
      ctx.font = '10px monospace';
      ctx.fillText('No deities exist yet', SIZES.padding, y + 8);
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '9px monospace';
      ctx.fillText('Deities emerge from agent belief', SIZES.padding, y + 24);
      y += 44;
    } else {
      // Display each deity
      for (const deity of deities) {
        const deityComp = deity.getComponent(CT.Deity) as DeityComponent;
        if (!deityComp) continue;

        y = this.renderSectionHeader(ctx, width, y, deityComp.identity.primaryName.toUpperCase());

        // Belief stats
        const beliefState = deityComp.belief;

        // Current belief
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Current Belief:', SIZES.padding, y + 4);
        ctx.fillStyle = COLORS.divinity;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(Math.floor(beliefState.currentBelief).toString(), SIZES.padding + 110, y + 4);
        y += 18;

        // Belief per tick
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Belief/Tick:', SIZES.padding, y + 4);
        ctx.fillStyle = COLORS.success;
        ctx.font = '10px monospace';
        ctx.fillText(beliefState.beliefPerTick.toFixed(3), SIZES.padding + 110, y + 4);
        y += 18;

        // Believers
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Believers:', SIZES.padding, y + 4);
        ctx.fillStyle = COLORS.text;
        ctx.font = '10px monospace';
        ctx.fillText(deityComp.believers.size.toString(), SIZES.padding + 110, y + 4);
        y += 18;

        // Total earned
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Total Earned:', SIZES.padding, y + 4);
        ctx.fillStyle = COLORS.text;
        ctx.font = '10px monospace';
        ctx.fillText(Math.floor(beliefState.totalBeliefEarned).toString(), SIZES.padding + 110, y + 4);
        y += 18;

        // Total spent
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Total Spent:', SIZES.padding, y + 4);
        ctx.fillStyle = COLORS.text;
        ctx.font = '10px monospace';
        ctx.fillText(Math.floor(beliefState.totalBeliefSpent).toString(), SIZES.padding + 110, y + 4);
        y += 18;

        // Unanswered prayers
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Unanswered Prayers:', SIZES.padding, y + 4);
        ctx.fillStyle = deityComp.prayerQueue.length > 0 ? COLORS.warning : COLORS.textDim;
        ctx.font = '10px monospace';
        ctx.fillText(deityComp.prayerQueue.length.toString(), SIZES.padding + 140, y + 4);
        y += 22;

        // Controller type
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px monospace';
        ctx.fillText('Controller:', SIZES.padding, y + 4);
        const controllerColor = deityComp.controller === 'player' ? COLORS.success :
                               deityComp.controller === 'ai' ? COLORS.magic : COLORS.textDim;
        ctx.fillStyle = controllerColor;
        ctx.font = '10px monospace';
        ctx.fillText(deityComp.controller, SIZES.padding + 110, y + 4);
        y += 24;
      }
    }

    // Actions
    y = this.renderSectionHeader(ctx, width, y, 'QUICK ACTIONS');
    y = this.renderActions(ctx, width, y, 'divinity');

    return y + SIZES.padding;
  }

  private renderSkillsSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    if (!this.world) {
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('No world available', SIZES.padding, y + 8);
      return y + 30;
    }

    // Show selected agent
    y = this.renderSectionHeader(ctx, width, y, 'SELECTED AGENT');

    if (!this.selectedAgentId) {
      ctx.fillStyle = COLORS.warning;
      ctx.font = '10px monospace';
      ctx.fillText('No agent selected', SIZES.padding, y + 8);
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '9px monospace';
      ctx.fillText('Click an agent in the game to select', SIZES.padding, y + 24);
      y += 40;
    } else {
      const agent = this.world.getEntity(this.selectedAgentId);
      if (!agent) {
        ctx.fillStyle = COLORS.warning;
        ctx.font = '10px monospace';
        ctx.fillText('Selected agent not found', SIZES.padding, y + 8);
        y += 24;
      } else {
        const identity = agent.getComponent<IdentityComponent>(CT.Identity);
        const skills = agent.getComponent<SkillsComponent>(CT.Skills);

        ctx.fillStyle = COLORS.success;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(identity?.name || 'Unnamed Agent', SIZES.padding, y + 8);

        if (skills) {
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '9px monospace';
          const skillEntries = Object.entries(skills.levels);
          const totalLevel = skillEntries.reduce((sum, [, level]) => sum + (level as number), 0);
          ctx.fillText(`Total Level: ${Math.floor(totalLevel)}`, SIZES.padding, y + 24);
          y += 36;

          // Show current skills
          y = this.renderSectionHeader(ctx, width, y, 'CURRENT SKILLS');

          for (const [skillName, level] of skillEntries.slice(0, 8)) {
            ctx.fillStyle = COLORS.text;
            ctx.font = '9px monospace';
            ctx.fillText(skillName, SIZES.padding, y + 4);

            ctx.fillStyle = COLORS.magic;
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`Lvl ${Math.floor(level as number)}`, width - 60, y + 4);

            y += 16;
          }

          if (skillEntries.length > 8) {
            ctx.fillStyle = COLORS.textDim;
            ctx.font = '9px monospace';
            ctx.fillText(`... and ${skillEntries.length - 8} more`, SIZES.padding, y + 4);
            y += 16;
          }
        } else {
          ctx.fillStyle = COLORS.textDim;
          ctx.font = '9px monospace';
          ctx.fillText('Agent has no skills', SIZES.padding, y + 24);
          y += 36;
        }
      }
    }

    // Grant XP buttons
    y = this.renderSectionHeader(ctx, width, y, 'GRANT XP TO SELECTED AGENT');

    const xpButtons = [
      { label: '+100 XP (Random Skill)', amount: 100 },
      { label: '+500 XP (Random Skill)', amount: 500 },
      { label: '+1000 XP (Random Skill)', amount: 1000 },
    ];

    for (const btn of xpButtons) {
      const btnWidth = width - SIZES.padding * 2;
      const isDisabled = !this.selectedAgentId;

      ctx.fillStyle = isDisabled ? COLORS.inputBg : COLORS.button;
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
      ctx.fill();

      ctx.fillStyle = isDisabled ? COLORS.textDim : COLORS.text;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(btn.label, SIZES.padding + 8, y + 12);

      if (!isDisabled) {
        this.clickRegions.push({
          x: SIZES.padding,
          y: y + 4,
          width: btnWidth,
          height: SIZES.buttonHeight,
          action: 'execute_action',
          data: `grant_selected_agent_xp_${btn.amount}`,
        });
      }

      y += SIZES.buttonHeight + 4;
    }

    // Actions
    y = this.renderSectionHeader(ctx, width, y, 'QUICK ACTIONS (ALL AGENTS)');
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

    // Spawn location controls
    y = this.renderSpawnLocationControls(ctx, width, y);

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

    // LLM Scheduler Info (if available and agent selected)
    if (this.scheduler && this.selectedAgentId && this.world) {
      const selectedAgent = this.world.getEntity(this.selectedAgentId);
      if (selectedAgent) {
        y = this.renderSchedulerInfo(ctx, width, y, selectedAgent);
      }
    }

    return y + SIZES.padding;
  }

  /**
   * Render LLM scheduler information for the selected agent
   */
  private renderSchedulerInfo(ctx: CanvasRenderingContext2D, width: number, y: number, agent: any): number {
    if (!this.scheduler || !this.world) return y;

    y = this.renderSectionHeader(ctx, width, y, 'LLM SCHEDULER');

    // Get agent name
    const identity = agent.getComponent(CT.Identity) as IdentityComponent | undefined;
    const name = identity?.name || 'Unnamed';

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText(`Selected: ${name}`, SIZES.padding, y + 6);
    y += 18;

    // Get layer selection
    const layerSelection = this.scheduler.selectLayer(agent, this.world);

    // Current layer (what would be selected now)
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Recommended Layer:', SIZES.padding, y + 6);
    y += 14;

    ctx.fillStyle = this.getLayerColor(layerSelection.layer);
    ctx.font = '11px monospace';
    ctx.fillText(`  ${layerSelection.layer.toUpperCase()}`, SIZES.padding, y + 6);
    y += 14;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '8px monospace';
    ctx.fillText(`  ${layerSelection.reason}`, SIZES.padding, y + 6);
    y += 12;

    ctx.fillText(`  Urgency: ${layerSelection.urgency}/10`, SIZES.padding, y + 6);
    y += 18;

    // Layer cooldown status
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Layer Cooldowns:', SIZES.padding, y + 6);
    y += 14;

    const layers: Array<'autonomic' | 'talker' | 'executor'> = ['autonomic', 'talker', 'executor'];
    for (const layer of layers) {
      const isReady = this.scheduler.isLayerReady(agent.id, layer);
      const timeUntilReady = this.scheduler.getTimeUntilReady(agent.id, layer);
      const config = this.scheduler.getLayerConfig(layer);

      ctx.fillStyle = this.getLayerColor(layer);
      ctx.font = '9px monospace';
      ctx.fillText(`  ${layer}:`, SIZES.padding, y + 6);

      if (isReady) {
        ctx.fillStyle = COLORS.success;
        ctx.fillText('READY', SIZES.padding + 90, y + 6);
      } else {
        ctx.fillStyle = COLORS.warning;
        const secondsLeft = Math.ceil(timeUntilReady / 1000);
        ctx.fillText(`${secondsLeft}s`, SIZES.padding + 90, y + 6);

        // Draw cooldown bar
        const barWidth = 60;
        const barX = SIZES.padding + 130;
        const barY = y + 2;
        const barHeight = 8;

        // Background
        ctx.fillStyle = COLORS.sliderBg;
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress
        const progress = 1 - (timeUntilReady / config.cooldownMs);
        ctx.fillStyle = this.getLayerColor(layer);
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      }

      ctx.fillStyle = COLORS.textDim;
      ctx.font = '7px monospace';
      ctx.fillText(`(${config.cooldownMs}ms)`, width - 70, y + 6);

      y += 14;
    }

    return y + SIZES.padding;
  }

  /**
   * Get color for layer display
   */
  private getLayerColor(layer: string): string {
    switch (layer) {
      case 'autonomic':
        return '#FF6B6B'; // Red - urgent/reflexive
      case 'talker':
        return '#4ECDC4'; // Cyan - social
      case 'executor':
        return '#95E1D3'; // Green - planning
      default:
        return COLORS.text;
    }
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

    y = this.renderSectionHeader(ctx, width, y, 'PLACE BUILDING');

    // Mode toggle: Blueprint vs Fully Built
    const btnWidth = width - SIZES.padding * 2;
    const toggleWidth = btnWidth / 2 - 2;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText('Placement Mode:', SIZES.padding, y + 4);
    y += 18;

    // Blueprint button
    ctx.fillStyle = this.placeAsBlueprint ? COLORS.success : COLORS.button;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding, y + 4, toggleWidth, SIZES.buttonHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 9px monospace';
    ctx.fillText('Blueprint', SIZES.padding + 8, y + 12);

    this.clickRegions.push({
      x: SIZES.padding,
      y: y + 4,
      width: toggleWidth,
      height: SIZES.buttonHeight,
      action: 'execute_action',
      data: 'toggle_blueprint_mode_true',
    });

    // Fully Built button
    ctx.fillStyle = !this.placeAsBlueprint ? COLORS.warning : COLORS.button;
    ctx.beginPath();
    ctx.roundRect(SIZES.padding + toggleWidth + 4, y + 4, toggleWidth, SIZES.buttonHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 9px monospace';
    ctx.fillText('Instant', SIZES.padding + toggleWidth + 12, y + 12);

    this.clickRegions.push({
      x: SIZES.padding + toggleWidth + 4,
      y: y + 4,
      width: toggleWidth,
      height: SIZES.buttonHeight,
      action: 'execute_action',
      data: 'toggle_blueprint_mode_false',
    });

    y += SIZES.buttonHeight + 12;

    // Click-to-place status
    if (this.clickToPlaceMode && this.selectedBlueprintId) {
      ctx.fillStyle = COLORS.warning;
      ctx.fillRect(SIZES.padding, y, btnWidth, 24);
      ctx.fillStyle = COLORS.background;
      ctx.font = 'bold 10px monospace';
      ctx.fillText('CLICK ON MAP TO PLACE', SIZES.padding + 8, y + 10);
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '8px monospace';
      ctx.fillText(`${this.selectedBlueprintId}`, SIZES.padding + 8, y + 20);
      y += 28;

      // Cancel button
      ctx.fillStyle = COLORS.button;
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cancel Placement', SIZES.padding + 8, y + 12);

      this.clickRegions.push({
        x: SIZES.padding,
        y: y + 4,
        width: btnWidth,
        height: SIZES.buttonHeight,
        action: 'execute_action',
        data: 'cancel_blueprint_placement',
      });

      y += SIZES.buttonHeight + 8;
    }

    // Available tile blueprints
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText('Available Blueprints:', SIZES.padding, y + 4);
    y += 18;

    const registry = getTileBasedBlueprintRegistry();
    const blueprints = [
      'tile_small_house',
      'tile_medium_house',
      'tile_workshop',
      'tile_storage_shed',
      'tile_barn',
      'tile_stone_house',
      'tile_guard_tower',
      'tile_longhouse',
    ];

    for (const blueprintId of blueprints) {
      const blueprint = registry.get(blueprintId);
      if (!blueprint) continue;

      const isSelected = this.selectedBlueprintId === blueprintId;

      ctx.fillStyle = isSelected ? COLORS.magic : COLORS.button;
      ctx.beginPath();
      ctx.roundRect(SIZES.padding, y + 4, btnWidth, SIZES.buttonHeight, 4);
      ctx.fill();

      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(blueprint.name, SIZES.padding + 8, y + 12);

      this.clickRegions.push({
        x: SIZES.padding,
        y: y + 4,
        width: btnWidth,
        height: SIZES.buttonHeight,
        action: 'execute_action',
        data: `select_blueprint_${blueprintId}`,
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

  private renderSpawnLocationControls(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText('Spawn Location:', SIZES.padding, y + 4);
    y += 18;

    // X coordinate slider
    const sliderWidth = width - SIZES.padding * 2 - 60;
    const maxCoord = 200;
    const progressX = this.spawnX / maxCoord;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText('X:', SIZES.padding, y + 4);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${this.spawnX}`, SIZES.padding + sliderWidth + 10, y + 4);

    ctx.fillStyle = COLORS.sliderBg;
    ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth, 12);

    ctx.fillStyle = COLORS.slider;
    ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth * progressX, 12);

    const handleX = SIZES.padding + 15 + sliderWidth * progressX;
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(handleX, y + 22, 8, 0, Math.PI * 2);
    ctx.fill();

    this.clickRegions.push({
      x: SIZES.padding + 15,
      y: y + 12,
      width: sliderWidth,
      height: 20,
      action: 'adjust_spawn_x',
      data: 'spawnX',
    });

    y += 36;

    // Y coordinate slider
    const progressY = this.spawnY / maxCoord;

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '9px monospace';
    ctx.fillText('Y:', SIZES.padding, y + 4);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${this.spawnY}`, SIZES.padding + sliderWidth + 10, y + 4);

    ctx.fillStyle = COLORS.sliderBg;
    ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth, 12);

    ctx.fillStyle = COLORS.slider;
    ctx.fillRect(SIZES.padding + 15, y + 16, sliderWidth * progressY, 12);

    const handleY = SIZES.padding + 15 + sliderWidth * progressY;
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(handleY, y + 22, 8, 0, Math.PI * 2);
    ctx.fill();

    this.clickRegions.push({
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

            // Apply mana to world entities with ManaPoolsComponent
            if (this.world) {
              try {
                const manaUsers = this.world.query().with(CT.ManaPoolsComponent).executeEntities();
                for (const entity of manaUsers) {
                  const manaPools = entity.getComponent<ManaPoolsComponent>(CT.ManaPoolsComponent);
                  if (!manaPools) continue;

                  // Update matching mana pool if it exists
                  const pool = manaPools.manaPools.find(p => p.source === paradigmId);
                  if (pool) {
                    pool.current = state.mana;
                    this.world.updateComponent(entity.id, CT.ManaPoolsComponent, () => manaPools);
                  }
                }
                this.log(`Applied ${paradigmId} mana to ${manaUsers.length} entities`);
              } catch (error) {
                this.log(`ERROR applying mana: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          }
        } else {
          const resource = DIVINE_RESOURCES.find(r => r.id === sliderId);
          if (resource) {
            const value = Math.floor(resource.min + progress * (resource.max - resource.min));
            this.divineResources.set(sliderId, value);
            this.log(`Set ${resource.name} to ${value}`);
            // Apply divine resource changes to world
            this.applyDivineResourceToWorld(sliderId, value);
          }
        }
        return true;
      }

      case 'adjust_spawn_x': {
        const progress = Math.max(0, Math.min(1, (clickX - region.x) / region.width));
        this.spawnX = Math.floor(progress * 200);
        return true;
      }

      case 'adjust_spawn_y': {
        const progress = Math.max(0, Math.min(1, (clickX - region.x) / region.width));
        this.spawnY = Math.floor(progress * 200);
        return true;
      }

      case 'execute_action':
        this.executeAction(region.data!);
        return true;

      case 'select_introspection_component':
        this.selectedIntrospectionComponent = region.data!;
        this.log(`Selected schema: ${region.data}`);
        return true;
    }
    return false;
  }

  /**
   * Apply divine resource changes to world entities (gods, believers, etc.)
   */
  private applyDivineResourceToWorld(resourceId: string, value: number): void {
    if (!this.world) return;

    try {
      // Apply belief to all deities in the world
      if (resourceId === 'belief') {
        const deities = this.world.query().with(CT.Deity).executeEntities();
        if (deities.length === 0) {
          this.log(`No deities found to apply belief to`);
          return;
        }

        for (const deity of deities) {
          const deityComp = deity.getComponent<DeityComponent>(CT.Deity);
          if (deityComp) {
            // Set belief directly (this is a dev tool, so we override)
            deityComp.belief.currentBelief = value;
            this.world.updateComponent(deity.id, CT.Deity, () => deityComp);
          }
        }
        this.log(`Applied ${value} belief to ${deities.length} deities`);
        return;
      }

      // Other divine resources can be logged for now
      this.log(`Divine resource ${resourceId} set to ${value} (no world entity binding)`);
    } catch (error) {
      this.log(`ERROR applying divine resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Grant XP to all agents in the world
   */
  private grantXPToAllAgents(amount: number): void {
    if (!this.world) {
      this.log('ERROR: No world available');
      return;
    }

    try {
      const agents = this.world.query().with(CT.Agent).with(CT.Skills).executeEntities();
      let grantedCount = 0;

      for (const agent of agents) {
        const skills = agent.getComponent<SkillsComponent>(CT.Skills);
        if (!skills) continue;

        const skillNames = Object.keys(skills.levels);
        if (skillNames.length === 0) continue;

        // Grant XP to a random skill
        const randomSkill = skillNames[Math.floor(Math.random() * skillNames.length)]!;
        const currentLevel = skills.levels[randomSkill] || 0;
        const newLevel = currentLevel + (amount / 100); // 100 XP = 1 level

        // Update the skill component
        this.world.updateComponent(agent.id, CT.Skills, (current: SkillsComponent) => ({
          ...current,
          levels: {
            ...current.levels,
            [randomSkill]: newLevel,
          },
        }));

        grantedCount++;
      }

      this.log(`Granted ${amount} XP to ${grantedCount} agents`);
    } catch (error) {
      this.log(`ERROR granting XP to all: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private executeAction(actionId: string): void {
    // Handle blueprint mode toggle
    if (actionId === 'toggle_blueprint_mode_true') {
      this.placeAsBlueprint = true;
      this.log('Mode: Place Blueprint (agents will build)');
      return;
    }

    if (actionId === 'toggle_blueprint_mode_false') {
      this.placeAsBlueprint = false;
      this.log('Mode: Place Fully Built (instant)');
      return;
    }

    // Handle blueprint selection
    if (actionId.startsWith('select_blueprint_')) {
      const blueprintId = actionId.replace('select_blueprint_', '');
      this.selectedBlueprintId = blueprintId;
      this.clickToPlaceMode = true;
      this.log(`Selected: ${blueprintId} - Click on map to place`);
      return;
    }

    // Handle cancel placement
    if (actionId === 'cancel_blueprint_placement') {
      this.clickToPlaceMode = false;
      this.selectedBlueprintId = null;
      this.log('Cancelled blueprint placement');
      return;
    }

    // Handle agent XP granting (per-agent button in Agents tab)
    if (actionId.startsWith('grant_agent_xp_')) {
      const agentId = actionId.replace('grant_agent_xp_', '');
      this.grantAgentXP(agentId, 100);
      return;
    }

    // Handle selected agent XP granting (Skills tab)
    if (actionId.startsWith('grant_selected_agent_xp_')) {
      const amount = parseInt(actionId.replace('grant_selected_agent_xp_', ''), 10);
      if (this.selectedAgentId) {
        this.grantAgentXP(this.selectedAgentId, amount);
      } else {
        this.log('ERROR: No agent selected');
      }
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
        this.applyDivineResourceToWorld('belief', belief);
        this.log('Added 1000 belief');
        break;
      case 'max_faith':
        if (this.world) {
          try {
            const believers = this.world.query().with(CT.Spiritual).executeEntities();
            let updatedCount = 0;

            for (const believer of believers) {
              const spiritual = believer.getComponent<SpiritualComponent>(CT.Spiritual);
              if (spiritual) {
                // Set faith to maximum (1.0)
                spiritual.faith = 1.0;
                spiritual.peakFaith = Math.max(spiritual.peakFaith, 1.0);
                // Clear doubts and crisis
                spiritual.doubts = spiritual.doubts.map(d => ({ ...d, resolved: true }));
                spiritual.crisisOfFaith = false;
                this.world.updateComponent(believer.id, CT.Spiritual, () => spiritual);
                updatedCount++;
              }
            }

            this.log(`Set faith to 100% for ${updatedCount} believers`);
          } catch (error) {
            this.log(`ERROR setting max faith: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          this.log('ERROR: No world available');
        }
        break;
      case 'spawn_angel':
        if (this.world) {
          try {
            // Find first deity to spawn angel for
            const deities = this.world.query().with(CT.Deity).executeEntities();
            if (deities.length === 0) {
              this.log('ERROR: No deities found to spawn angel for');
              break;
            }

            const deity = deities[0];
            const deityComp = deity!.getComponent<DeityComponent>(CT.Deity);
            if (!deityComp) {
              this.log('ERROR: Deity missing DeityComponent');
              break;
            }

            // Try to get AngelSystem from gameLoop
            const angelSystem = this.world.gameLoop?.systemRegistry.getSystem('AngelSystem');
            if (!angelSystem || !('createAngel' in angelSystem)) {
              this.log('ERROR: AngelSystem not found or missing createAngel method');
              this.log('Angel spawning requires AngelSystem to be registered');
              break;
            }

            // Create angel (messenger rank, autonomous AI)
            const angel = (angelSystem as any).createAngel(
              deity.id,
              this.world,
              'messenger',
              'deliver_messages',
              true
            );

            if (angel) {
              const angels = (this.divineResources.get('angels') ?? 0) + 1;
              this.divineResources.set('angels', angels);
              this.log(`Spawned messenger angel for deity ${deityComp.identity.primaryName} (ID: ${angel.id})`);
            } else {
              this.log('ERROR: Angel creation failed (insufficient belief or angels disabled in universe)');
            }
          } catch (error) {
            this.log(`ERROR spawning angel: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          this.log('ERROR: No world available');
        }
        break;
      case 'answer_prayers':
        if (this.world) {
          try {
            // Find all deities with pending prayers
            const deities = this.world.query().with(CT.Deity).executeEntities();
            if (deities.length === 0) {
              this.log('No deities found');
              break;
            }

            let totalAnswered = 0;
            let totalCost = 0;

            for (const deity of deities) {
              const deityComp = deity.getComponent<DeityComponent>(CT.Deity);
              if (!deityComp) continue;

              // Answer all prayers in queue
              const prayersToAnswer = [...deityComp.prayerQueue];
              for (const prayer of prayersToAnswer) {
                const cost = 75; // Default prayer answering cost
                if (deityComp.answerPrayer(prayer.prayerId, cost)) {
                  totalAnswered++;
                  totalCost += cost;

                  // Update believer's spiritual component
                  const believerEntity = this.world.getEntity(prayer.agentId);
                  if (believerEntity) {
                    const spiritual = believerEntity.getComponent<SpiritualComponent>(CT.Spiritual);
                    if (spiritual) {
                      // Mark prayer as answered in believer's component
                      const updatedPrayers = spiritual.prayers.map(p =>
                        p.id === prayer.prayerId
                          ? { ...p, answered: true, responseType: 'vision' as const, responseTime: this.world!.tick }
                          : p
                      );
                      spiritual.prayers = updatedPrayers;
                      spiritual.answeredPrayers++;
                      spiritual.faith = Math.min(1, spiritual.faith + 0.1); // Boost faith
                      this.world.updateComponent(believerEntity.id, CT.Spiritual, () => spiritual);
                    }
                  }
                }
              }

              this.world.updateComponent(deity.id, CT.Deity, () => deityComp);
            }

            if (totalAnswered > 0) {
              this.log(`Answered ${totalAnswered} prayers (cost: ${totalCost} belief total)`);
            } else {
              this.log('No pending prayers to answer');
            }
          } catch (error) {
            this.log(`ERROR answering prayers: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          this.log('ERROR: No world available');
        }
        break;
      case 'grant_xp_all':
        this.grantXPToAllAgents(500);
        break;
      case 'unlock_all_nodes':
        // Grant massive XP to all agents to unlock all nodes
        this.grantXPToAllAgents(10000);
        this.log('Granted 10000 XP to all agents (unlock all nodes)');
        break;
      case 'trigger_eclipse':
        if (this.world) {
          // Emit a custom event for eclipse
          // Note: No eclipse event in GameEventMap, so we emit a generic divine power event
          this.world.eventBus.emit({
            type: 'divine_power:minor_miracle',
            source: 'DevPanel',
            data: { deityId: 'dev_tools', miracleType: 'eclipse', cost: 0 },
          });
          this.log('Triggered eclipse event');
        }
        break;
      case 'trigger_miracle':
        if (this.world) {
          const miracles = ['healing', 'abundance', 'revelation', 'protection', 'wrath'];
          const randomMiracle = miracles[Math.floor(Math.random() * miracles.length)]!;
          this.world.eventBus.emit({
            type: 'divine_power:major_miracle',
            source: 'DevPanel',
            data: { deityId: 'dev_tools', miracleType: randomMiracle, cost: 0 },
          });
          this.log(`Triggered ${randomMiracle} miracle`);
        }
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

  /**
   * Check if DevPanel is in click-to-place mode
   * Main renderer should intercept world clicks and call handleWorldClick
   */
  public isClickToPlaceActive(): boolean {
    return this.clickToPlaceMode && this.selectedBlueprintId !== null;
  }

  /**
   * Handle world click for blueprint placement
   * Called by main renderer when user clicks on the game world
   */
  public handleWorldClick(worldX: number, worldY: number): boolean {
    if (!this.clickToPlaceMode || !this.selectedBlueprintId || !this.world) {
      return false;
    }

    try {
      if (this.placeAsBlueprint) {
        this.placeBlueprintForConstruction(worldX, worldY);
      } else {
        this.placeFullyBuiltBuilding(worldX, worldY);
      }

      // Clear click-to-place mode after successful placement
      this.clickToPlaceMode = false;
      this.selectedBlueprintId = null;
      return true;
    } catch (error) {
      this.log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Place blueprint as a construction task for agents to build
   */
  private placeBlueprintForConstruction(worldX: number, worldY: number): void {
    if (!this.world || !this.selectedBlueprintId) return;

    // Get TileConstructionSystem from world
    const tileConstructionSystem = this.world.getSystem?.('tile_construction');
    if (!tileConstructionSystem) {
      throw new Error('TileConstructionSystem not found in world');
    }

    // Create construction task
    const task = tileConstructionSystem.createTask(
      this.world,
      this.selectedBlueprintId,
      Math.floor(worldX),
      Math.floor(worldY),
      0 // rotation
    );

    // Start the task
    tileConstructionSystem.startTask(this.world, task.id);

    this.log(`Placed blueprint: ${this.selectedBlueprintId} at (${Math.floor(worldX)}, ${Math.floor(worldY)}) - Agents will build`);
  }

  /**
   * Place fully-built building instantly (no construction phase)
   */
  private placeFullyBuiltBuilding(worldX: number, worldY: number): void {
    if (!this.world || !this.selectedBlueprintId) return;

    const registry = getTileBasedBlueprintRegistry();
    const blueprint = registry.get(this.selectedBlueprintId);
    if (!blueprint) {
      throw new Error(`Blueprint "${this.selectedBlueprintId}" not found`);
    }

    // Parse layout to get tile positions
    const originX = Math.floor(worldX);
    const originY = Math.floor(worldY);
    const parsedTiles = parseLayout(blueprint, originX, originY, 0);

    // Get world getTileAt method
    const worldWithTiles = this.world;
    if (typeof worldWithTiles.getTileAt !== 'function') {
      throw new Error('World does not have getTileAt method');
    }

    // Place all tiles directly
    for (const parsed of parsedTiles) {
      const tile = worldWithTiles.getTileAt(parsed.x, parsed.y);
      if (!tile) {
        throw new Error(`Tile at (${parsed.x}, ${parsed.y}) not found`);
      }

      // Place tile based on type
      switch (parsed.type) {
        case 'wall':
          tile.wall = {
            material: parsed.materialId as WallMaterial,
            condition: 100,
            insulation: this.getWallInsulation(parsed.materialId as WallMaterial),
            constructedAt: this.world.tick,
          };
          break;

        case 'door':
          tile.door = {
            material: parsed.materialId as DoorMaterial,
            state: 'closed',
            constructedAt: this.world.tick,
          };
          break;

        case 'window':
          tile.window = {
            material: parsed.materialId as WindowMaterial,
            condition: 100,
            lightsThrough: true,
            constructedAt: this.world.tick,
          };
          break;

        case 'floor':
          tile.floor = parsed.materialId;
          break;
      }
    }

    this.log(`Placed fully-built: ${blueprint.name} at (${originX}, ${originY}) - ${parsedTiles.length} tiles`);
  }

  /**
   * Get wall insulation value for a material
   */
  private getWallInsulation(material: WallMaterial): number {
    const insulations: Record<WallMaterial, number> = {
      wood: 50,
      stone: 80,
      mud_brick: 60,
      ice: 40,
      metal: 90,
      glass: 30,
      thatch: 35,
    };
    return insulations[material] ?? 50;
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
      const currentLevel = skills.levels[randomSkill] || 0;
      const newLevel = currentLevel + (amount / 100); // 100 XP = 1 level

      // Update the skill component
      this.world.updateComponent(agentId, CT.Skills, (current: SkillsComponent) => ({
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
          const agentId = this.agentSpawnHandler.spawnWanderingAgent(this.spawnX, this.spawnY);
          this.log(`Spawned wandering agent at (${this.spawnX}, ${this.spawnY})`);
          break;
        }

        case 'spawn_llm_agent': {
          const agentId = this.agentSpawnHandler.spawnLLMAgent(this.spawnX, this.spawnY);
          this.log(`Spawned LLM agent at (${this.spawnX}, ${this.spawnY})`);
          break;
        }

        case 'spawn_village_5': {
          const agentIds = this.agentSpawnHandler.spawnVillage(5, this.spawnX, this.spawnY);
          this.log(`Spawned village with 5 agents at (${this.spawnX}, ${this.spawnY}): ${agentIds.length} created`);
          break;
        }

        case 'spawn_village_10': {
          const agentIds = this.agentSpawnHandler.spawnVillage(10, this.spawnX, this.spawnY);
          this.log(`Spawned village with 10 agents at (${this.spawnX}, ${this.spawnY}): ${agentIds.length} created`);
          break;
        }

        case 'spawn_town_25': {
          const agentIds = this.agentSpawnHandler.spawnVillage(25, this.spawnX, this.spawnY);
          this.log(`Spawned town with 25 agents at (${this.spawnX}, ${this.spawnY}): ${agentIds.length} created`);
          break;
        }

        case 'spawn_city_50': {
          const agentIds = this.agentSpawnHandler.spawnVillage(50, this.spawnX, this.spawnY);
          this.log(`Spawned city with 50 agents at (${this.spawnX}, ${this.spawnY}): ${agentIds.length} created`);
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
            this.world.advanceTick();
          }
          this.log('Advanced world by 100 ticks');
          break;

        case 'fast_forward_1000':
          // Advance the world 1000 ticks
          for (let i = 0; i < 1000; i++) {
            this.world.advanceTick();
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
            this.world.destroyEntity(entity.id, 'dev_tools_cleanup');
          }
          this.log(`Removed ${deadEntities.length} dead bodies`);
          break;

        case 'heal_all_agents':
          // Set all agents' needs to satisfied
          const agents = this.world.query().with(CT.Agent).with(CT.Needs).executeEntities();
          for (const agent of agents) {
            this.world.updateComponent(agent.id, CT.Needs, (needs: any) => ({
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
            this.world.updateComponent(agent.id, CT.Needs, (needs: any) => ({
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

  /**
   * Render introspection section (Phase 2A + Phase 4)
   * Demonstrates schema-driven auto-generated UI for ALL schemas
   */
  private renderIntrospectionSection(ctx: CanvasRenderingContext2D, width: number, y: number): number {
    const padding = 10;
    const contentWidth = width - padding * 2;

    // Section header
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('INTROSPECTION SYSTEM (Phase 4)', padding, y + 10);
    y += 30;

    // Description
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '11px monospace';
    ctx.fillText('Auto-generated UI from component schemas', padding, y);
    y += 20;

    // Get all registered schemas
    const registeredTypes = ComponentRegistry.list().sort();
    const schemaCount = registeredTypes.length;

    // Component selector header
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Component Selector (${schemaCount} schemas):`, padding, y);
    y += 20;

    // Render component selector buttons (3 per row)
    const buttonWidth = (contentWidth - 20) / 3;
    const buttonHeight = 24;
    const buttonPadding = 4;
    let buttonX = padding;
    let buttonY = y;
    let buttonsInRow = 0;

    for (const componentType of registeredTypes) {
      const isSelected = this.selectedIntrospectionComponent === componentType;

      // Draw button background
      ctx.fillStyle = isSelected ? COLORS.magic : COLORS.inputBg;
      ctx.fillRect(buttonX, buttonY, buttonWidth - buttonPadding, buttonHeight);

      // Draw button border
      ctx.strokeStyle = isSelected ? COLORS.warning : COLORS.textDim;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(buttonX, buttonY, buttonWidth - buttonPadding, buttonHeight);

      // Draw button text
      ctx.fillStyle = isSelected ? COLORS.text : COLORS.textMuted;
      ctx.font = isSelected ? 'bold 9px monospace' : '9px monospace';
      const text = componentType.length > 12 ? componentType.substring(0, 11) + '…' : componentType;
      const textX = buttonX + (buttonWidth - buttonPadding) / 2;
      const textY = buttonY + 15;
      ctx.textAlign = 'center';
      ctx.fillText(text, textX, textY);
      ctx.textAlign = 'left';

      // Add click region
      this.clickRegions.push({
        x: buttonX,
        y: buttonY,
        width: buttonWidth - buttonPadding,
        height: buttonHeight,
        action: 'select_introspection_component',
        data: componentType,
      });

      // Move to next button position
      buttonsInRow++;
      if (buttonsInRow >= 3) {
        buttonX = padding;
        buttonY += buttonHeight + buttonPadding;
        buttonsInRow = 0;
      } else {
        buttonX += buttonWidth;
      }
    }

    // Move y past all buttons
    y = buttonY + (buttonsInRow > 0 ? buttonHeight + buttonPadding : 0) + 10;

    // Get or create test entity for selected component
    if (!this.introspectionTestEntities.has(this.selectedIntrospectionComponent)) {
      const schema = ComponentRegistry.get(this.selectedIntrospectionComponent);
      if (schema && schema.createDefault) {
        const testEntity = schema.createDefault();

        // Set some interesting test values for specific components
        // Type assertion to Record for property access since we're dynamically setting test values
        const entityRecord = testEntity as unknown as Record<string, unknown>;

        if (this.selectedIntrospectionComponent === 'identity' && 'name' in testEntity) {
          entityRecord.name = 'Test Entity';
          entityRecord.age = 1000;
          entityRecord.species = 'elf';
        } else if (this.selectedIntrospectionComponent === 'personality' && 'openness' in testEntity) {
          entityRecord.openness = 0.9;
          entityRecord.agreeableness = 0.8;
          entityRecord.spirituality = 0.7;
        } else if (this.selectedIntrospectionComponent === 'skills' && 'levels' in testEntity) {
          const levels = entityRecord.levels as Record<string, number>;
          levels.exploration = 5;
          levels.crafting = 4;
          levels.farming = 3;
        } else if (this.selectedIntrospectionComponent === 'needs' && 'hunger' in testEntity) {
          entityRecord.hunger = 0.3;
          entityRecord.energy = 0.4;
          entityRecord.socialContact = 0.2;
        }

        this.introspectionTestEntities.set(this.selectedIntrospectionComponent, testEntity);

        // Initialize dev renderer for this component
        this.devRenderer.initializeComponent(
          this.selectedIntrospectionComponent,
          testEntity,
          (fieldName: string, newValue: unknown) => {
            // Update the test entity
            const entity = this.introspectionTestEntities.get(this.selectedIntrospectionComponent);
            if (entity) {
              const entityRecord = entity as Record<string, unknown>;
              entityRecord[fieldName] = newValue;
              this.log(`Updated ${this.selectedIntrospectionComponent}.${fieldName} to ${newValue}`);
            }
          }
        );
      }
    }

    // Render selected component
    const selectedEntity = this.introspectionTestEntities.get(this.selectedIntrospectionComponent);
    const selectedSchema = ComponentRegistry.get(this.selectedIntrospectionComponent);

    if (selectedEntity && selectedSchema) {
      // Component header
      ctx.fillStyle = COLORS.warning;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`Component: ${this.selectedIntrospectionComponent}`, padding, y);
      y += 5;

      // Schema metadata
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText(
        `Category: ${selectedSchema.category} | Version: ${selectedSchema.version} | Fields: ${Object.keys(selectedSchema.fields).length}`,
        padding,
        y
      );
      y += 20;

      // Render schema-driven fields
      const heightConsumed = this.devRenderer.render(
        ctx,
        this.selectedIntrospectionComponent,
        padding,
        y,
        contentWidth
      );

      y += heightConsumed + 10;

      // Info text
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '10px monospace';
      ctx.fillText('↑ Interactive schema-driven UI (click fields to edit)', padding, y);
      y += 20;
    } else {
      ctx.fillStyle = COLORS.warning;
      ctx.font = '11px monospace';
      ctx.fillText(`Schema '${this.selectedIntrospectionComponent}' has no createDefault() method.`, padding, y);
      y += 20;
    }

    // Registry stats
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Registry Stats:', padding, y);
    y += 15;

    ctx.font = '10px monospace';
    ctx.fillText(`Total schemas: ${schemaCount}`, padding + 10, y);
    y += 15;
    ctx.fillText(`Test entities: ${this.introspectionTestEntities.size}`, padding + 10, y);
    y += 20;

    // Phase completion status
    ctx.fillStyle = COLORS.success;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('✓ Phase 4: Schema Migration - COMPLETE', padding, y);
    y += 15;
    ctx.fillText('✓ DevPanel: All Schemas Visible', padding, y);
    y += 20;

    return y;
  }
}
