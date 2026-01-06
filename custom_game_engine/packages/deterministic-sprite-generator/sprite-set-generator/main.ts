/**
 * Sprite Set Generator - Interactive Wizard
 * Generates consistent sprite part libraries with visual feedback
 */

import { ART_STYLES, type ArtStyle } from '../src/artStyles.js';

// Configuration from environment
const API_KEY = import.meta.env.VITE_PIXELLAB_API_KEY || '';
const API_BASE = 'https://api.pixellab.ai/v1';

interface PartSpec {
  id: string;
  category: 'head' | 'body' | 'hair' | 'accessory';
  description: string;
  width: number;
  height: number;
  tags: string[];
}

interface GenerationState {
  artStyle: ArtStyle;
  referenceId: string | null;
  referenceImageUrl: string | null;
  parts: PartSpec[];
  completedParts: Map<string, PartVersion[]>;  // partId -> versions
  currentPartIndex: number;
  isGenerating: boolean;
  isPaused: boolean;
}

interface PartVersion {
  imageData: string;  // base64
  timestamp: number;
  active: boolean;
}

// Global state
const state: GenerationState = {
  artStyle: 'snes',
  referenceId: null,
  referenceImageUrl: null,
  parts: [],
  completedParts: new Map(),
  currentPartIndex: 0,
  isGenerating: false,
  isPaused: false,
};

// DOM Elements
const stepStyle = document.getElementById('step-style')!;
const stepReference = document.getElementById('step-reference')!;
const stepGeneration = document.getElementById('step-generation')!;
const stepReview = document.getElementById('step-review')!;

const btnGenerateReference = document.getElementById('btn-generate-reference') as HTMLButtonElement;
const btnRegenerateReference = document.getElementById('btn-regenerate-reference') as HTMLButtonElement;
const btnApproveReference = document.getElementById('btn-approve-reference') as HTMLButtonElement;
const btnStartGeneration = document.getElementById('btn-start-generation') as HTMLButtonElement;
const btnPauseGeneration = document.getElementById('btn-pause-generation') as HTMLButtonElement;
const btnExportSheet = document.getElementById('btn-export-sheet') as HTMLButtonElement;

const referenceLoading = document.getElementById('reference-loading')!;
const referenceCanvas = document.getElementById('reference-canvas') as HTMLCanvasElement;
const spriteSheetCanvas = document.getElementById('sprite-sheet-canvas') as HTMLCanvasElement;
const partQueue = document.getElementById('part-queue')!;
const currentPartName = document.getElementById('current-part-name')!;
const progressText = document.getElementById('progress-text')!;
const progressBar = document.getElementById('progress-bar')!;
const progressPercent = document.getElementById('progress-percent')!;

// =======================
// API Integration
// =======================

async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function generateImagePixflux(description: string, width: number, height: number, initImage?: string): Promise<string> {
  const requestBody: any = {
    description,
    image_size: { width, height },
    no_background: true,
    outline: 'selective outline',
    shading: 'medium shading',
    detail: 'medium detail',
  };

  if (initImage) {
    requestBody.init_image = {
      type: 'base64',
      base64: initImage,
    };
    requestBody.init_image_strength = 300;
  }

  const result = await apiRequest('/generate-image-pixflux', 'POST', requestBody);
  return result.image.base64;
}

// =======================
// Wizard Flow
// =======================

function showStep(step: 'style' | 'reference' | 'generation' | 'review') {
  [stepStyle, stepReference, stepGeneration, stepReview].forEach(el => el.classList.remove('active'));

  if (step === 'style') stepStyle.classList.add('active');
  else if (step === 'reference') stepReference.classList.add('active');
  else if (step === 'generation') stepGeneration.classList.add('active');
  else if (step === 'review') stepReview.classList.add('active');
}

// =======================
// Step 1: Art Style Selection
// =======================

document.querySelectorAll('.style-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.artStyle = card.getAttribute('data-style') as ArtStyle;
  });
});

btnGenerateReference.addEventListener('click', async () => {
  showStep('reference');
  referenceLoading.style.display = 'block';
  referenceCanvas.style.display = 'none';

  try {
    await generateReferenceCharacter();
  } catch (error) {
    console.error('Failed to generate reference:', error);
    alert(`Failed to generate reference: ${error}`);
    showStep('style');
  }
});

async function generateReferenceCharacter() {
  const artConfig = ART_STYLES[state.artStyle];
  const size = Math.floor((artConfig.baseSizes.min + artConfig.baseSizes.max) / 2);

  const description = `${artConfig.description}, front-facing humanoid character, neutral pose, reference template`;

  const base64 = await generateImagePixflux(description, size, size);

  // Display reference
  referenceLoading.style.display = 'none';
  referenceCanvas.style.display = 'block';

  const img = new Image();
  img.onload = () => {
    referenceCanvas.width = img.width;
    referenceCanvas.height = img.height;
    const ctx = referenceCanvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
  };
  img.src = `data:image/png;base64,${base64}`;

  // Store reference
  state.referenceImageUrl = `data:image/png;base64,${base64}`;

  // Initialize parts list
  initializePartsList();
}

