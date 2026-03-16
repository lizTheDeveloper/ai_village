"""
Feature extraction from MVEE LLM prompt logs.

Parses structured sections from executor/talker prompts → fixed-dim float vectors.

Feature vector layout (FEATURE_DIM = 40):
  [0]  skill_farming       (level / 10)
  [1]  skill_gathering     (level / 10)
  [2]  skill_building      (level / 10)
  [3]  skill_animal        (level / 10)
  [4]  skill_medicine      (level / 10)
  [5]  skill_combat        (level / 10)
  [6]  priority_farming    (0–1)
  [7]  priority_gathering  (0–1)
  [8]  priority_building   (0–1)
  [9]  priority_social     (0–1)
  [10] resource_fiber      (count / 100)
  [11] resource_wood       (count / 100)
  [12] resource_stone      (count / 100)
  [13] resource_berry      (count / 100)
  [14] has_food_stored     (0/1)
  [15] building_campfire   (0/1)
  [16] building_tent       (0/1)
  [17] building_chest      (0/1)
  [18] building_bench      (0/1)
  [19] behavior_idle       (0/1)
  [20] faith               (0–1)
  [21] has_injury          (0/1)
  [22] injury_severity     (none=0, minor=0.33, moderate=0.67, severe=1.0)
  [23] nearby_resources    (count / 50)
  [24] nearby_agents       (count / 10)
  [25] mood_pct            (0–1, from "Mood: X.X (Y%)")
  [26] emotion_anxious     (0/1)
  [27] emotion_happy       (0/1)
  [28] emotion_sad         (0/1)
  [29] emotion_angry       (0/1)
  [30] in_conversation     (0/1)
  [31] goals_count         (count / 10)
  [32] inventory_wood      (count / 50)
  [33] inventory_stone     (count / 50)
  [34] inventory_berry     (count / 50)
  [35] inventory_fiber     (count / 50)
  [36] is_executor         (0/1 — prompt type flag)
  [37] spatial_x           (0–1, normalized from −1..1)
  [38] spatial_y           (0–1, normalized from −1..1)
  [39] has_memories        (0/1)

Ref: arXiv:1511.06295 (Policy Distillation) — features should mirror what the
teacher (LLM) sees. Prompt parsing is the bootstrap approach; runtime feature
extraction uses agent components directly (MVEEPolicyInference.ts).
"""

import re
from typing import Optional

FEATURE_DIM = 40

# Action class definitions — must stay in sync with MVEEPolicyInference.ts
TALKER_ACTIONS = [
    'talk',
    'call_meeting',
    'set_personal_goal',
    'set_medium_term_goal',
    'set_group_goal',
    'follow_agent',
]

EXECUTOR_ACTIONS = [
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
]

TALKER_ACTION_INDEX = {a: i for i, a in enumerate(TALKER_ACTIONS)}
EXECUTOR_ACTION_INDEX = {a: i for i, a in enumerate(EXECUTOR_ACTIONS)}

SKILL_NAMES = ['farming', 'gathering', 'building', 'animal', 'medicine', 'combat']
SKILL_LEVELS = {
    'novice': 1, 'beginner': 1, 'apprentice': 2,
    'journeyman': 3, 'advanced': 3, 'expert': 4, 'master': 5, 'grandmaster': 6,
}

EMOTIONS = ['anxious', 'happy', 'sad', 'angry']


def _parse_float(text: str, pattern: str, default: float = 0.0, scale: float = 1.0) -> float:
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)) * scale
        except ValueError:
            pass
    return default


def _parse_pct(text: str, pattern: str, default: float = 0.0) -> float:
    """Extract a percentage value → 0-1 range."""
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)) / 100.0
        except ValueError:
            pass
    return default


