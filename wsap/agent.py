"""
Agent implementations for WSAP.
"""

import json
import re
from abc import ABC, abstractmethod
from typing import Any

import requests

from .core import Observation, ActionSpace, Action, ActionResult


class Agent(ABC):
    """Abstract base class for WSAP agents."""

    @abstractmethod
    def initialize(self, game_desc: str, action_space: ActionSpace) -> None:
        """Initialize with game context. Called once at start."""
        ...

    @abstractmethod
    def decide(self, observation: Observation) -> Action:
        """Choose an action given current observation."""
        ...

    def reflect(self, result: ActionResult) -> None:
        """Process feedback from last action. Override for learning."""
        pass

    def reset(self) -> None:
        """Reset agent state for new episode."""
        pass


class OllamaAgent(Agent):
    """Agent that uses Ollama for LLM inference."""

    def __init__(
        self,
        model: str = "qwen3:8b",
        host: str = "http://localhost:11434",
        temperature: float = 0.3,
        max_tokens: int = 500,
        timeout: int = 120,
    ):
        self.model = model
        self.host = host
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout

        self.system_prompt: str = ""
        self.action_names: list[str] = []
        self.history: list[dict] = []
        self.step_count = 0

    def initialize(self, game_desc: str, action_space: ActionSpace) -> None:
        """Set up system prompt and action space."""
        self.action_names = action_space.action_names()
        self.system_prompt = f"""{game_desc}

AVAILABLE ACTIONS:
{action_space.to_text()}

RESPONSE FORMAT:
Respond with just the action name, or JSON: {{"action": "name", "reasoning": "why"}}

Be concise. Focus on survival and progress."""

    def decide(self, observation: Observation) -> Action:
        """Query LLM for next action."""
        self.step_count += 1

        # Build prompt
        prompt = observation.to_text()

        # Add recent history context
        if self.history:
            recent = self.history[-3:]
            history_text = "\n".join(
                f"  Step {h['step']}: {h['action']} -> {h['result']}"
                for h in recent
            )
            prompt += f"\n\nRECENT HISTORY:\n{history_text}"

        prompt += "\n\nWhat action do you take?"

        # Query Ollama
        response = self._generate(prompt)

        # Parse response
        action = self._parse_action(response)

        return action

    def reflect(self, result: ActionResult) -> None:
        """Store result in history."""
        self.history.append({
            "step": self.step_count,
            "action": result.message.split(":")[0] if ":" in result.message else "unknown",
            "result": "success" if result.success else "failed",
            "reward": result.reward,
        })

        # Keep history bounded
        if len(self.history) > 50:
            self.history = self.history[-30:]

    def reset(self) -> None:
        """Clear history for new episode."""
        self.history = []
        self.step_count = 0

    def _generate(self, prompt: str) -> str:
        """Call Ollama API."""
        url = f"{self.host}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": self.max_tokens,
                "temperature": self.temperature,
            }
        }
        if self.system_prompt:
            payload["system"] = self.system_prompt

        # No fallback - if Ollama fails, crash
        response = requests.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()

        # Require response field
        if "response" not in data:
            raise KeyError(f"Ollama response missing 'response' field: {data.keys()}")

        result = data["response"]
        if not result.strip():
            if "thinking" in data:
                result = data["thinking"]
            else:
                raise ValueError("Ollama returned empty response with no thinking")

        return result

    def _parse_action(self, response: str) -> Action:
        """Extract action from LLM response."""
        if not response or not response.strip():
            raise ValueError("Cannot parse action from empty LLM response")

        response = response.strip()

        # Try JSON parse first
        json_match = re.search(r'\{[^}]+\}', response)
        if json_match:
            try:
                data = json.loads(json_match.group())
                action_name = data.get("action")
                if action_name is None:
                    raise KeyError("JSON response missing 'action' field")
                params = data.get("params", {})
                reasoning = data.get("reasoning")
                if action_name in self.action_names:
                    return Action(action_name, params, reasoning)
                else:
                    raise ValueError(f"Unknown action in JSON: {action_name}")
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON in response: {e}")

        # Try plain text match
        response_lower = response.lower()

        # Exact match
        if response_lower in self.action_names:
            return Action(response_lower)

        # Find action name in response
        for name in self.action_names:
            if name in response_lower:
                return Action(name)

        # No fallback - crash if we can't parse
        raise ValueError(f"Could not parse valid action from LLM response: {response[:200]}")


class MemoryAgent(OllamaAgent):
    """Agent with longer-term memory and planning."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.facts: list[str] = []  # Learned facts about the world
        self.plans: list[str] = []  # Current plan steps
        self.failed_actions: dict[str, int] = {}  # Track what doesn't work

    def decide(self, observation: Observation) -> Action:
        """Decide with memory context."""
        self.step_count += 1

        # Build enhanced prompt
        prompt = observation.to_text()

        # Add memory context
        if self.facts:
            prompt += f"\n\nKNOWN FACTS:\n" + "\n".join(f"  - {f}" for f in self.facts[-10:])

        if self.plans:
            prompt += f"\n\nCURRENT PLAN:\n" + "\n".join(f"  {i+1}. {p}" for i, p in enumerate(self.plans[:5]))

        if self.failed_actions:
            failed = [f"{k} (failed {v}x)" for k, v in self.failed_actions.items() if v >= 2]
            if failed:
                prompt += f"\n\nAVOID (previously failed): {', '.join(failed)}"

        prompt += "\n\nWhat action do you take?"

        response = self._generate(prompt)
        return self._parse_action(response)

    def reflect(self, result: ActionResult) -> None:
        """Update memory based on results."""
        super().reflect(result)

        # Track failures
        if not result.success:
            action_name = self.history[-1]["action"] if self.history else "unknown"
            self.failed_actions[action_name] = self.failed_actions.get(action_name, 0) + 1

        # Extract facts from achievements
        for ach in result.achievements:
            self.facts.append(f"Achieved: {ach}")

    def reset(self) -> None:
        """Reset for new episode but keep some learning."""
        super().reset()
        # Keep facts and failed actions across episodes (transfer learning)
        # But clear plans
        self.plans = []


def run_episode(
    adapter: "GameAdapter",  # type: ignore
    agent: Agent,
    max_steps: int = 1000,
    verbose: bool = True,
) -> dict[str, Any]:
    """
    Run a single episode with given adapter and agent.

    Returns episode statistics.
    """
    # Initialize
    agent.initialize(adapter.game_description, adapter.action_space)
    observation = adapter.reset()
    agent.reset()

    total_reward = 0.0
    achievements = []
    step = 0

    for step in range(max_steps):
        # Agent decides
        action = agent.decide(observation)

        # Execute in game
        result = adapter.act(action)

        # Agent reflects
        agent.reflect(result)

        # Track stats
        total_reward += result.reward
        achievements.extend(result.achievements)

        if verbose and (step % 10 == 0 or result.reward > 0 or result.achievements):
            status = observation.status
            print(
                f"[{step:4d}] {action.name:20s} | "
                f"H:{status.get('health', '?')} F:{status.get('food', '?')} "
                f"D:{status.get('drink', '?')} E:{status.get('energy', '?')} | "
                f"R:{result.reward:+.1f}"
            )

        observation = result.observation

        if result.done:
            break

    if verbose:
        print(f"\nEpisode finished at step {step + 1}")
        print(f"Total reward: {total_reward:.2f}")
        print(f"Achievements: {achievements}")

    return {
        "steps": step + 1,
        "total_reward": total_reward,
        "achievements": achievements,
        "final_observation": observation,
    }
