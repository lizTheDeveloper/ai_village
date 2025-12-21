#!/usr/bin/env python3
"""
Run a multi-game agent that navigates between games via the Nexus.

Usage:
    # Start Nexus server first:
    python -m wsap.nexus.server

    # Then run agent:
    python run_multiverse.py --name "Explorer" --steps 500

    # Or with mock games:
    python run_multiverse.py --mock --steps 100
"""

import argparse
import json
import re
import time
import uuid
from dataclasses import dataclass
from typing import Any

import ollama

from wsap.nexus import NexusClient, NexusServer, GameInfo, GameStatus
from wsap.adapters import CrafterAdapter, MockStarboundAdapter


@dataclass
class Action:
    name: str
    params: dict
    reasoning: str = ""


class MultiGameAgent:
    """Agent that navigates between games using Ollama/Qwen3"""

    def __init__(
        self,
        agent_id: str | None = None,
        name: str = "Explorer",
        model: str = "qwen3:8b",
        nexus_url: str = "http://localhost:9998",
        verbose: bool = True,
    ):
        self.agent_id = agent_id or f"agent_{uuid.uuid4().hex[:8]}"
        self.name = name
        self.model = model
        self.nexus = NexusClient(nexus_url)
        self.verbose = verbose

        # State
        self.current_game: str | None = None
        self.current_adapter = None
        self.identity = None
        self.session_stats = {"steps": 0, "reward": 0.0, "achievements": []}

        # Game adapters
        self.adapters = {
            "crafter": lambda: CrafterAdapter(),
            "starbound": lambda: MockStarboundAdapter(),  # Use mock for now
        }

    def log(self, msg: str):
        if self.verbose:
            print(msg)

    def generate(self, prompt: str, system: str = "") -> str:
        """Generate response using Ollama"""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            response = ollama.chat(
                model=self.model,
                messages=messages,
                options={
                    "num_predict": 300,
                    "temperature": 0.7,
                }
            )
            content = response["message"]["content"]

            # Handle Qwen3 thinking mode
            if "<think>" in content:
                content = content.split("</think>")[-1].strip()

            return content
        except Exception as e:
            self.log(f"[LLM Error] {e}")
            return '{"action": "wait", "params": {}, "reasoning": "LLM error"}'

    def parse_action(self, response: str) -> Action:
        """Parse action from LLM response"""
        # Find JSON in response
        match = re.search(r'\{[^{}]*\}', response)
        if match:
            try:
                data = json.loads(match.group())
                return Action(
                    name=data.get("action", "noop"),
                    params=data.get("params", {}),
                    reasoning=data.get("reasoning", ""),
                )
            except json.JSONDecodeError:
                pass

        # Fallback
        return Action(name="noop", params={}, reasoning="Could not parse")

    def run(self, max_steps: int = 500, max_games: int = 5):
        """Main loop - navigate between games"""
        self.log(f"\n{'='*50}")
        self.log(f"Starting Multi-Game Agent: {self.name}")
        self.log(f"Model: {self.model}")
        self.log(f"{'='*50}\n")

        # Register with Nexus
        try:
            self.identity = self.nexus.register_agent(self.agent_id, self.name)
            self.log(f"Registered as {self.identity.agent_id}")
        except Exception as e:
            self.log(f"[Error] Could not connect to Nexus: {e}")
            return

        total_steps = 0
        games_played = 0

        while total_steps < max_steps and games_played < max_games:
            if self.current_game is None:
                # In Nexus - choose a game
                self.log("\n--- NEXUS ---")
                game_id = self._choose_game()

                if game_id:
                    self._enter_game(game_id)
                    games_played += 1
                else:
                    self.log("No games available or chosen.")
                    break
            else:
                # In game - play
                steps = self._play_game(max_steps - total_steps)
                total_steps += steps

        self.log(f"\n{'='*50}")
        self.log(f"SESSION COMPLETE")
        self.log(f"Total steps: {total_steps}")
        self.log(f"Games played: {games_played}")
        self.log(f"{'='*50}")

    def _choose_game(self) -> str | None:
        """Use LLM to choose next game"""
        try:
            obs_text = self.nexus.observe(self.agent_id)
        except Exception as e:
            self.log(f"[Error] {e}")
            return None

        self.log(obs_text[:500] + "..." if len(obs_text) > 500 else obs_text)

        system = """You are an AI agent navigating a multiverse of games.
Choose a game to enter based on your skills and what you want to learn.
Always respond with JSON: {"action": "enter_game", "params": {"game_id": "..."}, "reasoning": "..."}"""

        response = self.generate(obs_text, system=system)
        action = self.parse_action(response)

        self.log(f"\nDecision: {action.name} -> {action.params}")
        self.log(f"Reasoning: {action.reasoning}")

        if action.name == "enter_game" and "game_id" in action.params:
            return action.params["game_id"]

        return None

    def _enter_game(self, game_id: str):
        """Enter a game world"""
        self.log(f"\n--- Entering {game_id} ---")

        try:
            result = self.nexus.enter_game(self.agent_id, game_id)

            if not result.get("success"):
                self.log(f"[Error] {result.get('error', 'Unknown error')}")
                return

            # Create local adapter
            if game_id in self.adapters:
                self.current_adapter = self.adapters[game_id]()
                self.current_game = game_id
                self.session_stats = {"steps": 0, "reward": 0.0, "achievements": []}

                bonuses = result.get("bonuses", {})
                if bonuses:
                    self.log(f"Bonuses applied: {bonuses}")

        except Exception as e:
            self.log(f"[Error] {e}")

    def _play_game(self, max_steps: int) -> int:
        """Play current game until exit or done"""
        if not self.current_adapter:
            return 0

        self.log(f"\n--- Playing {self.current_game} ---")

        steps = 0
        obs = self.current_adapter.observe()

        while steps < max_steps:
            # Get observation text
            obs_text = obs.to_text()
            if steps % 10 == 0:
                self.log(f"\n[Step {steps}]")
                # Truncate for display
                self.log(obs_text[:300] + "..." if len(obs_text) > 300 else obs_text)

            # Decide action
            action = self._decide_game_action(obs_text, obs)
            self.log(f"  Action: {action.name}")

            # Check for exit
            if action.name == "exit_game":
                self.log(f"  Exiting: {action.reasoning}")
                self._exit_game(action.reasoning)
                break

            # Execute action
            try:
                result = self.current_adapter.act(action.name)
                steps += 1
                self.session_stats["steps"] = steps
                self.session_stats["reward"] += result.reward

                if result.achievements:
                    self.session_stats["achievements"].extend(result.achievements)
                    for ach in result.achievements:
                        self.log(f"  Achievement: {ach}")

                if result.done:
                    self.log(f"\n  Game ended: {result.message}")
                    self._exit_game("game_over")
                    break

                obs = result.observation

            except Exception as e:
                self.log(f"  [Error] {e}")
                break

        return steps

    def _decide_game_action(self, obs_text: str, obs) -> Action:
        """Decide action within a game"""
        # Get action space
        actions = self.current_adapter.action_space.to_text()

        system = f"""You are playing {self.current_game}.

Available actions:
{actions}

Special action: "exit_game" - Leave this game and return to Nexus
Use exit_game when:
- You've learned enough
- You're stuck or frustrated
- You want to try a different game

Respond with JSON: {{"action": "...", "params": {{}}, "reasoning": "..."}}
Be decisive. Progress toward survival and exploration."""

        response = self.generate(obs_text, system=system)
        return self.parse_action(response)

    def _exit_game(self, reason: str):
        """Exit current game and return to Nexus"""
        if not self.current_game:
            return

        self.log(f"\n--- Exiting {self.current_game} ---")
        self.log(f"Steps: {self.session_stats['steps']}")
        self.log(f"Reward: {self.session_stats['reward']:.2f}")
        self.log(f"Achievements: {self.session_stats['achievements']}")

        # Report to Nexus
        try:
            # Infer skill gains based on game
            skill_gains = {}
            if self.current_game == "crafter":
                skill_gains = {
                    "survival": 0.01 * self.session_stats["steps"] / 100,
                    "resource_management": 0.01 * self.session_stats["steps"] / 100,
                }
            elif self.current_game == "starbound":
                skill_gains = {
                    "exploration": 0.01 * self.session_stats["steps"] / 100,
                    "combat": 0.005 * self.session_stats["steps"] / 100,
                }

            self.nexus.exit_game(
                self.agent_id,
                self.current_game,
                reason=reason,
                stats={
                    "steps": self.session_stats["steps"],
                    "reward": self.session_stats["reward"],
                    "achievements": self.session_stats["achievements"],
                    "skills": skill_gains,
                }
            )
        except Exception as e:
            self.log(f"[Warning] Could not report to Nexus: {e}")

        # Cleanup
        if self.current_adapter:
            self.current_adapter.close()
        self.current_adapter = None
        self.current_game = None


