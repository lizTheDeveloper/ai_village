#!/usr/bin/env ts-node
/**
 * Find all emitted and subscribed events that are missing from EventMap.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SYSTEMS_PATH = path.join(__dirname, '../packages/core/src/systems');
const EVENTMAP_PATH = path.join(__dirname, '../packages/core/src/events/EventMap.ts');

// Read EventMap.ts and extract existing event types
function getExistingEvents(): Set<string> {
  const content = fs.readFileSync(EVENTMAP_PATH, 'utf-8');
  const eventPattern = /['"]([a-z_:]+)['"]\s*:/g;
  const events = new Set<string>();

  let match;
  while ((match = eventPattern.exec(content)) !== null) {
    events.add(match[1]);
  }

  return events;
}

// Find all emitted events
function findEmittedEvents(): Set<string> {
  const events = new Set<string>();

  // Find all .emit( calls with type: 'event_name'
  try {
    const result = execSync(
      `grep -r "eventBus.emit" "${SYSTEMS_PATH}" | grep -o "type: ['\\\"][^'\\\"]*['\\\"]"`,
      { encoding: 'utf-8' }
    );

    const matches = result.matchAll(/type:\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      events.add(match[1]);
    }
  } catch (e) {
    // Ignore errors
  }

  // Find .emit('event_name', ...) pattern
  try {
    const result = execSync(
      `grep -r "eventBus.emit" "${SYSTEMS_PATH}"`,
      { encoding: 'utf-8' }
    );

    const matches = result.matchAll(/\.emit\s*\(\s*['"]([a-z_:]+)['"]/g);
    for (const match of matches) {
      events.add(match[1]);
    }
  } catch (e) {
    // Ignore errors
  }

  return events;
}

// Find all subscribed events
function findSubscribedEvents(): Set<string> {
  const events = new Set<string>();

  try {
    const result = execSync(
      `grep -r "subscribe" "${SYSTEMS_PATH}" | grep -o "subscribe(['\\\"][a-z_:]*['\\\"]"`,
      { encoding: 'utf-8' }
    );

    const matches = result.matchAll(/subscribe\(['"]([a-z_:]+)['"]/g);
    for (const match of matches) {
      events.add(match[1]);
    }
  } catch (e) {
    // Ignore errors
  }

  return events;
}

// Main
const existing = getExistingEvents();
const emitted = findEmittedEvents();
const subscribed = findSubscribedEvents();

const allEvents = new Set([...emitted, ...subscribed]);
const missing = [...allEvents].filter(e => !existing.has(e)).sort();

console.log('=== Missing Events from EventMap.ts ===\n');
console.log(`Found ${existing.size} existing events`);
console.log(`Found ${emitted.size} emitted events`);
console.log(`Found ${subscribed.size} subscribed events`);
console.log(`Missing: ${missing.length} events\n`);

if (missing.length > 0) {
  console.log('Missing events:');
  missing.forEach(event => {
    console.log(`  - ${event}`);
  });
}
