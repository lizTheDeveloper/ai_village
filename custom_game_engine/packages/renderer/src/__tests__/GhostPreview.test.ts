/**
 * GhostPreview Tests
 *
 * Tests for the GhostPreview class that manages ghost preview state
 * during building placement mode.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GhostPreview } from '../GhostPreview.js';
import type { BuildingBlueprint, PlacementValidationResult } from '@ai-village/core';

// Mock canvas context
function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createTestBlueprint(overrides: Partial<BuildingBlueprint> = {}): BuildingBlueprint {
  return {
    id: 'test-building',
    name: 'Test Building',
    description: 'A test building',
    category: 'residential',
    width: 1,
    height: 1,
    resourceCost: [],
    techRequired: [],
    terrainRequired: ['grass'],
    terrainForbidden: ['water'],
    unlocked: true,
    buildTime: 10,
    tier: 1,
    functionality: [],
    canRotate: true,
    rotationAngles: [0, 90, 180, 270],
    snapToGrid: true,
    requiresFoundation: false,
    ...overrides,
  };
}

describe('GhostPreview', () => {
  let ghost: GhostPreview;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
    ghost = new GhostPreview();
  });

  describe('REQ-BPLACE-002: Ghost Preview Creation', () => {
    it('should initialize with a blueprint', () => {
      const blueprint = createTestBlueprint();

      ghost.setBlueprint(blueprint);

      expect(ghost.getBlueprint()).toBe(blueprint);
      expect(ghost.isActive()).toBe(true);
    });

    it('should throw when setting null blueprint', () => {
      expect(() => ghost.setBlueprint(null as any)).toThrow(
        'Blueprint is required to create ghost preview'
      );
    });

    it('should clear ghost when blueprint is removed', () => {
      ghost.setBlueprint(createTestBlueprint());
      ghost.clear();

      expect(ghost.isActive()).toBe(false);
      expect(ghost.getBlueprint()).toBeUndefined();
    });
  });

  describe('REQ-BPLACE-002: Ghost Position Updates', () => {
    beforeEach(() => {
      ghost.setBlueprint(createTestBlueprint());
    });

    it('should snap position to grid when snapToGrid is true', () => {
      ghost.setBlueprint(createTestBlueprint({ snapToGrid: true }));
      ghost.updatePosition({ x: 17, y: 33 });

      const position = ghost.getPosition();
      // Should snap to 16px grid
      expect(position.x).toBe(16);
      expect(position.y).toBe(32);
    });

    it('should not snap when snapToGrid is false', () => {
      ghost.setBlueprint(createTestBlueprint({ snapToGrid: false }));
      ghost.updatePosition({ x: 17, y: 33 });

      const position = ghost.getPosition();
      expect(position).toEqual({ x: 17, y: 33 });
    });
  });

  describe('REQ-BPLACE-004: Rotation Controls', () => {
    beforeEach(() => {
      ghost.setBlueprint(
        createTestBlueprint({
          canRotate: true,
          rotationAngles: [0, 90, 180, 270],
        })
      );
    });

    it('should rotate clockwise by 90 degrees', () => {
      expect(ghost.getRotation()).toBe(0);

      ghost.rotateClockwise();

      expect(ghost.getRotation()).toBe(90);
    });

    it('should wrap rotation at 360 degrees', () => {
      ghost.setRotation(270);
      ghost.rotateClockwise();

      expect(ghost.getRotation()).toBe(0);
    });

    it('should rotate counter-clockwise', () => {
      ghost.setRotation(90);
      ghost.rotateCounterClockwise();

      expect(ghost.getRotation()).toBe(0);
    });

    it('should wrap counter-clockwise rotation at 0 degrees', () => {
      ghost.setRotation(0);
      ghost.rotateCounterClockwise();

      expect(ghost.getRotation()).toBe(270);
    });

    it('should only allow rotation angles defined in blueprint', () => {
      // Blueprint only allows [0, 90, 180, 270]
      expect(() => ghost.setRotation(45)).toThrow(
        'Rotation 45 is not allowed for this building'
      );
    });

    it('should not rotate when canRotate is false', () => {
      ghost.setBlueprint(createTestBlueprint({ canRotate: false, rotationAngles: [0] }));

      ghost.rotateClockwise();

      expect(ghost.getRotation()).toBe(0);
    });
  });

  describe('REQ-BPLACE-002 & REQ-BPLACE-005: Validity State', () => {
    beforeEach(() => {
      ghost.setBlueprint(createTestBlueprint());
    });

    it('should set validity to valid with green tint', () => {
      const validResult: PlacementValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
      };

      ghost.setValidity(validResult);

      expect(ghost.isValid()).toBe(true);
      expect(ghost.getTintColor()).toEqual({ r: 0, g: 255, b: 0, a: 0.3 });
    });

    it('should set validity to invalid with red tint', () => {
      const invalidResult: PlacementValidationResult = {
        valid: false,
        errors: [
          { type: 'terrain_invalid', message: 'Cannot build on water', affectedTiles: [] },
        ],
        warnings: [],
      };

      ghost.setValidity(invalidResult);

      expect(ghost.isValid()).toBe(false);
      expect(ghost.getTintColor()).toEqual({ r: 255, g: 0, b: 0, a: 0.3 });
    });

    it('should store validation errors for tooltip display', () => {
      const errors = [
        { type: 'terrain_invalid' as const, message: 'Cannot build on water', affectedTiles: [] },
        { type: 'terrain_occupied' as const, message: 'Space occupied', affectedTiles: [] },
      ];

      ghost.setValidity({
        valid: false,
        errors,
        warnings: [],
      });

      expect(ghost.getErrors()).toEqual(errors);
    });
  });

  describe('State Management', () => {
    it('should return full state object', () => {
      const blueprint = createTestBlueprint();
      ghost.setBlueprint(blueprint);
      ghost.updatePosition({ x: 100, y: 200 });
      ghost.setRotation(90);

      const state = ghost.getState();

      expect(state.blueprint).toBe(blueprint);
      expect(state.position).toEqual({ x: 96, y: 192 }); // Snapped to grid
      expect(state.rotation).toBe(90);
      expect(state.isActive).toBe(true);
    });

    it('should return inactive state when no blueprint', () => {
      const state = ghost.getState();

      expect(state.isActive).toBe(false);
      expect(state.blueprint).toBeUndefined();
    });
  });

  describe('Error Handling (CLAUDE.md: No Silent Fallbacks)', () => {
    it('should throw when rendering without blueprint', () => {
      expect(() => ghost.render(ctx, { zoom: 1 })).toThrow(
        'Cannot render ghost without active blueprint'
      );
    });

    it('should throw when setting invalid rotation type', () => {
      ghost.setBlueprint(createTestBlueprint());

      expect(() => ghost.setRotation('north' as any)).toThrow(
        'Rotation must be a number'
      );
    });

    it('should throw when updating position without blueprint', () => {
      expect(() => ghost.updatePosition({ x: 0, y: 0 })).toThrow(
        'Cannot update position without active blueprint'
      );
    });
  });
});