def run_with_mock_nexus(args):
    """Run with embedded mock Nexus (no server needed)"""
    print("Starting embedded Nexus server...")

    nexus = NexusServer(port=9998)

    # Register games
    nexus.register_game(GameInfo(
        id="crafter",
        name="Crafter",
        description="2D survival - gather, craft, survive",
        status=GameStatus.AVAILABLE,
        genre=["survival", "sandbox"],
        skill_domains=["resource_management", "survival", "crafting"],
    ))

    nexus.register_game(GameInfo(
        id="starbound",
        name="OpenStarbound (Mock)",
        description="Space exploration across planets",
        status=GameStatus.AVAILABLE,
        genre=["exploration", "survival"],
        skill_domains=["exploration", "combat", "social"],
    ))

    nexus.start()
    time.sleep(0.5)  # Let server start

    try:
        agent = MultiGameAgent(
            name=args.name,
            model=args.model,
            verbose=not args.quiet,
        )
        agent.run(max_steps=args.steps, max_games=args.games)
    finally:
        nexus.stop()


def main():
    parser = argparse.ArgumentParser(description="Run multi-game agent")
    parser.add_argument("--name", default="Explorer", help="Agent name")
    parser.add_argument("--model", default="qwen3:8b", help="Ollama model")
    parser.add_argument("--steps", type=int, default=200, help="Max total steps")
    parser.add_argument("--games", type=int, default=3, help="Max games to play")
    parser.add_argument("--nexus", default="http://localhost:9998", help="Nexus URL")
    parser.add_argument("--mock", action="store_true", help="Use embedded mock Nexus")
    parser.add_argument("--quiet", action="store_true", help="Reduce output")
    args = parser.parse_args()

    if args.mock:
        run_with_mock_nexus(args)
    else:
        agent = MultiGameAgent(
            name=args.name,
            model=args.model,
            nexus_url=args.nexus,
            verbose=not args.quiet,
        )
        agent.run(max_steps=args.steps, max_games=args.games)


if __name__ == "__main__":
    main()
