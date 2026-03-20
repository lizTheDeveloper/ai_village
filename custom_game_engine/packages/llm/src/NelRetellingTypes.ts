/**
 * NelRetellingTypes — Types for the NEL retelling variation engine
 *
 * The signal_artifact is produced by CotB's cycle end and transformed by
 * the Passport Transformer into NEL initial conditions. These types define
 * the shape of that artifact and the world config it produces.
 *
 * The signal_artifact's influence on NEL retellings is FELT, never EXPLAINED.
 * No player-facing text may reference "the signal", "transfer", or "data".
 */

// ---------------------------------------------------------------------------
// Signal Artifact — produced by CotB cycle end
// ---------------------------------------------------------------------------

/** How deeply the mystery was engaged with during CotB play */
export type MysteryDepth = 'surface' | 'layered' | 'deep';

/** Thematic resonance detected in CotB player behaviour */
export type ResonanceTheme = 'isolation' | 'emergence' | 'defiance';

/**
 * The signal_artifact is the cross-game artifact produced at the end of a
 * CotB cycle. It encodes the emotional/thematic fingerprint of how the
 * party engaged with the mysteries of the Belt, without revealing any
 * mechanical details to the player.
 */
export interface SignalArtifact {
  /** How deeply the party engaged with the mystery (affects narrative tone) */
  mystery_depth: MysteryDepth;
  /** Dominant thematic resonances from the party's CotB play */
  resonance_themes: ResonanceTheme[];
  /** Cycle identifier (internal — never exposed to players) */
  cycleId: string;
}

// ---------------------------------------------------------------------------
// NEL World Config — Passport Transformer output (CotB → NEL)
// ---------------------------------------------------------------------------

/**
 * NelWorldConfig is the output of the Passport Transformer (MUL-2500).
 * It contains the initial conditions for a NEL retelling, derived from
 * the signal_artifact. The retelling engine uses this to branch its
 * narrative without ever attributing variations to their source.
 */
export interface NelWorldConfig {
  /** The signal artifact that seeded this config */
  signalArtifact: SignalArtifact;
  /** Which retelling number this is (1-6) */
  retellingNumber: number;
  /** Cycle identifier */
  cycleId: string;
}
