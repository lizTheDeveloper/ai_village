import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextMenuRenderer } from '../ContextMenuRenderer';
import { RadialMenuItem } from '../context-menu/types';

// TODO: Not implemented - tests skipped
describe.skip('ContextMenuRenderer', () => {
  let renderer: ContextMenuRenderer;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = canvas.getContext('2d')!;
    renderer = new ContextMenuRenderer(ctx);
  });

  describe('RadialMenuItem calculations', () => {
    it('should calculate arc angles for menu items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Item 1', actionId: 'action1', enabled: true },
        { id: '2', label: 'Item 2', actionId: 'action2', enabled: true },
        { id: '3', label: 'Item 3', actionId: 'action3', enabled: true },
        { id: '4', label: 'Item 4', actionId: 'action4', enabled: true }
      ];

      const itemsWithAngles = renderer.calculateArcAngles(items, 30, 100);

      expect(itemsWithAngles).toHaveLength(4);
      expect(itemsWithAngles[0].startAngle).toBe(0);
      expect(itemsWithAngles[0].endAngle).toBe(90);
      expect(itemsWithAngles[1].startAngle).toBe(90);
      expect(itemsWithAngles[1].endAngle).toBe(180);
      expect(itemsWithAngles[2].startAngle).toBe(180);
      expect(itemsWithAngles[2].endAngle).toBe(270);
      expect(itemsWithAngles[3].startAngle).toBe(270);
      expect(itemsWithAngles[3].endAngle).toBe(360);
    });

    it('should include gap between items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Item 1', actionId: 'action1', enabled: true },
        { id: '2', label: 'Item 2', actionId: 'action2', enabled: true }
      ];

      const gap = 4; // degrees
      const itemsWithAngles = renderer.calculateArcAngles(items, 30, 100, gap);

      const arcSize = (360 - gap * items.length) / items.length;
      expect(itemsWithAngles[0].startAngle).toBe(0);
      expect(itemsWithAngles[0].endAngle).toBeCloseTo(arcSize, 1);
      expect(itemsWithAngles[1].startAngle).toBeCloseTo(arcSize + gap, 1);
    });

    it('should store inner and outer radius on items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Item 1', actionId: 'action1', enabled: true }
      ];

      const innerRadius = 30;
      const outerRadius = 100;
      const itemsWithAngles = renderer.calculateArcAngles(items, innerRadius, outerRadius);

      expect(itemsWithAngles[0].innerRadius).toBe(innerRadius);
      expect(itemsWithAngles[0].outerRadius).toBe(outerRadius);
    });
  });

  describe('render', () => {
    it('should render menu at specified position', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const fillArcSpy = vi.spyOn(ctx, 'fill');

      renderer.render(items, 400, 300);

      expect(fillArcSpy).toHaveBeenCalled();
    });

    it('should render items with different colors for enabled/disabled', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Enabled', actionId: 'enabled', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 },
        { id: '2', label: 'Disabled', actionId: 'disabled', enabled: false, startAngle: 90, endAngle: 180, innerRadius: 30, outerRadius: 100 }
      ];

      const fillStyleSpy = vi.spyOn(ctx, 'fillStyle', 'set');

      renderer.render(items, 400, 300);

      // Should set different fill styles for enabled vs disabled
      const fillStyles = fillStyleSpy.mock.calls.map(call => call[0]);
      expect(new Set(fillStyles).size).toBeGreaterThan(1);
    });

    it('should render hover state with increased scale', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Normal', actionId: 'normal', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 },
        { id: '2', label: 'Hovered', actionId: 'hovered', enabled: true, startAngle: 90, endAngle: 180, innerRadius: 30, outerRadius: 100, hovered: true }
      ];

      const scaleSpy = vi.spyOn(ctx, 'scale');

      renderer.render(items, 400, 300);

      // Should apply scale transform for hovered item
      expect(scaleSpy).toHaveBeenCalledWith(expect.closeTo(1.1, 1), expect.closeTo(1.1, 1));
    });

    it('should render labels on items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test Item', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      renderer.render(items, 400, 300);

      expect(fillTextSpy).toHaveBeenCalledWith(expect.stringContaining('Test'), expect.any(Number), expect.any(Number));
    });

    it('should render icons on items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, icon: 'test-icon', startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const drawImageSpy = vi.spyOn(ctx, 'drawImage');

      renderer.render(items, 400, 300);

      // Should attempt to draw icon (may fail if image not loaded, but call should be made)
      expect(drawImageSpy).toHaveBeenCalled();
    });

    it('should render shortcuts on items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, shortcut: 'T', startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      renderer.render(items, 400, 300);

      // Should render both label and shortcut
      expect(fillTextSpy).toHaveBeenCalledWith(expect.stringContaining('T'), expect.any(Number), expect.any(Number));
    });

    it('should render submenu indicator', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Parent', actionId: 'parent', enabled: true, hasSubmenu: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const fillTextSpy = vi.spyOn(ctx, 'fillText');

      renderer.render(items, 400, 300);

      // Should render arrow or indicator for submenu
      expect(fillTextSpy).toHaveBeenCalledWith(expect.stringMatching(/[›→▶]/), expect.any(Number), expect.any(Number));
    });
  });

  describe('renderConnectorLine', () => {
    it('should draw line from menu center to target', () => {
      const strokeSpy = vi.spyOn(ctx, 'stroke');

      renderer.renderConnectorLine(400, 300, 500, 400);

      expect(strokeSpy).toHaveBeenCalled();
    });

    it('should use dashed line style', () => {
      const setLineDashSpy = vi.spyOn(ctx, 'setLineDash');

      renderer.renderConnectorLine(400, 300, 500, 400);

      expect(setLineDashSpy).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Number)]));
    });

    it('should use semi-transparent color', () => {
      const strokeStyleSpy = vi.spyOn(ctx, 'strokeStyle', 'set');

      renderer.renderConnectorLine(400, 300, 500, 400);

      const strokeStyle = strokeStyleSpy.mock.calls[0][0] as string;
      // Should contain alpha channel (rgba or hex with alpha)
      expect(strokeStyle.toLowerCase()).toMatch(/(rgba|#[0-9a-f]{8})/);
    });
  });

  describe('renderOpenAnimation', () => {
    it('should animate menu opening with rotate_in style', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const rotateSpy = vi.spyOn(ctx, 'rotate');

      renderer.renderOpenAnimation(items, 400, 300, 'rotate_in', 0.5);

      expect(rotateSpy).toHaveBeenCalled();
    });

    it('should animate menu opening with scale style', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const scaleSpy = vi.spyOn(ctx, 'scale');

      renderer.renderOpenAnimation(items, 400, 300, 'scale', 0.5);

      // Should scale from 0 to 1
      expect(scaleSpy).toHaveBeenCalledWith(expect.closeTo(0.5, 1), expect.closeTo(0.5, 1));
    });

    it('should animate menu opening with fade style', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const globalAlphaSpy = vi.spyOn(ctx, 'globalAlpha', 'set');

      renderer.renderOpenAnimation(items, 400, 300, 'fade', 0.5);

      expect(globalAlphaSpy).toHaveBeenCalledWith(expect.closeTo(0.5, 1));
    });
  });

  describe('renderCloseAnimation', () => {
    it('should animate menu closing with fade style', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const globalAlphaSpy = vi.spyOn(ctx, 'globalAlpha', 'set');

      // Progress 0.5 = halfway through close = alpha 0.5
      renderer.renderCloseAnimation(items, 400, 300, 'fade', 0.5);

      expect(globalAlphaSpy).toHaveBeenCalledWith(expect.closeTo(0.5, 1));
    });
  });

  describe('hitTest', () => {
    it('should detect click within item arc', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const menuX = 400;
      const menuY = 300;

      // Click in the middle of the item arc (45 degrees, radius 65)
      const angle = 45 * Math.PI / 180;
      const radius = 65;
      const clickX = menuX + radius * Math.cos(angle);
      const clickY = menuY + radius * Math.sin(angle);

      const hitItem = renderer.hitTest(items, menuX, menuY, clickX, clickY);

      expect(hitItem).toBe('1');
    });

    it('should return null for click outside menu', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const menuX = 400;
      const menuY = 300;

      // Click far from menu
      const hitItem = renderer.hitTest(items, menuX, menuY, 100, 100);

      expect(hitItem).toBeNull();
    });

    it('should return null for click in dead zone (inner radius)', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const menuX = 400;
      const menuY = 300;

      // Click in dead zone (radius 20 < innerRadius 30)
      const angle = 45 * Math.PI / 180;
      const radius = 20;
      const clickX = menuX + radius * Math.cos(angle);
      const clickY = menuY + radius * Math.sin(angle);

      const hitItem = renderer.hitTest(items, menuX, menuY, clickX, clickY);

      expect(hitItem).toBeNull();
    });

    it('should return null for click outside outer radius', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 }
      ];

      const menuX = 400;
      const menuY = 300;

      // Click outside outer radius (radius 120 > outerRadius 100)
      const angle = 45 * Math.PI / 180;
      const radius = 120;
      const clickX = menuX + radius * Math.cos(angle);
      const clickY = menuY + radius * Math.sin(angle);

      const hitItem = renderer.hitTest(items, menuX, menuY, clickX, clickY);

      expect(hitItem).toBeNull();
    });

    it('should return correct item for multiple items', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Item 1', actionId: 'action1', enabled: true, startAngle: 0, endAngle: 90, innerRadius: 30, outerRadius: 100 },
        { id: '2', label: 'Item 2', actionId: 'action2', enabled: true, startAngle: 90, endAngle: 180, innerRadius: 30, outerRadius: 100 },
        { id: '3', label: 'Item 3', actionId: 'action3', enabled: true, startAngle: 180, endAngle: 270, innerRadius: 30, outerRadius: 100 },
        { id: '4', label: 'Item 4', actionId: 'action4', enabled: true, startAngle: 270, endAngle: 360, innerRadius: 30, outerRadius: 100 }
      ];

      const menuX = 400;
      const menuY = 300;

      // Click in item 2 (135 degrees)
      const angle = 135 * Math.PI / 180;
      const radius = 65;
      const clickX = menuX + radius * Math.cos(angle);
      const clickY = menuY + radius * Math.sin(angle);

      const hitItem = renderer.hitTest(items, menuX, menuY, clickX, clickY);

      expect(hitItem).toBe('2');
    });
  });

  describe('adjustPositionForScreen', () => {
    it('should adjust menu position when near right edge', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const menuRadius = 100;

      // Menu at right edge
      const adjusted = renderer.adjustPositionForScreen(750, 300, menuRadius, canvasWidth, canvasHeight);

      // Should be moved left
      expect(adjusted.x).toBeLessThan(750);
      expect(adjusted.x).toBeGreaterThanOrEqual(menuRadius);
    });

    it('should adjust menu position when near bottom edge', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const menuRadius = 100;

      // Menu at bottom edge
      const adjusted = renderer.adjustPositionForScreen(400, 570, menuRadius, canvasWidth, canvasHeight);

      // Should be moved up
      expect(adjusted.y).toBeLessThan(570);
      expect(adjusted.y).toBeGreaterThanOrEqual(menuRadius);
    });

    it('should not adjust position when menu fits on screen', () => {
      const canvasWidth = 800;
      const canvasHeight = 600;
      const menuRadius = 100;

      // Menu in center
      const adjusted = renderer.adjustPositionForScreen(400, 300, menuRadius, canvasWidth, canvasHeight);

      expect(adjusted.x).toBe(400);
      expect(adjusted.y).toBe(300);
    });
  });

  describe('error handling', () => {
    it('should throw when rendering without context', () => {
      expect(() => {
        new ContextMenuRenderer(null as any);
      }).toThrow('context');
    });

    it('should throw when calculating angles with empty items array', () => {
      expect(() => {
        renderer.calculateArcAngles([], 30, 100);
      }).toThrow('items');
    });

    it('should throw when inner radius >= outer radius', () => {
      const items: RadialMenuItem[] = [
        { id: '1', label: 'Test', actionId: 'test', enabled: true }
      ];

      expect(() => {
        renderer.calculateArcAngles(items, 100, 30);
      }).toThrow('radius');
    });
  });
});
