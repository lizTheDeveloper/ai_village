/**
 * UniverseConfigScreen - Configure magic laws and universe settings
 *
 * First screen shown when creating a new universe. Player selects:
 * - Magic paradigm (determines which magic system rules apply)
 * - Universe name (optional, can be LLM-generated)
 * - Other universe-level settings
 *
 * The selected configuration determines the universe ID via hash.
 * Universes with identical configurations share the same ID and can
 * have parallel timelines, while different configurations create
 * separate universes that can only connect via portals.
 *
 * Dynamically loads all available paradigms from magic registries.
 */

import {
  CORE_PARADIGM_REGISTRY,
  HYBRID_PARADIGM_REGISTRY,
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
} from '@ai-village/core';

export interface UniverseConfig {
  magicParadigmId: string | null;  // null = no magic
  universeName?: string;
  seed?: number;
  // Future: difficulty, world size, starting conditions, etc.
}

export interface PresetParadigm {
  id: string;
  name: string;
  description: string;
  preview: string;  // Short flavor text
  category: string;  // Group for UI organization
}

export class UniverseConfigScreen {
  private container: HTMLElement;
  private selectedParadigm: string | null = null;
  private onCreate: ((config: UniverseConfig) => void) | null = null;
  private presets: PresetParadigm[] = [];

  /**
   * Build preset list from all magic paradigm registries.
   */
  private buildPresets(): PresetParadigm[] {
    const presets: PresetParadigm[] = [];

    // Add "No Magic" option
    presets.push({
      id: 'none',
      name: 'The First World',
      description: 'A world without magic. Pure survival, technology, and human ingenuity.',
      preview: 'Build from nothing. No supernatural forces, only what you can craft.',
      category: 'No Magic',
    });

    // Load from core paradigms
    for (const [id, paradigm] of Object.entries(CORE_PARADIGM_REGISTRY)) {
      presets.push({
        id,
        name: paradigm.name,
        description: paradigm.description,
        preview: this.extractFirstSentence(paradigm.lore || paradigm.description),
        category: 'Core Magic',
      });
    }

    // Load from hybrid paradigms
    for (const [id, hybrid] of Object.entries(HYBRID_PARADIGM_REGISTRY)) {
      presets.push({
        id,
        name: hybrid.name,
        description: hybrid.description,
        preview: this.extractFirstSentence(hybrid.lore || hybrid.description),
        category: 'Hybrid Magic',
      });
    }

    // Load from whimsical paradigms
    for (const [id, paradigm] of Object.entries(WHIMSICAL_PARADIGM_REGISTRY)) {
      presets.push({
        id,
        name: paradigm.name,
        description: paradigm.description,
        preview: this.extractFirstSentence(paradigm.lore || paradigm.description),
        category: 'Whimsical Magic',
      });
    }

    // Load from null paradigms
    for (const [id, paradigm] of Object.entries(NULL_PARADIGM_REGISTRY)) {
      presets.push({
        id,
        name: paradigm.name,
        description: paradigm.description,
        preview: this.extractFirstSentence(paradigm.lore || paradigm.description),
        category: 'Magic Negation',
      });
    }

    // Load from animist paradigms
    for (const [id, paradigm] of Object.entries(ANIMIST_PARADIGM_REGISTRY)) {
      presets.push({
        id,
        name: paradigm.name,
        description: paradigm.description,
        preview: this.extractFirstSentence(paradigm.lore || paradigm.description),
        category: 'Animist Magic',
      });
    }

    // Load from dimensional paradigms
    for (const [id, paradigm] of Object.entries(DIMENSIONAL_PARADIGM_REGISTRY)) {
      presets.push({
        id,
        name: paradigm.name,
        description: paradigm.description,
        preview: this.extractFirstSentence(paradigm.lore || paradigm.description),
        category: 'Dimensional Magic',
      });
    }

    return presets;
  }

  /**
   * Extract first sentence from lore text for preview.
   */
  private extractFirstSentence(text: string): string {
    const match = text.match(/^[^.!?]+[.!?]/);
    if (match) {
      return match[0].trim();
    }
    // Fallback: take first 100 chars
    return text.substring(0, 100).trim() + (text.length > 100 ? '...' : '');
  }

