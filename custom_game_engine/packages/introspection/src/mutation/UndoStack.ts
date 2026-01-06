/**
 * Undo/redo support for mutations using the command pattern
 */

/**
 * A reversible mutation command
 */
export interface MutationCommand {
  /** ID of the entity this mutation applies to */
  entityId: string;

  /** Type of component being mutated */
  componentType: string;

  /** Name of the field being mutated */
  fieldName: string;

  /** Previous value (for undo) */
  oldValue: unknown;

  /** New value (for redo) */
  newValue: unknown;

  /** Execute the mutation (apply newValue) */
  execute(): void;

  /** Undo the mutation (restore oldValue) */
  undo(): void;
}

/**
 * Stack for tracking mutation history with undo/redo support
 */
export class UndoStack {
  private undoStack: MutationCommand[] = [];
  private redoStack: MutationCommand[] = [];
  private maxSize: number;

  /**
   * @param maxSize - Maximum number of commands to keep in history (default: 50)
   */
  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Push a new command onto the undo stack
   * Clears the redo stack (can't redo after a new mutation)
   */
  push(command: MutationCommand): void {
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack on new command

    // Enforce max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift(); // Remove oldest
    }
  }

  /**
   * Undo the last mutation
   * @returns true if undo was performed, false if nothing to undo
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) {
      return false;
    }

    command.undo();
    this.redoStack.push(command);
    return true;
  }

  /**
   * Redo the last undone mutation
   * @returns true if redo was performed, false if nothing to redo
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) {
      return false;
    }

    command.execute();
    this.undoStack.push(command);
    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the size of the undo stack
   */
  getUndoSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get the size of the redo stack
   */
  getRedoSize(): number {
    return this.redoStack.length;
  }
}
