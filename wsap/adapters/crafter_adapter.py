"""
WSAP Adapter for Crafter game.
"""

import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# Add crafter to path if needed
crafter_path = Path(__file__).parent.parent.parent / "crafter"
if crafter_path.exists():
    sys.path.insert(0, str(crafter_path))

import crafter

from ..adapter import GameAdapter
from ..core import (
    Observation,
    Location,
    Entity,
    Terrain,
    Goal,
    Event,
    ActionSpace,
    ActionDef,
    Action,
    ActionResult,
)


# Action definitions
CRAFTER_ACTIONS = [
    ActionDef("noop", "Do nothing, wait", [], [], "wait"),
    ActionDef("move_left", "Move one tile left", [], [], "movement"),
    ActionDef("move_right", "Move one tile right", [], [], "movement"),
    ActionDef("move_up", "Move one tile up", [], [], "movement"),
    ActionDef("move_down", "Move one tile down", [], [], "movement"),
    ActionDef("do", "Interact with what's in front (collect, attack, drink)", [], [], "interact"),
    ActionDef("sleep", "Sleep to restore energy", [], ["energy < max"], "survival"),
    ActionDef("place_stone", "Place stone block", [], ["stone >= 1"], "building"),
    ActionDef("place_table", "Place crafting table", [], ["wood >= 2"], "building"),
    ActionDef("place_furnace", "Place furnace", [], ["stone >= 4"], "building"),
    ActionDef("place_plant", "Plant a sapling", [], ["sapling >= 1", "on grass"], "building"),
    ActionDef("make_wood_pickaxe", "Craft wood pickaxe", [], ["wood >= 1", "near table"], "crafting"),
    ActionDef("make_stone_pickaxe", "Craft stone pickaxe", [], ["wood >= 1", "stone >= 1", "near table"], "crafting"),
    ActionDef("make_iron_pickaxe", "Craft iron pickaxe", [], ["wood >= 1", "coal >= 1", "iron >= 1", "near table+furnace"], "crafting"),
    ActionDef("make_wood_sword", "Craft wood sword", [], ["wood >= 1", "near table"], "crafting"),
    ActionDef("make_stone_sword", "Craft stone sword", [], ["wood >= 1", "stone >= 1", "near table"], "crafting"),
    ActionDef("make_iron_sword", "Craft iron sword", [], ["wood >= 1", "coal >= 1", "iron >= 1", "near table+furnace"], "crafting"),
]

ACTION_NAMES = [a.name for a in CRAFTER_ACTIONS]