  constructor(containerId: string = 'universe-config-screen') {
    // Build paradigm list from registries
    this.presets = this.buildPresets();

    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 40px;
        box-sizing: border-box;
        z-index: 10001;
        font-family: monospace;
        color: #e0e0e0;
        overflow-y: auto;
      `;
      document.body.appendChild(this.container);
    }

    this.render();
  }

  /**
   * Show the config screen.
   */
  show(onCreateCallback: (config: UniverseConfig) => void): void {
    this.onCreate = onCreateCallback;
    this.container.style.display = 'flex';
  }

  /**
   * Hide the config screen.
   */
  hide(): void {
    this.container.style.display = 'none';
    this.selectedParadigm = null;
  }

  /**
   * Render the configuration interface.
   */
  private render(): void {
    this.container.innerHTML = '';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Create New Universe';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 36px;
      text-align: center;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(100, 200, 255, 0.5);
    `;
    this.container.appendChild(title);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = `Choose the laws of magic that will govern this reality (${this.presets.length} paradigms available)`;
    subtitle.style.cssText = `
      margin: 0 0 40px 0;
      font-size: 14px;
      text-align: center;
      color: #aaa;
    `;
    this.container.appendChild(subtitle);

    // Group paradigms by category
    const categorized = new Map<string, PresetParadigm[]>();
    for (const preset of this.presets) {
      const category = preset.category;
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(preset);
    }

    // Render each category
    const categoryOrder = [
      'No Magic',
      'Core Magic',
      'Hybrid Magic',
      'Animist Magic',
      'Whimsical Magic',
      'Dimensional Magic',
      'Magic Negation',
    ];

    for (const category of categoryOrder) {
      const presetsInCategory = categorized.get(category);
      if (!presetsInCategory || presetsInCategory.length === 0) continue;

      // Category header
      const categoryHeader = document.createElement('h2');
      categoryHeader.textContent = `${category} (${presetsInCategory.length})`;
      categoryHeader.style.cssText = `
        margin: 30px 0 15px 0;
        font-size: 20px;
        color: #64b5f6;
        text-align: left;
        max-width: 1200px;
        width: 100%;
      `;
      this.container.appendChild(categoryHeader);

      // Paradigm cards grid for this category
      const grid = document.createElement('div');
      grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        max-width: 1200px;
        width: 100%;
        margin-bottom: 20px;
      `;

      for (const preset of presetsInCategory) {
        const card = this.renderParadigmCard(preset);
        grid.appendChild(card);
      }

      this.container.appendChild(grid);
    }

    // Create button
    const createButton = document.createElement('button');
    createButton.textContent = 'Create Universe';
    createButton.disabled = !this.selectedParadigm;
    createButton.style.cssText = `
      padding: 15px 40px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: ${this.selectedParadigm ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#333'};
      color: ${this.selectedParadigm ? '#fff' : '#666'};
      border: none;
      border-radius: 8px;
      cursor: ${this.selectedParadigm ? 'pointer' : 'not-allowed'};
      transition: all 0.3s;
      box-shadow: ${this.selectedParadigm ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'};
    `;

    if (this.selectedParadigm) {
      createButton.onmouseover = () => {
        createButton.style.transform = 'translateY(-2px)';
        createButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      };
      createButton.onmouseout = () => {
        createButton.style.transform = 'translateY(0)';
        createButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
      };
    }

    createButton.onclick = () => {
      if (this.selectedParadigm && this.onCreate) {
        const config: UniverseConfig = {
          magicParadigmId: this.selectedParadigm === 'none' ? null : this.selectedParadigm,
          seed: Date.now(),
        };
        this.onCreate(config);
        this.hide();
      }
    };

    this.container.appendChild(createButton);
  }

  /**
   * Render a single paradigm selection card.
   */
  private renderParadigmCard(preset: PresetParadigm): HTMLElement {
    const isSelected = this.selectedParadigm === preset.id;

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isSelected ? 'linear-gradient(135deg, #2a4a4a 0%, #1e3a3a 100%)' : 'rgba(30, 30, 50, 0.8)'};
      border: 2px solid ${isSelected ? '#4CAF50' : '#3a3a5a'};
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: ${isSelected ? '0 0 20px rgba(76, 175, 80, 0.4)' : '0 4px 8px rgba(0,0,0,0.2)'};
    `;

    card.onmouseover = () => {
      if (!isSelected) {
        card.style.borderColor = '#5a5a7a';
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
      }
    };

    card.onmouseout = () => {
      if (!isSelected) {
        card.style.borderColor = '#3a3a5a';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      }
    };

    card.onclick = () => {
      this.selectedParadigm = preset.id;
      this.render();
    };

    // Name
    const name = document.createElement('h3');
    name.textContent = preset.name;
    name.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 20px;
      color: ${isSelected ? '#4CAF50' : '#fff'};
    `;
    card.appendChild(name);

    // Description
    const description = document.createElement('p');
    description.textContent = preset.description;
    description.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 13px;
      line-height: 1.5;
      color: #bbb;
    `;
    card.appendChild(description);

    // Preview
    const preview = document.createElement('p');
    preview.textContent = preset.preview;
    preview.style.cssText = `
      margin: 0;
      font-size: 12px;
      font-style: italic;
      color: #888;
      border-top: 1px solid #3a3a5a;
      padding-top: 15px;
    `;
    card.appendChild(preview);

    // Selection indicator
    if (isSelected) {
      const indicator = document.createElement('div');
      indicator.textContent = '✓ Selected';
      indicator.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: #fff;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
      `;
      card.style.position = 'relative';
      card.appendChild(indicator);
    }

    return card;
  }

  /**
   * Destroy the config screen.
   */
  destroy(): void {
    this.container.remove();
  }
}
