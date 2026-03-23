/**
 * Runtime inference for trained MVEE distilled micro-NNs.
 *
 * Implements manual forward passes for TalkerNN and ExecutorNN — two small
 * classification networks trained to predict LLM action choices from
 * structured agent state extracted from the prompt text.
 *
 * Architecture:
 *   TalkerNN:   40 → 128 → 256 → 128 → 6  (social actions, ~73K params)
 *   ExecutorNN: 40 → 256 → 512 → 256 → 13 (task actions, ~279K params)
 *
 * Usage:
 *   const result = mveePolicy.infer(prompt, layer);
 *   if (result && result.confidence >= CONFIDENCE_THRESHOLD) {
 *     return buildActionResponse(result.action);  // skip LLM
 *   }
 *
 * Follows Talker-Reasoner dual-process pattern (arXiv:2410.08328):
 *   System 1 (this): fast NN inference, <0.5ms per agent
 *   System 2: LLM via LLMDecisionQueue, fires when confidence < 0.85
 *
 * Ref: LLM4Teach (arXiv:2311.13373), Policy Distillation (arXiv:1511.06295)
 */

/** Feature vector dimension — must match training/feature_extractor.py FEATURE_DIM. */
const FEATURE_DIM = 40;

/** Confidence threshold for LLM bypass. From Experiment B design in MUL-1020 lit review. */
export const NN_CONFIDENCE_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for extractFeatures (avoid per-call RegExp construction)
// ---------------------------------------------------------------------------

const _SKILL_NAMES_FOR_RE = ['farming', 'gathering', 'building', 'animal', 'medicine', 'combat'] as const;

/** "farming: expert (level 4.0)" */
const SKILL_LEVEL_RE: Record<string, RegExp> = {};
/** "Farming: Expert (4)" */
const SKILL_PARENS_RE: Record<string, RegExp> = {};
/** "farming: expert" */
const SKILL_WORD_RE: Record<string, RegExp> = {};
for (const sk of _SKILL_NAMES_FOR_RE) {
  SKILL_LEVEL_RE[sk] = new RegExp(`${sk}[^(]*\\(level\\s*([\\d.]+)\\)`, 'i');
  SKILL_PARENS_RE[sk] = new RegExp(`${sk}:\\s*(\\w+)\\s*\\((\\d+)\\)`, 'i');
  SKILL_WORD_RE[sk] = new RegExp(`${sk}:\\s*(\\w+)`, 'i');
}

/** Priority block inner: "farming: 0.5" */
const PRIO_BLOCK_RE: Record<string, RegExp> = {};
for (const k of ['farming', 'gathering', 'building', 'social']) {
  PRIO_BLOCK_RE[k] = new RegExp(`${k}:\\s*([\\d.]+)`, 'i');
}

/** "farming (31%)" */
const PCT_MATCH_RE: Record<string, RegExp> = {};
for (const name of ['farming', 'gathering', 'building', 'social']) {
  PCT_MATCH_RE[name] = new RegExp(`${name}[^%]*\\((\\d+)%\\)`, 'i');
}

/** "fiber: 12 available" */
const RES_AVAILABLE_RE: Record<string, RegExp> = {};
for (const name of ['fiber', 'wood', 'stone', 'berry']) {
  RES_AVAILABLE_RE[name] = new RegExp(`${name}:\\s*(\\d+)\\s*available`, 'i');
}

/** Inventory: "wood (12)" */
const INV_RES_RE: Record<string, RegExp> = {};
for (const name of ['wood', 'stone', 'berry', 'fiber']) {
  INV_RES_RE[name] = new RegExp(`${name}\\s*\\((\\d+)\\)`, 'i');
}

/** Action lists — must match training/feature_extractor.py */
export const TALKER_ACTIONS = [
  'talk',
  'call_meeting',
  'set_personal_goal',
  'set_medium_term_goal',
  'set_group_goal',
  'follow_agent',
] as const;

export const EXECUTOR_ACTIONS = [
  'gather',
  'till',
  'plan_build',
  'build',
  'farm',
  'help',
  'deposit_items',
  'idle',
  'explore',
  'plant',
  'set_priorities',
  'pick',
  'wander',
] as const;

/** Unified action list for species policy NNs (talker + executor combined). */
export const SPECIES_ACTIONS = [
  ...TALKER_ACTIONS,
  ...EXECUTOR_ACTIONS,
] as const;

