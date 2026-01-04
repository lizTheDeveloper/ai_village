/**
 * Headless Combat Recorder
 *
 * Spawns two hostile agents in a headless world, records their combat,
 * and exports the recording as JSON for Interdimensional Cable playback.
 *
 * Usage:
 *   npx tsx demo/headless-combat-recorder.ts [--ticks=200] [--output=gladiator-combat.json]
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env file
const envPath = path.join(import.meta.dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        process.env[key] = valueParts.join('=');
      }
    }
  }
  console.log('[CombatRecorder] Loaded .env file');
}

import {
  GameLoop,
  MovementSystem,
  SteeringSystem,
  TimeSystem,
  createTimeComponent,
  createPositionComponent,
  createRenderableComponent,
  createWeatherComponent,
  createSteeringComponent,
  EntityImpl,
  createEntityId,
  type World,
  type Entity,
  VideoReplayComponent,
  createVideoReplayComponent,
} from '../packages/core/src/index.ts';

import {
  OpenAICompatProvider,
  LLMDecisionQueue,
} from '../packages/llm/src/index.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const args = process.argv.slice(2);
const ticksArg = args.find(arg => arg.startsWith('--ticks='));
const outputArg = args.find(arg => arg.startsWith('--output='));

const CONFIG = {
  ticksToRun: ticksArg ? parseInt(ticksArg.split('=')[1]) : 200,
  outputFile: outputArg ? outputArg.split('=')[1] : 'gladiator-combat-real.json',
  recordingTitle: 'REAL GLADIATOR COMBAT - AI Arena Fight',
  recordingDescription: 'Two AI agents battle to the death in recorded combat',
  verbose: true,
};

// ============================================================================
// HEADLESS GAME LOOP
// ============================================================================

class HeadlessGameLoop {
  private gameLoop: GameLoop;
  private running = false;
  private tickCount = 0;

  constructor(gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
  }

  get world(): World {
    return this.gameLoop.world;
  }

  async runTicks(count: number): Promise<void> {
    console.log(`[CombatRecorder] Running ${count} ticks...`);
    this.running = true;
    this.tickCount = 0;

    for (let i = 0; i < count && this.running; i++) {
      try {
        await this.gameLoop.tick(0.05); // 20 TPS = 0.05s per tick
        this.tickCount++;

        if (CONFIG.verbose && this.tickCount % 20 === 0) {
          console.log(`[CombatRecorder] Tick ${this.tickCount}/${count}`);
        }
      } catch (error) {
        console.error(`[CombatRecorder] Error at tick ${this.tickCount}:`, error);
        this.running = false;
        throw error;
      }
    }

    console.log(`[CombatRecorder] Completed ${this.tickCount} ticks`);
  }

  stop(): void {
    this.running = false;
  }
}

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

function createCombatWorld(): World {
  console.log('[CombatRecorder] Creating combat world...');

  const gameLoop = new GameLoop();
  const world = gameLoop.world;

  // Register essential systems
  world.registerSystem(new TimeSystem());
  world.registerSystem(new MovementSystem());
  world.registerSystem(new SteeringSystem());

  // Create time entity
  const timeEntity = new EntityImpl(createEntityId('time'));
  timeEntity.addComponent(createTimeComponent({ day: 1, hour: 12, minute: 0 }));
  world.addEntity(timeEntity);

  // Create weather entity
  const weatherEntity = new EntityImpl(createEntityId('weather'));
  weatherEntity.addComponent(createWeatherComponent({ condition: 'clear' }));
  world.addEntity(weatherEntity);

  console.log('[CombatRecorder] World created with essential systems');
  return world;
}

function createGladiator(world: World, name: string, x: number, y: number, facingAngle: number): Entity {
  const gladiator = new EntityImpl(createEntityId(name));

  // Position
  gladiator.addComponent(createPositionComponent({
    x,
    y,
    z: 0,
    facingAngle,
  }));

  // Renderable
  gladiator.addComponent(createRenderableComponent({
    type: 'gladiator',
    layer: 'entity',
  }));

  // Steering for movement toward center (simulated combat)
  gladiator.addComponent(createSteeringComponent({
    maxSpeed: 20,
    maxForce: 50,
    seekTarget: { x: 600, y: 600 }, // Move toward arena center
  }));

  world.addEntity(gladiator);
  console.log(`[CombatRecorder] Created gladiator: ${name} at (${x}, ${y})`);
  return gladiator;
}

function createRecordingEntity(world: World, recordedBy: string): Entity {
  const recorder = new EntityImpl(createEntityId('recorder'));

  // Video replay component to capture frames
  recorder.addComponent(createVideoReplayComponent({
    recordingId: `combat_${Date.now()}`,
    recordedBy,
    recordedByName: recordedBy,
    status: 'recording',
    startTick: 0,
    endTick: 0,
    frames: [],
    metadata: {
      quality: 0.95,
      durationTicks: 0,
      frameCaptureRate: 2, // Capture every 2 ticks (10 FPS)
    },
  }));

  world.addEntity(recorder);
  console.log('[CombatRecorder] Created recording entity');
  return recorder;
}

// ============================================================================
// RECORDING CAPTURE SYSTEM
// ============================================================================

class CombatRecordingSystem {
  private world: World;
  private tickCounter = 0;
  private frameCaptureRate = 2; // Capture every N ticks
  private cameraX = 600;
  private cameraY = 600;
  private cameraZoom = 1.0;

  constructor(world: World) {
    this.world = world;
  }

  captureFrame(tick: number): void {
    this.tickCounter++;
    if (this.tickCounter % this.frameCaptureRate !== 0) return;

    const recorder = this.world.query().with('video_replay').executeEntities()[0];
    if (!recorder) return;

    const videoReplay = recorder.getComponent<VideoReplayComponent>('video_replay');
    if (!videoReplay || videoReplay.status !== 'recording') return;

    // Capture all entities with positions
    const entities = this.world.query()
      .with('position')
      .with('renderable')
      .executeEntities();

    const entitySnapshots = entities.map(entity => {
      const pos = entity.getComponent('position') as any;
      const renderable = entity.getComponent('renderable') as any;

      // Calculate distance from camera
      const dx = pos.x - this.cameraX;
      const dy = pos.y - this.cameraY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Determine animation state based on distance (simulates approach and combat)
      const distanceToCenter = Math.sqrt(
        Math.pow(pos.x - 600, 2) + Math.pow(pos.y - 600, 2)
      );
      const animState = distanceToCenter < 20 ? 'fighting' :
                       distanceToCenter < 50 ? 'running' : 'walking';

      return {
        entityId: entity.id,
        entityType: renderable.type || 'gladiator',
        x: pos.x,
        y: pos.y,
        facingAngle: pos.facingAngle || 0,
        animation: {
          state: animState,
          frame: Math.floor(this.tickCounter / 5) % 8,
        },
        distanceFromCamera: distance,
      };
    });

    // Add frame
    videoReplay.frames.push({
      tick,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      cameraAngle: 180,
      cameraZoom: this.cameraZoom,
      entities: entitySnapshots,
    });

    // Update camera to follow action (simple centering)
    if (entitySnapshots.length > 0) {
      const avgX = entitySnapshots.reduce((sum, e) => sum + e.x, 0) / entitySnapshots.length;
      const avgY = entitySnapshots.reduce((sum, e) => sum + e.y, 0) / entitySnapshots.length;
      this.cameraX = avgX;
      this.cameraY = avgY;
    }
  }

  finalize(endTick: number): void {
    const recorder = this.world.query().with('video_replay').executeEntities()[0];
    if (!recorder) return;

    const videoReplay = recorder.getComponent<VideoReplayComponent>('video_replay');
    if (!videoReplay) return;

    videoReplay.status = 'completed';
    videoReplay.endTick = endTick;
    videoReplay.metadata.durationTicks = endTick;

    console.log(`[CombatRecorder] Recording finalized: ${videoReplay.frames.length} frames captured`);
  }
}

// ============================================================================
// EXPORT RECORDING
// ============================================================================

function exportRecording(world: World, outputPath: string): void {
  const recorder = world.query().with('video_replay').executeEntities()[0];
  if (!recorder) {
    throw new Error('No recording entity found!');
  }

  const videoReplay = recorder.getComponent<VideoReplayComponent>('video_replay');
  if (!videoReplay) {
    throw new Error('No video_replay component found!');
  }

  const recording = {
    recordingId: videoReplay.recordingId,
    title: CONFIG.recordingTitle,
    description: CONFIG.recordingDescription,
    recordedBy: videoReplay.recordedByName,
    recordedAt: Date.now(),
    duration: videoReplay.metadata.durationTicks,
    quality: videoReplay.metadata.quality,
    frames: videoReplay.frames,
  };

  const json = JSON.stringify(recording, null, 2);
  fs.writeFileSync(outputPath, json, 'utf-8');
  console.log(`[CombatRecorder] Recording exported to: ${outputPath}`);
  console.log(`[CombatRecorder] Total frames: ${recording.frames.length}`);
  console.log(`[CombatRecorder] Duration: ${recording.duration} ticks`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('[CombatRecorder] Starting headless combat recording...');
  console.log('[CombatRecorder] Config:', CONFIG);

  // Create world
  const world = createCombatWorld();
  const gameLoop = new GameLoop();
  gameLoop.world = world as any; // Type assertion for compatibility

  // Create gladiators at opposite ends of the arena
  const gladiator1 = createGladiator(world, 'gladiator_red', 580, 600, 90);
  const gladiator2 = createGladiator(world, 'gladiator_blue', 620, 600, 270);

  // Create recording entity
  createRecordingEntity(world, 'Combat Recorder Bot');

  // Setup recording system
  const recordingSystem = new CombatRecordingSystem(world);

  // Create headless loop
  const headlessLoop = new HeadlessGameLoop(gameLoop);

  // Hook into tick loop to capture frames
  const originalTick = gameLoop.tick.bind(gameLoop);
  let currentTick = 0;
  gameLoop.tick = async (deltaTime: number) => {
    await originalTick(deltaTime);
    recordingSystem.captureFrame(currentTick);
    currentTick++;
  };

  // Run simulation
  try {
    await headlessLoop.runTicks(CONFIG.ticksToRun);
    recordingSystem.finalize(CONFIG.ticksToRun);

    // Export recording
    const outputPath = path.join(import.meta.dirname, 'public', 'mock-recordings', CONFIG.outputFile);
    exportRecording(world, outputPath);

    console.log('[CombatRecorder] ✅ Combat recording complete!');
    console.log(`[CombatRecorder] Watch it at: http://localhost:3000/interdimensional-cable.html`);
  } catch (error) {
    console.error('[CombatRecorder] ❌ Recording failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[CombatRecorder] Fatal error:', error);
  process.exit(1);
});
