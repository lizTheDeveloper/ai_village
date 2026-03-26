/**
 * GenesisCinematicPanel — First-session creation myth for new universes
 *
 * Shows a 5-scene cinematic sequence when a new save file is created, framing
 * the world's mythology for the player before they begin. Uses LLM-generated
 * prose when available, falling back to static poetic text.
 *
 * - Click anywhere to advance scenes
 * - ESC to skip all
 * - Fires once per universe (tracked in localStorage)
 */

import type { LLMProvider } from '@ai-village/llm';

export interface GenesisCinematicOptions {
  universeName: string;
  planetName: string;
  magicIntensity: string;
  cosmicDeityNames: string[];
  universeId: string;
  llmProvider?: LLMProvider;
}

interface GenesisScene {
  title: string;
  body: string;
  subtitle?: string;
}

const REALMS = ['Overworld', 'Underworld', 'Celestial Realm', 'Dream Realm', 'Industrial Realm', 'Proto-Reality'];

// Static fallback prose — used immediately while LLM generates (or if unavailable)
function buildFallbackScenes(opts: GenesisCinematicOptions): GenesisScene[] {
  const deities = opts.cosmicDeityNames.length > 0
    ? opts.cosmicDeityNames.join(', ')
    : 'the Fates';

  return [
    {
      title: 'THE VOID',
      body: `Before ${opts.universeName}, there was silence.\n\nNot the silence between sounds, but the silence before sound was invented. A stillness so complete it had no name, because names had not yet been spoken.\n\nThe proto-reality waited, patient and absolute, dreaming of what it might become.`,
    },
    {
      title: 'THE SPLITTING',
      body: `Then — a tremor.\n\nThe void cracked along seams that had always been there, waiting. Six realms tore free and rushed outward into the dark:\n\n${REALMS.join(' · ')}\n\nEach took a piece of what-was with it. Each became something the void alone could never be.`,
    },
    {
      title: 'THE FIRST SOULS',
      body: `${deities} arose in the earliest moments — not born, but crystallized from the raw intention of existence itself.\n\nThey wove the first threads. They measured them. They learned when to cut.\n\nThe precursors walked the young realms, leaving traces that would become prophecy.`,
    },
    {
      title: 'THE PRESENT',
      body: `Aeons turned.\n\nOn ${opts.planetName}, in the ${opts.universeName}, a new story is about to begin.\n\nSmall fires. First shelters. Souls who do not yet know what they will become.\n\nThis is your world.`,
      subtitle: 'Tend it.',
    },
    {
      title: '',
      body: '',
      subtitle: 'Click an agent to observe.  Open Divinity to hear their prayers.  Press F to fork time.',
    },
  ];
}

// LLM prompt to generate richer scene text
function buildLLMPrompt(opts: GenesisCinematicOptions, sceneIndex: number): string {
  const sceneDescriptions = [
    `Scene 1 of 4: THE VOID. Write 2-3 short paragraphs describing the moment before the universe "${opts.universeName}" existed. Proto-reality, absolute stillness, potential waiting to be realized. Evocative and cosmic. No bullet points.`,
    `Scene 2 of 4: THE SPLITTING. Write 2-3 short paragraphs describing the moment the void cracked into six realms: ${REALMS.join(', ')}. Each took something unique. Magic (${opts.magicIntensity} intensity) began here. Evocative, grand scale. No bullet points.`,
    `Scene 3 of 4: THE FIRST SOULS. Write 2-3 short paragraphs about the cosmic deities ${opts.cosmicDeityNames.join(', ')} arising at the dawn of existence. They shaped fate, life, and death. Ancient, mysterious precursors walked the new realms. Evocative. No bullet points.`,
    `Scene 4 of 4: THE PRESENT. Write 2-3 short paragraphs about the planet ${opts.planetName} in universe ${opts.universeName} now, where a new civilization is beginning. Small fires, first shelters, souls who don't yet know their destiny. End with something like "This is your world." Intimate but epic. No bullet points.`,
  ];

  return `You are writing cinematic onboarding text for a god-game called "Multiverse: The End of Eternity." The tone is mythic, poetic, and slightly melancholy — like a creation myth told by someone who has watched civilizations rise and fall countless times.

${sceneDescriptions[sceneIndex]}

Keep it under 120 words. No headers. Just the prose.`;
}

