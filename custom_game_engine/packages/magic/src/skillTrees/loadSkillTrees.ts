/**
 * Load skill trees from JSON data files.
 *
 * This module provides a centralized loader for all skill tree JSON files,
 * maintaining type safety while allowing easy data editing.
 *
 * Usage:
 *   import { loadSkillTree } from './loadSkillTrees.js';
 *   const tree = loadSkillTree('daemon');
 */

import type { MagicSkillTree } from '../MagicSkillTree.js';

// Import JSON files directly (Vite/TypeScript handle this)
import daemonData from '../../data/skill-trees/daemon.json';
import architectureData from '../../data/skill-trees/architecture.json';
import dreamData from '../../data/skill-trees/dream.json';
import songData from '../../data/skill-trees/song.json';
import nameData from '../../data/skill-trees/name.json';
import pactData from '../../data/skill-trees/pact.json';
import allomancyData from '../../data/skill-trees/allomancy.json';
import sympathyData from '../../data/skill-trees/sympathy.json';
import runeData from '../../data/skill-trees/rune.json';
import shintoData from '../../data/skill-trees/shinto.json';
import breathData from '../../data/skill-trees/breath.json';
import bloodData from '../../data/skill-trees/blood.json';
import beliefData from '../../data/skill-trees/belief_magic.json';
import divineData from '../../data/skill-trees/divine.json';
import academicData from '../../data/skill-trees/academic.json';
import commerceData from '../../data/skill-trees/commerce_magic.json';
import debtData from '../../data/skill-trees/debt_magic.json';
import bureaucraticData from '../../data/skill-trees/bureaucratic_magic.json';
import gameData from '../../data/skill-trees/game_magic.json';
import luckData from '../../data/skill-trees/luck_magic.json';
import emotionalData from '../../data/skill-trees/emotional.json';
import echoData from '../../data/skill-trees/echo_magic.json';
import paradoxData from '../../data/skill-trees/paradox_magic.json';
import fengShuiData from '../../data/skill-trees/feng_shui_magic.json';
import thresholdData from '../../data/skill-trees/threshold_magic.json';

/**
 * Registry of all skill trees by paradigm ID.
 */
const SKILL_TREE_REGISTRY: Record<string, MagicSkillTree> = {
  daemon: daemonData as MagicSkillTree,
  architecture: architectureData as MagicSkillTree,
  dream: dreamData as MagicSkillTree,
  song: songData as MagicSkillTree,
  name: nameData as MagicSkillTree,
  pact: pactData as MagicSkillTree,
  allomancy: allomancyData as MagicSkillTree,
  sympathy: sympathyData as MagicSkillTree,
  rune: runeData as MagicSkillTree,
  shinto: shintoData as MagicSkillTree,
  breath: breathData as MagicSkillTree,
  blood: bloodData as MagicSkillTree,
  belief_magic: beliefData as MagicSkillTree,
  divine: divineData as MagicSkillTree,
  academic: academicData as MagicSkillTree,
  commerce_magic: commerceData as MagicSkillTree,
  debt_magic: debtData as MagicSkillTree,
  bureaucratic_magic: bureaucraticData as MagicSkillTree,
  game_magic: gameData as MagicSkillTree,
  luck_magic: luckData as MagicSkillTree,
  emotional: emotionalData as MagicSkillTree,
  echo_magic: echoData as MagicSkillTree,
  paradox_magic: paradoxData as MagicSkillTree,
  feng_shui_magic: fengShuiData as MagicSkillTree,
  threshold_magic: thresholdData as MagicSkillTree,
};

/**
 * Load a skill tree by paradigm ID.
 *
 * @param paradigmId - The paradigm identifier (e.g., 'daemon', 'architecture')
 * @returns The skill tree data
 * @throws Error if paradigm not found
 */
export function loadSkillTree(paradigmId: string): MagicSkillTree {
  const tree = SKILL_TREE_REGISTRY[paradigmId];
  if (!tree) {
    throw new Error(`Skill tree not found for paradigm: ${paradigmId}`);
  }
  return tree;
}

/**
 * Get all available paradigm IDs.
 */
export function getAllParadigmIds(): string[] {
  return Object.keys(SKILL_TREE_REGISTRY);
}

/**
 * Get all skill trees.
 */
export function getAllSkillTrees(): MagicSkillTree[] {
  return Object.values(SKILL_TREE_REGISTRY);
}

/**
 * Check if a paradigm has a skill tree in the JSON registry.
 * Note: There's also hasSkillTree() in MagicSkillTreeRegistry.
 */
export function hasSkillTreeData(paradigmId: string): boolean {
  return paradigmId in SKILL_TREE_REGISTRY;
}

/**
 * Export individual trees for backward compatibility.
 * These match the original export names from individual files.
 */
export const DAEMON_SKILL_TREE = SKILL_TREE_REGISTRY.daemon;
export const ARCHITECTURE_SKILL_TREE = SKILL_TREE_REGISTRY.architecture;
export const DREAM_SKILL_TREE = SKILL_TREE_REGISTRY.dream;
export const SONG_SKILL_TREE = SKILL_TREE_REGISTRY.song;
export const NAME_SKILL_TREE = SKILL_TREE_REGISTRY.name;
export const PACT_SKILL_TREE = SKILL_TREE_REGISTRY.pact;
export const ALLOMANCY_SKILL_TREE = SKILL_TREE_REGISTRY.allomancy;
export const SYMPATHY_SKILL_TREE = SKILL_TREE_REGISTRY.sympathy;
export const RUNE_SKILL_TREE = SKILL_TREE_REGISTRY.rune;
export const SHINTO_SKILL_TREE = SKILL_TREE_REGISTRY.shinto;
export const BREATH_SKILL_TREE = SKILL_TREE_REGISTRY.breath;
export const BLOOD_SKILL_TREE = SKILL_TREE_REGISTRY.blood;
export const BELIEF_SKILL_TREE = SKILL_TREE_REGISTRY.belief_magic;
export const DIVINE_SKILL_TREE = SKILL_TREE_REGISTRY.divine;
export const ACADEMIC_SKILL_TREE = SKILL_TREE_REGISTRY.academic;
export const COMMERCE_SKILL_TREE = SKILL_TREE_REGISTRY.commerce_magic;
export const DEBT_SKILL_TREE = SKILL_TREE_REGISTRY.debt_magic;
export const BUREAUCRATIC_SKILL_TREE = SKILL_TREE_REGISTRY.bureaucratic_magic;
export const GAME_SKILL_TREE = SKILL_TREE_REGISTRY.game_magic;
export const LUCK_SKILL_TREE = SKILL_TREE_REGISTRY.luck_magic;
export const EMOTIONAL_SKILL_TREE = SKILL_TREE_REGISTRY.emotional;
export const ECHO_SKILL_TREE = SKILL_TREE_REGISTRY.echo_magic;
export const PARADOX_SKILL_TREE = SKILL_TREE_REGISTRY.paradox_magic;
export const FENG_SHUI_SKILL_TREE = SKILL_TREE_REGISTRY.feng_shui_magic;
export const THRESHOLD_SKILL_TREE = SKILL_TREE_REGISTRY.threshold_magic;
