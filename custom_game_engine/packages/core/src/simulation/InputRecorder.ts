/**
 * Records and replays player inputs for deterministic lockstep.
 */

export interface GameInput {
  tick: number;
  playerId: string;
  type: 'move' | 'action' | 'build' | 'command' | 'select';
  data: Record<string, unknown>;
}

export class InputRecorder {
  private inputs: GameInput[] = [];
  private checkpoints: Map<number, unknown> = new Map();

  /** Record a player input */
  record(input: GameInput): void {
    this.inputs.push(input);
  }

  /** Get all inputs for a specific tick */
  getInputsForTick(tick: number): GameInput[] {
    return this.inputs.filter(i => i.tick === tick);
  }

  /** Get all inputs in a tick range */
  getInputsInRange(startTick: number, endTick: number): GameInput[] {
    return this.inputs.filter(i => i.tick >= startTick && i.tick <= endTick);
  }

  /** Save world state checkpoint */
  checkpoint(tick: number, worldState: unknown): void {
    this.checkpoints.set(tick, worldState);
  }

  /** Find nearest checkpoint before target tick */
  findNearestCheckpoint(targetTick: number): number {
    let nearest = 0;
    this.checkpoints.forEach((_, tick) => {
      if (tick <= targetTick && tick > nearest) {
        nearest = tick;
      }
    });
    return nearest;
  }

  /** Get checkpoint state */
  getCheckpoint(tick: number): unknown | null {
    return this.checkpoints.get(tick) ?? null;
  }

  /** Get total recorded inputs */
  getInputCount(): number {
    return this.inputs.length;
  }

  /** Get total checkpoints */
  getCheckpointCount(): number {
    return this.checkpoints.size;
  }

  /** Clear all data */
  clear(): void {
    this.inputs = [];
    this.checkpoints.clear();
  }

  /** Serialize for save/export */
  serialize(): { inputs: GameInput[]; checkpointTicks: number[] } {
    return {
      // Deep copy inputs to ensure serialized data is independent
      inputs: this.inputs.map(input => ({ ...input, data: { ...input.data } })),
      checkpointTicks: Array.from(this.checkpoints.keys()),
    };
  }
}