def extract_features(prompt: str) -> list[float]:
    """
    Parse an MVEE executor or talker prompt → 40-dim feature vector.
    Returns a list of floats; all values in [0, 1] range.
    """
    feat = [0.0] * FEATURE_DIM

    # --- Skills [0-5] ---
    # Matches: "farming: expert (level 4.0)" or "Farming: Expert (4)"
    for i, skill in enumerate(SKILL_NAMES):
        # executor format: "farming: expert (level 4.0)"
        m = re.search(rf'{skill}[^(]*\(level\s*([\d.]+)\)', prompt, re.IGNORECASE)
        if m:
            feat[i] = min(float(m.group(1)) / 10.0, 1.0)
            continue
        # talker format: "Farming: Expert (4)"
        m = re.search(rf'{skill}:\s*(\w+)\s*\((\d+)\)', prompt, re.IGNORECASE)
        if m:
            feat[i] = min(int(m.group(2)) / 10.0, 1.0)
            continue
        # level name only: "farming: expert"
        m = re.search(rf'{skill}:\s*(\w+)', prompt, re.IGNORECASE)
        if m:
            level = SKILL_LEVELS.get(m.group(1).lower(), 0)
            feat[i] = min(level / 10.0, 1.0)

    # --- Priorities [6-9] ---
    feat[6] = _parse_pct(prompt, r'farming[^%]*\((\d+)%\)', 0.0)
    feat[7] = _parse_pct(prompt, r'gathering[^%]*\((\d+)%\)', 0.0)
    feat[8] = _parse_pct(prompt, r'building[^%]*\((\d+)%\)', 0.0)
    feat[9] = _parse_pct(prompt, r'social[^%]*\((\d+)%\)', 0.0)

    # Also handle "priorities: {farming: 0.31, ...}" format
    m = re.search(r'priorities:\s*\{([^}]+)\}', prompt, re.IGNORECASE)
    if m:
        prio_str = m.group(1)
        for k, idx in [('farming', 6), ('gathering', 7), ('building', 8), ('social', 9)]:
            mp = re.search(rf'{k}:\s*([\d.]+)', prio_str, re.IGNORECASE)
            if mp:
                feat[idx] = min(float(mp.group(1)), 1.0)

    # --- Available resources in environment [10-13] ---
    feat[10] = min(_parse_float(prompt, r'fiber:\s*(\d+)\s*available', 0.0) / 100.0, 1.0)
    feat[11] = min(_parse_float(prompt, r'wood:\s*(\d+)\s*available', 0.0) / 100.0, 1.0)
    feat[12] = min(_parse_float(prompt, r'stone:\s*(\d+)\s*available', 0.0) / 100.0, 1.0)
    feat[13] = min(_parse_float(prompt, r'berry:\s*(\d+)\s*available', 0.0) / 100.0, 1.0)

    # --- Village state [14-18] ---
    feat[14] = 1.0 if "food stored" in prompt.lower() else 0.0
    buildings_text = re.search(r'Buildings:\s*([^\n]+)', prompt, re.IGNORECASE)
    if buildings_text:
        btext = buildings_text.group(1).lower()
        feat[15] = 1.0 if 'campfire' in btext else 0.0
        feat[16] = 1.0 if 'tent' in btext else 0.0
        feat[17] = 1.0 if 'storage-chest' in btext or 'chest' in btext else 0.0
        feat[18] = 1.0 if 'research-bench' in btext or 'bench' in btext else 0.0

    # --- Behavior [19] ---
    feat[19] = 1.0 if re.search(r'Behavior:\s*idle', prompt, re.IGNORECASE) else 0.0

    # --- Spirituality [20] ---
    feat[20] = _parse_pct(prompt, r'Faith:\s*[\d.]+\s*\((\d+)%\)', 0.0)

    # --- Health [21-22] ---
    if re.search(r'Injury Type:', prompt, re.IGNORECASE):
        feat[21] = 1.0
        severity_map = {'minor': 0.33, 'moderate': 0.67, 'severe': 1.0, 'critical': 1.0}
        m = re.search(r'Severity:\s*(\w+)', prompt, re.IGNORECASE)
        if m:
            feat[22] = severity_map.get(m.group(1).lower(), 0.33)

    # --- Perception [23-24] ---
    m = re.search(r'Sees\s+(\d+)\s+agent', prompt, re.IGNORECASE)
    if m:
        feat[24] = min(int(m.group(1)) / 10.0, 1.0)
    m = re.search(r'Sees\s+\d+\s+agent[^,]*,\s*(\d+)\s+resource', prompt, re.IGNORECASE)
    if m:
        feat[23] = min(int(m.group(1)) / 50.0, 1.0)

    # --- Emotional state [25-29] ---
    # Talker prompt: "Mood: -22.27 (39%)"
    feat[25] = _parse_pct(prompt, r'Mood:\s*[-\d.]+\s*\((\d+)%\)', 0.5)
    emotion_text = re.search(r'Emotion:\s*(\w+)', prompt, re.IGNORECASE)
    if emotion_text:
        em = emotion_text.group(1).lower()
        for j, name in enumerate(EMOTIONS):
            feat[26 + j] = 1.0 if name in em else 0.0

    # --- Conversation [30] ---
    m = re.search(r'Partner:\s*(\S+)', prompt, re.IGNORECASE)
    if m and m.group(1).lower() not in ('none', 'nobody', ''):
        feat[30] = 1.0
    if re.search(r'GROUP CONVERSATION', prompt, re.IGNORECASE):
        feat[30] = 1.0

    # --- Goals [31] ---
    goals_section = re.search(r'## Goals\s*\n(.+?)(?:\n##|\Z)', prompt, re.DOTALL | re.IGNORECASE)
    if goals_section:
        gs = goals_section.group(1).strip()
        if gs and 'none' not in gs.lower():
            goal_count = len(re.findall(r'\n[-•*]|\d+\.', gs)) or 1
            feat[31] = min(goal_count / 10.0, 1.0)

    # --- Inventory [32-35] ---
    inv_section = re.search(r'## inventory\s*\n(.+?)(?:\n##|\Z)', prompt, re.DOTALL | re.IGNORECASE)
    if inv_section:
        inv = inv_section.group(1)
        for name, idx in [('wood', 32), ('stone', 33), ('berry', 34), ('fiber', 35)]:
            m = re.search(rf'{name}\s*\((\d+)\)', inv, re.IGNORECASE)
            if m:
                feat[idx] = min(int(m.group(1)) / 50.0, 1.0)

    # --- Layer flag [36] ---
    feat[36] = 1.0 if 'TASK PLANNER' in prompt and 'EXECUTOR' in prompt else 0.0

    # --- Spatial position [37-38] ---
    mx = re.search(r'X Position:\s*([-\d.]+)', prompt, re.IGNORECASE)
    my = re.search(r'Y Position:\s*([-\d.]+)', prompt, re.IGNORECASE)
    if mx:
        feat[37] = (float(mx.group(1)) + 1.0) / 2.0  # normalize −1..1 → 0..1
    if my:
        feat[38] = (float(my.group(1)) + 1.0) / 2.0

    # --- Memory [39] ---
    m = re.search(r'(\d+)\s+(?:unique\s+)?memor', prompt, re.IGNORECASE)
    if m and int(m.group(1)) > 0:
        feat[39] = 1.0

    return feat


def identify_layer(prompt: str) -> str:
    """Identify which LLM layer this prompt belongs to."""
    if 'TASK PLANNER' in prompt and 'EXECUTOR' in prompt:
        return 'executor'
    if 'social brain' in prompt.lower() or 'talker' in prompt.lower():
        return 'talker'
    return 'unknown'
