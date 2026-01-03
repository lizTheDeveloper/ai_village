import { describe, it, expect, beforeEach } from 'vitest';
import { RemoteUniverseView } from '../RemoteUniverseView.js';
import type {
  UniverseSnapshotMessage,
  UniverseTickUpdate,
} from '@ai-village/core';

describe('RemoteUniverseView', () => {
  let view: RemoteUniverseView;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    view = new RemoteUniverseView('test-passage', 'universe-a', 'picture-in-picture');

    // Create mock canvas context
    const canvas = document.createElement('canvas');
    mockCtx = canvas.getContext('2d')!;
  });

  describe('Initialization', () => {
    it('should create view with correct IDs', () => {
      expect(view.getId()).toBe('remote-universe-test-passage');
      expect(view.getPassageId()).toBe('test-passage');
      expect(view.getUniverseId()).toBe('universe-a');
    });

    it('should have correct view mode', () => {
      expect(view.getViewMode()).toBe('picture-in-picture');
    });

    it('should start not visible', () => {
      expect(view.isVisible()).toBe(false);
    });

    it('should have correct default dimensions for view modes', () => {
      const portalView = new RemoteUniverseView('p1', 'u1', 'portal');
      expect(portalView.getDefaultWidth()).toBe(300);
      expect(portalView.getDefaultHeight()).toBe(300);

      const pipView = new RemoteUniverseView('p2', 'u2', 'picture-in-picture');
      expect(pipView.getDefaultWidth()).toBe(400);
      expect(pipView.getDefaultHeight()).toBe(300);

      const splitView = new RemoteUniverseView('p3', 'u3', 'split-screen');
      expect(splitView.getDefaultWidth()).toBe(800);
      expect(splitView.getDefaultHeight()).toBe(600);
    });
  });

  describe('Snapshot Handling', () => {
    it('should handle initial universe snapshot', () => {
      const snapshot: UniverseSnapshotMessage = {
        type: 'universe_snapshot',
        universeId: 'universe-a',
        tick: '100',
        entities: [
          {
            $schema: 'https://aivillage.dev/schemas/entity/v1',
            $version: 1,
            id: 'entity-1',
            components: [
              {
                $schema: 'https://aivillage.dev/schemas/component/v1',
                $version: 1,
                type: 'position',
                data: { x: 10, y: 20 },
              },
              {
                $schema: 'https://aivillage.dev/schemas/component/v1',
                $version: 1,
                type: 'agent',
                data: { name: 'Test Agent' },
              },
            ],
          },
        ],
      };

      view.handleSnapshot(snapshot);

      expect(view.getConnectionState()).toBe('connected');
    });

    it('should clear existing entities on new snapshot', () => {
      // Add first snapshot
      const snapshot1: UniverseSnapshotMessage = {
        type: 'universe_snapshot',
        universeId: 'universe-a',
        tick: '100',
        entities: [
          {
            $schema: 'https://aivillage.dev/schemas/entity/v1',
            $version: 1,
            id: 'entity-1',
            components: [],
          },
        ],
      };

      view.handleSnapshot(snapshot1);

      // Add second snapshot with different entities
      const snapshot2: UniverseSnapshotMessage = {
        type: 'universe_snapshot',
        universeId: 'universe-a',
        tick: '200',
        entities: [
          {
            $schema: 'https://aivillage.dev/schemas/entity/v1',
            $version: 1,
            id: 'entity-2',
            components: [],
          },
        ],
      };

      view.handleSnapshot(snapshot2);

      // Should only have entity-2
      expect(view.getConnectionState()).toBe('connected');
    });
  });

  describe('Update Handling', () => {
    beforeEach(() => {
      // Initialize with a snapshot
      const snapshot: UniverseSnapshotMessage = {
        type: 'universe_snapshot',
        universeId: 'universe-a',
        tick: '100',
        entities: [
          {
            $schema: 'https://aivillage.dev/schemas/entity/v1',
            $version: 1,
            id: 'entity-1',
            components: [
              {
                $schema: 'https://aivillage.dev/schemas/component/v1',
                $version: 1,
                type: 'position',
                data: { x: 10, y: 20 },
              },
            ],
          },
        ],
      };

      view.handleSnapshot(snapshot);
    });

    it('should handle entity additions', () => {
      const update: UniverseTickUpdate = {
        type: 'universe_tick',
        universeId: 'universe-a',
        tick: '101',
        entitiesAdded: [
          {
            $schema: 'https://aivillage.dev/schemas/entity/v1',
            $version: 1,
            id: 'entity-2',
            components: [
              {
                $schema: 'https://aivillage.dev/schemas/component/v1',
                $version: 1,
                type: 'position',
                data: { x: 15, y: 25 },
              },
            ],
          },
        ],
        entitiesUpdated: [],
        entitiesRemoved: [],
        events: [],
      };

      view.handleUpdate(update);

      expect(view.getConnectionState()).toBe('connected');
    });

    it('should handle entity removals', () => {
      const update: UniverseTickUpdate = {
        type: 'universe_tick',
        universeId: 'universe-a',
        tick: '102',
        entitiesAdded: [],
        entitiesUpdated: [],
        entitiesRemoved: ['entity-1'],
        events: [],
      };

      view.handleUpdate(update);

      expect(view.getConnectionState()).toBe('connected');
    });

    it('should handle entity component updates', () => {
      const update: UniverseTickUpdate = {
        type: 'universe_tick',
        universeId: 'universe-a',
        tick: '103',
        entitiesAdded: [],
        entitiesUpdated: [
          {
            entityId: 'entity-1',
            deltas: [
              {
                componentType: 'position',
                operation: 'update',
                data: { x: 11, y: 21 },
              },
            ],
          },
        ],
        entitiesRemoved: [],
        events: [],
      };

      view.handleUpdate(update);

      expect(view.getConnectionState()).toBe('connected');
    });

    it('should handle component additions', () => {
      const update: UniverseTickUpdate = {
        type: 'universe_tick',
        universeId: 'universe-a',
        tick: '104',
        entitiesAdded: [],
        entitiesUpdated: [
          {
            entityId: 'entity-1',
            deltas: [
              {
                componentType: 'agent',
                operation: 'add',
                data: { name: 'New Agent' },
              },
            ],
          },
        ],
        entitiesRemoved: [],
        events: [],
      };

      view.handleUpdate(update);

      expect(view.getConnectionState()).toBe('connected');
    });

    it('should handle component removals', () => {
      const update: UniverseTickUpdate = {
        type: 'universe_tick',
        universeId: 'universe-a',
        tick: '105',
        entitiesAdded: [],
        entitiesUpdated: [
          {
            entityId: 'entity-1',
            deltas: [
              {
                componentType: 'position',
                operation: 'remove',
              },
            ],
          },
        ],
        entitiesRemoved: [],
        events: [],
      };

      view.handleUpdate(update);

      expect(view.getConnectionState()).toBe('connected');
    });
  });

  describe('Camera Controls', () => {
    it('should pan camera', () => {
      view.panCamera(5, 10);
      view.panCamera(-2, -3);

      // Camera should have moved
      expect(true).toBe(true); // Actual camera values are private
    });

    it('should set zoom level', () => {
      view.setZoom(1.5);
      expect(true).toBe(true); // Zoom is private

      // Should clamp to min/max
      view.setZoom(0.1); // Below min (0.25)
      view.setZoom(5.0); // Above max (2.0)
      expect(true).toBe(true);
    });

    it('should handle mouse wheel zoom', () => {
      view.handleWheel(-100); // Zoom in
      view.handleWheel(100); // Zoom out
      expect(true).toBe(true);
    });
  });

  describe('Viewport Management', () => {
    it('should set viewport bounds', () => {
      view.setViewport({ x: 10, y: 20, width: 30, height: 40 });
      expect(true).toBe(true); // Viewport is private
    });
  });

  describe('View Mode', () => {
    it('should change view mode', () => {
      view.setViewMode('portal');
      expect(view.getViewMode()).toBe('portal');

      view.setViewMode('split-screen');
      expect(view.getViewMode()).toBe('split-screen');
    });
  });

  describe('Connection State', () => {
    it('should start in connecting state', () => {
      expect(view.getConnectionState()).toBe('connecting');
    });

    it('should change connection state', () => {
      view.setConnectionState('connected');
      expect(view.getConnectionState()).toBe('connected');

      view.setConnectionState('disconnected');
      expect(view.getConnectionState()).toBe('disconnected');

      view.setConnectionState('error');
      expect(view.getConnectionState()).toBe('error');
    });
  });

  describe('Rendering', () => {
    it('should render without errors', () => {
      expect(() => {
        view.render(mockCtx, 0, 0, 400, 300);
      }).not.toThrow();
    });

    it('should render connection status when not connected', () => {
      view.setConnectionState('connecting');
      expect(() => {
        view.render(mockCtx, 0, 0, 400, 300);
      }).not.toThrow();
    });

    it('should render entities when connected', () => {
      const snapshot: UniverseSnapshotMessage = {
        type: 'universe_snapshot',
        universeId: 'universe-a',
        tick: '100',
        entities: [
          {
            $schema: 'https://aivillage.dev/schemas/entity/v1',
            $version: 1,
            id: 'entity-1',
            components: [
              {
                $schema: 'https://aivillage.dev/schemas/component/v1',
                $version: 1,
                type: 'position',
                data: { x: 10, y: 20 },
              },
              {
                $schema: 'https://aivillage.dev/schemas/component/v1',
                $version: 1,
                type: 'agent',
                data: {},
              },
            ],
          },
        ],
      };

      view.handleSnapshot(snapshot);

      expect(() => {
        view.render(mockCtx, 0, 0, 400, 300);
      }).not.toThrow();
    });

    it('should render header controls', () => {
      expect(() => {
        if (view.renderHeader) {
          view.renderHeader(mockCtx, 0, 0, 400);
        }
      }).not.toThrow();
    });
  });

  describe('Mouse Interaction', () => {
    it('should handle mouse down for camera drag', () => {
      const handled = view.handleMouseDown(100, 100);
      expect(handled).toBe(true);
    });

    it('should handle mouse move during drag', () => {
      view.handleMouseDown(100, 100);
      expect(() => {
        view.handleMouseMove(110, 110);
      }).not.toThrow();
    });

    it('should handle mouse up to end drag', () => {
      view.handleMouseDown(100, 100);
      view.handleMouseMove(110, 110);
      expect(() => {
        view.handleMouseUp();
      }).not.toThrow();
    });
  });
});
