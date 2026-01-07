/**
 * Sprite Set Generator - Interactive Wizard
 * Generates consistent sprite part libraries with visual feedback
 */

import { ART_STYLES, type ArtStyle, type ArtStyleConfig } from '../src/artStyles.js';

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

interface SubStyleReference {
  id: string;
  imageUrl: string;
  name: string;
  createdAt: number;
}

interface GenerationState {
  artStyle: ArtStyle;
  subStyle: string | null;  // User-defined sub-style name (e.g., "Fantasy", "Sci-Fi")
  referenceId: string | null;
  referenceImageUrl: string | null;
  parts: PartSpec[];
  completedParts: Map<string, PartVersion[]>;  // partId -> versions
  currentPartIndex: number;
  isGenerating: boolean;
  isPaused: boolean;
  // Sub-style storage: "${artStyle}_${subStyle}" -> reference
  storedReferences: Map<string, SubStyleReference>;
}

interface PartVersion {
  imageData: string;  // base64
  timestamp: number;
  active: boolean;
}

// Custom art styles (user-created)
const customArtStyles: Record<string, ArtStyleConfig> = {};

// Global state
const state: GenerationState = {
  artStyle: 'snes',
  subStyle: null,
  referenceId: null,
  referenceImageUrl: null,
  parts: [],
  completedParts: new Map(),
  currentPartIndex: 0,
  isGenerating: false,
  isPaused: false,
  storedReferences: new Map(),
};

// DOM Elements
const stepStyle = document.getElementById('step-style')!;
const stepSubStyle = document.getElementById('step-substyle')!;
const stepReference = document.getElementById('step-reference')!;
const stepGeneration = document.getElementById('step-generation')!;
const stepReview = document.getElementById('step-review')!;

const btnSelectArtStyle = document.getElementById('btn-select-artstyle') as HTMLButtonElement;
const subStyleInput = document.getElementById('substyle-input') as HTMLInputElement;
const subStyleList = document.getElementById('substyle-list')!;
const btnCreateSubStyle = document.getElementById('btn-create-substyle') as HTMLButtonElement;
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

async function generateImagePixflux(description: string, width: number, height: number, initImage?: string, isReferenceCharacter: boolean = false): Promise<string> {
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
    // For reference character, no init image needed (generating from scratch)
    // For parts, use LOW strength to match style without copying
    requestBody.init_image_strength = isReferenceCharacter ? 0 : 120;
  }

  const result = await apiRequest('/generate-image-pixflux', 'POST', requestBody);
  return result.image.base64;
}

// =======================
// Custom Art Styles Management
// =======================

function loadCustomArtStyles() {
  const stored = localStorage.getItem('sprite-wizard-custom-styles');
  if (!stored) return;

  try {
    const data = JSON.parse(stored);
    Object.assign(customArtStyles, data);
  } catch (error) {
    console.error('Failed to load custom art styles:', error);
  }
}

function saveCustomArtStyles() {
  localStorage.setItem('sprite-wizard-custom-styles', JSON.stringify(customArtStyles));
}

function getAllArtStyles(): Record<string, ArtStyleConfig> {
  return { ...ART_STYLES, ...customArtStyles };
}

