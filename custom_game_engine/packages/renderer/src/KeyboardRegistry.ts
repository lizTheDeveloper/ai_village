/**
 * Keyboard shortcut registry for centralized keyboard handling.
 * Allows registering, executing, and later remapping keyboard shortcuts.
 */

export interface KeyboardShortcut {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: string;
  handler: () => boolean | void; // Return true if handled
}

export interface KeyMap {
  [actionId: string]: {
    key: string;
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
}

/**
 * Centralized keyboard shortcut registry.
 * Supports:
 * - Registering shortcuts with categories and descriptions
 * - Executing shortcuts based on key events
 * - Querying shortcuts for help UI
 * - Future: Key remapping via KeyMap
 */
export class KeyboardRegistry {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private keyMap: KeyMap = {}; // For future remapping

  /**
   * Register a keyboard shortcut.
   * @param id Unique identifier for this shortcut (e.g., 'toggle_temperature')
   * @param shortcut Shortcut configuration
   */
  register(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut.
   * @param id Shortcut identifier
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Handle a keyboard event and execute matching shortcut.
   * @param key Key pressed (e.g., 't', 'T', 'Escape')
   * @param shiftKey Whether Shift was held
   * @param ctrlKey Whether Ctrl was held
   * @param altKey Whether Alt was held
   * @param metaKey Whether Meta/Command was held
   * @returns True if a shortcut was handled
   */
  handleKey(key: string, shiftKey: boolean, ctrlKey: boolean, altKey: boolean = false, metaKey: boolean = false): boolean {
    for (const [_id, shortcut] of this.shortcuts) {
      // Check if this shortcut matches the key event
      const keyMatches = shortcut.key.toLowerCase() === key.toLowerCase();
      const shiftMatches = (shortcut.shift ?? false) === shiftKey;
      const ctrlMatches = (shortcut.ctrl ?? false) === ctrlKey;
      const altMatches = (shortcut.alt ?? false) === altKey;
      const metaMatches = (shortcut.meta ?? false) === metaKey;

      if (keyMatches && shiftMatches && ctrlMatches && altMatches && metaMatches) {
        const handled = shortcut.handler();
        if (handled === true || handled === undefined) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all registered shortcuts, optionally filtered by category.
   * @param category Optional category filter
   * @returns Array of shortcuts
   */
  getShortcuts(category?: string): Array<{ id: string; shortcut: KeyboardShortcut }> {
    const shortcuts: Array<{ id: string; shortcut: KeyboardShortcut }> = [];

    for (const [id, shortcut] of this.shortcuts) {
      if (!category || shortcut.category === category) {
        shortcuts.push({ id, shortcut });
      }
    }

    return shortcuts;
  }

  /**
   * Get all categories.
   * @returns Array of unique categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const shortcut of this.shortcuts.values()) {
      categories.add(shortcut.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Format a shortcut as a human-readable string.
   * @param shortcut Shortcut to format
   * @returns Formatted string (e.g., "Shift+T", "Ctrl+S", "Escape", "⌘+V")
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];

    if (shortcut.meta) parts.push('⌘');
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');

    // Capitalize single letter keys, keep special keys as-is
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);

    return parts.join('+');
  }

  /**
   * Set a custom key mapping (for future remapping feature).
   * @param actionId Action identifier
   * @param key New key
   * @param shift Shift modifier
   * @param ctrl Ctrl modifier
   * @param alt Alt modifier
   * @param meta Meta/Command modifier
   */
  remap(actionId: string, key: string, shift = false, ctrl = false, alt = false, meta = false): void {
    this.keyMap[actionId] = { key, shift, ctrl, alt, meta };

    // Update the shortcut if it exists
    const shortcut = this.shortcuts.get(actionId);
    if (shortcut) {
      shortcut.key = key;
      shortcut.shift = shift;
      shortcut.ctrl = ctrl;
      shortcut.alt = alt;
      shortcut.meta = meta;
    }
  }

  /**
   * Save key mappings to localStorage.
   */
  saveKeyMap(): void {
    localStorage.setItem('keyboardMappings', JSON.stringify(this.keyMap));
  }

  /**
   * Load key mappings from localStorage.
   */
  loadKeyMap(): void {
    const saved = localStorage.getItem('keyboardMappings');
    if (saved) {
      try {
        this.keyMap = JSON.parse(saved);

        // Apply saved mappings to shortcuts
        for (const [actionId, mapping] of Object.entries(this.keyMap)) {
          this.remap(actionId, mapping.key, mapping.shift, mapping.ctrl, mapping.alt, mapping.meta);
        }
      } catch (e) {
        console.error('[KeyboardRegistry] Failed to load key mappings:', e);
      }
    }
  }

  /**
   * Reset all key mappings to defaults.
   */
  resetKeyMap(): void {
    this.keyMap = {};
    localStorage.removeItem('keyboardMappings');
  }
}
