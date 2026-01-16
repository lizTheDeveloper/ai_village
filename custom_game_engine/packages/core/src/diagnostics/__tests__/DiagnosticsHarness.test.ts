/**
 * Tests for DiagnosticsHarness
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { diagnosticsHarness, DiagnosticIssue } from '../DiagnosticsHarness.js';
import { wrapEntity, wrapComponent, wrapObject } from '../ProxyWrappers.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';

describe('DiagnosticsHarness', () => {
  beforeEach(() => {
    diagnosticsHarness.clear();
    diagnosticsHarness.setEnabled(true);
  });

  it('should track undefined property access on entities', () => {
    const eventBus = new EventBusImpl();
    const entity = new EntityImpl(createEntityId(), eventBus);
    const wrapped = wrapEntity(entity);

    // Access undefined property
    const value = (wrapped as any).nonExistentProperty;

    const issues = diagnosticsHarness.getIssues({ type: 'undefined_property' });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].property).toBe('nonExistentProperty');
    expect(issues[0].objectType).toBe('Entity');
  });

  it('should track undefined method calls on components', () => {
    const component = { type: 'position', x: 10, y: 20 };
    const wrapped = wrapComponent(component, 'position', 'test-entity');

    // Access undefined property
    const value = (wrapped as any).nonExistentField;

    const issues = diagnosticsHarness.getIssues({ type: 'undefined_property' });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].property).toBe('nonExistentField');
    expect(issues[0].objectType).toBe('Component:position');
    expect(issues[0].objectId).toBe('test-entity');
  });

  it('should deduplicate identical issues', () => {
    const obj = { validProp: 'test' };
    const wrapped = wrapObject(obj, 'TestObject', 'test-1');

    // Access same undefined property multiple times
    for (let i = 0; i < 5; i++) {
      const value = (wrapped as any).invalidProp;
    }

    const issues = diagnosticsHarness.getIssues();
    // Should be only 1 unique issue
    expect(issues.length).toBe(1);
    // But count should be 5
    expect(issues[0].count).toBe(5);
  });

  it('should provide property suggestions', () => {
    const obj = {
      validMethod: () => {},
      anotherMethod: () => {},
      similarName: 'test'
    };
    const wrapped = wrapObject(obj, 'TestObject');

    // Typo: "valdMethod" instead of "validMethod"
    const value = (wrapped as any).valdMethod;

    const issues = diagnosticsHarness.getIssues();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].context?.suggestions).toBeDefined();
    expect(issues[0].context?.suggestions).toContain('validMethod');
  });

  it('should filter issues by severity', () => {
    // Create some issues with entities (which report as errors)
    const eventBus = new EventBusImpl();
    const entity = new EntityImpl(createEntityId(), eventBus);
    const wrappedEntity = wrapEntity(entity);

    // This creates an error-level issue
    const value = (wrappedEntity as any).invalid;

    const errors = diagnosticsHarness.getIssues({ severity: 'error' });
    const warnings = diagnosticsHarness.getIssues({ severity: 'warning' });

    // Should have at least one error from entity
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should filter issues by minimum count', () => {
    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');

    // Access 10 times
    for (let i = 0; i < 10; i++) {
      const value = (wrapped as any).frequent;
    }

    // Access 2 times
    for (let i = 0; i < 2; i++) {
      const value = (wrapped as any).infrequent;
    }

    const allIssues = diagnosticsHarness.getIssues();
    expect(allIssues.length).toBe(2);

    const frequentIssues = diagnosticsHarness.getIssues({ minCount: 5 });
    expect(frequentIssues.length).toBe(1);
    expect(frequentIssues[0].property).toBe('frequent');
  });

  it('should respect suppression patterns', () => {
    diagnosticsHarness.suppressPattern('TestObject:suppressed');

    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');

    const suppressedValue = (wrapped as any).suppressedProperty;
    const normalValue = (wrapped as any).normalProperty;

    const issues = diagnosticsHarness.getIssues();
    // Should only have the normal property issue, not the suppressed one
    expect(issues.length).toBe(1);
    expect(issues[0].property).toBe('normalProperty');
  });

  it('should provide summary statistics', () => {
    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');

    // Create multiple issues
    for (let i = 0; i < 3; i++) {
      const v1 = (wrapped as any).issue1;
      const v2 = (wrapped as any).issue2;
    }

    const summary = diagnosticsHarness.getSummary();
    expect(summary.totalIssues).toBe(2);
    expect(summary.byType['undefined_property']).toBe(6); // 3 × 2 issues
    expect(summary.topIssues.length).toBe(2);
  });

  it('should clear all issues', () => {
    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');
    const value = (wrapped as any).invalid;

    expect(diagnosticsHarness.getIssues().length).toBeGreaterThan(0);

    diagnosticsHarness.clear();

    expect(diagnosticsHarness.getIssues().length).toBe(0);
  });

  it('should not track when disabled', () => {
    diagnosticsHarness.setEnabled(false);

    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');
    const value = (wrapped as any).invalid;

    expect(diagnosticsHarness.getIssues().length).toBe(0);
  });

  it('should sync with game tick', () => {
    diagnosticsHarness.setCurrentTick(1234);

    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');
    const value = (wrapped as any).invalid;

    const issues = diagnosticsHarness.getIssues();
    expect(issues[0].tick).toBe(1234);
  });

  it('should not wrap safe properties', () => {
    const obj = { valid: 'test' };
    const wrapped = wrapObject(obj, 'TestObject');

    // These should not create issues (safe properties)
    const promiseCheck = (wrapped as any).then;
    const toStringCheck = (wrapped as any).toString;
    const constructorCheck = (wrapped as any).constructor;

    expect(diagnosticsHarness.getIssues().length).toBe(0);
  });
});
