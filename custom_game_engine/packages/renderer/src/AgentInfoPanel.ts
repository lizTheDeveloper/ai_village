/**
 * AgentInfoPanel - UI Panel displaying information about the selected agent.
 *
 * Shows agent status, needs, behavior, and interactions across multiple tabs:
 * - Info: General status, needs, inventory summary
 * - Stats: Gathering statistics
 * - Items: Full inventory with scrolling
 * - Mem: Episodic memories, beliefs, social memory
 * - Prio: Strategic priorities
 * - LLM: Copyable LLM prompt context
 */

import type { Entity } from '@ai-village/core';
import { TabbedPanel } from './ui/index.js';
import type { IWindowPanel } from './types/WindowTypes.js';
import {
  type AgentInfoTab,
  type SectionRenderContext,
  type IdentityComponent,
  type AgentComponentData,
  type NeedsComponentData,
  type PositionComponentData,
  type TemperatureComponentData,
  type MovementComponentData,
  type InventoryComponentData,
  type GatheringStatsComponentData,
  type SkillsComponentData,
  type PersonalityComponentData,
  type EpisodicMemoryComponent,
  type SemanticMemoryComponent,
  type SocialMemoryComponent,
  type ReflectionComponent,
  type JournalComponent,
  InfoSection,
  StatsSection,
  SkillsSection,
  InventorySection,
  MemoriesSection,
  ContextSection,
  PrioritiesSection,
  DevSection,
} from './panels/agent-info/index.js';

const TAB_DEFINITIONS: Array<{ id: AgentInfoTab; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'stats', label: 'Stats' },
  { id: 'skills', label: 'Skills' },
  { id: 'inventory', label: 'Items' },
  { id: 'memories', label: 'Mem' },
  { id: 'priorities', label: 'Prio' },
  { id: 'context', label: 'LLM' },
  { id: 'dev', label: 'Dev' },
];

/**
 * UI Panel displaying information about the selected agent.
 */
export class AgentInfoPanel implements IWindowPanel {
  private visible: boolean = false;
  private selectedEntityId: string | null = null;
  private panelWidth = 360;
  private panelHeight = 530;
  private padding = 12;
  private lineHeight = 16;

  // UI Components
  private tabs: TabbedPanel<AgentInfoTab>;

  // Sections
  private infoSection = new InfoSection();
  private statsSection = new StatsSection();
  private skillsSection = new SkillsSection();
  private inventorySection = new InventorySection();
  private memoriesSection = new MemoriesSection();
  private contextSection = new ContextSection();
  private prioritiesSection = new PrioritiesSection();
  private devSection = new DevSection();

  // Track actual screen position for HTML overlay positioning
  private lastScreenX: number = 0;
  private lastScreenY: number = 0;

  // Priority reset callback
  private onResetPrioritiesCallback: ((entityId: string) => void) | null = null;


  getId(): string {
    return 'agent-info';
  }

  getTitle(): string {
    return 'Agent Info';
  }

  getDefaultWidth(): number {
    return 360;
  }

