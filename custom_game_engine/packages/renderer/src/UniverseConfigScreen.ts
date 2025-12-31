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
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
  type MagicParadigm,
} from '@ai-village/core';

export interface UniverseConfig {
  magicParadigmId: string | null;  // null = no magic
  scenarioPresetId: string;  // The first memory / intro scenario
  universeName?: string;
  seed?: number;
  // Future: difficulty, world size, starting conditions, etc.
}

/**
 * Scenario presets define the "first memory" - the context and tone for the world.
 * These are shown as cards during universe creation.
 */
export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;  // The actual DM prompt text
  preview: string;  // Short flavor for the card
  category: string;  // For grouping in UI
  tags: string[];  // For filtering
}

/**
 * Expanded scenario presets - more varied starting scenarios.
 */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  // Cooperative / Building scenarios
  {
    id: 'cooperative-survival',
    name: 'The Awakening',
    description: 'You all just woke up in this place together, with nothing but berries to survive. Work together and make a village!',
    preview: 'A fresh start. Build from nothing with your companions.',
    category: 'Cooperative',
    tags: ['building', 'teamwork', 'classic'],
  },
  {
    id: 'garden-abundance',
    name: 'Paradise Found',
    description: 'You awaken in a paradise of endless food, perfect weather, and natural shelter. There is no struggle here, only the question of what to create when survival is already assured.',
    preview: 'Unlimited resources. What will you build when you don\'t need to survive?',
    category: 'Cooperative',
    tags: ['peaceful', 'creative', 'no-conflict'],
  },
  {
    id: 'scientific-expedition',
    name: 'Research Mission',
    description: 'Welcome, research team. Your mission: catalog this new biome, establish sustainable operations, and report findings. Remember your training—science and cooperation are humanity\'s greatest tools.',
    preview: 'A scientific expedition. Methodical exploration and documentation.',
    category: 'Cooperative',
    tags: ['science', 'exploration', 'organized'],
  },

  // Survival / Harsh scenarios
  {
    id: 'hostile-wilderness',
    name: 'The Long Dark',
    description: 'You wake to find yourself stranded in a dangerous wilderness where the nights are deadly cold and strange creatures watch from the shadows. Trust no one—resources are scarce and winter is coming.',
    preview: 'Hostile environment. Every decision matters for survival.',
    category: 'Survival',
    tags: ['harsh', 'danger', 'scarcity'],
  },
  {
    id: 'last-survivors',
    name: 'After the Fall',
    description: 'You are the last humans on Earth. The old world is ash and ruin. You have each other, your wits, and three days of food. Rebuild civilization or die trying.',
    preview: 'Post-apocalyptic survival. Humanity\'s last hope.',
    category: 'Survival',
    tags: ['apocalypse', 'desperate', 'rebuilding'],
  },
  {
    id: 'prison-colony',
    name: 'Exile\'s Landing',
    description: 'You were exiled here as punishment, left to survive or perish beyond the gates. The guards are gone now. Freedom is yours—but can you build something better than what you fled?',
    preview: 'Exiled criminals. Forge a new society from outcasts.',
    category: 'Survival',
    tags: ['exile', 'redemption', 'freedom'],
  },
  {
    id: 'shipwrecked',
    name: 'Cast Ashore',
    description: 'The storm took everything—your ship, your supplies, your maps. Now you\'re stranded on an unknown shore with only the debris that washed up beside you. The sea is hungry, and so are you.',
    preview: 'Shipwreck survivors. Salvage what you can from the wreckage.',
    category: 'Survival',
    tags: ['shipwreck', 'coastal', 'salvage'],
  },

  // Mystery / Discovery scenarios
  {
    id: 'amnesia-mystery',
    name: 'Forgotten Selves',
    description: 'You wake with no memory of who you are or how you got here. Strange artifacts lie scattered around you, and distant ruins hint at a civilization that came before. What happened here?',
    preview: 'Memory loss. Piece together the mystery of your past.',
    category: 'Mystery',
    tags: ['amnesia', 'mystery', 'discovery'],
  },
  {
    id: 'ancient-ruins',
    name: 'The Lost City',
    description: 'You\'ve found it—the ruins spoken of only in legend. Overgrown temples, broken machinery, and whispers of those who lived here before. The secrets of the ancients await those brave enough to uncover them.',
    preview: 'Archaeological discovery. Ancient secrets and forgotten technology.',
    category: 'Mystery',
    tags: ['ruins', 'ancient', 'secrets'],
  },
  {
    id: 'dimensional-rift',
    name: 'Through the Veil',
    description: 'One moment you were home. The next, you were here. The stars are wrong, the plants unfamiliar, and sometimes the shadows move on their own. You must survive in this strange place until you find a way back—if there is one.',
    preview: 'Displaced to another world. Everything is unfamiliar.',
    category: 'Mystery',
    tags: ['dimensional', 'alien', 'otherworldly'],
  },

  // Divine / Spiritual scenarios
  {
    id: 'divine-experiment',
    name: 'The Garden',
    description: 'You awaken in the Garden, placed here by forces you don\'t understand. You have been given free will, intelligence, and a world to shape. What will you make of this gift?',
    preview: 'Created by divine beings. Your choices define everything.',
    category: 'Divine',
    tags: ['divine', 'creation', 'purpose'],
  },
  {
    id: 'prophecy',
    name: 'The Chosen Ones',
    description: 'The old texts spoke of this day—when the chosen ones would awaken in the sacred valley and fulfill an ancient purpose. You are those ones. But the prophecy never said what you\'re meant to do.',
    preview: 'Prophesied destiny. But what does the prophecy actually mean?',
    category: 'Divine',
    tags: ['prophecy', 'destiny', 'meaning'],
  },
  {
    id: 'fallen-angels',
    name: 'Cast from Heaven',
    description: 'Once you dwelled among the celestial. Now you wake in flesh, bound to earth, your memories of paradise fading like morning mist. Was this punishment, or something else entirely?',
    preview: 'Former celestials now mortal. Exile from paradise.',
    category: 'Divine',
    tags: ['angels', 'fallen', 'divine-exile'],
  },
  {
    id: 'spirits-awakened',
    name: 'Vessels of Spirit',
    description: 'The land itself chose you. Ancient spirits have awakened within each of you, granting glimpses of memories that aren\'t your own. The world is alive, and it has plans for you.',
    preview: 'Chosen by nature spirits. Connected to the land itself.',
    category: 'Divine',
    tags: ['spirits', 'nature', 'chosen'],
  },

  // Social / Experimental scenarios
  {
    id: 'social-experiment',
    name: 'Under Observation',
    description: 'You are participants in the greatest social experiment ever conducted. Observers are watching, recording everything. Build a society worthy of study. Or don\'t. The choice—and the consequences—are yours.',
    preview: 'You\'re being watched. Every action is being recorded.',
    category: 'Social',
    tags: ['experiment', 'observation', 'society'],
  },
  {
    id: 'utopia-project',
    name: 'Perfect Society',
    description: 'You\'ve been selected for your skills, your wisdom, your vision. Your mission: build the perfect society. No old prejudices, no inherited conflicts—just the opportunity to get it right this time.',
    preview: 'Hand-picked colonists. Design an ideal civilization.',
    category: 'Social',
    tags: ['utopia', 'idealism', 'selection'],
  },
  {
    id: 'family-legacy',
    name: 'Founders\' Blood',
    description: 'Your grandparents settled this land. Your parents worked it. Now it falls to you to carry on their legacy—or forge your own path. The family farm awaits, but so do dreams of something more.',
    preview: 'Multi-generational story. Honor tradition or break free.',
    category: 'Social',
    tags: ['family', 'legacy', 'tradition'],
  },

  // Competition / Conflict scenarios
  {
    id: 'resource-rush',
    name: 'Gold in the Hills',
    description: 'They say there\'s gold in these hills, ancient technology in those ruins, and rare plants in that forest. You all got here first. The question is: will you share the wealth, or fight for it?',
    preview: 'Resource competition. Cooperate or compete for riches.',
    category: 'Competition',
    tags: ['competition', 'resources', 'conflict'],
  },
  {
    id: 'tribal-lands',
    name: 'Contested Territory',
    description: 'Your people have claimed this valley. But others have come—strangers with their own customs, their own gods, their own claims to the land. Peace or war, the choice must be made.',
    preview: 'Territorial conflict. Different groups, different values.',
    category: 'Competition',
    tags: ['tribal', 'territory', 'diplomacy'],
  },
  {
    id: 'rebellion',
    name: 'The Uprising',
    description: 'You were slaves. Now you are free—for the moment. The masters will send hunters, soldiers, perhaps worse. You have a head start. Use it wisely.',
    preview: 'Escaped slaves. Build a life while evading pursuit.',
    category: 'Competition',
    tags: ['rebellion', 'freedom', 'pursuit'],
  },

  // Weird / Surreal scenarios
  {
    id: 'dream-realm',
    name: 'The Dreaming',
    description: 'Is this real? The colors are too vivid, the physics too loose, and sometimes you wake up somewhere you don\'t remember going. Perhaps you\'re all sharing the same dream. Perhaps you never wake up.',
    preview: 'Reality is uncertain. Dreams blur with waking.',
    category: 'Surreal',
    tags: ['dream', 'surreal', 'uncertain'],
  },
  {
    id: 'simulation-theory',
    name: 'The Construct',
    description: 'There are glitches. Small things at first—objects in impossible places, memories that don\'t quite fit. You\'re beginning to suspect this world isn\'t what it seems. But who built it, and why?',
    preview: 'Something is wrong with reality. Investigate the glitches.',
    category: 'Surreal',
    tags: ['simulation', 'glitch', 'meta'],
  },
  {
    id: 'reincarnation-cycle',
    name: 'The Eternal Return',
    description: 'You\'ve been here before. All of you. Again and again. Each time you build, each time you fall, each time you forget and start anew. But this time, some of you remember fragments...',
    preview: 'Trapped in a cycle. Break free or repeat forever.',
    category: 'Surreal',
    tags: ['reincarnation', 'cycle', 'memory'],
  },
  {
    id: 'time-displaced',
    name: 'Out of Time',
    description: 'Each of you comes from a different era—ancient past, distant future, alternate present. Now you\'re all here, stranded together in a time that belongs to none of you. Build a future from fragments of many timelines.',
    preview: 'Time travelers from different eras. Forge a new timeline together.',
    category: 'Surreal',
    tags: ['time-travel', 'displaced', 'fusion'],
  },
];

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
  private selectedScenario: string = 'cooperative-survival';  // Default scenario
  private currentStep: 'scenario' | 'magic' = 'scenario';  // Two-step selection
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

    // Helper to add paradigms from a registry
    const addFromRegistry = (
      registry: Record<string, MagicParadigm>,
      category: string
    ) => {
      for (const [id, paradigm] of Object.entries(registry)) {
        presets.push({
          id,
          name: paradigm.name,
          description: paradigm.description,
          preview: this.extractFirstSentence(paradigm.lore || paradigm.description),
          category,
        });
      }
    };

    // Load from all paradigm registries
    addFromRegistry(CORE_PARADIGM_REGISTRY, 'Core Magic');
    addFromRegistry(WHIMSICAL_PARADIGM_REGISTRY, 'Whimsical Magic');
    addFromRegistry(NULL_PARADIGM_REGISTRY, 'Magic Negation');
    addFromRegistry(ANIMIST_PARADIGM_REGISTRY, 'Animist Magic');
    addFromRegistry(DIMENSIONAL_PARADIGM_REGISTRY, 'Dimensional Magic');

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
   * Two-step process: 1) Select scenario, 2) Select magic paradigm
   */
  private render(): void {
    this.container.innerHTML = '';

    // Step indicator
    const stepIndicator = document.createElement('div');
    stepIndicator.style.cssText = `
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-bottom: 20px;
    `;

    const step1 = document.createElement('div');
    step1.textContent = '1. Choose Your Story';
    step1.style.cssText = `
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      background: ${this.currentStep === 'scenario' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'};
      color: ${this.currentStep === 'scenario' ? '#fff' : '#888'};
      cursor: pointer;
    `;
    step1.onclick = () => {
      this.currentStep = 'scenario';
      this.render();
    };

    const step2 = document.createElement('div');
    step2.textContent = '2. Choose Magic System';
    step2.style.cssText = `
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      background: ${this.currentStep === 'magic' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2a2a4a'};
      color: ${this.currentStep === 'magic' ? '#fff' : '#888'};
      cursor: pointer;
    `;
    step2.onclick = () => {
      this.currentStep = 'magic';
      this.render();
    };

    stepIndicator.appendChild(step1);
    stepIndicator.appendChild(step2);
    this.container.appendChild(stepIndicator);

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

    if (this.currentStep === 'scenario') {
      this.renderScenarioStep();
    } else {
      this.renderMagicStep();
    }
  }

  /**
   * Render the scenario selection step.
   */
  private renderScenarioStep(): void {
    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = `Choose the first memory - how your world begins (${SCENARIO_PRESETS.length} scenarios available)`;
    subtitle.style.cssText = `
      margin: 0 0 40px 0;
      font-size: 14px;
      text-align: center;
      color: #aaa;
    `;
    this.container.appendChild(subtitle);

    // Group scenarios by category
    const categorized = new Map<string, ScenarioPreset[]>();
    for (const preset of SCENARIO_PRESETS) {
      const category = preset.category;
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(preset);
    }

    // Render each category
    const categoryOrder = [
      'Cooperative',
      'Survival',
      'Mystery',
      'Divine',
      'Social',
      'Competition',
      'Surreal',
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
        color: #ff9800;
        text-align: left;
        max-width: 1200px;
        width: 100%;
      `;
      this.container.appendChild(categoryHeader);

      // Scenario cards grid for this category
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
        const card = this.renderScenarioCard(preset);
        grid.appendChild(card);
      }

      this.container.appendChild(grid);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next: Choose Magic System';
    nextButton.style.cssText = `
      padding: 15px 40px;
      font-size: 18px;
      font-family: monospace;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      margin-top: 20px;
    `;

    nextButton.onmouseover = () => {
      nextButton.style.transform = 'translateY(-2px)';
      nextButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    };
    nextButton.onmouseout = () => {
      nextButton.style.transform = 'translateY(0)';
      nextButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    };

    nextButton.onclick = () => {
      this.currentStep = 'magic';
      this.render();
    };

    this.container.appendChild(nextButton);
  }

  /**
   * Render the magic paradigm selection step.
   */
  private renderMagicStep(): void {
    // Show selected scenario summary
    const selectedScenario = SCENARIO_PRESETS.find(s => s.id === this.selectedScenario);
    if (selectedScenario) {
      const scenarioSummary = document.createElement('div');
      scenarioSummary.style.cssText = `
        background: rgba(255, 152, 0, 0.1);
        border: 1px solid #ff9800;
        border-radius: 8px;
        padding: 15px;
        max-width: 800px;
        margin-bottom: 20px;
      `;
      scenarioSummary.innerHTML = `
        <div style="color: #ff9800; font-size: 12px; margin-bottom: 5px;">SELECTED SCENARIO</div>
        <div style="color: #fff; font-size: 16px; font-weight: bold;">${selectedScenario.name}</div>
        <div style="color: #aaa; font-size: 13px; margin-top: 5px;">${selectedScenario.preview}</div>
      `;
      this.container.appendChild(scenarioSummary);
    }

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

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 20px;
      margin-top: 20px;
    `;

    // Back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Scenario';
    backButton.style.cssText = `
      padding: 15px 30px;
      font-size: 16px;
      font-family: monospace;
      background: #333;
      color: #aaa;
      border: 1px solid #555;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
    `;
    backButton.onmouseover = () => {
      backButton.style.borderColor = '#888';
      backButton.style.color = '#fff';
    };
    backButton.onmouseout = () => {
      backButton.style.borderColor = '#555';
      backButton.style.color = '#aaa';
    };
    backButton.onclick = () => {
      this.currentStep = 'scenario';
      this.render();
    };

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
          scenarioPresetId: this.selectedScenario,
          seed: Date.now(),
        };
        this.onCreate(config);
        this.hide();
      }
    };

    buttonContainer.appendChild(backButton);
    buttonContainer.appendChild(createButton);
    this.container.appendChild(buttonContainer);
  }

  /**
   * Render a single scenario selection card.
   */
  private renderScenarioCard(preset: ScenarioPreset): HTMLElement {
    const isSelected = this.selectedScenario === preset.id;

    const card = document.createElement('div');
    card.style.cssText = `
      background: ${isSelected ? 'linear-gradient(135deg, #4a3a2a 0%, #3a2a1a 100%)' : 'rgba(30, 30, 50, 0.8)'};
      border: 2px solid ${isSelected ? '#ff9800' : '#3a3a5a'};
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: ${isSelected ? '0 0 20px rgba(255, 152, 0, 0.4)' : '0 4px 8px rgba(0,0,0,0.2)'};
      position: relative;
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
      this.selectedScenario = preset.id;
      this.render();
    };

    // Name
    const name = document.createElement('h3');
    name.textContent = preset.name;
    name.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 20px;
      color: ${isSelected ? '#ff9800' : '#fff'};
    `;
    card.appendChild(name);

    // Preview
    const preview = document.createElement('p');
    preview.textContent = preset.preview;
    preview.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 13px;
      line-height: 1.5;
      color: #bbb;
    `;
    card.appendChild(preview);

    // Description (first memory text)
    const description = document.createElement('p');
    description.textContent = `"${this.extractFirstSentence(preset.description)}"`;
    description.style.cssText = `
      margin: 0;
      font-size: 12px;
      font-style: italic;
      color: #888;
      border-top: 1px solid #3a3a5a;
      padding-top: 15px;
    `;
    card.appendChild(description);

    // Tags
    const tagsContainer = document.createElement('div');
    tagsContainer.style.cssText = `
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 10px;
    `;
    for (const tag of preset.tags.slice(0, 3)) {
      const tagEl = document.createElement('span');
      tagEl.textContent = tag;
      tagEl.style.cssText = `
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        color: #888;
      `;
      tagsContainer.appendChild(tagEl);
    }
    card.appendChild(tagsContainer);

    // Selection indicator
    if (isSelected) {
      const indicator = document.createElement('div');
      indicator.textContent = 'Selected';
      indicator.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #ff9800;
        color: #000;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
      `;
      card.appendChild(indicator);
    }

    return card;
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