btnRegenerateReference.addEventListener('click', async () => {
  referenceLoading.style.display = 'block';
  referenceCanvas.style.display = 'none';
  await generateReferenceCharacter();
});

btnApproveReference.addEventListener('click', () => {
  showStep('generation');
  renderPartQueue();
  initializeSpriteSheet();
});

// =======================
// Step 2: Part Generation
// =======================

function initializePartsList() {
  const artConfig = ART_STYLES[state.artStyle];
  const baseSize = Math.floor((artConfig.baseSizes.min + artConfig.baseSizes.max) / 2);

  // Generate parts list based on art style
  state.parts = [
    // Human heads (8)
    { id: 'head_round_pale', category: 'head', description: `${artConfig.description}, human head, round face, pale skin, front view, neutral, no hair`, width: baseSize, height: baseSize, tags: ['round', 'pale'] },
    { id: 'head_round_tan', category: 'head', description: `${artConfig.description}, human head, round face, tan skin, front view, smiling, no hair`, width: baseSize, height: baseSize, tags: ['round', 'tan'] },
    { id: 'head_round_dark', category: 'head', description: `${artConfig.description}, human head, round face, dark brown skin, front view, serious, no hair`, width: baseSize, height: baseSize, tags: ['round', 'dark'] },
    { id: 'head_square_pale', category: 'head', description: `${artConfig.description}, human head, square jaw, pale skin, front view, stern, no hair`, width: baseSize, height: baseSize, tags: ['square', 'pale'] },
    { id: 'head_square_tan', category: 'head', description: `${artConfig.description}, human head, square jaw, tan skin, front view, confident, no hair`, width: baseSize, height: baseSize, tags: ['square', 'tan'] },
    { id: 'head_oval_pale', category: 'head', description: `${artConfig.description}, human head, oval face, pale skin, front view, gentle smile, no hair`, width: baseSize, height: baseSize, tags: ['oval', 'pale'] },
    { id: 'head_oval_dark', category: 'head', description: `${artConfig.description}, human head, oval face, dark skin, front view, wise, no hair`, width: baseSize, height: baseSize, tags: ['oval', 'dark'] },
    { id: 'head_angular_pale', category: 'head', description: `${artConfig.description}, human head, angular face, pale skin, front view, intense, no hair`, width: baseSize, height: baseSize, tags: ['angular', 'pale'] },

    // Human bodies (5)
    { id: 'body_athletic', category: 'body', description: `${artConfig.description}, human body, athletic muscular build, arms and legs, standing, no head`, width: baseSize, height: Math.floor(baseSize * 1.5), tags: ['athletic'] },
    { id: 'body_stocky', category: 'body', description: `${artConfig.description}, human body, stocky broad build, arms and legs, standing, no head`, width: baseSize, height: Math.floor(baseSize * 1.5), tags: ['stocky'] },
    { id: 'body_thin', category: 'body', description: `${artConfig.description}, human body, thin lanky build, arms and legs, standing, no head`, width: baseSize, height: Math.floor(baseSize * 1.5), tags: ['thin'] },
    { id: 'body_average', category: 'body', description: `${artConfig.description}, human body, average build, arms and legs, standing, no head`, width: baseSize, height: Math.floor(baseSize * 1.5), tags: ['average'] },
    { id: 'body_heavy', category: 'body', description: `${artConfig.description}, human body, heavy-set build, arms and legs, standing, no head`, width: baseSize, height: Math.floor(baseSize * 1.5), tags: ['heavy'] },
  ];

  // Initialize completion tracking
  state.parts.forEach(part => {
    state.completedParts.set(part.id, []);
  });
}

function renderPartQueue() {
  partQueue.innerHTML = '';

  state.parts.forEach((part, index) => {
    const div = document.createElement('div');
    div.className = 'part-item';
    div.dataset.index = index.toString();

    const versions = state.completedParts.get(part.id) || [];
    const isCompleted = versions.length > 0;
    const isGenerating = index === state.currentPartIndex && state.isGenerating;

    if (isCompleted) div.classList.add('completed');
    if (isGenerating) div.classList.add('generating');

    const status = isCompleted ? 'completed' : isGenerating ? 'generating' : 'pending';

    div.innerHTML = `
      <span>${part.id}</span>
      <span class="part-status ${status}">${status}</span>
    `;

    div.addEventListener('click', () => {
      if (isCompleted && !state.isGenerating) {
        jumpToPartRegeneration(part.id);
      }
    });

    partQueue.appendChild(div);
  });
}