function renderStyleGrid() {
  const styleGrid = document.getElementById('style-grid')!;
  styleGrid.innerHTML = '';

  const allStyles = getAllArtStyles();

  Object.entries(allStyles).forEach(([styleId, config]) => {
    const card = document.createElement('div');
    card.className = 'style-card';
    if (styleId === state.artStyle) card.classList.add('selected');
    card.setAttribute('data-style', styleId);

    const isCustom = !ART_STYLES[styleId as ArtStyle];

    card.innerHTML = `
      <div class="style-preview"></div>
      <h3>${config.era}</h3>
      <p>${config.baseSizes.min}-${config.baseSizes.max}px • ${config.colorDepth}</p>
      <span class="era">${config.description.substring(0, 50)}...</span>
      ${isCustom ? '<span class="custom-badge">Custom</span>' : ''}
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.artStyle = styleId as ArtStyle;
    });

    styleGrid.appendChild(card);
  });
}

// =======================
// Wizard Flow
// =======================

function showStep(step: 'style' | 'substyle' | 'reference' | 'generation' | 'review') {
  [stepStyle, stepSubStyle, stepReference, stepGeneration, stepReview].forEach(el => el.classList.remove('active'));

  if (step === 'style') stepStyle.classList.add('active');
  else if (step === 'substyle') stepSubStyle.classList.add('active');
  else if (step === 'reference') stepReference.classList.add('active');
  else if (step === 'generation') stepGeneration.classList.add('active');
  else if (step === 'review') stepReview.classList.add('active');
}

// =======================
// Step 1: Art Style Selection
// =======================

// Custom style creation UI
const btnShowCreateStyle = document.getElementById('btn-show-create-style') as HTMLButtonElement;
const btnCancelCreateStyle = document.getElementById('btn-cancel-create-style') as HTMLButtonElement;
const btnSaveCustomStyle = document.getElementById('btn-save-custom-style') as HTMLButtonElement;
const customStyleForm = document.getElementById('custom-style-form')!;
const customStyleName = document.getElementById('custom-style-name') as HTMLInputElement;
const customStyleDescription = document.getElementById('custom-style-description') as HTMLInputElement;
const customStyleSizeMin = document.getElementById('custom-style-size-min') as HTMLInputElement;
const customStyleSizeMax = document.getElementById('custom-style-size-max') as HTMLInputElement;

btnShowCreateStyle.addEventListener('click', () => {
  customStyleForm.style.display = 'block';
  btnShowCreateStyle.style.display = 'none';
});

btnCancelCreateStyle.addEventListener('click', () => {
  customStyleForm.style.display = 'none';
  btnShowCreateStyle.style.display = 'inline-block';
  // Reset form
  customStyleName.value = '';
  customStyleDescription.value = '';
  customStyleSizeMin.value = '32';
  customStyleSizeMax.value = '64';
});

btnSaveCustomStyle.addEventListener('click', () => {
  const name = customStyleName.value.trim();
  const description = customStyleDescription.value.trim();
  const sizeMin = parseInt(customStyleSizeMin.value) || 32;
  const sizeMax = parseInt(customStyleSizeMax.value) || 64;

  if (!name || !description) {
    alert('Please provide both a name and description for the custom style');
    return;
  }

  const styleId = name.toLowerCase().replace(/\s+/g, '_');

  if (ART_STYLES[styleId as ArtStyle] || customArtStyles[styleId]) {
    alert(`A style with ID "${styleId}" already exists`);
    return;
  }

  // Create custom art style
  customArtStyles[styleId] = {
    era: name,
    description,
    baseSizes: { min: sizeMin, max: sizeMax },
    colorDepth: 'Custom',
    shadingStyle: 'medium shading',
    outlineStyle: 'selective outline',
    partsDirectory: `assets/parts/${styleId}/`,
  };

  saveCustomArtStyles();
  renderStyleGrid();

  // Hide form and reset
  customStyleForm.style.display = 'none';
  btnShowCreateStyle.style.display = 'inline-block';
  customStyleName.value = '';
  customStyleDescription.value = '';
  customStyleSizeMin.value = '32';
  customStyleSizeMax.value = '64';

  // Select the new style
  state.artStyle = styleId as ArtStyle;
  document.querySelector(`.style-card[data-style="${styleId}"]`)?.classList.add('selected');

  alert(`✅ Custom art style "${name}" created!`);
});

btnSelectArtStyle.addEventListener('click', () => {
  // Load existing sub-styles for this art style
  loadStoredReferences();
  renderSubStyleList();

  // Update UI with selected art style name from config
  const allStyles = getAllArtStyles();
  const styleConfig = allStyles[state.artStyle];
  document.getElementById('selected-artstyle-name')!.textContent = styleConfig?.era || state.artStyle;

  showStep('substyle');
});

async function createNewSubStyle() {
  const subStyleName = subStyleInput.value.trim();

  if (!subStyleName) {
    alert('Please enter a sub-style name');
    return;
  }

  // Check if sub-style already exists
  const key = `${state.artStyle}_${subStyleName}`;
  if (state.storedReferences.has(key)) {
    alert(`Sub-style "${subStyleName}" already exists for ${state.artStyle}. Click it to select instead.`);
    return;
  }

  state.subStyle = subStyleName;
  document.getElementById('current-substyle-name')!.textContent = `${state.artStyle.toUpperCase()} - ${subStyleName}`;

  // Skip reference character - go straight to part generation
  // First torso will establish the style
  initializePartsList();
  showStep('generation');
}

btnCreateSubStyle.addEventListener('click', createNewSubStyle);

// Allow Enter key to create sub-style
subStyleInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    createNewSubStyle();
  }
});

// Removed old btnGenerateReference - now using btnCreateSubStyle

// =======================
// Sub-Style Management
// =======================

function loadStoredReferences() {
  const stored = localStorage.getItem('sprite-wizard-references');
  if (!stored) return;

  try {
    const data = JSON.parse(stored);
    state.storedReferences = new Map(Object.entries(data));
  } catch (error) {
    console.error('Failed to load stored references:', error);
  }
}

function saveStoredReferences() {
  const data = Object.fromEntries(state.storedReferences);
  localStorage.setItem('sprite-wizard-references', JSON.stringify(data));
}

function renderSubStyleList() {
  subStyleList.innerHTML = '';

  const substyles = Array.from(state.storedReferences.entries())
    .filter(([key]) => key.startsWith(`${state.artStyle}_`))
    .map(([key, ref]) => ({ key, ref }));

  if (substyles.length === 0) {
    subStyleList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No sub-styles yet. Create one below!</p>';
    return;
  }

  substyles.forEach(({ key, ref }) => {
    const card = document.createElement('div');
    card.className = 'substyle-card';
    card.innerHTML = `
      <img src="${ref.imageUrl}" alt="${ref.name}" />
      <h4>${ref.name}</h4>
      <p class="date">Created ${new Date(ref.createdAt).toLocaleDateString()}</p>
    `;

    card.addEventListener('click', () => {
      // Select existing sub-style
      state.subStyle = ref.name;

      document.getElementById('current-substyle-name')!.textContent = `${state.artStyle.toUpperCase()} - ${ref.name}`;

      // Skip reference character - go straight to part generation
      initializePartsList();
      showStep('generation');
    });

    subStyleList.appendChild(card);
  });
}

async function generateReferenceCharacter() {
  const artConfig = ART_STYLES[state.artStyle];
  const size = Math.floor((artConfig.baseSizes.min + artConfig.baseSizes.max) / 2);

  const description = `${artConfig.description}, simple basic human character for sprite composition reference, plain civilian humanoid, normal everyday person, standing front view, neutral pose, wearing simple plain tunic or basic clothing, no armor, no weapons, no accessories, no sci-fi elements, no fantasy armor, just a regular unadorned human figure`;

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
  state.referenceId = `ref_${Date.now()}`;

  // Save to localStorage if sub-style is set
  if (state.subStyle) {
    const key = `${state.artStyle}_${state.subStyle}`;
    state.storedReferences.set(key, {
      id: state.referenceId,
      imageUrl: state.referenceImageUrl,
      name: state.subStyle,
      createdAt: Date.now(),
    });
    saveStoredReferences();
  }

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

  // Generate parts list for modular sprite composition system
  // Each part is designed to be layered and combined with other parts
  // Detailed style guidance from art config
  const styleGuide = `${artConfig.description}, ${artConfig.colorDepth} palette, ${artConfig.shadingStyle}, ${artConfig.outlineStyle}, pixel art style from ${artConfig.era}`;

  state.parts = [
    // TORSO FIRST - This becomes the style reference for all other parts
    { id: 'torso_average', category: 'torso', description: `bare torso body part only, no head, no arms, no legs, ${styleGuide}, modular sprite part for composition system, ONLY a human torso (chest and waist area), average build, simple shirt or tunic, neck opening at top, shoulder stumps for arm attachment, waist opening at bottom, isolated torso piece for layering`, width: baseSize, height: baseSize, tags: ['average'] },
    { id: 'torso_athletic', category: 'torso', description: `bare torso body part only, no head, no arms, no legs, ${styleGuide}, modular sprite part for composition system, ONLY a human torso (chest and waist area), athletic muscular build, simple shirt or tunic, neck opening at top, shoulder stumps for arm attachment, waist opening at bottom, isolated torso piece for layering`, width: baseSize, height: baseSize, tags: ['athletic'] },
    { id: 'torso_stocky', category: 'torso', description: `bare torso body part only, no head, no arms, no legs, ${styleGuide}, modular sprite part for composition system, ONLY a human torso (chest and waist area), stocky broad build, simple shirt or tunic, neck opening at top, shoulder stumps for arm attachment, waist opening at bottom, isolated torso piece for layering`, width: baseSize, height: baseSize, tags: ['stocky'] },
    { id: 'torso_thin', category: 'torso', description: `bare torso body part only, no head, no arms, no legs, ${styleGuide}, modular sprite part for composition system, ONLY a human torso (chest and waist area), thin lanky build, simple shirt or tunic, neck opening at top, shoulder stumps for arm attachment, waist opening at bottom, isolated torso piece for layering`, width: baseSize, height: baseSize, tags: ['thin'] },
    { id: 'torso_heavy', category: 'torso', description: `bare torso body part only, no head, no arms, no legs, ${styleGuide}, modular sprite part for composition system, ONLY a human torso (chest and waist area), heavy-set build, simple shirt or tunic, neck opening at top, shoulder stumps for arm attachment, waist opening at bottom, isolated torso piece for layering`, width: baseSize, height: baseSize, tags: ['heavy'] },

    // Human heads (8) - Generated after torso for style matching
    { id: 'head_round_pale', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, round face shape, pale skin tone, front-facing view, neutral expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['round', 'pale'] },
    { id: 'head_round_tan', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, round face shape, tan skin tone, front-facing view, smiling expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['round', 'tan'] },
    { id: 'head_round_dark', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, round face shape, dark brown skin tone, front-facing view, serious expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['round', 'dark'] },
    { id: 'head_square_pale', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, square jaw face shape, pale skin tone, front-facing view, stern expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['square', 'pale'] },
    { id: 'head_square_tan', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, square jaw face shape, tan skin tone, front-facing view, confident expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['square', 'tan'] },
    { id: 'head_oval_pale', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, oval face shape, pale skin tone, front-facing view, gentle smile, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['oval', 'pale'] },
    { id: 'head_oval_dark', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, oval face shape, dark skin tone, front-facing view, wise expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['oval', 'dark'] },
    { id: 'head_angular_pale', category: 'head', description: `detached head only, no body, no neck, no torso, ${styleGuide}, modular sprite part, ONLY an isolated human head, angular face shape, pale skin tone, front-facing view, intense expression, bald with no hair, isolated head piece for layering`, width: baseSize, height: baseSize, tags: ['angular', 'pale'] },

    // Arms (4) - Left and right, different poses
    { id: 'arm_left_relaxed', category: 'arm', description: `detached arm only, no body, no torso, ${styleGuide}, modular sprite part, ONLY a single left arm, relaxed pose hanging down, shoulder socket at top, hand at bottom, isolated arm piece for layering`, width: Math.floor(baseSize * 0.6), height: Math.floor(baseSize * 1.2), tags: ['left', 'relaxed'] },
    { id: 'arm_right_relaxed', category: 'arm', description: `detached arm only, no body, no torso, ${styleGuide}, modular sprite part, ONLY a single right arm, relaxed pose hanging down, shoulder socket at top, hand at bottom, isolated arm piece for layering`, width: Math.floor(baseSize * 0.6), height: Math.floor(baseSize * 1.2), tags: ['right', 'relaxed'] },
    { id: 'arm_left_bent', category: 'arm', description: `detached arm only, no body, no torso, ${styleGuide}, modular sprite part, ONLY a single left arm, bent at elbow pose, shoulder socket at top, hand pointing forward, isolated arm piece for layering`, width: Math.floor(baseSize * 0.6), height: Math.floor(baseSize * 1.2), tags: ['left', 'bent'] },
    { id: 'arm_right_bent', category: 'arm', description: `detached arm only, no body, no torso, ${styleGuide}, modular sprite part, ONLY a single right arm, bent at elbow pose, shoulder socket at top, hand pointing forward, isolated arm piece for layering`, width: Math.floor(baseSize * 0.6), height: Math.floor(baseSize * 1.2), tags: ['right', 'bent'] },

    // Legs (2) - Standing pose
    { id: 'legs_standing', category: 'legs', description: `legs only, no torso, no waist, no upper body, ${styleGuide}, modular sprite part, ONLY a pair of human legs from thigh to feet, standing pose, simple pants or bare legs, waist connection at top, feet at bottom, isolated legs piece for layering`, width: baseSize, height: Math.floor(baseSize * 1.2), tags: ['standing'] },
    { id: 'legs_walking', category: 'legs', description: `legs only, no torso, no waist, no upper body, ${styleGuide}, modular sprite part, ONLY a pair of human legs from thigh to feet, walking pose with one leg forward, simple pants or bare legs, waist connection at top, feet at bottom, isolated legs piece for layering`, width: baseSize, height: Math.floor(baseSize * 1.2), tags: ['walking'] },
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

  const resuming = state.currentPartIndex > 0;
  console.log(`[Sprite Wizard] Generation ${resuming ? 'resumed' : 'started'}`);

  generateNextPart();
});

btnPauseGeneration.addEventListener('click', () => {
  state.isPaused = true;
  state.isGenerating = false;
  btnStartGeneration.style.display = 'inline-block';
  btnPauseGeneration.style.display = 'none';

  currentPartName.textContent = 'Paused (current part will finish first)';
  console.log('[Sprite Wizard] Generation paused');
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
  // Use first completed torso as the style reference
  // Torso is always generated first and sets the visual style for all other parts
  const torsoAverage = state.completedParts.get('torso_average');
  if (torsoAverage && torsoAverage.length > 0) {
    const activeVersion = torsoAverage.find(v => v.active) || torsoAverage[torsoAverage.length - 1];
    // Extract base64 from data URL
    return activeVersion.imageData.split(',')[1];
  }

  // If no torso yet, don't use any reference (this is the first part being generated)
  return undefined;
}

function jumpToPartRegeneration(partId: string) {
  // TODO: Implement regeneration UI
  alert(`Regeneration for ${partId} - coming soon!`);
}

btnExportSheet.addEventListener('click', () => {
  // Export sprite sheet as PNG
  const link = document.createElement('a');
  const substyleName = state.subStyle ? `-${state.subStyle}` : '';
  link.download = `sprite-sheet-${state.artStyle}${substyleName}-${Date.now()}.png`;
  link.href = spriteSheetCanvas.toDataURL('image/png');
  link.click();

  alert('✅ Sprite sheet exported!');
});

// Initialize
console.log('Sprite Set Generator loaded');
console.log('Available art styles:', Object.keys(ART_STYLES));

// Load custom art styles from localStorage
loadCustomArtStyles();

// Render the style grid with both default and custom styles
renderStyleGrid();