class CrafterAdapter(GameAdapter):
    """WSAP adapter for Crafter game."""

    def __init__(self, **env_kwargs):
        self.env = crafter.Env(**env_kwargs)
        self._last_info: dict = {}
        self._step = 0
        self._recent_events: list[Event] = []
        self._unlocked: set[str] = set()

    @property
    def name(self) -> str:
        return "Crafter"

    @property
    def game_description(self) -> str:
        return """Crafter is a 2D procedural survival game inspired by Minecraft.

SURVIVAL NEEDS:
- Health: Take damage from enemies, lava, or starvation. Regenerates when other needs are met.
- Food: Decreases over time. Eat plants or cows to restore.
- Drink: Decreases over time. Use 'do' action facing water to drink.
- Energy: Decreases when awake. Sleep to restore.

CORE LOOP:
1. Collect wood from trees (use 'do' facing a tree)
2. Place a crafting table (needs 2 wood)
3. Make a wood pickaxe (needs 1 wood, near table)
4. Mine stone with pickaxe (use 'do' facing stone)
5. Make stone tools, place furnace, mine coal/iron
6. Make iron tools, mine diamonds

DANGERS:
- Zombies: Appear at night, chase you, deal melee damage
- Skeletons: Shoot arrows from distance
- Lava: Instant death
- Starvation: Low food/drink/energy causes health loss

TIPS:
- Collect saplings from grass (10% chance) and plant them for renewable wood
- Always keep drink above 2 (water is everywhere)
- Sleep before energy runs out
- Avoid zombies until you have a sword"""

    @property
    def action_space(self) -> ActionSpace:
        return ActionSpace(actions=CRAFTER_ACTIONS)

    def observe(self) -> Observation:
        """Convert Crafter state to WSAP Observation."""
        info = self._last_info

        # Require inventory - no silent defaults
        if "inventory" not in info:
            raise KeyError("Crafter info missing 'inventory' - game state corrupted")
        inv = info["inventory"]

        # Require critical stats - crash if missing
        required_stats = ["health", "food", "drink", "energy"]
        missing = [s for s in required_stats if s not in inv]
        if missing:
            raise KeyError(f"Crafter inventory missing required stats: {missing}")

        # Status - core survival stats
        status = {
            "health": inv["health"],
            "food": inv["food"],
            "drink": inv["drink"],
            "energy": inv["energy"],
        }

        # Inventory - resources and tools
        inventory = {
            k: v for k, v in inv.items()
            if k not in ["health", "food", "drink", "energy"] and v > 0
        }

        # Location - require position
        if "player_pos" not in info:
            raise KeyError("Crafter info missing 'player_pos' - game state corrupted")
        pos = info["player_pos"]
        location = Location(
            coordinates=tuple(pos),
            region="surface",
            description=self._describe_location(info),
        )

        # Goals based on progress
        goals = self._get_current_goals(inv, info.get("achievements", {}))

        return Observation(
            status=status,
            inventory=inventory,
            location=location,
            nearby_entities=[],  # Could parse from semantic view
            nearby_terrain=[],
            active_effects=[],
            current_goals=goals,
            recent_events=self._recent_events[-5:],
            step=self._step,
            time_of_day=self._get_time_of_day(),
        )

    def act(self, action: Action) -> ActionResult:
        """Execute action in Crafter."""
        # Map action name to index
        try:
            action_idx = ACTION_NAMES.index(action.name)
        except ValueError:
            return ActionResult(
                success=False,
                message=f"Unknown action: {action.name}",
                observation=self.observe(),
            )

        # Execute
        obs, reward, done, info = self.env.step(action_idx)
        self._last_info = info
        self._step += 1

        # Track events
        self._recent_events = []

        # Check for new achievements - require achievements field
        if "achievements" not in info:
            raise KeyError("Crafter info missing 'achievements' - game state corrupted")
        achievements = []
        for name, count in info["achievements"].items():
            if count > 0 and name not in self._unlocked:
                self._unlocked.add(name)
                achievements.append(name)
                self._recent_events.append(Event(f"Achievement unlocked: {name}", "reward"))

        # Health changes - require inventory in last_info too
        if "inventory" not in self._last_info or "health" not in self._last_info["inventory"]:
            raise KeyError("Previous game state missing inventory/health - state corrupted")
        old_health = self._last_info["inventory"]["health"]
        new_health = info["inventory"]["health"]
        if new_health < old_health:
            self._recent_events.append(Event(f"Took damage! Health: {new_health}", "danger"))

        # Build result message
        if reward > 0:
            message = f"{action.name}: gained reward!"
        elif reward < 0:
            message = f"{action.name}: took damage"
        else:
            message = f"{action.name}: executed"

        return ActionResult(
            success=True,
            message=message,
            reward=reward,
            achievements=achievements,
            done=done,
            observation=self.observe(),
        )

    def reset(self) -> Observation:
        """Reset Crafter environment."""
        self.env.reset()
        self._step = 0
        self._recent_events = []
        self._unlocked = set()

        # Initialize with default info
        self._last_info = {
            "inventory": {name: data["initial"] for name, data in crafter.constants.items.items()},
            "achievements": {name: 0 for name in crafter.constants.achievements},
            "player_pos": (32, 32),
        }

        return self.observe()

    def close(self) -> None:
        """Clean up."""
        pass  # Crafter doesn't need cleanup

    def _describe_location(self, info: dict) -> str:
        """Generate location description."""
        # Could enhance with actual terrain info
        return "Standing on the surface"

    def _get_time_of_day(self) -> str:
        """Estimate time of day from step count."""
        cycle = (self._step / 300) % 1
        if cycle < 0.25:
            return "morning"
        elif cycle < 0.5:
            return "day"
        elif cycle < 0.75:
            return "evening"
        else:
            return "night (dangerous!)"

    def _get_current_goals(self, inv: dict, achievements: dict) -> list[Goal]:
        """Generate goals based on current progress."""
        goals = []

        # Survival goals - inv already validated to have these fields
        if inv["drink"] <= 3:
            goals.append(Goal("drink", "Find water and drink!", "urgent", f"drink: {inv['drink']}/9"))
        if inv["food"] <= 3:
            goals.append(Goal("food", "Find food (plants or cows)", "urgent", f"food: {inv['food']}/9"))
        if inv["energy"] <= 2:
            goals.append(Goal("energy", "Sleep to restore energy", "urgent", f"energy: {inv['energy']}/9"))

        # Progression goals
        if not achievements.get("collect_wood"):
            goals.append(Goal("wood", "Collect wood from trees (use 'do' facing tree)", "main"))
        elif not achievements.get("place_table"):
            goals.append(Goal("table", "Place a crafting table (needs 2 wood)", "main"))
        elif not achievements.get("make_wood_pickaxe"):
            goals.append(Goal("pickaxe", "Make a wood pickaxe (need 1 wood, near table)", "main"))
        elif not achievements.get("collect_stone"):
            goals.append(Goal("stone", "Mine stone with pickaxe", "main"))
        elif not achievements.get("make_stone_pickaxe"):
            goals.append(Goal("better_pick", "Make a stone pickaxe", "main"))
        elif not achievements.get("collect_coal"):
            goals.append(Goal("coal", "Mine coal for smelting", "main"))
        elif not achievements.get("place_furnace"):
            goals.append(Goal("furnace", "Place a furnace (needs 4 stone)", "main"))
        elif not achievements.get("collect_iron"):
            goals.append(Goal("iron", "Mine iron with stone pickaxe", "main"))
        elif not achievements.get("collect_diamond"):
            goals.append(Goal("diamond", "Mine diamond with iron pickaxe", "main"))
        else:
            goals.append(Goal("survive", "Survive and explore!", "main"))

        return goals