function initializeSpriteSheet() {
  // Set canvas size to fit all parts (grid layout)
  const cols = 6;
  const rows = Math.ceil(state.parts.length / cols);
  const maxPartSize = 96; // Max size for display

  spriteSheetCanvas.width = cols * maxPartSize;
  spriteSheetCanvas.height = rows * maxPartSize;

  const ctx = spriteSheetCanvas.getContext('2d')!;
  ctx.fillStyle = '#0f3460';
  ctx.fillRect(0, 0, spriteSheetCanvas.width, spriteSheetCanvas.height);
}

function updateSpriteSheet(partId: string, imageData: string) {
  const partIndex = state.parts.findIndex(p => p.id === partId);
  if (partIndex === -1) return;

  const cols = 6;
  const maxPartSize = 96;
  const col = partIndex % cols;
  const row = Math.floor(partIndex / cols);

  const img = new Image();
  img.onload = () => {
    const ctx = spriteSheetCanvas.getContext('2d')!;

    // Clear slot
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(col * maxPartSize, row * maxPartSize, maxPartSize, maxPartSize);

    // Draw part (centered and scaled to fit)
    const scale = Math.min(maxPartSize / img.width, maxPartSize / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = col * maxPartSize + (maxPartSize - scaledWidth) / 2;
    const y = row * maxPartSize + (maxPartSize - scaledHeight) / 2;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
  };
  img.src = imageData;
}

btnStartGeneration.addEventListener('click', () => {
  state.isGenerating = true;
  state.isPaused = false;
  btnStartGeneration.style.display = 'none';
  btnPauseGeneration.style.display = 'inline-block';
  generateNextPart();
});

btnPauseGeneration.addEventListener('click', () => {
  state.isPaused = true;
  state.isGenerating = false;
  btnStartGeneration.style.display = 'inline-block';
  btnPauseGeneration.style.display = 'none';
});

async function generateNextPart() {
  if (state.isPaused || state.currentPartIndex >= state.parts.length) {
    state.isGenerating = false;
    btnStartGeneration.style.display = 'inline-block';
    btnPauseGeneration.style.display = 'none';

    if (state.currentPartIndex >= state.parts.length) {
      btnExportSheet.disabled = false;
      alert('✅ All parts generated! You can now export the sprite sheet.');
    }
    return;
  }

  const part = state.parts[state.currentPartIndex];

  // Update UI
  currentPartName.textContent = `Generating: ${part.id}`;
  const progress = (state.currentPartIndex / state.parts.length) * 100;
  progressBar.style.width = `${progress}%`;
  progressPercent.textContent = `${Math.floor(progress)}%`;
  progressText.textContent = `${state.currentPartIndex} of ${state.parts.length} parts complete`;
  renderPartQueue();

  try {
    // Get reference image (first completed part or reference character)
    const referenceImage = getActiveReferenceImage();

    // Generate part
    const base64 = await generateImagePixflux(
      part.description,
      part.width,
      part.height,
      referenceImage
    );

    // Save version
    const version: PartVersion = {
      imageData: `data:image/png;base64,${base64}`,
      timestamp: Date.now(),
      active: true,
    };

    const versions = state.completedParts.get(part.id) || [];
    versions.push(version);
    state.completedParts.set(part.id, versions);

    // Update sprite sheet
    updateSpriteSheet(part.id, version.imageData);

    // Move to next part
    state.currentPartIndex++;

    // Wait for rate limit (5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Continue to next part
    generateNextPart();

  } catch (error) {
    console.error(`Failed to generate ${part.id}:`, error);
    alert(`Failed to generate ${part.id}: ${error}`);
    state.isPaused = true;
    state.isGenerating = false;
    btnStartGeneration.style.display = 'inline-block';
    btnPauseGeneration.style.display = 'none';
  }
}

function getActiveReferenceImage(): string | undefined {
  // Use first completed part as reference, or reference character
  for (const part of state.parts) {
    const versions = state.completedParts.get(part.id);
    if (versions && versions.length > 0) {
      const activeVersion = versions.find(v => v.active) || versions[versions.length - 1];
      // Extract base64 from data URL
      return activeVersion.imageData.split(',')[1];
    }
  }

  // Fall back to reference character
  if (state.referenceImageUrl) {
    return state.referenceImageUrl.split(',')[1];
  }

  return undefined;
}

function jumpToPartRegeneration(partId: string) {
  // TODO: Implement regeneration UI
  alert(`Regeneration for ${partId} - coming soon!`);
}

btnExportSheet.addEventListener('click', () => {
  // Export sprite sheet as PNG
  const link = document.createElement('a');
  link.download = `sprite-sheet-${state.artStyle}-${Date.now()}.png`;
  link.href = spriteSheetCanvas.toDataURL('image/png');
  link.click();

  alert('✅ Sprite sheet exported!');
});

// Initialize
console.log('Sprite Set Generator loaded');
console.log('Available art styles:', Object.keys(ART_STYLES));