export type TalkerAction = typeof TALKER_ACTIONS[number];
export type ExecutorAction = typeof EXECUTOR_ACTIONS[number];
export type SpeciesAction = typeof SPECIES_ACTIONS[number];

/** Maps IdentityComponent.species to trained policy species name. */
export const IDENTITY_TO_POLICY_SPECIES: Record<string, string> = {
  human: 'norn',
  dwarf: 'dvergar',
  elf: 'valkyr',
  animal: 'grendel',
};

export interface NNInferenceResult {
  action: string;
  confidence: number;
  layer: 'talker' | 'executor' | 'species';
}

// ---------------------------------------------------------------------------
// Exported weight format (from training/export_weights_json)
// ---------------------------------------------------------------------------

interface ModelWeights {
  model: string;
  input_dim: number;
  output_dim: number;
  actions: string[];
  weights: Record<string, number[] | number[][]>;
}

// ---------------------------------------------------------------------------
// Math utilities (in-place, GC-free)
// ---------------------------------------------------------------------------

/** Safe index read for Float32Array (handles noUncheckedIndexedAccess). */
function f(arr: Float32Array, i: number): number { return arr[i] ?? 0; }
/** Safe index read for number[] (handles noUncheckedIndexedAccess). */
function n(arr: number[], i: number): number { return arr[i] ?? 0; }
/** Safe index read for number[][] row (handles noUncheckedIndexedAccess). */
function nr(arr: number[][], i: number): number[] { return arr[i] ?? []; }

/** In-place linear layer: out[i] = bias[i] + dot(weight[i], x). */
function linearInPlace(x: Float32Array, w: Record<string, number[] | number[][]>, layerIdx: number, out: Float32Array): void {
  const weight = w[`net.${layerIdx}.weight`] as number[][];
  const bias = w[`net.${layerIdx}.bias`] as number[];
  const outDim = out.length;
  for (let i = 0; i < outDim; i++) {
    let sum = n(bias, i);
    const row = nr(weight, i);
    for (let j = 0; j < x.length; j++) sum += n(row, j) * f(x, j);
    out[i] = sum;
  }
}

/** In-place layer norm. */
function layerNormInPlace(x: Float32Array, w: Record<string, number[] | number[][]>, layerIdx: number, out: Float32Array): void {
  const gamma = w[`net.${layerIdx}.weight`] as number[];
  const beta = w[`net.${layerIdx}.bias`] as number[];
  const len = x.length;
  const eps = 1e-5;
  let mean = 0;
  for (let i = 0; i < len; i++) mean += f(x, i);
  mean /= len;
  let variance = 0;
  for (let i = 0; i < len; i++) { const d = f(x, i) - mean; variance += d * d; }
  variance /= len;
  const std = Math.sqrt(variance + eps);
  for (let i = 0; i < len; i++) out[i] = n(gamma, i) * ((f(x, i) - mean) / std) + n(beta, i);
}

/** In-place approximate GELU (same approximation as LimbicPolicyInference). */
function geluInPlace(buf: Float32Array, len: number): void {
  for (let i = 0; i < len; i++) {
    const v = f(buf, i);
    buf[i] = v * (0.5 * (1 + Math.tanh(0.7978845608 * (v + 0.044715 * v * v * v))));
  }
}

/** Softmax in-place. Returns max probability (confidence). */
function softmaxInPlace(buf: Float32Array, len: number): number {
  let max = -Infinity;
  for (let i = 0; i < len; i++) { const v = f(buf, i); if (v > max) max = v; }
  let sum = 0;
  for (let i = 0; i < len; i++) { buf[i] = Math.exp(f(buf, i) - max); sum += f(buf, i); }
  let maxProb = 0;
  for (let i = 0; i < len; i++) { buf[i] = f(buf, i) / sum; const v = f(buf, i); if (v > maxProb) maxProb = v; }
  return maxProb;
}

// ---------------------------------------------------------------------------
// Feature extraction from prompt text
// ---------------------------------------------------------------------------

/**
 * Extract 40-dim feature vector from MVEE prompt text.
 * This mirrors training/feature_extractor.py — must be kept in sync.
 *
 * All values in [0, 1] range. Unknown features default to 0.
 */