/**
 * Extract usable narrative text from raw LLM output.
 * Handles: <think> tags (Qwen3-style reasoning), JSON responses with narrative fields.
 * Returns null if no narrative text can be extracted.
 */
function extractNarrativeText(raw: string): string | null {
  // Strip <think>...</think> blocks (Qwen3-style reasoning tags)
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (!text) return null;

  // Try to parse as JSON — LLM sometimes returns structured responses
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Look for common narrative fields
      for (const key of ['speaking', 'text', 'content', 'narrative', 'body']) {
        if (typeof parsed[key] === 'string' && parsed[key].trim()) {
          return parsed[key].trim();
        }
      }
      // JSON object but no recognizable narrative field — discard
      return null;
    }
    // If it parsed as a plain string, use it
    if (typeof parsed === 'string') return parsed.trim() || null;
    // Arrays or other types — discard
    return null;
  } catch {
    // Not JSON — use as-is (normal prose response)
    return text;
  }
}

// Storage key to prevent showing twice for the same universe
function genesisShownKey(universeId: string): string {
  return `mvee_genesis_shown_${universeId}`;
}

export function hasShownGenesis(universeId: string): boolean {
  try {
    return localStorage.getItem(genesisShownKey(universeId)) === '1';
  } catch {
    return false;
  }
}

function markGenesisShown(universeId: string): void {
  try {
    localStorage.setItem(genesisShownKey(universeId), '1');
  } catch {
    // localStorage unavailable — non-fatal
  }
}

/**
 * Show the Genesis cinematic. Resolves when the player finishes or skips.
 *
 * Call this only for new saves. Use `hasShownGenesis()` to guard re-shows.
 */
export async function showGenesisVision(opts: GenesisCinematicOptions): Promise<void> {
  if (hasShownGenesis(opts.universeId)) return;

  return new Promise<void>((resolve) => {
    const panel = new GenesisCinematicPanel(opts, () => {
      markGenesisShown(opts.universeId);
      resolve();
    });
    panel.mount();
  });
}

class GenesisCinematicPanel {
  private container: HTMLElement;
  private scenes: GenesisScene[];
  private currentScene = 0;
  private isTransitioning = false;
  private onComplete: () => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private llmScenes: (string | null)[] = [null, null, null, null]; // async-loaded
  private opts: GenesisCinematicOptions;

  constructor(opts: GenesisCinematicOptions, onComplete: () => void) {
    this.opts = opts;
    this.onComplete = onComplete;
    this.scenes = buildFallbackScenes(opts);

    // Kick off LLM generation for all 4 narrative scenes in parallel
    if (opts.llmProvider) {
      this.prefetchLLMScenes(opts.llmProvider);
    }

    this.container = this.buildContainer();

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.skip();
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') this.advance();
    };

