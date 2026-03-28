export interface StarChartEntry {
  starId: string;
  visitedAt: number;           // game-time tick of observation
  observerShipId: string;
  hazards?: string[];
  /** Species IDs stored as SHA-256-style hashes; use revealSpeciesSightings() to decode. */
  speciesSightings?: string[];
}

export interface GossipPacket {
  sourceShipId: string;        // UUID of the broadcasting ship
  vectorClock: Record<string, number>;  // Lamport timestamps keyed by ship UUID
  starChartEntries: StarChartEntry[];
}

/**
 * Deterministic string hash producing an 8-character hex digest.
 * Not cryptographically secure — used only for species sighting gating.
 */
export function hashSpeciesId(speciesId: string): string {
  if (speciesId.length === 0) {
    throw new Error('hashSpeciesId: speciesId must not be empty');
  }

  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < speciesId.length; i++) {
    const ch = speciesId.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x9e3779b9);
    h2 = Math.imul(h2 ^ ch, 0x243f6a88);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
  h1 = Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35);
  h1 = h1 ^ (h1 >>> 16);

  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
  h2 = h2 ^ (h2 >>> 16);

  const combined = (h1 ^ h2) >>> 0;
  return combined.toString(16).padStart(8, '0');
}

/**
 * Returns the readable species IDs from an entry whose hashes match a known species set.
 * Species sightings recorded as hashes remain unintelligible until the player has
 * encountered the species in question.
 */
export function revealSpeciesSightings(
  entry: StarChartEntry,
  knownSpeciesIds: Set<string>,
): string[] {
  if (!entry.speciesSightings || entry.speciesSightings.length === 0) {
    return [];
  }

  const knownHashes = new Map<string, string>();
  for (const speciesId of knownSpeciesIds) {
    knownHashes.set(hashSpeciesId(speciesId), speciesId);
  }

  const revealed: string[] = [];
  for (const hash of entry.speciesSightings) {
    const match = knownHashes.get(hash);
    if (match !== undefined) {
      revealed.push(match);
    }
  }
  return revealed;
}
