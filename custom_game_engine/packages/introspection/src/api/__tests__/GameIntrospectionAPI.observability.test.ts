/**
 * Tests for GameIntrospectionAPI observability methods (watchEntity, getMutationHistory)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameIntrospectionAPI } from '../GameIntrospectionAPI.js';
import { ComponentRegistry } from '../../registry/ComponentRegistry.js';
import { MutationService } from '../../mutation/MutationService.js';
import type { World, Entity } from '@ai-village/core';
import type { EntityChangeEvent } from '../../types/IntrospectionTypes.js';

// Mock World
function createMockWorld(): World {
  const entities = new Map<string, Entity>();

  const world = {
    tick: 100,
    getEntity: (id: string) => entities.get(id),
    query: () => ({
      with: () => ({ executeEntities: () => [] }),
      executeEntities: () => [],
    }),
  } as any;

  return world;
}

// Mock Entity
function createMockEntity(id: string, components: Map<string, any>): Entity {
  return {
    id,
    components,
    hasComponent: (type: string) => components.has(type),
    getComponent: (type: string) => components.get(type),
    updateComponent: (type: string, updater: (current: any) => any) => {
      const current = components.get(type);
      if (current) {
        components.set(type, updater(current));
      }
    },
  } as any;
}

describe('GameIntrospectionAPI - Observability', () => {
  let world: World;
  let api: GameIntrospectionAPI;

  beforeEach(() => {
    world = createMockWorld();
    api = new GameIntrospectionAPI(
      world,
      ComponentRegistry,
      MutationService,
      null, // metricsAPI
      null  // liveEntityAPI
    );
  });

  describe('watchEntity', () => {
    it('should watch entity changes and call onChange callback', async () => {
      // Setup entity
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5, energy: 0.8 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      // Watch entity
      const events: EntityChangeEvent[] = [];
      const unsubscribe = api.watchEntity(entityId, {
        onChange: (event) => {
          events.push(event);
        },
      });

      // Register schema for needs component
      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            range: { min: 0, max: 1 },
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // Perform mutation
      const result = await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.7,
      });

      // Debug: check mutation result
      console.log('Mutation success:', result.success);
      console.log('Mutation errors:', result.validationErrors);
      console.log('Old value:', result.oldValue);
      console.log('New value:', result.newValue);
      console.log('Events received:', events.length);

      // Mutation should have succeeded
      expect(result.success).toBe(true);

      // Check that onChange was called
      expect(events.length).toBe(1);
      expect(events[0].entityId).toBe(entityId);
      expect(events[0].changes.length).toBe(1);
      expect(events[0].changes[0].componentType).toBe('needs');
      expect(events[0].changes[0].field).toBe('hunger');
      expect(events[0].changes[0].oldValue).toBe(0.5);
      expect(events[0].changes[0].newValue).toBe(0.7);

      // Unsubscribe
      unsubscribe();
    });

    it('should filter by components', async () => {
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5 }],
        ['health', { current: 100 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const events: EntityChangeEvent[] = [];
      const unsubscribe = api.watchEntity(entityId, {
        components: ['needs'], // Only watch 'needs'
        onChange: (event) => {
          events.push(event);
        },
      });

      // Register schemas
      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      ComponentRegistry.register({
        type: 'health',
        category: 'vitals',
        description: 'Entity health',
        fields: {
          current: {
            type: 'number',
            description: 'Current health',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // Mutate 'needs' - should trigger
      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.7,
      });

      // Mutate 'health' - should NOT trigger
      await api.mutateField({
        entityId,
        componentType: 'health',
        field: 'current',
        value: 90,
      });

      // Only the 'needs' mutation should have triggered
      expect(events.length).toBe(1);
      expect(events[0].changes[0].componentType).toBe('needs');

      unsubscribe();
    });

    it('should throttle notifications', async () => {
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const events: EntityChangeEvent[] = [];
      const unsubscribe = api.watchEntity(entityId, {
        onChange: (event) => {
          events.push(event);
        },
        throttle: 1000, // 1 second throttle
      });

      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // First mutation - should trigger
      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.6,
      });

      // Second mutation immediately after - should be throttled
      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.7,
      });

      // Only first mutation should have triggered
      expect(events.length).toBe(1);

      unsubscribe();
    });

    it('should unsubscribe and stop watching', async () => {
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      const events: EntityChangeEvent[] = [];
      const unsubscribe = api.watchEntity(entityId, {
        onChange: (event) => {
          events.push(event);
        },
      });

      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // Unsubscribe before any mutations
      unsubscribe();

      // Perform mutation - should NOT trigger
      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.7,
      });

      expect(events.length).toBe(0);
    });
  });

  describe('getMutationHistory', () => {
    it('should return mutation history', async () => {
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // Perform some mutations
      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.6,
      });

      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.7,
      });

      // Get history
      const history = await api.getMutationHistory({
        entityId,
      });

      // Should have 2 mutations
      expect(history.length).toBe(2);
      expect(history[0].entityId).toBe(entityId);
      expect(history[0].componentType).toBe('needs');
      expect(history[0].field).toBe('hunger');
    });

    it('should filter by component type', async () => {
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5 }],
        ['health', { current: 100 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      ComponentRegistry.register({
        type: 'health',
        category: 'vitals',
        description: 'Entity health',
        fields: {
          current: {
            type: 'number',
            description: 'Current health',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // Mutate both components
      await api.mutateField({
        entityId,
        componentType: 'needs',
        field: 'hunger',
        value: 0.7,
      });

      await api.mutateField({
        entityId,
        componentType: 'health',
        field: 'current',
        value: 90,
      });

      // Get history for only 'needs'
      const history = await api.getMutationHistory({
        componentType: 'needs',
      });

      // Should only have 'needs' mutations
      history.forEach((entry) => {
        expect(entry.componentType).toBe('needs');
      });
    });

    it('should apply limit', async () => {
      const entityId = 'test-entity';
      const components = new Map([
        ['needs', { hunger: 0.5 }],
      ]);
      const entity = createMockEntity(entityId, components);
      (world as any).getEntity = (id: string) => id === entityId ? entity : undefined;

      ComponentRegistry.register({
        type: 'needs',
        category: 'vitals',
        description: 'Entity needs',
        fields: {
          hunger: {
            type: 'number',
            description: 'Hunger level',
            mutable: true,
            visibility: { full: true, llm: true, player: true },
          },
        },
      });

      // Perform 5 mutations
      for (let i = 0; i < 5; i++) {
        await api.mutateField({
          entityId,
          componentType: 'needs',
          field: 'hunger',
          value: 0.5 + i * 0.1,
        });
      }

      // Get history with limit of 2
      const history = await api.getMutationHistory({
        limit: 2,
      });

      // Should only have 2 entries (most recent)
      expect(history.length).toBe(2);
    });
  });
});
