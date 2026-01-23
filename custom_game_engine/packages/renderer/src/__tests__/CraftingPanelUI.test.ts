/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CraftingPanelUI } from '../CraftingPanelUI';
import { World, EventBusImpl } from '@ai-village/core';

describe('CraftingPanelUI (REQ-CRAFT-001)', () => {
  let panel: CraftingPanelUI;
  let world: World;
  let eventBus: EventBusImpl;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;

    panel = new CraftingPanelUI(world, canvas);
  });

  describe('Panel Structure (REQ-CRAFT-001, Criterion 1)', () => {
    it('should initialize with all required sections', () => {
      expect(panel.recipeListSection).toBeDefined();
      expect(panel.recipeDetailsSection).toBeDefined();
      expect(panel.ingredientPanel).toBeDefined();
      expect(panel.queueSection).toBeDefined();
    });

    it('should have search bar component', () => {
      expect(panel.searchBar).toBeDefined();
      expect(panel.searchBar.placeholder).toBe('Search recipes...');
    });

    it('should have filter controls', () => {
      expect(panel.filterControls).toBeDefined();
      expect(panel.filterControls.options).toContain('All');
      expect(panel.filterControls.options).toContain('Craftable');
      expect(panel.filterControls.options).toContain('Missing One');
      expect(panel.filterControls.options).toContain('Locked');
    });

    it('should have category tabs', () => {
      expect(panel.categoryTabs).toBeDefined();
      expect(panel.categoryTabs.tabs).toContain('All');
      expect(panel.categoryTabs.tabs).toContain('Tools');
      expect(panel.categoryTabs.tabs).toContain('Weapons');
      expect(panel.categoryTabs.tabs).toContain('Food');
      expect(panel.categoryTabs.tabs).toContain('Materials');
    });

    it('should be hidden by default', () => {
      expect(panel.isVisible).toBe(false);
    });

    it('should throw when initialized without world', () => {
      expect(() => new CraftingPanelUI(null as any, canvas)).toThrow('World is required');
    });

    it('should throw when initialized without canvas', () => {
      expect(() => new CraftingPanelUI(world, null as any)).toThrow('Canvas is required');
    });
  });

  describe('Panel Visibility (REQ-CRAFT-001)', () => {
    it('should open panel when show() is called', () => {
      panel.show();
      expect(panel.isVisible).toBe(true);
    });

    it('should close panel when hide() is called', () => {
      panel.show();
      panel.hide();
      expect(panel.isVisible).toBe(false);
    });

    it('should toggle visibility', () => {
      expect(panel.isVisible).toBe(false);
      panel.toggle();
      expect(panel.isVisible).toBe(true);
      panel.toggle();
      expect(panel.isVisible).toBe(false);
    });

    it('should emit crafting:panel_opened event when shown', () => {
      const mockEmit = vi.spyOn(world.eventBus, 'emit');
      panel.show();
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        type: 'crafting:panel_opened',
        source: 'crafting-panel-ui'
      }));
    });

    it('should emit crafting:panel_closed event when hidden', () => {
      const mockEmit = vi.spyOn(world.eventBus, 'emit');
      panel.show();
      panel.hide();
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        type: 'crafting:panel_closed',
        source: 'crafting-panel-ui'
      }));
    });
  });

  describe('Agent Association', () => {
    it('should set active agent', () => {
      const agentId = 'agent-123';
      panel.setActiveAgent(agentId);
      expect(panel.activeAgentId).toBe(agentId);
    });

    it('should throw when setting invalid agent ID', () => {
      // Empty string should be treated as invalid
      expect(() => panel.setActiveAgent('')).toThrow('Invalid agent ID');
    });

    it('should refresh panel when agent changes', () => {
      const mockRefresh = vi.spyOn(panel, 'refresh');
      panel.setActiveAgent('agent-123');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Workstation Association (REQ-CRAFT-006)', () => {
    it('should set active workstation', () => {
      panel.setWorkstation('forge');
      expect(panel.workstationId).toBe('forge');
    });

    it('should allow null workstation (hand crafting)', () => {
      panel.setWorkstation(null);
      expect(panel.workstationId).toBeNull();
    });

    it('should filter recipes when workstation is set', () => {
      const mockFilter = vi.spyOn(panel.recipeListSection, 'filterByStation');
      panel.setWorkstation('forge');
      expect(mockFilter).toHaveBeenCalledWith('forge');
    });

    it('should show workstation name in panel header', () => {
      panel.setWorkstation('forge');
      expect(panel.getHeader()).toContain('Forge');

      panel.setWorkstation(null);
      expect(panel.getHeader()).toContain('Hand Crafting');
    });
  });

  describe('Rendering (REQ-CRAFT-001)', () => {
    it('should not render when panel is hidden', () => {
      const mockRenderSection = vi.spyOn(panel.recipeListSection, 'render');
      panel.render(ctx);
      expect(mockRenderSection).not.toHaveBeenCalled();
    });

    it('should render all sections when panel is visible', () => {
      panel.setActiveAgent(123);
      panel.show();
      const mockRecipeList = vi.spyOn(panel.recipeListSection, 'render');
      const mockRecipeDetails = vi.spyOn(panel.recipeDetailsSection, 'render');
      const mockIngredients = vi.spyOn(panel.ingredientPanel, 'render');
      const mockQueue = vi.spyOn(panel.queueSection, 'render');

      panel.render(ctx);

      expect(mockRecipeList).toHaveBeenCalled();
      expect(mockRecipeDetails).toHaveBeenCalled();
      expect(mockIngredients).toHaveBeenCalled();
      expect(mockQueue).toHaveBeenCalled();
    });

    it('should render background overlay', () => {
      panel.setActiveAgent(123);
      panel.show();
      const mockFillRect = vi.spyOn(ctx, 'fillRect');
      panel.render(ctx);

      expect(mockFillRect).toHaveBeenCalled(); // Background drawn
    });

    it('should render panel border', () => {
      panel.setActiveAgent(123);
      panel.show();
      const mockStrokeRect = vi.spyOn(ctx, 'strokeRect');
      panel.render(ctx);

      expect(mockStrokeRect).toHaveBeenCalled();
    });

    it('should render close button', () => {
      panel.setActiveAgent(123);
      panel.show();
      panel.render(ctx);

      expect(panel.closeButton).toBeDefined();
      expect(panel.closeButton.x).toBeGreaterThan(700); // Top right area
      expect(panel.closeButton.y).toBeLessThan(50);
    });

    it('should center panel on screen', () => {
      panel.setActiveAgent(123);
      panel.show();
      panel.render(ctx);

      const panelX = panel.bounds.x;
      const panelY = panel.bounds.y;

      expect(panelX).toBe((800 - panel.bounds.width) / 2);
      expect(panelY).toBe((600 - panel.bounds.height) / 2);
    });
  });

  describe('Mouse Interaction', () => {
    it('should handle click on close button', () => {
      panel.setActiveAgent(123);
      panel.show();
      panel.render(ctx);

      const closeButtonX = panel.closeButton.x + 5;
      const closeButtonY = panel.closeButton.y + 5;

      panel.handleClick(closeButtonX, closeButtonY);

      expect(panel.isVisible).toBe(false);
    });

    it('should delegate clicks to sections', () => {
      panel.show();
      panel.setActiveAgent(123);

      const mockRecipeListClick = vi.spyOn(panel.recipeListSection, 'handleClick');

      // Click in recipe list area (left side)
      panel.handleClick(150, 200);

      expect(mockRecipeListClick).toHaveBeenCalled();
    });

    it('should not process clicks when panel is hidden', () => {
      const mockRecipeListClick = vi.spyOn(panel.recipeListSection, 'handleClick');

      panel.handleClick(150, 200);

      expect(mockRecipeListClick).not.toHaveBeenCalled();
    });

    it('should handle clicks outside panel bounds (close panel)', () => {
      // Panel is 800x600 centered on 800x600 canvas, so it fills entire canvas
      // We need to test with a larger canvas to have "outside" space
      const largeCanvas = document.createElement('canvas');
      largeCanvas.width = 1200;
      largeCanvas.height = 800;
      const largePanel = new CraftingPanelUI(world, largeCanvas);

      largePanel.show();
      largePanel.handleClick(10, 10); // Click in top-left corner, outside centered panel

      expect(largePanel.isVisible).toBe(false);
    });
  });

  describe('State Persistence', () => {
    it('should persist selected category', () => {
      panel.categoryTabs.selectTab('Tools');
      const state = panel.getState();

      expect(state.selectedCategory).toBe('Tools');
    });

    it('should persist search query', () => {
      panel.searchBar.setText('axe');
      const state = panel.getState();

      expect(state.searchQuery).toBe('axe');
    });

    it('should persist filter selection', () => {
      panel.filterControls.select('Craftable');
      const state = panel.getState();

      expect(state.selectedFilter).toBe('Craftable');
    });

    it('should persist view mode (grid/list)', () => {
      panel.recipeListSection.setViewMode('list');
      const state = panel.getState();

      expect(state.viewMode).toBe('list');
    });

    it('should restore state', () => {
      const state = {
        selectedCategory: 'Weapons',
        searchQuery: 'sword',
        selectedFilter: 'Craftable',
        viewMode: 'grid'
      };

      panel.setState(state);

      expect(panel.categoryTabs.selectedTab).toBe('Weapons');
      expect(panel.searchBar.getText()).toBe('sword');
      expect(panel.filterControls.selected).toBe('Craftable');
      expect(panel.recipeListSection.viewMode).toBe('grid');
    });
  });

  describe('Recipe Selection (REQ-CRAFT-003)', () => {
    it('should select recipe when clicked', () => {
      const mockEmit = vi.spyOn(world.eventBus, 'emit');
      panel.show();
      panel.setActiveAgent(123);

      panel.selectRecipe('stone_axe');

      expect(panel.selectedRecipeId).toBe('stone_axe');
      expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
        type: 'crafting:recipe_selected',
        source: 'crafting-panel-ui',
        data: { recipeId: 'stone_axe' }
      }));
    });

    it('should update details section when recipe is selected', () => {
      panel.show();
      panel.setActiveAgent(123);

      const mockUpdate = vi.spyOn(panel.recipeDetailsSection, 'setRecipe');
      panel.selectRecipe('stone_axe');

      expect(mockUpdate).toHaveBeenCalledWith('stone_axe');
    });

    it('should update ingredient panel when recipe is selected', () => {
      panel.show();
      panel.setActiveAgent(123);

      const mockUpdate = vi.spyOn(panel.ingredientPanel, 'setRecipe');
      panel.selectRecipe('stone_axe');

      expect(mockUpdate).toHaveBeenCalledWith('stone_axe', 123);
    });

    it('should clear selection when null is passed', () => {
      panel.setActiveAgent(123);
      panel.selectRecipe('stone_axe');
      panel.selectRecipe(null);

      expect(panel.selectedRecipeId).toBeNull();
    });
  });

  describe('Integration with EventBus (REQ-CRAFT-012)', () => {
    it('should refresh queue when crafting:job_queued event fires', () => {
      panel.setActiveAgent(123);
      const mockRefresh = vi.spyOn(panel.queueSection, 'refresh');

      eventBus.emit({type:'crafting:job_queued', source: 'test', data: { agentId: 123 }});
      eventBus.flush();

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should refresh queue when crafting:job_completed event fires', () => {
      panel.setActiveAgent(123);
      const mockRefresh = vi.spyOn(panel.queueSection, 'refresh');

      eventBus.emit({type:'crafting:job_completed', source: 'test', data: { agentId: 123 }});
      eventBus.flush();

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should refresh ingredient availability when inventory:changed event fires', () => {
      const mockRefresh = vi.spyOn(panel.ingredientPanel, 'refresh');
      panel.setActiveAgent(123);

      eventBus.emit({type:'inventory:changed', source: 'test', data: { entityId: 123 }});
      eventBus.flush();

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should refresh recipe list when research:unlocked event fires', () => {
      const mockRefresh = vi.spyOn(panel.recipeListSection, 'refresh');

      eventBus.emit({type:'research:unlocked', source: 'test', data: { researchId: 'advanced_smithing' }});
      eventBus.flush();

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should close panel when building:destroyed event fires for active workstation', () => {
      panel.setWorkstation('forge');
      panel.show();

      eventBus.emit({type:'building:destroyed', source: 'test', data: { buildingId: 'forge' }});
      eventBus.flush();

      expect(panel.isVisible).toBe(false);
    });
  });

  describe('Error Handling (CLAUDE.md)', () => {
    it('should throw when rendering without active agent', () => {
      panel.show();
      // No agent set
      expect(() => panel.render(ctx)).toThrow('No active agent');
    });

    it('should throw when selecting recipe without active agent', () => {
      expect(() => panel.selectRecipe('stone_axe')).toThrow('No active agent');
    });

    it('should throw when refresh is called without world', () => {
      // Create panel with invalid world
      const invalidPanel = new CraftingPanelUI(world, canvas);
      (invalidPanel as any).world = null;

      expect(() => invalidPanel.refresh()).toThrow('World is required');
    });
  });
});