function extractFeatures(prompt: string): Float32Array {
  const feat = new Float32Array(FEATURE_DIM); // zero-initialized

  // Skills [0-5]: farming, gathering, building, animal, medicine, combat
  const SKILL_NAMES = ['farming', 'gathering', 'building', 'animal', 'medicine', 'combat'];
  const SKILL_LEVELS: Record<string, number> = {
    novice: 1, beginner: 1, apprentice: 2, journeyman: 3, advanced: 3, expert: 4, master: 5, grandmaster: 6,
  };
  for (let i = 0; i < SKILL_NAMES.length; i++) {
    const sk = SKILL_NAMES[i] ?? '';
    // "farming: expert (level 4.0)"
    let m = prompt.match(SKILL_LEVEL_RE[sk] ?? new RegExp(`${sk}[^(]*\\(level\\s*([\\d.]+)\\)`, 'i'));
    if (m) { feat[i] = Math.min(parseFloat(m[1] ?? '0') / 10, 1); continue; }
    // "Farming: Expert (4)"
    m = prompt.match(SKILL_PARENS_RE[sk] ?? new RegExp(`${sk}:\\s*(\\w+)\\s*\\((\\d+)\\)`, 'i'));
    if (m) { feat[i] = Math.min(parseInt(m[2] ?? '0') / 10, 1); continue; }
    // "farming: expert"
    m = prompt.match(SKILL_WORD_RE[sk] ?? new RegExp(`${sk}:\\s*(\\w+)`, 'i'));
    if (m) feat[i] = Math.min((SKILL_LEVELS[(m[1] ?? '').toLowerCase()] ?? 0) / 10, 1);
  }

  // Priorities [6-9]: farming, gathering, building, social (from priorities: {...} block)
  const prioBlock = prompt.match(/priorities:\s*\{([^}]+)\}/i);
  if (prioBlock) {
    const pb = prioBlock[1] ?? '';
    const pmap: Record<string, number> = { farming: 6, gathering: 7, building: 8, social: 9 };
    for (const [k, idx] of Object.entries(pmap)) {
      const pm = pb.match(PRIO_BLOCK_RE[k] ?? new RegExp(`${k}:\\s*([\\d.]+)`, 'i'));
      if (pm) feat[idx] = Math.min(parseFloat(pm[1] ?? '0'), 1);
    }
  } else {
    // "farming (31%)"
    const pctMatch = (name: string) => {
      const m = prompt.match(PCT_MATCH_RE[name] ?? new RegExp(`${name}[^%]*\\((\\d+)%\\)`, 'i'));
      return m ? parseFloat(m[1] ?? '0') / 100 : 0;
    };
    feat[6] = pctMatch('farming'); feat[7] = pctMatch('gathering');
    feat[8] = pctMatch('building'); feat[9] = pctMatch('social');
  }

  // Environment resources [10-13]
  const res = (name: string) => {
    const m = prompt.match(RES_AVAILABLE_RE[name] ?? new RegExp(`${name}:\\s*(\\d+)\\s*available`, 'i'));
    return m ? Math.min(parseInt(m[1] ?? '0') / 100, 1) : 0;
  };
  feat[10] = res('fiber'); feat[11] = res('wood'); feat[12] = res('stone'); feat[13] = res('berry');

  // Village state [14-18]
  feat[14] = /food stored/i.test(prompt) ? 1 : 0;
  const bldg = prompt.match(/Buildings:\s*([^\n]+)/i);
  if (bldg) {
    const bt = (bldg[1] ?? '').toLowerCase();
    feat[15] = bt.includes('campfire') ? 1 : 0;
    feat[16] = bt.includes('tent') ? 1 : 0;
    feat[17] = (bt.includes('storage-chest') || bt.includes('chest')) ? 1 : 0;
    feat[18] = (bt.includes('research-bench') || bt.includes('bench')) ? 1 : 0;
  }

  // Behavior [19]
  feat[19] = /Behavior:\s*idle/i.test(prompt) ? 1 : 0;

  // Faith [20]
  const faith = prompt.match(/Faith:\s*[\d.]+\s*\((\d+)%\)/i);
  feat[20] = faith ? parseFloat(faith[1] ?? '0') / 100 : 0;

  // Health [21-22]
  if (/Injury Type:/i.test(prompt)) {
    feat[21] = 1;
    const sev = prompt.match(/Severity:\s*(\w+)/i);
    if (sev) {
      const sm: Record<string, number> = { minor: 0.33, moderate: 0.67, severe: 1, critical: 1 };
      feat[22] = sm[(sev[1] ?? '').toLowerCase()] ?? 0.33;
    }
  }

  // Perception [23-24]
  const perc = prompt.match(/Sees\s+(\d+)\s+agent[^,]*,\s*(\d+)\s+resource/i);
  if (perc) {
    feat[23] = Math.min(parseInt(perc[2] ?? '0') / 50, 1);
    feat[24] = Math.min(parseInt(perc[1] ?? '0') / 10, 1);
  } else {
    const ag = prompt.match(/Sees\s+(\d+)\s+agent/i);
    if (ag) feat[24] = Math.min(parseInt(ag[1] ?? '0') / 10, 1);
  }

  // Emotional state [25-29]
  const mood = prompt.match(/Mood:\s*[-\d.]+\s*\((\d+)%\)/i);
  feat[25] = mood ? parseFloat(mood[1] ?? '50') / 100 : 0.5;
  const em = prompt.match(/Emotion:\s*(\w+)/i);
  if (em) {
    const EMOTIONS = ['anxious', 'happy', 'sad', 'angry'];
    const e = (em[1] ?? '').toLowerCase();
    EMOTIONS.forEach((name, j) => { feat[26 + j] = e.includes(name) ? 1 : 0; });
  }

  // Conversation [30]
  const partner = prompt.match(/Partner:\s*(\S+)/i);
  if (partner) {
    const partnerName = (partner[1] ?? '').toLowerCase();
    if (!['none', 'nobody'].includes(partnerName)) feat[30] = 1;
  }
  if (/GROUP CONVERSATION/i.test(prompt)) feat[30] = 1;

  // Goals count [31]
  const goalsSect = prompt.match(/## Goals\s*\n([\s\S]+?)(?:\n##|\n---)/i);
  if (goalsSect && !/none/i.test((goalsSect[1] ?? '').trim())) feat[31] = 0.1;

  // Inventory [32-35]
  const inv = prompt.match(/## inventory\s*\n([\s\S]+?)(?:\n##)/i);
  if (inv) {
    const it = inv[1] ?? '';
    const invRes = (name: string, idx: number) => {
      const m = it.match(INV_RES_RE[name] ?? new RegExp(`${name}\\s*\\((\\d+)\\)`, 'i'));
      if (m) feat[idx] = Math.min(parseInt(m[1] ?? '0') / 50, 1);
    };
    invRes('wood', 32); invRes('stone', 33); invRes('berry', 34); invRes('fiber', 35);
  }

  // Layer flag [36]
  feat[36] = (/TASK PLANNER/i.test(prompt) && /EXECUTOR/i.test(prompt)) ? 1 : 0;

  // Spatial position [37-38]
  const sx = prompt.match(/X Position:\s*([-\d.]+)/i);
  const sy = prompt.match(/Y Position:\s*([-\d.]+)/i);
  if (sx) feat[37] = Math.min(Math.max((parseFloat(sx[1] ?? '0') + 1) / 2, 0), 1);
  if (sy) feat[38] = Math.min(Math.max((parseFloat(sy[1] ?? '0') + 1) / 2, 0), 1);

  // Memory [39]
  const mem = prompt.match(/(\d+)\s+(?:unique\s+)?memor/i);
  if (mem && parseInt(mem[1] ?? '0') > 0) feat[39] = 1;

  return feat;
}

// ---------------------------------------------------------------------------
// Scratch buffers for GC-free inference
// ---------------------------------------------------------------------------

interface TalkerScratch {
  input: Float32Array;   // 40
  h128a: Float32Array;   // 128
  h256: Float32Array;    // 256
  h128b: Float32Array;   // 128
  out6: Float32Array;    // 6
}

interface ExecutorScratch {
  input: Float32Array;   // 40
  h256a: Float32Array;   // 256
  h512: Float32Array;    // 512
  h256b: Float32Array;   // 256
  out13: Float32Array;   // 13
}

interface SpeciesScratch {
  input: Float32Array;   // 40
  h128a: Float32Array;   // 128
  h256: Float32Array;    // 256
  h128b: Float32Array;   // 128
  out19: Float32Array;   // 19
}

// ---------------------------------------------------------------------------
// Forward passes
// ---------------------------------------------------------------------------

/** TalkerNN: 40 → 128 → 256 → 128 → 6. Dropout(0.1) skipped at inference. */
function talkerForward(input: Float32Array, w: Record<string, number[] | number[][]>, s: TalkerScratch): { actionIdx: number; confidence: number } {
  // net.0: Linear(40→128), net.1: LayerNorm(128), GELU
  linearInPlace(input, w, 0, s.h128a);
  layerNormInPlace(s.h128a, w, 1, s.h128a);
  geluInPlace(s.h128a, 128);
  // net.3: Linear(128→256), net.4: LayerNorm(256), GELU, Dropout(skip)
  linearInPlace(s.h128a, w, 3, s.h256);
  layerNormInPlace(s.h256, w, 4, s.h256);
  geluInPlace(s.h256, 256);
  // net.7: Linear(256→128), net.8: LayerNorm(128), GELU
  linearInPlace(s.h256, w, 7, s.h128b);
  layerNormInPlace(s.h128b, w, 8, s.h128b);
  geluInPlace(s.h128b, 128);
  // net.10: Linear(128→6), Softmax
  linearInPlace(s.h128b, w, 10, s.out6);
  const confidence = softmaxInPlace(s.out6, 6);
  let maxIdx = 0;
  for (let i = 1; i < 6; i++) if (f(s.out6, i) > f(s.out6, maxIdx)) maxIdx = i;
  return { actionIdx: maxIdx, confidence };
}

/** ExecutorNN: 40 → 256 → 512 → 256 → 13. Dropout(0.1) skipped at inference. */
function executorForward(input: Float32Array, w: Record<string, number[] | number[][]>, s: ExecutorScratch): { actionIdx: number; confidence: number } {
  // net.0: Linear(40→256), net.1: LayerNorm(256), GELU
  linearInPlace(input, w, 0, s.h256a);
  layerNormInPlace(s.h256a, w, 1, s.h256a);
  geluInPlace(s.h256a, 256);
  // net.3: Linear(256→512), net.4: LayerNorm(512), GELU, Dropout(skip)
  linearInPlace(s.h256a, w, 3, s.h512);
  layerNormInPlace(s.h512, w, 4, s.h512);
  geluInPlace(s.h512, 512);
  // net.7: Linear(512→256), net.8: LayerNorm(256), GELU
  linearInPlace(s.h512, w, 7, s.h256b);
  layerNormInPlace(s.h256b, w, 8, s.h256b);
  geluInPlace(s.h256b, 256);
  // net.10: Linear(256→13), Softmax
  linearInPlace(s.h256b, w, 10, s.out13);
  const confidence = softmaxInPlace(s.out13, 13);
  let maxIdx = 0;
  for (let i = 1; i < 13; i++) if (f(s.out13, i) > f(s.out13, maxIdx)) maxIdx = i;
  return { actionIdx: maxIdx, confidence };
}

/** SpeciesNN: 40 → 128 → 256 → 128 → 19. Same layer structure as TalkerNN. */
function speciesForward(input: Float32Array, w: Record<string, number[] | number[][]>, s: SpeciesScratch): { actionIdx: number; confidence: number } {
  // net.0: Linear(40→128), net.1: LayerNorm(128), GELU
  linearInPlace(input, w, 0, s.h128a);
  layerNormInPlace(s.h128a, w, 1, s.h128a);
  geluInPlace(s.h128a, 128);
  // net.3: Linear(128→256), net.4: LayerNorm(256), GELU, Dropout(skip)
  linearInPlace(s.h128a, w, 3, s.h256);
  layerNormInPlace(s.h256, w, 4, s.h256);
  geluInPlace(s.h256, 256);
  // net.7: Linear(256→128), net.8: LayerNorm(128), GELU
  linearInPlace(s.h256, w, 7, s.h128b);
  layerNormInPlace(s.h128b, w, 8, s.h128b);
  geluInPlace(s.h128b, 128);
  // net.10: Linear(128→19), Softmax
  linearInPlace(s.h128b, w, 10, s.out19);
  const confidence = softmaxInPlace(s.out19, 19);
  let maxIdx = 0;
  for (let i = 1; i < 19; i++) if (f(s.out19, i) > f(s.out19, maxIdx)) maxIdx = i;
  return { actionIdx: maxIdx, confidence };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class MVEEPolicyInference {
  private talkerWeights: Record<string, number[] | number[][]> | null = null;
  private talkerActions: string[] = [];
  private executorWeights: Record<string, number[] | number[][]> | null = null;
  private executorActions: string[] = [];
  private enabled = false;

  /** Per-species unified policy weights keyed by species name (norn, dvergar, etc.). */
  private speciesWeights: Map<string, Record<string, number[] | number[][]>> = new Map();
  private speciesActions: Map<string, string[]> = new Map();

  /** Pre-allocated scratch buffers — one set per layer, reused every inference call. */
  private readonly _talkerScratch: TalkerScratch = {
    input: new Float32Array(FEATURE_DIM),
    h128a: new Float32Array(128),
    h256: new Float32Array(256),
    h128b: new Float32Array(128),
    out6: new Float32Array(6),
  };

  private readonly _executorScratch: ExecutorScratch = {
    input: new Float32Array(FEATURE_DIM),
    h256a: new Float32Array(256),
    h512: new Float32Array(512),
    h256b: new Float32Array(256),
    out13: new Float32Array(13),
  };

  private readonly _speciesScratch: SpeciesScratch = {
    input: new Float32Array(FEATURE_DIM),
    h128a: new Float32Array(128),
    h256: new Float32Array(256),
    h128b: new Float32Array(128),
    out19: new Float32Array(19),
  };

  /** LLM calls saved by NN (for metrics). */
  private _calls = { nnServed: 0, llmFallback: 0 };

  /**
   * Load TalkerNN weights from JSON (fetched from server or bundled).
   * Validates input_dim against FEATURE_DIM.
   */
  loadTalkerModel(weights: ModelWeights): void {
    if (weights.input_dim !== FEATURE_DIM) {
      throw new Error(`MVEEPolicy: talker model input_dim=${weights.input_dim} but expected ${FEATURE_DIM}`);
    }
    this.talkerWeights = weights.weights;
    this.talkerActions = weights.actions;
    console.warn(`[MVEEPolicy] Loaded TalkerNN (${weights.output_dim} classes)`);
  }

  /**
   * Load ExecutorNN weights from JSON.
   */
  loadExecutorModel(weights: ModelWeights): void {
    if (weights.input_dim !== FEATURE_DIM) {
      throw new Error(`MVEEPolicy: executor model input_dim=${weights.input_dim} but expected ${FEATURE_DIM}`);
    }
    this.executorWeights = weights.weights;
    this.executorActions = weights.actions;
    console.warn(`[MVEEPolicy] Loaded ExecutorNN (${weights.output_dim} classes)`);
  }

  async loadFromURL(talkerUrl: string, executorUrl: string): Promise<void> {
    const [talkerResp, executorResp] = await Promise.all([fetch(talkerUrl), fetch(executorUrl)]);
    if (!talkerResp.ok) throw new Error(`Failed to load TalkerNN from ${talkerUrl}`);
    if (!executorResp.ok) throw new Error(`Failed to load ExecutorNN from ${executorUrl}`);
    this.loadTalkerModel(await talkerResp.json() as ModelWeights);
    this.loadExecutorModel(await executorResp.json() as ModelWeights);
  }

  /**
   * Load a species-specific unified policy NN (40→128→256→128→19).
   * Species name should match training output: norn, dvergar, grendel, valkyr.
   */
  loadSpeciesModel(species: string, weights: ModelWeights): void {
    if (weights.input_dim !== FEATURE_DIM) {
      throw new Error(`MVEEPolicy: species ${species} model input_dim=${weights.input_dim} but expected ${FEATURE_DIM}`);
    }
    this.speciesWeights.set(species, weights.weights);
    this.speciesActions.set(species, weights.actions);
    console.warn(`[MVEEPolicy] Loaded species policy: ${species} (${weights.output_dim} actions)`);
  }

  /**
   * Load all 4 species policy weights from URLs.
   * URLs should point to JSON files matching training/weights/species/{species}_policy.json.
   */
  async loadSpeciesFromURLs(speciesUrls: Record<string, string>): Promise<void> {
    const entries = Object.entries(speciesUrls);
    const responses = await Promise.all(entries.map(([, url]) => fetch(url)));
    for (let i = 0; i < entries.length; i++) {
      const [species] = entries[i]!;
      const resp = responses[i]!;
      if (!resp.ok) throw new Error(`Failed to load species policy for ${species} from ${entries[i]![1]}`);
      this.loadSpeciesModel(species, await resp.json() as ModelWeights);
    }
  }

  /** Check if a species policy is loaded. */
  hasSpeciesModel(species: string): boolean {
    return this.speciesWeights.has(species);
  }

  /** Get list of loaded species. */
  getLoadedSpecies(): string[] {
    return Array.from(this.speciesWeights.keys());
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    console.warn(`[MVEEPolicy] ${on ? 'Enabled' : 'Disabled'}`);
  }

  isEnabled(): boolean { return this.enabled; }

  hasModels(): boolean {
    return this.talkerWeights !== null && this.executorWeights !== null;
  }

  /** Check if species policies are loaded and ready. */
  hasSpeciesModels(): boolean {
    return this.speciesWeights.size > 0;
  }

  /**
   * Attempt NN inference given a prompt string and layer.
   *
   * Returns null if:
   *  - NN is disabled or no model loaded
   *  - Layer is unrecognized
   *  - Confidence < threshold (caller should fall back to LLM)
   *
   * The returned action string can be used directly to build a stub LLM response:
   *   `{ "action": { "type": result.action } }`
   */
  infer(prompt: string, layer: string): NNInferenceResult | null {
    if (!this.enabled) return null;

    const features = extractFeatures(prompt);

    if (layer === 'talker' && this.talkerWeights) {
      features.forEach((v, i) => { this._talkerScratch.input[i] = v; });
      const { actionIdx, confidence } = talkerForward(this._talkerScratch.input, this.talkerWeights, this._talkerScratch);
      const action = this.talkerActions[actionIdx] ?? 'talk';
      if (confidence >= NN_CONFIDENCE_THRESHOLD) {
        this._calls.nnServed++;
        return { action, confidence, layer: 'talker' };
      }
      this._calls.llmFallback++;
      return null;
    }

    if (layer === 'executor' && this.executorWeights) {
      features.forEach((v, i) => { this._executorScratch.input[i] = v; });
      const { actionIdx, confidence } = executorForward(this._executorScratch.input, this.executorWeights, this._executorScratch);
      const action = this.executorActions[actionIdx] ?? 'gather';
      if (confidence >= NN_CONFIDENCE_THRESHOLD) {
        this._calls.nnServed++;
        return { action, confidence, layer: 'executor' };
      }
      this._calls.llmFallback++;
      return null;
    }

    return null;
  }

  /**
   * Attempt species-specific NN inference.
   *
   * Uses the unified 19-action policy NN for the given species.
   * The species name should be the policy species (norn, dvergar, grendel, valkyr),
   * not the IdentityComponent species. Use IDENTITY_TO_POLICY_SPECIES to map.
   *
   * Returns null if disabled, no model loaded, or confidence < threshold.
   */
  inferSpecies(prompt: string, species: string): NNInferenceResult | null {
    if (!this.enabled) return null;

    const weights = this.speciesWeights.get(species);
    const actions = this.speciesActions.get(species);
    if (!weights || !actions) return null;

    const features = extractFeatures(prompt);
    features.forEach((v, i) => { this._speciesScratch.input[i] = v; });
    const { actionIdx, confidence } = speciesForward(this._speciesScratch.input, weights, this._speciesScratch);
    const action = actions[actionIdx] ?? 'idle';

    if (confidence >= NN_CONFIDENCE_THRESHOLD) {
      this._calls.nnServed++;
      // Determine effective layer based on which action set the action belongs to
      const isTalkerAction = (TALKER_ACTIONS as readonly string[]).includes(action);
      return { action, confidence, layer: isTalkerAction ? 'talker' : 'executor' };
    }

    this._calls.llmFallback++;
    return null;
  }

  /** Metrics for monitoring LLM savings. */
  getMetrics(): { nnServed: number; llmFallback: number; nnRate: number } {
    const total = this._calls.nnServed + this._calls.llmFallback;
    return {
      ...this._calls,
      nnRate: total > 0 ? this._calls.nnServed / total : 0,
    };
  }
}

/** Singleton instance, shared across the game. */
export const mveePolicy = new MVEEPolicyInference();