  getDefaultHeight(): number {
    return 530;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  constructor() {
    this.tabs = new TabbedPanel<AgentInfoTab>(
      TAB_DEFINITIONS,
      'info',
      { tabHeight: 28 },
      (newTab, _oldTab) => {
        // Reset scroll offsets when switching tabs
        this.infoSection.setScrollOffset(0);
        this.statsSection.setScrollOffset(0);
        this.skillsSection.setScrollOffset(0);
        this.inventorySection.setScrollOffset(0);
        this.memoriesSection.setScrollOffset(0);
        this.prioritiesSection.setScrollOffset(0);
        this.devSection.setScrollOffset(0);
        // Hide context text when switching away from LLM tab
        if (newTab !== 'context') {
          this.contextSection.hide();
        }
      }
    );
  }

  /**
   * Set the currently selected agent entity.
   */
  setSelectedEntity(entity: Entity | null): void {
    this.selectedEntityId = entity ? entity.id : null;
    if (!entity) {
      this.contextSection.hide();
    }
  }

  /**
   * Get the currently selected entity ID.
   */
  getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  /**
   * Get the currently selected entity (for backwards compatibility).
   */
  getSelectedEntity(): { id: string } | null {
    return this.selectedEntityId ? { id: this.selectedEntityId } : null;
  }

  /**
   * Get the current active tab.
   */
  getCurrentTab(): AgentInfoTab {
    return this.tabs.getCurrentTab();
  }

  /**
   * Set the current tab.
   */
  setTab(tab: AgentInfoTab): void {
    this.tabs.setCurrentTab(tab);
  }

  /**
   * Hide the context text overlay.
   */
  hideContextTextarea(): void {
    this.contextSection.hide();
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.contextSection.destroy();
  }

  /**
   * Set a callback for when priorities should be reset.
   */
  setOnResetPriorities(callback: (entityId: string) => void): void {
    this.onResetPrioritiesCallback = callback;
  }

  /**
   * Set a callback for when LLM config should be opened.
   */
  setOnOpenLLMConfig(callback: (agentEntity: any) => void): void {
    this.contextSection.setOnOpenConfig(callback);
  }

  /**
   * Handle click on the panel.
   */
  handleClick(clickX: number, clickY: number, panelX: number, panelY: number, width?: number): boolean {
    const actualWidth = width ?? this.panelWidth;

    // Delegate tab click handling to TabbedPanel
    if (this.tabs.handleClick(clickX, clickY, panelX, panelY, actualWidth)) {
      return true;
    }

    // Check if click is on the config LLM button (context tab)
    const currentTab = this.tabs.getCurrentTab();
    if (currentTab === 'context') {
      if (this.contextSection.handleClick(clickX, clickY)) {
        return true;
      }
    }

    // Check if click is on the reset priorities button
    const resetBtn = this.prioritiesSection.getResetButtonBounds();
    if (resetBtn && this.selectedEntityId && this.onResetPrioritiesCallback) {
      if (
        clickX >= resetBtn.x &&
        clickX <= resetBtn.x + resetBtn.width &&
        clickY >= resetBtn.y &&
        clickY <= resetBtn.y + resetBtn.height
      ) {
        this.onResetPrioritiesCallback(this.selectedEntityId);
        return true;
      }
    }

    return false;
  }

  /**
   * Handle scroll events for scrollable tabs.
   */
  handleScroll(deltaY: number, _contentHeight: number): boolean {
    const currentTab = this.tabs.getCurrentTab();
    switch (currentTab) {
      case 'info':
        this.infoSection.handleScroll(deltaY);
        return true;
      case 'stats':
        this.statsSection.handleScroll(deltaY);
        return true;
      case 'skills':
        this.skillsSection.handleScroll(deltaY);
        return true;
      case 'inventory':
        this.inventorySection.handleScroll(deltaY);
        return true;
      case 'memories':
        this.memoriesSection.handleScroll(deltaY);
        return true;
      case 'priorities':
        this.prioritiesSection.handleScroll(deltaY);
        return true;
      case 'dev':
        this.devSection.handleScroll(deltaY);
        return true;
      case 'context':
        // Context tab is a textarea, no scrolling needed
        return false;
      default:
        return false;
    }
  }

  /**
   * Render the agent info panel (legacy).
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number, world: any): void {
    const x = canvasWidth - this.panelWidth - 20;
    const y = 20;
    this.renderAt(ctx, x, y, this.panelWidth, this.panelHeight, world);
  }

  /**
   * Render the agent info panel at a specific position.
   */
  renderAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    world: any,
    screenX?: number,
    screenY?: number
  ): void {
    this.lastScreenX = screenX ?? x;
    this.lastScreenY = screenY ?? y;

    const currentTab = this.tabs.getCurrentTab();
    const tabHeight = this.tabs.getTabHeight();

    if (!this.selectedEntityId) {
      this.contextSection.hide();
      return;
    }

    if (currentTab !== 'context') {
      this.contextSection.hide();
    }

    if (!world || typeof world.getEntity !== 'function') {
      console.warn('[AgentInfoPanel] World not available or missing getEntity method');
      this.contextSection.hide();
      return;
    }

    const selectedEntity = world.getEntity(this.selectedEntityId);
    if (!selectedEntity) {
      console.warn('[AgentInfoPanel] Selected entity not found in world:', this.selectedEntityId);
      this.selectedEntityId = null;
      this.contextSection.hide();
      return;
    }

    // Draw panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x, y, width, height);

    // Draw panel border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Render tabs
    this.tabs.renderTabs(ctx, x, y, width);

    // Create render context for sections
    const context: SectionRenderContext = {
      ctx,
      x,
      y: y + tabHeight,
      width,
      height: height - tabHeight,
      padding: this.padding,
      lineHeight: this.lineHeight,
    };

    // Get components
    const identity = selectedEntity.components.get('identity') as IdentityComponent | undefined;
    const agent = selectedEntity.components.get('agent') as AgentComponentData | undefined;
    const needs = selectedEntity.components.get('needs') as NeedsComponentData | undefined;
    const position = selectedEntity.components.get('position') as PositionComponentData | undefined;
    const temperature = selectedEntity.components.get('temperature') as TemperatureComponentData | undefined;
    const movement = selectedEntity.components.get('movement') as MovementComponentData | undefined;
    const inventory = selectedEntity.components.get('inventory') as InventoryComponentData | undefined;
    const gatheringStats = selectedEntity.components.get('gathering_stats') as GatheringStatsComponentData | undefined;
    const episodicMemory = selectedEntity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
    const semanticMemory = selectedEntity.components.get('semantic_memory') as SemanticMemoryComponent | undefined;
    const socialMemory = selectedEntity.components.get('social_memory') as SocialMemoryComponent | undefined;
    const reflection = selectedEntity.components.get('reflection') as ReflectionComponent | undefined;
    const journal = selectedEntity.components.get('journal') as JournalComponent | undefined;
    const skills = selectedEntity.components.get('skills') as SkillsComponentData | undefined;
    const personality = selectedEntity.components.get('personality') as PersonalityComponentData | undefined;
    const goals = selectedEntity.components.get('goals') as import('./panels/agent-info/types.js').GoalsComponent | undefined;

    // Render current tab
    switch (currentTab) {
      case 'stats':
        this.statsSection.render(context, identity, gatheringStats);
        break;

      case 'skills':
        this.skillsSection.render(context, identity, skills, personality);
        break;

      case 'inventory':
        this.inventorySection.render(context, identity, inventory);
        break;

      case 'memories':
        this.memoriesSection.render(
          context,
          identity,
          agent,
          episodicMemory,
          semanticMemory,
          socialMemory,
          reflection,
          journal
        );
        break;

      case 'context':
        this.contextSection.render(
          context,
          identity,
          agent,
          selectedEntity,
          world,
          this.lastScreenX,
          this.lastScreenY
        );
        break;

      case 'priorities':
        this.prioritiesSection.render(context, identity, agent);
        break;

      case 'dev':
        this.devSection.render(context, selectedEntity, identity);
        break;

      case 'info':
      default:
        this.infoSection.render(
          context,
          selectedEntity,
          identity,
          agent,
          needs,
          position,
          temperature,
          movement,
          inventory,
          goals,
          world
        );
        break;
    }
  }
}