    this.clickHandler = () => { this.advance(); };
  }

  private prefetchLLMScenes(llmProvider: LLMProvider): void {
    for (let i = 0; i < 4; i++) {
      llmProvider.generate({
        prompt: buildLLMPrompt(this.opts, i),
        temperature: 0.85,
        maxTokens: 200,
      }).then(resp => {
        this.llmScenes[i] = extractNarrativeText(resp.text.trim());
        // If we're still on this scene, update live
        if (this.currentScene === i) {
          this.renderCurrentScene();
        }
      }).catch(() => {
        // LLM unavailable — keep fallback text
      });
    }
  }

  private buildContainer(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'genesis-cinematic-panel';
    el.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      font-family: 'Georgia', 'Times New Roman', serif;
      cursor: pointer;
      user-select: none;
    `;

    // Background gradient overlay
    const bg = document.createElement('div');
    bg.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at center, #0a0a1a 0%, #000000 70%);
      pointer-events: none;
    `;
    el.appendChild(bg);

    // Stars (static decorative dots)
    const stars = document.createElement('canvas');
    stars.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:0.4;';
    stars.width = 1920;
    stars.height = 1080;
    const ctx = stars.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 1920;
        const y = Math.random() * 1080;
        const r = Math.random() * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    el.appendChild(stars);

    // Content area
    const content = document.createElement('div');
    content.id = 'genesis-content';
    content.style.cssText = `
      position: relative;
      z-index: 1;
      max-width: 680px;
      padding: 48px 32px;
      text-align: center;
      animation: genesis-fade-in 1.2s ease forwards;
    `;
    el.appendChild(content);

    // Skip hint
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 32px;
      z-index: 1;
      color: rgba(255,255,255,0.25);
      font-size: 11px;
      font-family: monospace;
      letter-spacing: 0.05em;
    `;
    hint.textContent = 'CLICK TO CONTINUE · ESC TO SKIP';
    el.appendChild(hint);

    // Scene counter dots
    const dots = document.createElement('div');
    dots.id = 'genesis-dots';
    dots.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
      display: flex;
      gap: 8px;
    `;
    el.appendChild(dots);

    // Inject CSS animation keyframes once
    if (!document.getElementById('genesis-styles')) {
      const style = document.createElement('style');
      style.id = 'genesis-styles';
      style.textContent = `
        @keyframes genesis-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes genesis-fade-out {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
        #genesis-cinematic-panel #genesis-scene-title {
          font-size: 11px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(180, 160, 255, 0.6);
          margin-bottom: 32px;
        }
        #genesis-cinematic-panel #genesis-scene-body {
          font-size: 18px;
          line-height: 1.9;
          color: rgba(230, 225, 255, 0.88);
          white-space: pre-line;
        }
        #genesis-cinematic-panel #genesis-scene-subtitle {
          margin-top: 40px;
          font-size: 22px;
          color: rgba(255, 255, 255, 0.6);
          font-style: italic;
          letter-spacing: 0.04em;
        }
      `;
      document.head.appendChild(style);
    }

    return el;
  }

  private renderCurrentScene(): void {
    const scene = this.scenes[this.currentScene];
    const content = this.container.querySelector('#genesis-content') as HTMLElement;
    if (!content || !scene) return;

    // Swap LLM text in for body (scenes 0-3 only)
    const body = (this.currentScene < 4 && this.llmScenes[this.currentScene])
      ? this.llmScenes[this.currentScene]!
      : scene.body;

    // Final orientation scene — minimal layout
    if (this.currentScene === 4) {
      content.innerHTML = `
        <div id="genesis-scene-subtitle" style="font-size:15px;letter-spacing:0.12em;color:rgba(255,255,255,0.45);font-style:normal;font-family:monospace;">
          ${scene.subtitle ?? ''}
        </div>
      `;
    } else {
      content.innerHTML = `
        ${scene.title ? `<div id="genesis-scene-title">${scene.title}</div>` : ''}
        <div id="genesis-scene-body">${body}</div>
        ${scene.subtitle ? `<div id="genesis-scene-subtitle">${scene.subtitle}</div>` : ''}
      `;
    }

    this.renderDots();
  }

  private renderDots(): void {
    const dots = this.container.querySelector('#genesis-dots') as HTMLElement;
    if (!dots) return;
    dots.innerHTML = '';
    const total = this.scenes.length;
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 6px; height: 6px; border-radius: 50%;
        background: ${i === this.currentScene ? 'rgba(200,180,255,0.8)' : 'rgba(255,255,255,0.2)'};
        transition: background 0.3s;
      `;
      dots.appendChild(dot);
    }
  }

  private advance(): void {
    if (this.isTransitioning) return;

    if (this.currentScene >= this.scenes.length - 1) {
      this.complete();
      return;
    }

    this.isTransitioning = true;
    const content = this.container.querySelector('#genesis-content') as HTMLElement;
    if (content) {
      content.style.animation = 'genesis-fade-out 0.5s ease forwards';
    }

    setTimeout(() => {
      this.currentScene++;
      if (content) {
        content.style.animation = '';
        content.style.animation = 'genesis-fade-in 0.8s ease forwards';
      }
      this.renderCurrentScene();
      this.isTransitioning = false;
    }, 480);
  }

  private skip(): void {
    this.complete();
  }

  private complete(): void {
    document.removeEventListener('keydown', this.keyHandler);
    this.container.removeEventListener('click', this.clickHandler);

    // Fade out the whole panel
    this.container.style.transition = 'opacity 0.8s ease';
    this.container.style.opacity = '0';
    setTimeout(() => {
      this.container.remove();
      this.onComplete();
    }, 800);
  }

  mount(): void {
    document.body.appendChild(this.container);
    document.addEventListener('keydown', this.keyHandler);
    this.container.addEventListener('click', this.clickHandler);
    this.renderCurrentScene();
  }
}
