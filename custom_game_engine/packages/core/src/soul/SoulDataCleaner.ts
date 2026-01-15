/**
 * SoulDataCleaner - Utility to clean corrupted LLM thinking content from soul data
 *
 * Problem: LLM responses sometimes include incomplete <think> or <thinking> tags
 * that leak into soul purpose/destiny fields. This cleaner removes them.
 *
 * Usage:
 * - Run on individual souls: cleanSoulData(soulEntity)
 * - Run on all souls in world: cleanAllSoulsInWorld(world)
 * - Run as migration: Called automatically on save load
 */

import type { Entity } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';

/**
 * Strip all thinking tags (complete and incomplete) from text
 */
export function stripThinkingTags(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text
    // Remove complete thinking blocks
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Remove incomplete thinking blocks (no closing tag)
    .replace(/<thinking>[\s\S]*$/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

/**
 * Check if text contains thinking tags (corrupted)
 */
export function hasThinkingTags(text: string | undefined): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return text.includes('<think') || text.includes('<Think');
}

/**
 * Extract clean content from corrupted soul field
 * If the field is entirely thinking content with no actual response,
 * return undefined so the game can regenerate it
 */
export function extractCleanContent(corruptedText: string): string | undefined {
  const cleaned = stripThinkingTags(corruptedText);

  // If nothing remains after stripping, the field was entirely thinking content
  if (!cleaned || cleaned.length === 0) {
    return undefined;
  }

  return cleaned;
}

/**
 * Clean a single soul's corrupted data
 * Returns true if cleaning was performed
 */
export function cleanSoulData(soul: Entity): boolean {
  const soulIdentity = soul.getComponent('soul_identity') as SoulIdentityComponent | undefined;

  if (!soulIdentity) {
    return false;
  }

  let wasCleaned = false;

  // Check and clean purpose field
  if (hasThinkingTags(soulIdentity.purpose)) {
    const originalPurpose = soulIdentity.purpose;
    const cleanedPurpose = extractCleanContent(soulIdentity.purpose);

    if (cleanedPurpose) {
      soulIdentity.purpose = cleanedPurpose;
      console.log(`[SoulDataCleaner] Cleaned purpose for soul ${soulIdentity.soulName}`);
      console.log(`  Before: ${originalPurpose.substring(0, 100)}...`);
      console.log(`  After: ${cleanedPurpose}`);
      wasCleaned = true;
    } else {
      // Purpose was entirely thinking content - set a fallback
      soulIdentity.purpose = `To find their place in the world`;
      console.warn(`[SoulDataCleaner] Soul ${soulIdentity.soulName} purpose was entirely thinking content, set fallback`);
      wasCleaned = true;
    }
  }

  // Check and clean destiny field
  if (soulIdentity.destiny && hasThinkingTags(soulIdentity.destiny)) {
    const originalDestiny = soulIdentity.destiny;
    const cleanedDestiny = extractCleanContent(soulIdentity.destiny);

    if (cleanedDestiny) {
      soulIdentity.destiny = cleanedDestiny;
      console.log(`[SoulDataCleaner] Cleaned destiny for soul ${soulIdentity.soulName}`);
      console.log(`  Before: ${originalDestiny.substring(0, 100)}...`);
      console.log(`  After: ${cleanedDestiny}`);
      wasCleaned = true;
    } else {
      // Destiny was entirely thinking content - remove it (destiny is optional)
      soulIdentity.destiny = undefined;
      console.warn(`[SoulDataCleaner] Soul ${soulIdentity.soulName} destiny was entirely thinking content, removed`);
      wasCleaned = true;
    }
  }

  return wasCleaned;
}

/**
 * Clean all souls in a world
 * Returns count of souls that were cleaned
 */
export function cleanAllSoulsInWorld(world: World): number {
  const souls = world.query()
    .with('soul_identity' as any)
    .executeEntities();

  let cleanedCount = 0;

  for (const soul of souls) {
    if (cleanSoulData(soul)) {
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[SoulDataCleaner] ✅ Cleaned ${cleanedCount} corrupted souls`);
  } else {
    console.log(`[SoulDataCleaner] No corrupted souls found`);
  }

  return cleanedCount;
}

/**
 * Scan for corrupted souls without cleaning (diagnostic)
 * Returns list of corrupted souls
 */
export function scanForCorruptedSouls(world: World): Array<{
  soulId: string;
  soulName: string;
  purposeCorrupted: boolean;
  destinyCorrupted: boolean;
}> {
  const souls = world.query()
    .with('soul_identity' as any)
    .executeEntities();

  const corrupted: Array<{
    soulId: string;
    soulName: string;
    purposeCorrupted: boolean;
    destinyCorrupted: boolean;
  }> = [];

  for (const soul of souls) {
    const soulIdentity = soul.getComponent('soul_identity') as SoulIdentityComponent | undefined;

    if (!soulIdentity) continue;

    const purposeCorrupted = hasThinkingTags(soulIdentity.purpose);
    const destinyCorrupted = soulIdentity.destiny ? hasThinkingTags(soulIdentity.destiny) : false;

    if (purposeCorrupted || destinyCorrupted) {
      corrupted.push({
        soulId: soul.id,
        soulName: soulIdentity.soulName,
        purposeCorrupted,
        destinyCorrupted,
      });
    }
  }

  return corrupted;
}
