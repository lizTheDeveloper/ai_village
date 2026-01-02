/**
 * Portal Spawning Dev Tool
 * Creates bidirectional portals between two running universes
 */

import { createPassageComponent, type PassageType } from '../packages/core/src/components/PassageComponent.js';
import { ComponentType as CT } from '../packages/core/src/types/ComponentType.js';

interface PortalConfig {
  /** Source universe session ID */
  sourceUniverse: string;

  /** Target universe session ID */
  targetUniverse: string;

  /** Portal type */
  type?: PassageType;

  /** Position in source universe */
  sourcePosition: { x: number; y: number; z?: number };

  /** Position in target universe */
  targetPosition: { x: number; y: number; z?: number };

  /** Portal metadata */
  metadata?: {
    name?: string;
    description?: string;
  };
}

/**
 * Send action request to metrics server
 */
async function sendAction(action: string, params: Record<string, unknown>): Promise<any> {
  const response = await fetch('http://localhost:8766/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Action failed: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Spawn a portal entity in a universe
 */
async function spawnPortal(universeId: string, portal: {
  passageId: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  passageType: PassageType;
  position: { x: number; y: number; z?: number };
  metadata?: { name?: string; description?: string };
}): Promise<string> {
  console.log(`[Portal] Spawning portal in ${universeId}...`);

  const result = await sendAction('spawn_entity', {
    session: universeId,
    entityType: 'portal',
    components: {
      position: {
        type: CT.Position,
        version: 1,
        x: portal.position.x,
        y: portal.position.y,
        z: portal.position.z || 0,
      },
      passage: createPassageComponent(
        portal.passageId,
        portal.sourceUniverseId,
        portal.targetUniverseId,
        portal.passageType,
        portal.metadata?.description ? {
          x: portal.position.x,
          y: portal.position.y,
          z: portal.position.z || 0
        } : undefined
      ),
    },
    metadata: portal.metadata,
  });

  console.log(`   ✓ Created portal entity: ${result.entityId}`);
  return result.entityId;
}

/**
 * Create bidirectional portals between two universes
 */
async function createPortalPair(config: PortalConfig): Promise<void> {
  console.log('=== Portal Creation ===\n');
  console.log(`Connecting: ${config.sourceUniverse} <-> ${config.targetUniverse}`);
  console.log(`Type: ${config.type || 'bridge'}\n`);

  const passageType = config.type || 'bridge';
  const passageId = `portal_${Date.now()}`;

  // Create portal A->B in source universe
  console.log('[1] Creating portal A->B...');
  const portalAB = await spawnPortal(config.sourceUniverse, {
    passageId: `${passageId}_AB`,
    sourceUniverseId: config.sourceUniverse,
    targetUniverseId: config.targetUniverse,
    passageType,
    position: config.sourcePosition,
    metadata: {
      name: config.metadata?.name || `Portal to ${config.targetUniverse}`,
      description: `Leads to ${config.targetUniverse} at (${config.targetPosition.x}, ${config.targetPosition.y})`,
    },
  });

  // Create portal B->A in target universe
  console.log('\n[2] Creating portal B->A...');
  const portalBA = await spawnPortal(config.targetUniverse, {
    passageId: `${passageId}_BA`,
    sourceUniverseId: config.targetUniverse,
    targetUniverseId: config.sourceUniverse,
    passageType,
    position: config.targetPosition,
    metadata: {
      name: config.metadata?.name || `Portal to ${config.sourceUniverse}`,
      description: `Leads to ${config.sourceUniverse} at (${config.sourcePosition.x}, ${config.sourcePosition.y})`,
    },
  });

  console.log('\n✅ Bidirectional portal created!');
  console.log(`   ${config.sourceUniverse} (${config.sourcePosition.x}, ${config.sourcePosition.y}) <-> ${config.targetUniverse} (${config.targetPosition.x}, ${config.targetPosition.y})`);
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
Portal Spawning Dev Tool

Usage:
  npx tsx scripts/spawn-portal.ts <source> <target> [type]

Arguments:
  source    Source universe session ID
  target    Target universe session ID
  type      Portal type: thread | bridge | gate | confluence (default: bridge)

Example:
  npx tsx scripts/spawn-portal.ts universe_alpha universe_beta bridge

This will create bidirectional portals at default positions (50, 50).
  `);
  process.exit(0);
}

const [sourceUniverse, targetUniverse, type] = args;

createPortalPair({
  sourceUniverse,
  targetUniverse,
  type: (type as PassageType) || 'bridge',
  sourcePosition: { x: 50, y: 50, z: 0 },
  targetPosition: { x: 50, y: 50, z: 0 },
  metadata: {
    name: `Portal ${sourceUniverse} <-> ${targetUniverse}`,
  },
}).catch((error) => {
  console.error('Portal creation failed:', error);
  process.exit(1);
});
