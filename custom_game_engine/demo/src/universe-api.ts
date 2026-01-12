/**
 * Universe API - REST endpoints for multiverse operations
 *
 * Provides endpoints for:
 * - Universe management (create, read, delete)
 * - Snapshot management (upload, download, list)
 * - Universe forking (time travel / branch creation)
 * - Passage management (inter-universe connections)
 * - Player management (registration, universe ownership)
 */

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import {
  multiverseStorage,
  type UniverseMetadata,
  type CanonEvent,
  type PassageConnection,
  type PlayerProfile,
} from './multiverse-storage.js';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

/**
 * Create and configure the universe API router
 */
export function createUniverseApiRouter(): Router {
  const router = createRouter();

  // ============================================================
  // UNIVERSE ENDPOINTS
  // ============================================================

  /**
   * POST /api/universe
   * Create a new universe
   */
  router.post('/universe', async (req: Request, res: Response) => {
    try {
      const { id, name, ownerId, isPublic, config } = req.body;

      if (!name || !ownerId) {
        return res.status(400).json({
          error: 'Missing required fields: name, ownerId',
        });
      }

      // Use provided ID if given, otherwise generate new one
      // This keeps client and server universe IDs in sync
      const universeId = id || `universe:${crypto.randomUUID()}`;

      const metadata: UniverseMetadata = {
        id: universeId,
        name,
        ownerId,
        createdAt: Date.now(),
        lastSnapshotAt: 0,
        snapshotCount: 0,
        canonicalEventCount: 0,
        isPublic: isPublic ?? false,
        config,
      };

      await multiverseStorage.createUniverse(metadata);

      res.status(201).json({
        success: true,
        universe: metadata,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error creating universe:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universe/:id
   * Get universe metadata
   */
  router.get('/universe/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const metadata = await multiverseStorage.getUniverseMetadata(id);
      if (!metadata) {
        return res.status(404).json({ error: 'Universe not found' });
      }

      res.json({ universe: metadata });
    } catch (error: any) {
      console.error('[UniverseAPI] Error getting universe:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/universe/:id
   * Delete a universe (marks as deleted, preserves data)
   */
  router.delete('/universe/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const metadata = await multiverseStorage.getUniverseMetadata(id);
      if (!metadata) {
        return res.status(404).json({ error: 'Universe not found' });
      }

      await multiverseStorage.deleteUniverse(id);

      res.json({
        success: true,
        message: 'Universe marked as deleted (data preserved)',
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error deleting universe:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universes
   * List all universes (optionally filtered)
   */
  router.get('/universes', async (req: Request, res: Response) => {
    try {
      const { publicOnly, ownerId } = req.query;

      const universes = await multiverseStorage.listUniverses({
        publicOnly: publicOnly === 'true',
        ownerId: ownerId as string | undefined,
      });

      res.json({ universes });
    } catch (error: any) {
      console.error('[UniverseAPI] Error listing universes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // SNAPSHOT ENDPOINTS
  // ============================================================

  /**
   * POST /api/universe/:id/snapshot
   * Upload a snapshot (supports compressed uploads)
   */
  router.post('/universe/:id/snapshot', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { snapshot, compressedSnapshot, tick, day, type, canonEvent } = req.body;
      const isCompressed = req.headers['x-snapshot-compressed'] === 'gzip-base64';

      let snapshotData = snapshot;

      // Handle compressed uploads
      if (isCompressed && compressedSnapshot) {
        console.log(`[UniverseAPI] Decompressing snapshot (${(compressedSnapshot.length / 1024).toFixed(0)}KB compressed)`);
        try {
          const compressedBuffer = Buffer.from(compressedSnapshot, 'base64');
          const decompressedBuffer = await gunzip(compressedBuffer);
          const decompressedJson = decompressedBuffer.toString('utf-8');
          snapshotData = JSON.parse(decompressedJson);
          console.log(`[UniverseAPI] Decompressed to ${(decompressedJson.length / 1024).toFixed(0)}KB`);
        } catch (decompressError: any) {
          console.error('[UniverseAPI] Decompression failed:', decompressError);
          return res.status(400).json({
            error: `Failed to decompress snapshot: ${decompressError.message}`,
          });
        }
      }

      if (!snapshotData || tick === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: snapshot (or compressedSnapshot), tick',
        });
      }

      const metadata = await multiverseStorage.getUniverseMetadata(id);
      if (!metadata) {
        return res.status(404).json({ error: 'Universe not found' });
      }

      const entry = await multiverseStorage.saveSnapshot(id, snapshotData, {
        tick,
        day: day ?? 0,
        type: type ?? 'manual',
        canonEvent: canonEvent as CanonEvent | undefined,
      });

      res.status(201).json({
        success: true,
        entry,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error saving snapshot:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universe/:id/snapshot/:tick
   * Get a snapshot at a specific tick
   */
  router.get('/universe/:id/snapshot/:tick', async (req: Request, res: Response) => {
    try {
      const { id, tick } = req.params;

      const snapshot = await multiverseStorage.loadSnapshot(id, parseInt(tick, 10));
      if (!snapshot) {
        return res.status(404).json({ error: 'Snapshot not found' });
      }

      res.json({ snapshot });
    } catch (error: any) {
      console.error('[UniverseAPI] Error loading snapshot:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universe/:id/snapshot/latest
   * Get the latest snapshot
   */
  router.get('/universe/:id/snapshot/latest', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await multiverseStorage.loadLatestSnapshot(id);
      if (!result) {
        return res.status(404).json({ error: 'No snapshots found' });
      }

      res.json({
        snapshot: result.snapshot,
        entry: result.entry,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error loading latest snapshot:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universe/:id/snapshots
   * List all snapshots for a universe
   */
  router.get('/universe/:id/snapshots', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const timeline = await multiverseStorage.getTimeline(id);
      if (!timeline) {
        return res.status(404).json({ error: 'Universe not found' });
      }

      res.json({
        universeId: id,
        snapshots: timeline.snapshots,
        lastUpdated: timeline.lastUpdated,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error listing snapshots:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universe/:id/timeline
   * Get timeline with canonical events
   */
  router.get('/universe/:id/timeline', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { canonicalOnly } = req.query;

      if (canonicalOnly === 'true') {
        const events = await multiverseStorage.getCanonicalEvents(id);
        res.json({
          universeId: id,
          canonicalEvents: events,
        });
      } else {
        const timeline = await multiverseStorage.getTimeline(id);
        if (!timeline) {
          return res.status(404).json({ error: 'Universe not found' });
        }
        res.json(timeline);
      }
    } catch (error: any) {
      console.error('[UniverseAPI] Error getting timeline:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // FORK ENDPOINTS
  // ============================================================

  /**
   * POST /api/universe/:id/fork
   * Fork a universe at a specific snapshot
   */
  router.post('/universe/:id/fork', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { snapshotTick, name, ownerId } = req.body;

      if (snapshotTick === undefined || !name || !ownerId) {
        return res.status(400).json({
          error: 'Missing required fields: snapshotTick, name, ownerId',
        });
      }

      const newUniverseId = `universe:${crypto.randomUUID()}`;

      const newMetadata = await multiverseStorage.forkUniverse(
        id,
        snapshotTick,
        newUniverseId,
        ownerId,
        name
      );

      res.status(201).json({
        success: true,
        universe: newMetadata,
        forkedFrom: {
          universeId: id,
          snapshotTick,
        },
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error forking universe:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/universe/:id/forks
   * List all forks of a universe
   */
  router.get('/universe/:id/forks', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const forks = await multiverseStorage.listForks(id);

      res.json({
        sourceUniverseId: id,
        forks,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error listing forks:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // PASSAGE ENDPOINTS
  // ============================================================

  /**
   * POST /api/passage
   * Create a passage between universes
   */
  router.post('/passage', async (req: Request, res: Response) => {
    try {
      const {
        sourceUniverseId,
        targetUniverseId,
        type,
        createdBy,
      } = req.body;

      if (!sourceUniverseId || !targetUniverseId || !type || !createdBy) {
        return res.status(400).json({
          error: 'Missing required fields: sourceUniverseId, targetUniverseId, type, createdBy',
        });
      }

      // Verify both universes exist
      const source = await multiverseStorage.getUniverseMetadata(sourceUniverseId);
      const target = await multiverseStorage.getUniverseMetadata(targetUniverseId);

      if (!source) {
        return res.status(404).json({ error: 'Source universe not found' });
      }
      if (!target) {
        return res.status(404).json({ error: 'Target universe not found' });
      }

      const passage: PassageConnection = {
        id: `passage:${crypto.randomUUID()}`,
        sourceUniverseId,
        targetUniverseId,
        type,
        active: true,
        createdAt: Date.now(),
        createdBy,
        stability: 100,
        lastMaintenance: Date.now(),
      };

      await multiverseStorage.createPassage(passage);

      res.status(201).json({
        success: true,
        passage,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error creating passage:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/passage/:id
   * Get passage details
   */
  router.get('/passage/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const passage = await multiverseStorage.getPassage(id);
      if (!passage) {
        return res.status(404).json({ error: 'Passage not found' });
      }

      res.json({ passage });
    } catch (error: any) {
      console.error('[UniverseAPI] Error getting passage:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/passage/:id
   * Delete a passage (marks inactive)
   */
  router.delete('/passage/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await multiverseStorage.deletePassage(id);

      res.json({
        success: true,
        message: 'Passage marked as inactive (preserved)',
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error deleting passage:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/passages
   * List all passages (optionally filtered by universe)
   */
  router.get('/passages', async (req: Request, res: Response) => {
    try {
      const { universeId } = req.query;

      const passages = await multiverseStorage.listPassages({
        universeId: universeId as string | undefined,
      });

      res.json({ passages });
    } catch (error: any) {
      console.error('[UniverseAPI] Error listing passages:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // PLAYER ENDPOINTS
  // ============================================================

  /**
   * POST /api/player
   * Register a player
   */
  router.post('/player', async (req: Request, res: Response) => {
    try {
      const { id, displayName } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Missing required field: id' });
      }

      const profile: PlayerProfile = {
        id,
        displayName: displayName ?? id,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        universeCount: 0,
      };

      await multiverseStorage.registerPlayer(profile);

      res.status(201).json({
        success: true,
        player: profile,
      });
    } catch (error: any) {
      console.error('[UniverseAPI] Error registering player:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/player/:id
   * Get player profile
   */
  router.get('/player/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const player = await multiverseStorage.getPlayer(id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      res.json({ player });
    } catch (error: any) {
      console.error('[UniverseAPI] Error getting player:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/player/:id/universes
   * Get player's universes
   */
  router.get('/player/:id/universes', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const universeIds = await multiverseStorage.getPlayerUniverses(id);

      // Optionally fetch full metadata
      const { includeMetadata } = req.query;
      if (includeMetadata === 'true') {
        const universes: UniverseMetadata[] = [];
        for (const universeId of universeIds) {
          const metadata = await multiverseStorage.getUniverseMetadata(universeId);
          if (metadata) universes.push(metadata);
        }
        res.json({ playerId: id, universes });
      } else {
        res.json({ playerId: id, universeIds });
      }
    } catch (error: any) {
      console.error('[UniverseAPI] Error getting player universes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // STATS ENDPOINT
  // ============================================================

  /**
   * GET /api/multiverse/stats
   * Get multiverse statistics
   */
  router.get('/multiverse/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await multiverseStorage.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error('[UniverseAPI] Error getting stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
